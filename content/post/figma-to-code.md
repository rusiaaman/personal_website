---
Author: Aman Rusia
Date: 2021-01-30
title: "What's so hard about generating code from Figma? A case of minimising description length."
---

Talk to any front-end developer and they’d tell you about the disappointment with all the tools out there for getting CSS or HTML from Figma designs. Design to code is not a solved problem, but has anything changed recently?

Something has changed and it’s about programmatically encoding human choices. But first, what’s so hard about getting _usable_ code from Figma.

## The complexity

Take the following simple card design:

![Simple card 3 elements](/images/post-f2d/asana1.png)

A modern developer would create this using a flex div at top with `justify-content: space-between` so that the left div and the rightmost info icon spread out in the container.

![Simple card 3 elements](/images/post-f2d/asana2.png)

The complexity of the problem is that exact look can be created using just margins. A fixed left-margin before all three elements can give you the exact pixel replication, no grouping needed.

There lies the problem. There are multiple CSS possible for the same design. However, surprisingly, Occam's razor (minimum description length) can predict what CSS and HTML humans prefer.

In the flex based design, you avoid the left-margin property on the info-icon (the rightmost icon) that’s present in the margin-only design. The left-margin property is an integer that has no mutual information with other parts of the design. On the contrary, the flex design’s `justify-content: space-between` is much more ordered and simple.

The left-margin property has added specific unnecessary information that a human can’t make sense of as easily as the flex based layout.

The reason why Occam’s razor works here is because it prefers CSS and HTML that has less assumptions, so that if any specification changes, there’s minimal impact. It’d prefer responsive designs, adding or removing elements without everything breaking, grouping that can be changed with minimal effort, elements changing their sizes and so on.

### More on minimum description length

The similar behavior is observed in the other parts of code generation. Component identification is a critical part of website building.

![Simple card 3 elements](/images/post-f2d/repeated.png)

How do you minimize the complexity of the encoding for the above design (run the Occam’s razor)? You observe that the 2-element div structure is repeated. So you don’t need to specify the div structure every-time! You can run a loop, say in JSX to generate the above code. That’s what a developer does.

### The last part of the complexity, don’t run Gzip yet

Minimum description length is a good metric for getting understandable code, but we can’t take this too far. Taking it to the extreme, we should then run Gzip on our code! But gzip output is not useful to iterate upon.

Developers don’t want components named “x” and “y” because they can’t easily form a mental model for them as opposed to more informative names like “Input” and “Select”.

That’s the last piece of the puzzle. We want to generate code that a developer can read without taking much of their mental space and fully form the image of the design just by reading it!

I like to call this idea human biased minimum description length.

## Will this be solved soon?

Has anything changed recently for you to update your estimate on this problem being solved?

I don’t know if the problem could be solved but something has changed so that at least the software can now be usable rather than being a complete waste of developers’ time. That change is the advent of LLMs (Large Language Models).

The idea of minimizing human biased minimum description length for generating CSS and HTML could not be solved without encoding human knowledge in the software. This is where LLMs come.

We can utilize special LLMs that can understand Figma designs to do layout detection, component detection, CSS property generation, code and comment generation which take minimal head space in a developers mind. All because LLMs can mimic human mental model of software programs so well.

So yes, Figma to Code will become usable very soon. That’s why I joined Kombai to build such a software. [Here’s the Product Hunt launch of our research preview if you want to know more](https://kombai.com/launch).
