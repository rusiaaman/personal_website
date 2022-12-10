---
Author: Aman Rusia
Date: 2021-01-30
title: "Python beyond beginner stage"
---
**Tools and best practices to get you to the next level**
---

### Intro
So you’ve started using Python. You know all about the syntax, control flow and operators. You’re probably already familiar with special Python features like list and dict comprehension, lambda functions, inline if, for..in and so on. You’ve maybe also used classes and generators.

I’d like to share features, tools, libraries and good practices which you can include in your development flow to improve efficiency and make your code more robust.

### Debugging
Learning python debugger really pays off.

Simply insert `import pdb; pdb.set_trace()` where you want your program to pause and then you can type `!my_var` to see the variable and execute any statements like `!my_function(my_var)` You can step through the code by typing `s` (step).

Use ipdb as a a drop in replacement of pdb based on ipython for a more user friendly experience and multi-line code support.

If you want the code to pause for you when an error (exception) happens without inserting the set_trace breakpoint, change `python my_program.py` to `python -m pdb -c continue my_program.py` and you’ll get pdb prompt at the place of the first uncaught exception. You can step out of the call stack by using u if the exception wasn’t raised in your code.

If you’re using jupyter notebook you’re blessed with features inherited from ipython. If your cell raised an exception, create a new cell and type `%debug` to attach the debugger. Works on google-colab and vs code jupyter notebook extension too.

If you’re using vs code you can use debug feature of python plugin which is god sent for debugging multiprocessing and multithreading code — allowing you to inspect each process individually and giving you the freedom to create a breakpoint while the code is running.

If you’re using python’s command line console I suggest you use ipython with `%debug` magic function support as a replacement to python.

### Testing
Everybody usually test their own work. They at least run their program once and see if it gives the desired output.

With experience you might realise that checking your program with different input scenarios or environmental conditions is important to avoid bugs breaking your software later on.

You can do it manually but when your code becomes more complex or your manager wants the proof of the test cases passing, you’d want to look at automating and documenting the testing flow.

For starters, you can create a file named test_my_code.py alongside your my_code.py and create a function `test_my_func()` with assert statements, checking the output for various input cases.

You can call the function in the `__main__` block of test_my_code.py and run it through command line but it's better use `pytest` with its feature rich framework and run `pytest test_my_code.py` that calls all the functions in that file with test prefix. I've also used `unittest` in my major projects which is a python built-in library.

Once your code starts interacting with other expensive and complex components you’ll want to test your code components (like functions and classes) in isolation. For that you’ll need to temporarily remove other components and replace them with fixed output. This is called monkey-patching.

In `pytest` you can use monkeypatch and in unittest there is mock module.

The other use cases for these testing frameworks are:

- Checking all the test cases even if one fails. Counting the total number of errors.
- Comparing two dictionaries, nested lists, floats (taking precision into account), and some other object types which can’t be simply compared using `==`.
- Checking the arguments passed to a mock object and the number of times it was called along with the arguments for each call.
- Asserting that an exception should be raised in a code block.
- Running tests in parallel

### Development — use typing
Typing is specifying the ‘type’ of the data you expect your variable to contain. Although it doesn’t do affect the execution in Python it helps you in code development. Take for example:
```
def get_marks(name: str) -> float:
    return random.rand() * 100
```
It says the get_marks takes in a string (in variable name) and returns a float. How’s it useful again?

**Reason 1**: Suppose I’m not familiar with the `random` library and I want to use the function to check if Albert’s marks are equal to Mary’s marks. I might assume that the return type is an integer and use the `==` operator which is not safe to be used for float because of the precision involved.

**Reason 2**: Helps improve readability. The code reviewer will thank you. The people using your library will love you.

**Reason 3**: Type checkers. You can use libraries like mypy which uses type checking to determine whether certain operations are incompatible with the type of the object. For example, strings have `.tolower()` method but ints don’t. In large code bases it’s easier to run mypy than to run the program with all the test cases to figure out such a bug.

**Reason 4**: Runtime data validators.

