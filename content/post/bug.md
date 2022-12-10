---
author: "Aman Rusia"
date: 2022-12-08
title: Nasty bug due to python's garbage collection resolved after 2 years
---

### The system and the symptom
At Nanonets, we used to have intermittent failures for the longest time in one particular experiment during model training. The experiment was a job in a kubernetes cluster coded in python. The python process would just get stuck. No cpu usage. But this didn't happen every time, the errors would happen for 1 in 100 or so, making it difficult to replicate.


### Initial investigation
The logs weren't helpful and I couldn't replicate the issue locally, but fortunately, I could get exec into the pod and get a shell. Python processes getting stuck aren't that rare, especially in a multi-processing environment, so I thought this would be an easy fix.

`py-spy` makes it very easy to get a line-level python traceback of currently running threads. The output of that was similar to this:
```
Thread 9954 (idle): "MainThread"
    term (zmq/sugar/context.py:195)
    __del__ (zmq/sugar/context.py:74)
    random_function (mycodebase/mycode.py:83)
    ...
```
Curiously, the code would get stuck at random places in our code and there was no call to `__del__` of zmq/sugar/context.py in mycode.py. This happens because garbage collection (GC) is the one calling `__del__` method, and GC can happen at any step of the code. 

the `term` method of `zmq` Context class would go on to call `term` method in the libzmq library. So the stack trace proceeds further into the C part of the code which `py-spy` doesn't show.

`zmq` is a messaging library for communicating over transports like TCP, and it was being used by bert-client library to retrieve BERT embeddings in our code.

It just didn't make any sense why ZMQ Context termination would hang sometimes but be successful most of the time. Based on the documentation of py-zmq and zmq, one has to be careful in closing sockets and context once done. We were doing the same in a manner similar to the following:
```
from bert_client import BertClient
@retry_on_timeout
def get_embedding(sentence):
    with BertClient(IP) as bert_client:
        return bert_client.encode(sentence)
        
```

#### Not a multiprocessing problem
Python processes getting stuck happens a lot in multiprocessing environments in `fork` mode if you aren't careful what you're forking. For example, python threads and sockets aren't safe to fork. I had similar encounters in the past like initializing a boto3 session before forking leading to programs getting intermittently stuck.

I changed `fork` method to `spawn` method, which avoids pitfalls associated with `fork`, but the problem persisted. Replacing `BertClient` with `ConcurrentBertClient` didn't help.

Finally, I resorted to changing multiprocessing to a single process, confident that it must be a multiprocessing-related issue, but I was wrong. The problem persisted in the synchronous code.

#### GDB traceback

Since py-spy misses C stack trace, GDB comes to the rescue.

GDB can be used to debug a python program. To simplify life, you need to have python debug symbols present in the environment. We didn't have python3-dbg installed in the production environment.

Sometimes I had to manually link the debugging symbols, but most of the time a simple `apt install python3.7-dbg` did the trick and gdb traceback with python symbols was available.

GDB backtrace looked something similar to [this](https://github.com/zeromq/pyzmq/issues/1003)
```#0  0x00007ff5627ea84d in poll () from /lib/x86_64-linux-gnu/libc.so.6
#1  0x00007ff5599f90da in zmq::signaler_t::wait (this=this@entry=0x2a064c8, timeout_=timeout_@entry=-1) at src/signaler.cpp:218
#2  0x00007ff5599e4ed0 in zmq::mailbox_t::recv (this=this@entry=0x2a06468, cmd_=cmd_@entry=0x7ffc879dea40, timeout_=timeout_@entry=-1) at src/mailbox.cpp:80
#3  0x00007ff5599d65bc in zmq::ctx_t::terminate (this=0x2a063d0) at src/ctx.cpp:165
```

You can go up and down the frame and inspect the values of the registers. You can inspect the value of the python variables using `py-print` in the python frames. ([python gdb tool should be configured](https://devguide.python.org/advanced-tools/gdb/))

Even though it was a good learning experience, this activity didn't give much insight into things. It did help me learn a bit about the working of the garbage collector, which was connected to the problem.

#### Resolution
Around July this year, the failures started increasing. From 1 in 100 they went up to 1 in 5. That's when I decided to dedicate my complete effort to this.

After some digging, I was able to find similar issues reported
https://github.com/zeromq/libzmq/issues/2586
https://github.com/zeromq/pyzmq/issues/1003
https://github.com/zeromq/pyzmq/issues/1512

None matched the exact problem, but there were some hints which helped me understand the issue better. The final breakthrough came when I wrote a lot more logs, and ran the experiments again.


##### Cause
The root cause was that although the context manager used in the `get_embedding` method above closes the socket and context on exception, if the error is raised during `__init__` of `BertClient`, the sockets created in `__init__` wouldn't close.

I confirmed that there were exceptions raised in `BertClient` while checking the health of the remote server due to load. The remote server wouldn't respond in time and it would raise a timeout error. This is caught by `retry_on_timeout` decorator, which calls the method again. Retries ensured that the method succeeds and training continues.

However, sometimes at some indefinite point, the garbage collector cleans the older reference to socket and context (created before the exception) in a way unexpected by pyzmq. An assumption went wrong in `pyzmq`.

The code assumes that since `context` object holds a reference to `socket` objects, `socket.__del__` would be called first before `context.__del__`. But such an order is not guaranteed by the python garbage collector.

[Additional references were created due to the exception leading to the cyclic garbage collector getting invoked](https://docs.python.org/dev/reference/datamodel.html#object.__del__) which has non-deterministic order of cleanup. 

`context.__del__` then calls term() which hangs indefinitely waiting for the socket to close which doesn't since GC runs synchronously. 

#### Solution
This was solved temporarily in our code by catching the exception during `BertClient.__init__` and closing the zmq sockets.

With pyzmq==24 released in September, this is permanently solved (based on the code changes, although I haven't tested).