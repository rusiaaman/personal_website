---
author: "Aman Rusia"
date: 2022-12-08
title: Nasty bug due to python's garabage collection resolved after 2 years
---

### The system and the symptom
At Nanonets, we used to have intermittent failures for the longest time in one particular experiment during model training. The experiment was a job in a kubernetes cluster coded in python. The python process would just get stuck. No cpu usage. But this didn't happen everytime, the errors would happen for 1 in 100 or so, making it difficult to replicate.


### Initial investigation
The logs weren't helpful, but fortunately I could get exec into the pod and get a shell. Python processes getting stuck aren't that rare, specially in multiprocessing environment, which this was.

`py-spy` makes it very easy to get line level traceback of all the current running C-threads. The output of that was similar to this:
```
Thread 9954 (idle): "MainThread"
    term (zmq/sugar/context.py:195)
    __del__ (zmq/sugar/context.py:74)
    random_function (mycodebase/mycode.py:83)
    ...
```
Curiously, the code would get stuck at random places in our code and there was no call to __del__ of zmq/sugar/context.py in mycode.py. This happens because garabage collection (GC) is the one calling __del__ method, and GC can happen at any step of the code. 

the `term` method of `zmq` Context class would go on to call `term` method in the libzmq library. So the stack trace proceeds further in to the C part of the code which `py-spy` doesn't trace.

`zmq` is a messaging library for communicating over transports like TCP, and it was being used by bert-client library to retrieve BERT embeddings in our code.

It just didn't make any sense why ZMQ Context termination would hang sometimes but be successful most of the time. Based on the documentation of py-zmq and zmq, one has to be careful in closing sockets and context once done. We were doing the same in a manner similar to the following:
```
from bert_client import BertClient
@retry_on_timeout
def get_embedding(sentence):
    bert_client = BertClient(IP)
    output = bert_client.encode(sentence)
    bert_client.close()
    return output
```

#### Not a multiprocessing problem
Python processes getting stuck happens a lot in multiprocessing environment in `fork` mode if you aren't careful what you're forking. For example, python threads and sockets aren't safe to fork.

I thought it could be due the multiprocessing. I had similar encounters in the past like initialising boto3 session before forking leading to programs getting interimttently stuck.

But the problem persisted even after making it a single process.

Replacing `BertClient` with `ConcurrentBertClient` didn't help

#### GDB traceback

Since py-spy misses C stack trace, GDB comes to rescue.

GDB can be used to debug a python program. To simplify life, you need to have python debug symbols present in the environment. We didn't have python3-dbg installed in production environment.

Sometimes I had to manually link the debugging symbols, but most of the times a simple `apt install python3.7-dbg` did the trick and gdb traceback with python symbols were available.

GDB back trace looked something similar to [this](https://github.com/zeromq/pyzmq/issues/1003)
```#0  0x00007ff5627ea84d in poll () from /lib/x86_64-linux-gnu/libc.so.6
#1  0x00007ff5599f90da in zmq::signaler_t::wait (this=this@entry=0x2a064c8, timeout_=timeout_@entry=-1) at src/signaler.cpp:218
#2  0x00007ff5599e4ed0 in zmq::mailbox_t::recv (this=this@entry=0x2a06468, cmd_=cmd_@entry=0x7ffc879dea40, timeout_=timeout_@entry=-1) at src/mailbox.cpp:80
#3  0x00007ff5599d65bc in zmq::ctx_t::terminate (this=0x2a063d0) at src/ctx.cpp:165
```

You can go up and down the frame and print the address. You can values of the python variables using `py-print` in the python frames. ([python gdb tool should be configured](https://devguide.python.org/advanced-tools/gdb/))


#### Resolution
Around July this year, the failures started increasing. From 1 in 100 they went upto 1 in 5. That's when I decided to dedicate my complete effort on this.