Example 1: you are serving an application over web and want to automatically validate the type of the “post” data? Use type-hints with fastapi library. It returns appropriate status code back, generates schema and swagger documentation.

Example 2: the variables in a class can only take certain data types and you don’t want other datatypes to be passed to `__init__` ? Use pydantic to validate each value passed in its dataclass.

### Architecture — use dataclasses

> Python 5 will only have these [dataclasses], not ‘normal’ classes.
> - Oliver Russell

Although Oliver says this in a tongue-in-cheek manner, the usefulness of dataclasses can’t be overstated. Instead of initialising your variables in `__init__` you can do the following:
```
from dataclasses import dataclass
@dataclass
class Food:
    name: str
    carbs_percent: int
    fiber_percent: int
    
    @property
    def net_carbs(self):
        return self.carbs_percent + self.fiber_percent

Food("Apple", 40, fiber_percent=5).net_carbs
# returns 45
```

There are a couple of frameworks which implement data classes. Along with the built-in dataclass library there is `attrs` and `pydantic` each with their own flaws and benefits. I recommend pydantic with its data validation feature for external interface, and `dataclasses` for passing around internal data.

You can easily convert a dataclass to a dictionary using `dataclasses.as_dict` function which comes in handy for serialisation, and convert it back by either using dictionary unpacking `**my_dict` or third party tool like `dacite.from_dict` which supports dataclasses inside a dataclass. Each of the three libraries have equivalent functions for `as_dict` and `from_dict`.

One of the side-effects of using dataclasses is that it forces you to type hint the variables which is a very good coding practice in Python.

To specify the default value of the variables directly assign it in case the default value is immutable or use `dataclasses.field` to like following:
```
from dataclasses import field
@dataclass
class Food:
    name: str = ''
    subitems: list = field(default_factory=list)
```

If you directly assign subitems: `list = []` any changes you do to one instance like `Food().subitems.append(3)` will change the value for ALL instances of Food . That’s why that is not allowed and dataclasses will raise an Exception in the definition. However, it won’t detect whether the assigned value is mutable if it isn’t a default type (list, dict, etc.) so you need to be careful. For example, don’t do the following
```
# USE DEFAULT FACTORY INSTEAD OF THE FOLLOWING
@dataclass
class Animal:
    name: str = ''
@dataclass
class Store:
    animal: Animal = Animal("dog")
store1 = Store()
store1.animal.name = "cat"
store2 = Store()
print(store2.animal.name) # prints "cat"
```

Instead do `animal: Animal = field(default_factory=lambda: Animal("dog"))`

### Architecture — use named tuples
If you want to return multiple variables in python you usually do something like the following
```
def get_time_and_place() -> Tuple[datetime, str]:
    return datetime.now(), 'Combodia'
```
Note that when you return multiple variables the return type is a tuple. Tuple can be unpacked like the following
```
mytime, myplace = get_time_and_place()
```
When the number of returned values become numerous, it becomes harder to track whether myplace is in the 5th index of the tuple or the 6th. You’ll have to carefully read the docstring of the function to make sure you’re unpacking the return value in correct sequence. Typing the return value of the function becomes cumbersome, such as `-> Tuple[int, str, str, List[int]]` .

These problems can be solved by using either `typing.NamedTuple` or `collections.namedtuple` I recommend using `typing.NamedTuple` for its user friendly nature.
```
class TimeAndPlace(typing.NamedTuple):
    time: datetime
    place: str = 'Madagascar'
def get_time_and_place() -> TimeAndPlace:
    output = TimeAndPlace(datetime.now())
    return output
```
You now get a Tuple with names as the attributes with its indexing and unpacking features intact.
```
mytime, myplace = TimeAndPlace(dattetime.now())
TimeAndPlace(dattetime.now())[1] # returns Madagascar
```
You can use dataclasses here but you lose the properties of a tuple. You can’t index or unpack. You also lose immutability and so can’t be used as a key in a dictionary.

