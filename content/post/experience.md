---
Author: Aman Rusia
Date: 2022-12-09
title: "Takeaways after working on 100 customer models"
---

Here are some takeaways from my experience at Nanonets, where I worked on a lot of customer models to improve their accuracy. Although these models were in the document understanding domain, I believe they generalize to other ML problems.

### 1. What you don't measure doesn't get optimized. 
This is the number 1 rule to make a model that makes customers happy. Often as ML Engineers, we resort to using proxy metrics for optimization. After a lot of effort, you would end up with a model that doesn't meet the customer's expectations as well as you'd hoped.

This rule is so simple but so easy to miss. It's so easy to miss because in ML most of the time we HAVE to transform the problem into another easy-to-optimize version of it. The mistake is to measure the metric for the newly transformed problem instead of the original problem.

For example, if you're doing speech-to-text, it's easy to keep tracking CER (Character Error Rate), the most common metric used in literature, when the downstream application cares about the detection of only some specific words. Although the two metrics are highly correlated, the subtle difference can cause a big change in the way you prioritize the available actions. So, you might not prioritize the language model for improving the critical word detection rate.

The downside of measuring only the main metric is that incremental improvements may not manifest, that's why it's always helpful to track multiple metrics instead of a single one. 

### 2. Simpson's paradox - is your model really good?
Don't rejoice about getting better accuracy than your competitor, for reality can strike you down in unforeseen ways. [Simpson's paradox](https://en.wikipedia.org/wiki/Simpson%27s_paradox) is one of them. 

You got a better f1-score on your large test dataset which you took every precaution to ensure doesn't have any leakage with the train and validation dataset. You can be confident your customers are going to find you better too, right?

Wrong. If you're solving a generic problem like invoice extraction, your model may be performing worse in most of the industries - retail, travel, commercial, etc., but could still have aggregate statistics in your favor. This can be due to the Simpson's paradox coming into play due to hidden biases in the way data was collected. 

You may be matching the data to historical records of your customers, or you may not have ensured realistic representations of all languages, or you may have knowingly or unknowingly under-represented some data sources. 

All of these are confounding variables. Such confounding variables will practically be always there because it's not easy to have an unbiased random sampling of the consumers and their use cases. 

One of the solutions is to discover all such confounding variables and eliminate any biases in the data.

### 3. Decompose the ML problem
Decomposing a problem is a well-known general tactic in life. But it's mathematically backed to have decomposed problems in machine learning for better performance.

Increasing the number of features leads to a higher variance model and more overfitting. Decompose the ML problem into multiple sub-problems so that each of the sub-problem has less number of features, more informative targets, and the possibility to include human biases into the architecture. In short, decompose the problem to make the sub-problems less complex. 

#### Example
You are building a document image classifier for distinguishing purchase orders from invoices. A document is an image of text. You could build a CNN that takes an image and gives out the desired class probabilities but it won't work great. For such a model to work it'll have to learn the characters, how they associate to form words, and what the words mean.

Learning all these correlations internally from just the final labels for a single CNN model would mean learning complex structures that aren't encoded in the architecture -- it'll require a lot of data to find those structures and the model will have to be big and deep. This is akin to the difference between the performance of CNN and ANN in image classification where the latter requires a lot more data to learn the invariances.

We improve the accuracy a lot by decomposing the problems into sub-problems, each of which requires lesser data. We can also induce architecture biases to further improve the generalization. We can reduce the problem into word detection, word recognition, text understanding, layout understanding and then the final classification.  

Each of the sub-problems can have architecture biases induced -- for example in word detection from images, we can have CNN-based localization; in word recognition, we can have an RNN-based model; for text understanding, BERT type models work the best; and so on.

#### Be careful in preserving the information
Decomposing the problem is like including human rules on how to form associations. As with rule-based models, decomposing the ML problem may have problems related to edge cases and wrong assumptions. Once upon a time, NLP was about cleaning the text to reduce the features -- lemmatization, stemming, removing stop words, and so on. 

Then the pre-training revolution came along and obviated the need to do any of these cleanups. Well, not completely, since sub-word tokenization is still in use to reduce the input dimensionality. 

It was understood that the text cleanup could remove some crucial information. "Yes?" and "Yes." have completely different sentiments which punctuation removal doesn't take care of. When you simplify the problem or decompose it, make sure that information is preserved as much as possible. 


### 4. Counter-intuitively, data size may become inversely correlated to accuracy.
At Nanonets, I observed that annotated data size would show an inverse trend to the accuracy. One should be aware of all such possible effects. My hypotheses for why this happened:
1. Problem complexity is correlated to both variables. More complex the problem, the worse the accuracy. The worse the accuracy, more the images people add. For the individual problem, accuracy likely improves with more data, but it remains lower than the other easier problems.
2. Annotations quality controls become challenging with larger data. Reviewing, and re-working on larger data takes more time. Due to tight timelines, pressure is high to deliver and the quality suffers. 
3. Making incremental changes take a longer time. In many cases, accuracy can be improved by re-designing the annotations. Maybe add more classes or remove extra annotations or combine the classes, etc. Doing this on larger data is more challenging.

While the first point is just a spurious correlation. The other two points are challenges to address.

### 5. Data augmentation works, but there should be enough real-life examples. Purely synthetic data doesn't work. 
Training on purely synthetic data leads to overfitting in ways we can't foresee. Large NNs find spurious correlations faster than a hungry hound finds a piece of meat. Whereas, if you have a healthy amount of real-life examples in the mix, the spurious correlations become increasingly non-linear and difficult to model.

For example, if you only use examples generated from a CFG for text classification, a Bert-based model would learn your template and the labeling rules. A slight meaningless change in the template would lead to drastic failure. However, such strong sensitivity reduces a lot if you've even a dozen of real-life examples for each template rule related to it.

### 6. It's hard to make pre-processing generalize, try to incorporate the invariance through large-scale training.
You may think you've mastered open-cv and now you can pre-process the images to reduce all the noise in the image and reduce the dimensionality through some clever algorithm, but the corner cases can bite you in several different ways. If you can afford to collect a large amount of data and computation, unsupervised training can learn a more generaliZed "pre-processing" and "dimensionality reduction"  

### 7. Complexity of the problem can be understood by getting human accuracy.
On problem A you got 90% accuracy. On problem B, even with the best of efforts, you get 70% accuracy. How do you convince the management? What to do when the management requires you to show a single number showing the accuracy of your product across different datasets? A better way than to just average the accuracies is to normalize the accuracy first with human performance (1 vs the rest or inter-annotator agreement). Human performance is correlated with the complexity of the problem.

### 8. Make pre-training closer to the final problem.
Unsupervised large-scale pre-training is good, but what's better is pre-training that is closer to the final use case. A large-scale multi-task pretraining may give you much better results (leveraging the correlation between the tasks). 

### 9. Be aware of the balance between computational time and dependency between the output variables. 
In the case of multiple output variables, e.g. NER, translation, question answering, etc. One could improve the accuracy and make the errors more human-like by including the dependency between output variables (structured machine learning). In NER linear-chain CRF can help you with this by conditioning the output at each step on its neighboring output. This reduces the problem of jagged spans. 

In translation, sequence-to-sequence models naturally model each decoder step output on all the previous step outputs. As opposed to linear-chain CRF, which is fast, this auto-regressive decoding is expensive even without beam search, because it can't be parallelized over the decoder sequence length. Even in NER, you'll eventually feel it might be better to include further dependency between the output variables than just the immediate neighbors (building the full Markov graph), which starts to become more computationally intensive with each added edge.

Researchers have investigated parallel auto-regressive decoding for translation systems with some success, but it continues to be an active area of research. 

So if you plan to change your encoder-only architecture to encoder-decoder architecture, or you plan to add graph CRF, beware of the tradeoff between accuracy and computational time. 

### 10. All the generally known rules are true
- Make sure your model overfits on small data first before training on the full data
- Simple is better than complex. Complex is better than complicated
- Incorporate domain knowledge to get to the next level, find out invariances using domain knowledge, and try to incorporate it at the feature or architecture level.
- Continue the pretraining on your domain data.
- Be blind to the method and process of obtaining test data. It's easy to convince yourself that the test data is pure.
- Don't use test data as validation data. Even looking at the model predictions on the test data should be forbidden.