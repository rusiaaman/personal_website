---
Author: Aman Rusia
Date: 2025-04-13
title: "How Claude avoids JSON accuracy issue in tool calling"
---


There's [an article](https://aider.chat/2024/08/14/code-in-json.html) from Aider that demonstrates reduced accuracy of code generation in LLMs when using tool calls.

In essence, their exercise demonstrates that asking an LLM to return JSON reduces the accuracy of code generation.

### Reduced accuracy

````
{
    "file_path": "package.json",
    "content": "{\"name\": \"test\"}"
}
````
### Better
````
```
// package.json
{"name": "test"}
```
````

The primary hypothesis is that since per-token computation is limited, a part of the computation is instead directed toward getting proper escaping.

# How claude avoids JSON escaping


In the [published tool system prompt](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview), here are instructions on tool calling:

```
In this environment you have access to a set of tools you can use to answer the user's question.
{{ FORMATTING INSTRUCTIONS }}
String and scalar parameters should be specified as is, while lists and objects should use JSON format. Note that spaces for string values are not stripped. The output is not expected to be valid XML and is parsed with regular expressions.
Here are the functions available in JSONSchema format:
{{ TOOL DEFINITIONS IN JSON SCHEMA }}
{{ USER SYSTEM PROMPT }}
{{ TOOL CONFIGURATION }}
```

So when the file system MCP writes code, the LLM doesn't have to escape the string. It's instructed not to escape scalar values.


---
I also asked Claude desktop app to print its tool calling schema (used for MCPs). It looks like the following
```xml
<antml:function_calls >
<antml:invoke name="$FUNCTION_NAME">
<antml:parameter name="$PARAMETER_NAME">$PARAMETER_VALUE</antml:parameter>
...
</antml:invoke>
<antml:invoke name="$FUNCTION_NAME2">
...
</antml:invoke>
</antml:function_calls>
```

I'm pretty sure this isn't hallucinated because it has consistently printed the same structure for some months (except the "antml:" prefix which wasn't there the last time I tried).

This gives us an understanding of how Claude actually does tool calling.

---
I believe Aider didn't use Anthropic's tool calling (likely because it wasn't available at that time?) while assessing Sonnet's performance on tool calling file edit. Otherwise, they likely wouldn't have found much difference from plain format.

### The following should still work as well as plain format
```xml
<antml:function_calls >
<antml:invoke name="write_file">
<antml:parameter name="file_path">package.json</antml:parameter>
<antml:parameter name="file_content">
{"name": "test"}
</antml:parameter>
</antml:invoke>
</antml:function_calls>

```

---

# Roo code and Cline

In both Roo code and Cline MCP calls, the LLM has to provide JSON-encoded parameters.

Although I haven't directly tested the accuracy difference, it's reasonable to believe that they both should have accuracy issues with MCPs writing code or files.


# Conclusions
While designing MCPs, you should avoid using objects and arrays as much as possible. Instead, use scalars like strings which don't need escaping.

While designing clients that do tool calls, ensure you avoid asking LLMs for JSONs.


PS: I followed the same approach as Claude in this file-based AI chat interface https://github.com/rusiaaman/chat.md