### Architecture — use Enums
```
from enum import Enum
class Label(Enum):
    dog='dog'
    cat='cat'
```
Enum is a data structure you use when you have distinct values for a particular variable. This solves a common problem where you use strings to store the class of the variable and then mistakenly use `label == 'cats'` when the value is cat and the statement evaluates as False.

Enum prevents this from happening by raising AttributeError if you write `label == Label.cats` . It also enables linters like pylint and mypy to detect the error.

If you use IDE like jupyter notebook or VS-code with Pylance you get auto complete to prevent you from writing Label.cats in the first place.

If you get the label string input from, say, a text file you can do data validation using Enum in the following manner
```
label_text: str = open("my_label.txt").read()
label = Label(label_text)
```
The above code raises ValueError if my_label.txt is cats instead of cat otherwise converts the string to the appropriate attribute.

`Label.cat.value` returns the “cat” string back which can be used to serialise and save.

If you use json.dumps with Enum in one of the values it will raise an Exception. There are solutions for it in this stackoverflow answer. The best way in my opinion is to use IntEnum which is also a subclass of pythonint so that you can directly use 0 == Label.cat instead of first converting your variable to Enum explicitly. The downside is you lose human readability on serialization.

### Architecture — use pathlib
The inbuilt pathlib implements an object-oriented approach of manipulating and validating file paths. Consider the following case:

Iterate through a directory and reading file
```
Using os

import os
for maybe_file in os.listdir(my_dir):
    if not os.path.isfile(maybe_file): continue
    with open(os.path.join(my_dir, file)) as f:
        print(f.read())
```
**Using pathlib**
```
from pathlib import Path
for file in Path(my_dir).iterdir():
     if not file.is_file(): continue
     with file.open() as f:
         print(f.read())
```
It’s a much cleaner approach. The key is Path object instantiated by passing a string like ./ which is an object representing the path. The object has methods and properties like is_file() , exists() , name , glob('*.jpeg')

The biggest eye-catcher is the way a path is constructed using the / operator. Consider:
```
>>> os.path.join(new_dir, os.path.basename(file))
/home/ubuntu/project/x.jpeg
```
vs
```
>>> new_dir / file.name
Path(/home/ubuntu/project/x.jpeg)
```

### Linting
A linter helps you detect many types of errors without running the program. Sometimes there are some type of errors that your test cases will miss but linter might catch. If you use any IDE like VS Code you can get the errors pinpointed with each save of the code.

For example, you can know if you’ve misspelled a variable or a function name, if you’re using a class attribute which doesn’t exist, if you’re passing more arguments than the function expects or you’re passing an argument more than once. If you’ve type annotated, linters will catch all kind of type incompatibilities.

It also creates warning if there are code smells like catching general Exception or unused variable in a code. It also suggests you to do refactoring and other best practices recommended in PEP and other places.

I recommend using pylint and mypy simultaneously which can be done in VS code by setting the following flags in VS code settings (JSON)
```
"python.linting.mypyEnabled": true,
"python.linting.pylintEnabled": true,
```
You can use pylint as a step before running the tests in your automated build pipeline by checking for failure. You can check exit code returned by the command to see the level of error (fatal/error/warning…) https://pypi.org/project/pylint-exit/

### Readability — styling and formatting
Great libraries have docstrings for each function, class, class methods and module. I recommend google-style docstrings https://sphinxcontrib-napoleon.readthedocs.io/en/latest/example_google.html
Code layout based on PEP8 https://pep8.org/
Use a combination of manual formatting and auto-formatter like yapf or autopep8 (there are others you may try).
Conclusion
Using tools like pdb, vs code python extension and ipython magic commands will reduce the pain of debugging.
Include in your code design: type hints, dataclasses, enum, pathlib and namedtuples. These will make your code more scalable, readable, and easy to use and extend.
Testing frameworks like pytest and unittest will help you write tests programmatically.
Linter like mypy, pylint and pylance (vs code) improve code quality.
Follow code style guide PEP8 and docstring guides to improve readability and documentation.


###### This article was originally published on medium on 30 Jan 2021 at https://medium.com/towards-data-science/python-beyond-beginner-stage-good-practices-and-tools-75ddd55b445d
