---
title: "Prompt Engineering for Better Results from ChatGPT and Other Conversational AI Services"
description: "An introduction to prompt engineering: why it matters, practical examples, and tips for improving the quality of conversational AI output."
pubDate: "2023-02-12T13:52:57.000Z"
tags: ["ai", "chatgpt", "prompt"]
lang: en
---

The era of conversational AI has begun in earnest. ChatGPT's release signaled its arrival. [The trial version, released only a couple of months ago, already has more than one hundred million monthly users.](https://www.theguardian.com/technology/2023/feb/02/chatgpt-100-million-users-open-ai-fastest-growing-app) Social media is full of people amazed by its witty answers; news reports marvel at its potential after it passed various certification exams with little difficulty.

AI services may soon become part of everyday life. On February 6, Google [introduced Bard, an AI-based information service](https://blog.google/technology/ai/bard-google-ai-search-updates/). The next day, Microsoft [announced ChatGPT-based AI for Bing and Edge](https://blogs.microsoft.com/blog/2023/02/07/reinventing-search-with-a-new-ai-powered-microsoft-bing-and-edge-your-copilot-for-the-web/). Its demonstration opened Gap's quarterly report PDF in Edge and [produced a text summary through a simple chat request](https://youtu.be/rOeRWRJ16yY?t=2100). It was startling.

![Microsoft Edge Copilot summarizing a PDF report live. Source: Bing's official YouTube channel.](/content/images/2023/02/ms-edge-copilot.jpg)

Conversational AI will change how we handle information. Until now, effective information use depended largely on searching quickly for the information we needed. Increasingly, what matters will be interacting with AI to obtain the answer we need, in the form we want. **It is time to move beyond casual impressions of conversational AI and discuss the skills needed to use it well.**

This article briefly introduces **prompt engineering** for improving AI-generated output. We will define prompts and explain why engineering them matters, examine experiments with ChatGPT, and discuss practical writing techniques.

## What is a prompt?

In generative AI, **a prompt is the input used to generate a response from a large language model (LLM)**.

![The relationship between prompts, large language models, and generated output. Image source: co:here.](/content/images/2023/02/prompt-to-generate.jpg)

A **large language model** is **a type of deep learning algorithm trained on vast datasets to recognize, transform, process, or generate text, images, or video**. ChatGPT is a conversational service that makes one such model, GPT-3.5, available through chat.

Services like ChatGPT are designed for natural-language interaction, resembling conversation with a person. **Their prompts therefore also take the form of natural language.** Everyday instructions such as `Write a New Year's greeting for an email`, or simple questions such as `Who first developed email?`, are working prompts in this environment.

## What is prompt engineering?

We have long used techniques to improve search results on Google or Naver, including advanced search features and combinations of operators.

Generative AI also needs techniques for obtaining the desired result more easily. Finding prompts that help AI perform better is **prompt engineering: finding combinations of input that produce high-quality responses from an LLM**.

### Why is it necessary?

Small wording changes can dramatically alter output. Compare:

- `Tell me who invented the email.`
- `Tell me about the person invented the email.`

Their meanings are nearly identical, yet ChatGPT produces different results:

![Result for "Tell me who invented the email."](/content/images/2023/02/chatgpt-email-01.png)

![Result for "Tell me about the person invented the email."](/content/images/2023/02/chatgpt-email-02.png)

Replacing `who` with `about the person` changes both quantity and quality. A short answer becomes an essay with richer context. **Higher-quality responses require structured prompts in clear language the model can understand well.**

Suitable prompts vary with the underlying model. Techniques approaching prompt hacking, fully optimized to extract a particular answer from one model, are beyond this article's scope. For **ordinary users without detailed technical understanding, prompt engineering inevitably involves repeated experimentation**.

What can an ordinary user try? Here is a practical ChatGPT experiment.

## A prompt engineering experiment with ChatGPT

Let us ask for a movie quiz with `Create a movie quiz.`

![Result for "Create a movie quiz."](/content/images/2023/02/chatgpt-prompt-engineering-01.png)

It seems to have done the job, but there is room for improvement:

- I requested one question and got ten. I want the specified number.
- Multiple-choice questions would be more entertaining than short answers.
- Answers and explanations would help verify accuracy.
- A hint about the topic, such as title, actor, or director, would help.
- Ambiguous questions with multiple correct answers, like questions 6 and 9, should be avoided.
- Questions should concern movies listed on IMDb.
- Each request should produce different movies and topics.

Let us keep revising the prompt and observe how those improvements affect the output.

### First revision

```
Create one quiz with 4 options. Follow the instructions below.

- The quiz must be about the movie currently exists in IMDb.
- There must be only 1 correct answer.
```

First, I required **movies that actually exist on IMDb**. ChatGPT predicts what follows a prompt, so it may plausibly invent movie information. I wanted to reduce that risk.

I also defined **the quiz format**: one question with four options, exactly one correct. Adding just a few conditions incorporated most improvements at once:

![Output from the first revised prompt](/content/images/2023/02/chatgpt-prompt-engineering-02.png)

One problem remained. Repeating the same prompt in a session often produced answers resembling the first one. Movie questions kept returning to similar topics from the same film. I suspected limited training data and resulting bias.

I opened a new session and revised the prompt again.

### Second revision

```
Create one quiz with 4 options. Follow the instructions below.

- The quiz must be about the movie currently exists in IMDb.
- The quiz must have a subject. Subject should be one of these: [Title, Director, Top Cast, Actor, Actress, Release Year, Storyline, Awards, Rates, Quotes, Soundtracks, Trivia].
- Do not choose the same subject twice or more.
- Do not choose the same movie twice or more.
- There must be only 1 correct answer.
```

![Output from the second revised prompt](/content/images/2023/02/chatgpt-prompt-engineering-03.png)

This time, I specified **a range of topics** and **restricted repeated use of the same movie or subject**. Questions became more varied, making repeated requests more entertaining.

Next, I wanted detailed explanations and a way to find more information about each film. How could I add those?

### Third revision

```
Create one quiz with 4 options. Follow the instructions below.

- The quiz must be about the movie currently exists in IMDb.
- The quiz must have a subject. Subject should be one of these: [Title, Director, Top Cast, Actor, Actress, Release Year, Storyline, Awards, Rates, Quotes, Soundtracks, Trivia].
- Do not choose the same subject twice or more.
- Do not choose the same movie twice or more.
- There must be only 1 correct answer.
- Print only these infomation: [Subject, Question, Options, Answer, Explanation, IMDb URL(as "More Info")]
- Do not print the movie title under the subject.
```

I added **a consistent output format** and **an IMDb link** labeled `More Info` on the final line. I also guarded against ChatGPT revealing the answer by printing the movie title unnecessarily.

![Output from the third revised prompt](/content/images/2023/02/chatgpt-prompt-engineering-04.png)

As intended, an explanation appeared beneath the answer, along with an automatically generated IMDb link. **More detailed prompts produced more refined, precise output.**

## Tips for writing prompts

Good results from another person require good instructions. Excessively abstract, verbose, or rambling requests only exhaust both sides.

**Specify the task, provide the context needed to understand it, and clearly define the desired result.** This reduces communication costs and helps produce what you want. The same applies to generative AI.

1. Use simple, concise language.
2. Prefer closed instructions to open questions.
3. Specify task conditions concretely.
4. Supply context.
5. Include examples of the desired format.
6. Experiment thoroughly.

### 1. Use simple, concise language

Compare:

- `If you don't mind, could you explain what the James Webb Space Telescope is, simply enough for a child who has only just turned nine to understand?`
- `Explain the James Webb Space Telescope to a nine-year-old.`

Both request exactly the same thing. The second, without unnecessary flourishes, is more likely to produce the desired answer. Small input differences can have large effects. Keep language simple and concise.

### 2. Prefer closed instructions to open questions

A prompt influences response format. For a particular task and structure, prefer a bounded instruction. `Write an essay on whether robots can replace doctors` is more likely to produce an organized response than `Can robots replace doctors?`.

### 3. Specify task conditions concretely

Suppose you ask ChatGPT to write energy drink copy:

- `Write some messages for an energy drink`
- `Develop 5 key messages and 5 glogans for an energy drink targeting young adults aged 18-30.`

The first may produce usable copy, but adding a few guidelines makes the result much more structured.

Guidelines should be specific and clear. Reducing what the model must decide increases the chance of receiving the desired format:

- `Write an short essay about James Webb Telescope.`
- `Write 5 paragraphs of an essay about James Webb Telescope. Use 3 to 5 sentences for each paragraph.`

Try both. You will see how much guidelines can change the output.

### 4. Supply context

For a JavaScript example, I asked ChatGPT to create `create_post()`, sending HTML form input to `/create` through `POST`:

```js
/***************
Prompt input : "Let's write a JavaScript function 'create_post()'. Fetch the form inputs to url '/create'."
****************/

/***************
Generated response
****************/

async function create_post() {
  const title = document.getElementById("title").value;
  const body = document.getElementById("body").value;

  const response = await fetch('/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, body })
  });

  const data = await response.json();

  console.log(data);
}
```

The simple request produced suitable code without much trouble. Adding context about my actual environment produced a better response:

```js
/***************
Prompt input :
Let's write a JavaScript function 'create_post()' with given conditions:

- Get the input data from '#create-post-input'.
- Use `fetch` method to send the data to url '/create' with POST method without `await` calls.
- Parse the response to JSON format if the response status is `ok`.
- If the parsed response data has a 'message' or 'error' value, log it to the console.
- Add comments to your code.
****************/

/***************
Generated response
****************/

function create_post() {
  // Get the input data from the form with id 'create-post-input'
  const inputData = document.querySelector('#create-post-input').value;

  // Send the data to the URL '/create' with a POST method
  fetch('/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ input: inputData })
  })
    .then(response => {
      // Check if the response status is 'ok'
      if (response.ok) {
        // Parse the response to JSON format
        return response.json();
      }
      throw new Error('Network response was not ok');
    })
    .then(data => {
      // Log the message or error value if it exists in the response data
      if (data.message || data.error) {
        console.log(data.message || data.error);
      }
    })
    .catch(error => {
      // Log any errors that occur
      console.error('There was a problem with the fetch operation:', error);
    });
}
```

### 5. Include examples of the desired format

This example from [OpenAI's API Quickstart](https://platform.openai.com/docs/quickstart/add-some-examples) requests three names for a superhero horse:

```html
<!-- Prompt input -->
Suggest three names for a horse that is a superhero.

<!-- Output -->
1. Super Stallion
2. Captain Colt
3. Mighty Mustang
```

That is enough for three random answers. Include example output, however, and the result is more likely to fit the intended format and context. This is especially useful when answers must follow a precise structure:

```html
<!-- Prompt input -->
Suggest three names for an animal that is a superhero.

Animal: Cat
Names: Captain Sharpclaw, Agent Fluffball, The Incredible Feline
Animal: Dog
Names: Ruff the Protector, Wonder Canine, Sir Barks-a-Lot
Animal: Horse
Names:

<!-- Output -->
Super Stallion, Mighty Mare, The Magnificent Equine
```

### 6. Experiment thoroughly

The movie quiz experiment searched for a prompt optimized for a fixed output format. Details will differ for quarterly report summaries, scientific essays, or other tasks. To obtain the right content, format, and length, keep experimenting with your own prompt-writing approach.

If you do not know where to start, these examples from users around the world can serve as recipes:

- [The Ultimate Collection of ChatGPT Products and Prompts](https://chatgpt.getlaunchlist.com/)

## Closing

Prompt engineering can be understood as **carefully constructing good questions to obtain better AI responses**. Interestingly, it closely resembles **finding good questions for working well with other people**. Just as asking good questions has been a measure of collaboration skills, designing prompts may become part of the basic literacy needed to use language-model-based AI.

## References

- [OpenAI Docs: Quickstart](https://platform.openai.com/docs/quickstart)
- [NVIDIA Blog: What Are Large Language Models Used For?](https://blogs.nvidia.com/blog/2023/01/26/what-are-large-language-models-used-for/)
- [co:here Docs: Prompt Engineering](https://docs.cohere.ai/docs/prompt-engineering)
- [OpenAI Docs: Best practices for prompt engineering with OpenAI API](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api)
- [GripRoom: How to Write Better Prompts for ChatGPT](https://www.griproom.com/fun/how-to-write-better-prompts-for-chat-gpt)
- [The Ultimate Collection of ChatGPT Products and Prompts](https://chatgpt.getlaunchlist.com/)
