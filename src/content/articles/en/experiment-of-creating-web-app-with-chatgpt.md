---
title: "Building a Web Application Through ChatGPT Conversation"
description: "I generated all the code for a working web application using only ChatGPT prompts. Here are the process, results, and what the experiment taught me."
pubDate: "2023-02-26T12:08:13.000Z"
tags: ["ai", "chatgpt"]
lang: en
---

I once led development of new products as a business planner. One recurring daydream was a conversational prototyping tool. Feed it a rough idea, a concept, minimal rules, and a technology stack, and it would produce wireframes and code for a proof of concept (PoC). The quality might not be high, but something good enough to test raw ideas quickly could dramatically improve development efficiency. It was a fantasy. Back then.

Things have changed. Generative AI is gradually bringing apparently fanciful ideas into reality. [A Midjourney-generated picture won an art competition at the Colorado State Fair](https://www.washingtonpost.com/technology/2022/09/02/midjourney-artificial-intelligence-state-fair-colorado/). More recently, [a game mod integrated ChatGPT to let players converse with NPCs](https://www.techspot.com/news/97572-mount-blade-ii-mod-uses-chatgpt-procedurally-generate.html). A conversational prototyping tool still seems distant, but rapid progress raises the hope that it may arrive sooner than expected.

That made me wonder: **can a simple web application be built through conversation with an AI chatbot alone?** Beyond solving algorithm exercises or coding assignments, can prompts generate all the core code for something that actually runs?

![ChatGPT generating template code](/content/images/2023/02/chatgpt-experiment.gif)

So I tried. **Using only prompts, I generated all the code needed for a web application in ChatGPT and ran it.** This article presents the process, results, and implications.

> 🖥️ The completed application code is available in this repository:
> [Nemo-Coded-by-ChatGPT](https://github.com/seongjinme/Nemo-Coded-by-ChatGPT)

## ChatGPT's characteristics and limitations

First, some differences from earlier language-model services are essential to understanding the experiment.

### Its strength: maintaining context

ChatGPT **remembers a certain amount of conversation within the same session**. Ask a question, then say `Explain in more detail` or `Tell me more`, and it expands on its earlier response. Simple conversations flow naturally without repeating everything. This is understood to work by [sending the entire conversation back as a prompt to GPT-3.5](https://en.wikipedia.org/wiki/GPT-3), the underlying model.

**Preserved context** enables more varied workflows than single-turn chatbots. Repeated exchanges can improve or extend the result while solving one problem.

![A conversation example from OpenAI's ChatGPT page](/content/images/2023/02/chatgpt-keeping-context.png)

### Its limits: memory and response length

Long human conversations can lose their original topic. ChatGPT, despite seeming as though AI should be perfect, sometimes does the same because of limits in both model and service.

According to [the official documentation](https://help.openai.com/en/articles/6787051-does-chatgpt-remember-what-happened-earlier-in-the-conversation), it remembers around **3,000 English words, or 4,000 tokens**, per session. Beyond that, context starts disappearing. [A single prompt longer than 3,000 words can also prevent it from recognizing instructions properly.](https://twitter.com/dl_insider/status/1599838515915018245) A chatbot that answered intelligently may gradually begin talking past the question.

Individual responses also have a limit. No exact figure is public, but [user experiments](https://www.reddit.com/r/ChatGPT/comments/zh61at/whats_the_character_limit_for_chat_gpts_replies/) suggest [roughly five hundred words](https://www.reddit.com/r/ChatGPT/comments/zk8wic/any_methods_to_increase_the_length_of_the_response/). Beyond that, answers abruptly stop, sometimes with browser network errors. `continue` or `go on` may help ordinary writing, but a length limit combined with lost context can cause trouble.

## The application

Generating code from complex context required avoiding these limits as much as possible. I set four conditions:

1. Use well-known languages and frameworks with ample training data.
2. Minimize structural complexity.
3. Minimize the number of prompts.
4. Minimize code length.

With those conditions, we will build a small social application named **Nemo**:

- Use Django and Bootstrap.
- Register and log in with `username` and `password`.
- Show every user's posts on the `index` page.
- Let logged-in users post up to one thousand characters.
- Let users delete their own posts.
- Let users like and unlike other users' posts.

The goal is **a functioning PoC from prompts describing a rough idea**. I therefore omitted everything beyond code generation, including high-level and detailed planning, wireframes, prototyping, and design. Let us begin prompting.

## Prompts and code generation

Django's main components are models, templates, views, and URL patterns. ChatGPT will generate each. The order follows the shortest successful attempt among several experiments. Project and app setup are omitted.

### Create the model

My prompt for Nemo's model was:

```
I need to create a Twitter-like Django app called "Nemo".

Here are the basic features of this app.
- All visitors can view all posts of registered users in the index page.
- A single post contains 1 to 1000 characters.
- Any visitor can register and login to the app using username and password.
- Logged-in users can create their posts.
- Logged-in users can delete their own posts.
- Logged-in users can give or revoke a 'Like' on the other user's post.

Considering the features above, create models.
Use only one model. Give me just codes, not with descriptions.
```

To keep the model simple, I specified:

- Only one model, for posts. Django's built-in `User` suffices, and likes can use a many-to-many relationship through `ManyToManyField`.
- Code only, without explanations, to reduce tokens and retain context longer.

It produced [the intended model](https://github.com/seongjinme/Nemo-Coded-by-ChatGPT/blob/main/nemo/models.py) in one attempt:

![Generated Nemo model code](/content/images/2023/02/chatgpt-exp-1-models.png)

### Create the views

```
Next, create views according to features and models above.
Use Django's default generic views and auth views
to keep the codes as simple as possible.
All templates will be placed under `nemo/` in the project's templates directory.

Here are views I need:

- Index
- Register
- Login
- Logout
- Create a post
- Delete a post
- Like/Unlike a post
```

My intentions were:

- Begin with `Next,` to signal completion of the previous task.
- Refer to the existing `features` and `models` for continuity.
- Use Django's built-in view classes to keep code concise.
- Use the correct template prefix, `nemo/`.
- List the required views explicitly.

The result looked reasonably clean. The image shows only part; [the full code is here](https://github.com/seongjinme/Nemo-Coded-by-ChatGPT/blob/main/nemo/views.py).

![Generated Nemo view code](/content/images/2023/02/chatgpt-exp-2-views.png)

### Create URL patterns

```
Next, create URLs based on the views you created above.
```

With views already generated, reminding ChatGPT of that context made URL generation easy. [Here is the result.](https://github.com/seongjinme/Nemo-Coded-by-ChatGPT/blob/main/nemo/urls.py)

![Generated Nemo URL patterns](/content/images/2023/02/chatgpt-exp-3-urls.png)

### Create templates

#### The base template

First we need `base.html`, containing components shared across the detailed pages:

```
Next, create the base template according to features, models, views and URLs above.
Use Bootstrap from jsDelivr.
```

- I specified a `base template` reflecting all previously supplied `features`, `models`, `views`, and `URLs`.
- I requested Bootstrap from [jsDelivr CDN](https://www.jsdelivr.com/). Otherwise ChatGPT tended to use the project's `static` directory.

[The full generated code is here.](https://github.com/seongjinme/Nemo-Coded-by-ChatGPT/blob/main/templates/nemo/base.html)

![Generated Nemo base template](/content/images/2023/02/chatgpt-exp-4-template-base.png)

#### Detailed templates

Templates must reference all previously supplied features, models, views, and URLs. By this stage, however, the exchanges exceed the session's roughly three-thousand-word memory, and context begins to disappear.

What happens then? In this attempt at `index.html`, the previously generated `IndexView` passed posts as `posts`, but the template forgot that and invented `post_list`:

![post_list appears instead of posts.](/content/images/2023/02/chatgpt-exp-5-template-index-fail.png)

Lost context cannot be recovered directly. I had to summarize the necessary information and supply it again, as if reminding a friend who had forgotten an assignment:

```
Next, create a template for `IndexView` view according to features, models, views and URLs above.
It'll list the whole posts(`posts`) in DB.
Each post(`post`) contains `content`, `author`, `created_at` and `likes`.
If user is the author, 'Delete' button must be appeared.
If user is not the author but logged user,
'Like' or 'Unlike' button must be appear.
```

Surprisingly, it generated the correct index template. [See the full code.](https://github.com/seongjinme/Nemo-Coded-by-ChatGPT/blob/main/templates/nemo/index.html)

![The correct posts context and other components appear.](/content/images/2023/02/chatgpt-exp-5-template-index-success.png)

The remaining templates were similar, so I generated them together. Fortunately, the URL context had not yet disappeared:

```
Next, create templates for `RegisterView`, `LoginView`, `CreatePostView` and `DeletePostView`
according to views you created before.
For every form you must add an `action` attribute with proper URL paths you created before.
```

![Generated remaining Nemo templates](/content/images/2023/02/chatgpt-exp-6-template-etcs.png)

## Fixing a bug

Django's built-in `LoginView` redirects authenticated users to `account/profile/` or the `LOGIN_REDIRECT_URL` in `settings.py`. Without a page there, users encounter `404 Not Found` after every login.

The generated view would cause that problem:

```python
class LoginView(LoginView):
    template_name = 'nemo/login.html'
```

I asked ChatGPT to add `next_page` and redirect to `index`:

```
Now let's back to the views you created before.
For `LoginView` view, I want to redirect users to `IndexView`
if the login process is completed.
Add `next_page` attribute to `LoginView` view below:

"""
class LoginView(LoginView):
    template_name = 'nemo/login.html'
"""
```

The result:

![ChatGPT adds an unrelated attribute.](/content/images/2023/02/chatgpt-exp-7-bugfix-fail.png)

I requested `next_page`, but it added a different attribute. Forgetting or ignoring careful instructions feels very human. Another human-like quality is that pointing out the problem produces a revised result. Again, this depends on the model's contextual memory.

![This time the bug is corrected.](/content/images/2023/02/chatgpt-exp-7-bugfix-success.png)

It now inserted `next_page` correctly and added `redirect_authenticated_user = True` for already logged-in users visiting the login page. That resolved the problem.

## Running the application

I ran **Nemo**. Surprisingly, every intended feature worked. **A working web application's code had been completed entirely through ChatGPT conversation.**

![Registration and login](/content/images/2023/02/nemo-register-login.gif)

![Creating and publishing a post](/content/images/2023/02/nemo-post-creation.gif)

![Logging in as another user and liking a post](/content/images/2023/02/nemo-login-like.gif)

This was, of course, an extremely simplified application designed only to test feasibility. Even at this complexity, I had first tested dozens of sessions and tens of thousands of words of prompts.

## What the experiment suggests

It began with a casual question: can chat alone develop an application? Its implications were less casual. In fact, organizing those implications is why I wrote this article.

### Could this work for production applications?

As of February 2023, **my view is that this is nearly impossible in production, and any attempted result would be poor in quality**.

![ChatGPT is no magic wand.](/content/images/2023/02/chatgpt-limitation.jpg)

Most applications structure code around design patterns. Generative AI services essentially predict what should follow a prompt. Keeping their output within an intended structure requires continually supplying that structure to the model. In ChatGPT, **the context of every exchange would need to remain intact under all circumstances**.

But its model has a limited context capacity. No context passes between separate sessions; work remains within one session. Response length is also limited. As work continues, context evaporates and quality declines. **These constraints make sustained complex work requiring abstraction and memory difficult.**

[GPT generation is also probabilistic](https://symbl.ai/blog/what-is-gpt-3-and-is-it-the-next-revolution-in-natural-language-processing/). **The same prompt does not guarantee identical output every time.** Repeating the prompts above may not produce my code. This undermines consistency, a serious issue in software development, where small defects can cause large losses.

### Will it remain impossible?

Context loss and response limits are fundamentally **temporary issues arising from current model specifications**. Nobody expects the roughly four-thousand-token capacity to remain unchanged in GPT-4 and beyond.

On February 17, OpenAI quietly introduced [Foundry, offering dedicated access to its latest models for enterprise customers](https://techcrunch.com/2023/02/21/openai-foundry-will-let-customers-buy-dedicated-capacity-to-run-its-ai-models/). Its main attractions are **up to eight times the context, or 32,000 tokens**, and more finely tuned models. **32,000 tokens correspond to roughly 130,000 English characters, or 130 kB of text.** Future models with better memory and contextual reasoning could offer collaboration resembling, or exceeding, working with people.

### How might generative AI affect my work?

Remember that ChatGPT is a general-purpose service popularizing LLM technology. **The impact of models engineered for specific purposes and environments** could differ qualitatively from that of general-purpose services.

Imagine a company specializing in web products. **What if an internal AI development tool were trained on its products, legacy code, frameworks, conventions, and development and production infrastructure?** Repeating complex context in every prompt would become unnecessary. Code generation and office work might happen through natural conversation, as with a colleague.

People would still need to refine and validate output and design and improve the overall product. But much repetitive supporting work could move to AI and prompts. In that environment, prompting skills could substantially determine work efficiency. [That is why the previous article emphasized prompt engineering.](/en/prompt-engineering-in-chatgpt/)

## References

- [OpenAI: Does ChatGPT remember what happened earlier in the conversation?](https://help.openai.com/en/articles/6787051-does-chatgpt-remember-what-happened-earlier-in-the-conversation)
- [symbl.ai: What is GPT-3 and is it the Next Revolution in Natural Language Processing? by Sekhar Vallath](https://symbl.ai/blog/what-is-gpt-3-and-is-it-the-next-revolution-in-natural-language-processing/)
