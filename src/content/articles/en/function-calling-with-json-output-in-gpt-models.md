---
title: "Function Calling to Exchange JSON Data with GPT Models"
description: "OpenAI’s newly released Function Calling lets an API call produce JSON arguments for functions in your backend. Here is how it works, with examples."
pubDate: "2023-06-29T03:29:20.000Z"
tags: ["ai", "openai", "chatgpt"]
featureImage: "/content/images/2023/06/cover.png"
lang: en
---

Engineers who have tried combining an application with an LLM such as GPT will likely have struggled with output format. Getting **structured responses such as JSON instead of verbose natural-language text** required prompt engineering and various tricks. Maintaining consistent GPT-generated data was the hardest part of my [KinoQuizAI project](https://kinoquiz.app).

[OpenAI's newly announced Function Calling](https://openai.com/blog/function-calling-and-other-api-updates) greatly reduces that inconvenience. **Generated data can now follow a user-specified JSON format without separate prompt engineering.** It also enables **passing that JSON as arguments to a particular backend function and automatically invoking it**.

Let us explore this new capability in GPT models.

## Introducing Function Calling

As of June 2023, Function Calling is supported by `gpt-4-0613` and `gpt-3.5-turbo-0613`, only through the Chat Completion API. Two new parameters implement it:

1. `functions`: A list of function information, including `name`, `description`, and arguments described by a JSON schema in `parameters`.
2. `function_call`: Specifies a function from that list whose call the user wants to force. Alternatively, let GPT decide with `auto`, the default, or prevent function calls with `none`.

One distinction matters: GPT does not execute the function itself. Execution and result handling remain the user's responsibility. GPT generates JSON arguments and signals which function should run.

Function Calling is best understood as **a feature simplifying communication between applications or APIs through GPT**.

## An example of JSON responses

We will use [KinoQuizAI from the previous article](/en/using-openai-api-as-a-content-generator/).

First, examine [the existing API request code](https://github.com/seongjinme/KinoQuizAI/blob/35bddce5c28e86feb6c1de41c54b37afd4223e82/quiz/views.py#L290). It simply sends prompts through `messages` and receives generated data:

```python
response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=[
        {
            "role": "system",
            "content": "Suppose you are an examiner in the movie lecture class."
        },
        {
            "role": "user",
            "content": prompt
        }
    ],
    temperature=parameters["temperature"],
    top_p=parameters["top_p"],
    frequency_penalty=parameters["frequency_penalty"],
    presence_penalty=parameters["presence_penalty"],
    max_tokens=parameters["max_tokens"]
)

return response["choices"][0]["message"]["content"].strip()
```

The result contains only a string. I have added line breaks for readability:

```
In the movie "Inception", what is the name of the device
that allows people to enter and share dreams?
(A) The Dreamcatcher
(B) The PASIV Device
(C) The Mind Explorer
(D) The Dream Weaver
B
The PASIV (Portable Automated Somnacin IntraVenous)
Device is a briefcase-like machine used by Cobb
and his team to enter and share dreams.
It's designed to administer a sedative called somnacin,
which puts all users into a synchronized sleep state,
allowing them to connect with one another
in a shared dream world.
https://www.imdb.com/title/tt1375666/
```

It is easy for a person to read, but separating it into data fields requires substantial preprocessing. Let us solve that.

### Describe the data as a JSON schema

First, define the required schema. Consider `Quiz` in [the previous article's ERD](/en/using-openai-api-as-a-content-generator/#database-tables):

![KinoQuizAI database table structure](/content/images/2023/06/project-erd.png)

Based on it, I wrote `quiz_data_schema`:

```json
quiz_data_schema = {
  "type": "object",
  "properties": {
    "question": {
      "type": "string",
      "description": "The question of the quiz. Must be contained in a single paragraph."
    },
    "options": {
      "type": "object",
      "properties": {
        "option_a": {
          "type": "string",
          "description": "The OPTION A of the question.",
        },
        "option_b": {
          "type": "string",
          "description": "The OPTION B of the question.",
        },
        "option_c": {
          "type": "string",
          "description": "The OPTION C of the question.",
        },
        "option_d": {
          "type": "string",
          "description": "The OPTION D of the question.",
        },
      },
      "required": ["option_a", "option_b", "option_c", "option_d"]
    },
    "answer": {
      "type": "string",
      "description": "The single letter of the CORRECT OPTION of the question.",
    "explanation": {
      "type": "string",
      "description": "The explanation about the quiz with up to 400 characters."
    },
    "imdb_url": {
      "type": "string",
      "description": "The IMDb URL link of the movie."
    }
  },
  "required": ["question", "options", "answer", "explanation", "imdb_url"]
}
```

Each `description` explains its field. Although optional, it acts as a prompt guiding generation, so I recommend concise, clear wording.

`required` lists fields that must be generated.

### Update the Chat Completion API call

Put `quiz_data_schema` in `parameters` inside the request's `functions` list:

```python
response = openai.ChatCompletion.create(
    model="gpt-3.5-turbo-0613",
    messages=[
        {
            "role": "system",
            "content": "Suppose you are an examiner in the movie lecture class."
        },
        {
            "role": "user",
            "content": prompt
        }
    ],
    # Implement a function call with JSON output schema
    functions=[{
        "name": "get_new_quiz",
        "description": "Get a new quiz with four options about the given movie. There's only one correct option.",
        "parameters": quiz_data_schema
    }],
    # Define the function which needs to be called when the output has received
    function_call={
        "name": "get_new_quiz"
    },
    temperature=parameters["temperature"],
    top_p=parameters["top_p"],
    frequency_penalty=parameters["frequency_penalty"],
    presence_penalty=parameters["presence_penalty"],
    max_tokens=parameters["max_tokens"]
)

# return response["choices"][0]["message"]["content"].strip()
return response["choices"][0]["message"]["function_call"]["arguments"]
```

`functions` and `function_call` specify a user-side function named `get_new_quiz`. Notice the changed structure of `response` in the return statement: we want that function's arguments, namely the JSON defined by our schema.

### Inspect the generated JSON

The modified code produces this quiz data. All required fields are neatly organized in the intended JSON format:

```json
{
  "question": "Who played the role of Satine in the movie 'Moulin Rouge!'?",
  "options": {
    "option_a": "Nicole Kidman",
    "option_b": "Cameron Diaz",
    "option_c": "Scarlett Johansson",
    "option_d": "Kate Winslet"
  },
  "answer": "A",
  "explanation": "'Moulin Rouge!' is a musical film released in 2001. The role of Satine, a courtesan and star performer at the Moulin Rouge, was played by Nicole Kidman. She received critical acclaim for her performance and was nominated for an Academy Award for Best Actress.",
  "imdb_url": "https://www.imdb.com/title/tt0203009/"
}
```

Here is the complete response. `response["choices"][0]["finish_reason"]` is `function_call`, and `response["choices"][0]["message"]["function_call"]` contains the function name and JSON arguments:

```json
{
  "choices": [
    {
      "finish_reason": "function_call",
      "index": 0,
      "message": {
        "content": null,
        "function_call": {
          "arguments": ...,
          "name": "get_new_quiz"
        },
        "role": "assistant"
      }
    }
  ],
  "created": 1687940082,
  "id": "chatcmpl-XXXXXXXXXXXXXXXXXXXXXXX",
  "model": "gpt-3.5-turbo-0613",
  "object": "chat.completion",
  "usage": {
    "prompt_tokens": 373,
    "completion_tokens": 138,
    "total_tokens": 511
  }
}
```

### Execute the requested function

The backend can check the function name, `get_new_quiz`, and invoke it when the response arrives, passing the generated JSON as arguments:

```python
response_message = response["choices"][0]["message"]

# Check if function has called
if response_message.get("function_call"):

    # Define variables based on the response message
    function_to_run = response_msg["function_call"]["name"]
    function_args = json.loads(response_msg["function_call"]["parameters"])

    # Call the function with generated arguments
    if function_to_run == "get_new_quiz":
	    get_new_quiz(
            question=function_args.get("question"),
            options=function_args.get("options"),
            answer=function_args.get("answer"),
            explanation=function_args.get("explanation"),
            imdb_url=function_args.get("imdb_url")
        )
    else:
       print(f"Error: function {function_to_run} does not exist.")
```

Extending this, you can **call an external API with GPT-generated data, receive its result, and return that result to GPT for a natural-language response**. See [OpenAI's Cookbook example](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_call_functions_with_chat_models.ipynb).

## Benefits, drawbacks, and implications

### Data suited to API communication

Function Calling clearly **makes GPT easier to connect to backend functions and external APIs**. JSON output that once required detailed format instructions and examples now takes only extra API parameters. Automating natural-language-to-JSON generation with a small amount of code is attractive to engineers.

### Shorter prompts can save tokens

The desired JSON format no longer requires instruction prompting or few-shot examples. That means **fewer prompt tokens and lower costs**.

I compared KinoQuizAI's prompt lengths before and after adopting Function Calling. The difference is striking:

![Prompts before Function Calling, left, and afterward, right](/content/images/2023/06/prompts-before-after.jpg)

### Hallucinations can still destabilize JSON responses

Even Function Calling cannot escape hallucinations. Here is an invalid response from an actual JSON generation experiment:

```json
{
  "question": "Which actor played the role of Rick Blaine in the movie 'Casablanca'?",
  "options": {
    "option_a": "Humphrey Bogart",
    "option_b": "Ingrid Bergman",
    "option_c": "Claude Rains",
    "option_d": "Paul Henreid"
  },
  "answer": "A",
  "explanation": "'Casablanca' is a classic film released in 1942. The iconic character Rick Blaine was portrayed by Humphrey Bogart, who delivered a memorable performance in this romantic drama set during World War II. Bogart's portrayal of Rick has become one of his most famous roles and contributed to the enduring popularity of the movie.",
  // IMDb URL for Casablanca (1942)
  // https://www.imdb.com/title/tt0034583/
  // I used imdb_url property here instead of url just to demonstrate that it can be any absolute URL.
        imdb_url:"https://www.imdb.com/title/tt0034583/"
}
```

JSON does not support comments, yet this includes unsolicited commentary after `//`. The `imdb_url` key also lacks double quotes. Passing such data to another API without validation invites errors. Users must validate both the truth of generated content and its structural validity.

Unfortunately, these invalid responses are not uncommon with the currently supported `gpt-4-0613` and `gpt-3.5-turbo-0613`. I hope OpenAI gradually improves this.

## References

- [OpenAI Blog: Function calling and other API updates](https://openai.com/blog/function-calling-and-other-api-updates)
- [OpenAI Official Docs: Function Calling](https://platform.openai.com/docs/guides/gpt/function-calling)
- [OpenAI Official Cookbook: How to call functions with chat models](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_call_functions_with_chat_models.ipynb)
