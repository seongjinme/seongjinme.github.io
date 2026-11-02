---
title: "Building a Movie Quiz App with the ChatGPT API"
description: "Could ChatGPT’s training knowledge itself serve as a data source? Here is how I built a movie quiz app to test that idea, the problems I solved, and what I learned."
pubDate: "2023-05-31T08:29:45.000Z"
tags: ["ai", "openai", "project", "chatgpt"]
featureImage: "/content/images/2023/05/cover-1.jpg"
lang: en
---

[I previously built a simple social application using only ChatGPT and prompts.](/en/experiment-of-creating-web-app-with-chatgpt/) That experience gave me confidence: if instructions can generate code with highly formalized syntax, perhaps they can also select needed content from learned data and return it directly in a defined format. Instead of a conversational agent producing natural language, **let the language model generate content ready for insertion into a database**.

![The KinoQuizAI application](/content/images/2023/05/kinoquizai-part1-800px-3.gif)

Based on this idea, I built [KinoQuizAI](https://github.com/seongjinme/KinoQuizAI) last April. It is a small web game where users answer GPT-generated movie questions and earn points. The results exceeded my expectations. Here are the development process, problems, and lessons.

- 🔗 [GitHub Repository](https://github.com/seongjinme/KinoQuizAI)

## Planning the project

### Subject: movie quizzes

GPT learns from general information available on the web. To use its learned knowledge as a backend source, I needed a subject with enough public data to be well represented in training. This would also reduce false responses caused by [hallucinations](https://zapier.com/blog/ai-hallucinations/). Movies, with abundant sources such as IMDb, fit those conditions.

### Language: English

GPT's Korean training data is tiny compared with English. [OpenAI's published statistics](https://github.com/openai/gpt-3/tree/master/dataset_statistics) show **Korean accounted for only 0.019% of GPT-3's pretraining data by documents and 0.017% by words**. I judged this insufficient to guarantee Korean movie content quality. Experiments with `gpt-3.5-turbo` in [OpenAI Playground](https://platform.openai.com/playground) confirmed my expectations. KinoQuizAI was therefore planned in English from the start.

### Stack: Django, JavaScript, Tailwind CSS, Supabase, and GCP

I chose:

- **Backend:** Python, Django
- **Frontend:** JavaScript, Tailwind CSS, HTML
- **Database and storage:** Supabase
- **Infrastructure:** GCP App Engine

At the time, I was taking [Harvard's CS50 web programming course](https://www.edx.org/course/cs50s-web-programming-with-python-and-javascript), so KinoQuizAI naturally became my capstone. The course required Django and JavaScript. I added [Tailwind CSS](https://tailwindcss.com/) for convenient interface implementation, letting me build the screens quickly without even a page of sketches.

[Supabase](https://supabase.com/), known as an open-source Firebase alternative, handles prompt files and the content database. I initially considered a separate database instance, but using a suitable solution to reduce unnecessary work and implement an idea quickly is also an engineering virtue. Its Python support depends entirely on the community, and discrepancies remain between official documentation and actual usage. Still, convenient PostgreSQL and storage even on the free tier are clear strengths.

For deployment, I chose [GCP App Engine](https://cloud.google.com/appengine), which I had used professionally. I changed plans after learning that Vercel's [free-tier function timeout was ten seconds](https://vercel.com/docs/concepts/limits/overview). OpenAI API responses commonly take five to fifteen seconds or more, making that restrictive. Other free hosts also failed to meet various requirements. I decided to pay for convenience. In April 2023, GCP offered new users $300+100 in credits over their first three months, another attraction.

## Application architecture

### Designing the OpenAI API sequence

The application's core is **communication among client, server, and OpenAI API**. Starting with a blank slate, I sketched the sequence in macOS's built-in [Freeform](https://www.apple.com/kr/newsroom/2022/12/apple-launches-freeform-a-powerful-new-app-designed-for-creative-collaboration/). Only recently did I learn that this kind of drawing is called a [sequence diagram](https://en.m.wikipedia.org/wiki/Sequence_diagram).

![Initial client-server-OpenAI API sequence](/content/images/2023/05/project-sequence-1-3.png)

1. The user requests a quiz from the server.
2. The server assembles and sends a prompt to OpenAI.
3. The server receives generated quiz data.
4. It preprocesses and sends it to the client.
5. Answer checking repeats steps 1-4 in the same manner.

Implementation revealed problems I had missed:

- Each question required **two OpenAI API exchanges**, amplifying its already noticeable response latency for users.
- **GPT is a language model, not a tool for judging facts or events.** Asking it to grade answers forced it into a fundamentally unsuitable role, so grading quality could not be guaranteed.

I needed a much simpler sequence, minimizing what the service provider could not control:

![Revised client-server-OpenAI API sequence](/content/images/2023/05/project-sequence-2.png)

1. The user requests a quiz.
2. The server assembles a prompt for the question, options, answer, explanation, and IMDb URL, then sends it to OpenAI.
3. It receives the generated data.
4. It preprocesses and stores it in the database.
5. It sends the stored quiz to the client.
6. Answer checking happens only between client and server.

This reduced **OpenAI communication to once per question**, cutting delays and cost while preserving the intended experience. Implementation became simpler too.

Generating content for every request still seemed inefficient. Wouldn't it be better to **serve new users questions already generated by others and stored in the database**? I revised the sequence again:

![Final client-server-OpenAI API sequence](/content/images/2023/05/project-sequence-3-1.png)

1. The user requests a quiz.
2. The server checks the user's answer history.
3. If unanswered questions remain in the database, it selects one randomly and sends it.
4. Only if the user has answered every stored question does it request new content from OpenAI, preprocess it, store it, and send it to the client.
5. Answer checking remains between client and server.

This became the final design. In the first week, **around two hundred users answered 510 questions**. Reusing stored content supported all those attempts with only **106 generated questions**. It improved experience by reducing delays and **cut paid external API calls by around 80%**.

### Database tables

Storage structure matters as much as sequence design. Drawing on my earlier SQL certification studies, I created an [entity relationship diagram (ERD)](https://www.lucidchart.com/pages/er-diagrams) before writing Django models and migrations.

I used [dbdiagram.io](https://dbdiagram.io/), which visualizes schemas written in the database markup language [DBML](https://dbml.dbdiagram.io/home/), much like writing code. This diagram shows the structure operating as of May 2023:

![KinoQuizAI database table structure](/content/images/2023/05/project-erd.png)

`Quiz` is central. Generated content must be parsed and preprocessed into `question`, `option`, `answer`, `explanation`, and `imdb_url`. Reliable processing requires consistent output. Achieving that consistency required considerable prompt engineering.

## Prompt engineering

Prompt quality determines response quality, with differences as vast as heaven and earth. KinoQuizAI took **twenty days from conception to deployment**, and **half of them, ten days, went entirely into prompt engineering**.

The following techniques aimed to generate consistent content ready for database insertion. I benefited greatly from [Lilian Weng's prompt engineering article](https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/), written as head of OpenAI's Applied AI Research, and [Stanford AI Lab's introduction to in-context learning](http://ai.stanford.edu/blog/understanding-incontext/).

### Instruction prompting

**Instruction prompting** directly tells the model what to follow when generating output. It is the most basic way to convey intent and encourage compliance. [Lilian Weng offers this guidance](https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/#instruction-prompting):

> When interacting with instruction models, we should describe the task requirement in details, trying to be specific and precise and avoiding say “not do something” but rather specify what to do.

- Break requirements down and explain them in detail.
- Be concrete and clear.
- Specify what to do rather than what not to do.

KinoQuizAI needs precisely formatted output to parse, store, and serve content. Prompts therefore must detail both **what to generate** and **how to format it**.

These are example content requirements:

```
Create a single movie quiz with four options. The quiz must follow conditions described below:
- The question must have four options: (A), (B), (C), (D) for answers.
- Only one option must be correct.
- Do not make up the content of correct option with false information.
- ...
```

Then specify output structure:

```
According to the conditions above, generate each element of the quiz. Follow the instructions below.
- There must be eight elements: question, option A, option B, option C, option D, right option, explanation, and IMDb URL.
- Include a single line-break(`\n`) at the end of each element.
- At the first line, ...
- At the second line, ...
```

After many experiments, the production prompt reached **roughly 2,800 characters**, including examples and spaces, with **nine content requirements and twelve output requirements**.

### In-context learning

**In-context learning** [includes a task description and input-output examples in the prompt](http://ai.stanford.edu/blog/understanding-incontext/). Also known as **few-shot learning**, as discussed in [the GPT-3 paper](https://arxiv.org/abs/2005.14165), it shows the model the desired input-output pattern and appends a similar input to encourage matching output. [OpenAI Quickstart's Add some examples](https://platform.openai.com/docs/quickstart/add-some-examples) is a representative use.

![OpenAI's in-context learning example](/content/images/2023/05/openai-sample.gif)

After experimentation, I chose **one-shot**, using just one example:

1. Multiple examples caused questions very similar to the final example to recur.
2. Sometimes the model generated as many questions as examples.
3. More examples consumed more tokens and cost more.

The earlier instructions already defined question types, content, and rules. Here, the example only established output structure. I appended this and obtained cleanly formatted data matching it:

```
...
- Follow the exact format of the example below. Do not include additional line-break between the elements.
- After the end line of this prompt, start printing your question.

[Question]
In the movie "Inception", what is the name of the device that allows people to enter and share dreams?
(A) The Dreamcatcher
(B) The PASIV Device
(C) The Mind Explorer
(D) The Dream Weaver
B
The PASIV (Portable Automated Somnacin IntraVenous) Device is a briefcase-like machine used by Cobb and his team to enter and share dreams. It's designed to administer a sedative called somnacin, which puts all users into a synchronized sleep state, allowing them to connect with one another in a shared dream world.
https://www.imdb.com/title/tt1375666/

[Question]
```

In production, **twelve examples reside in the Prompt table**, and **one is randomly selected for each generation request**. This reduces repetition caused by repeatedly showing the same example.

### Parameter tuning

Quiz generation needs both creativity and rigor. Questions should not all ask for the lead actor, nor should they identify an incorrect option as correct. Questions and options benefit from varied, interesting material; answers and explanations demand accuracy.

Combining those qualities was difficult but necessary. **Parameter tuning** adjusts `temperature`, `top_p`, `frequency_penalty`, and `presence_penalty` alongside prompts to influence **creativity or uniformity**. [The API reference explains each parameter.](https://platform.openai.com/docs/api-reference/chat/create)

After lengthy experimentation, I settled on these settings. High `temperature` and `top_p` encouraged creative phrasing; high frequency and presence penalties discouraged similar content about the same subjects:

```
parameters = {
    "temperature": 1.15,
    "top_p": 0.7,
    "frequency_penalty": 1,
    "presence_penalty": 0.85,
    "max_tokens": 2048
}
```

The change was striking. **Previously, questions repeatedly asked for lead actors or directors. After tuning, they began drawing on dialogue, settings, and plots.** Small details really can make an enormous difference in quality.

### Results

Prompt engineering made generation, parsing, reception, preprocessing, and database insertion flow smoothly. The server needed only to communicate with OpenAI, validate the response, store it, and send it to the client.

![Generated quiz data preprocessed and stored in KinoQuizAI](/content/images/2023/05/project-data-input-success-1.png)

## Problems and improvements

### Avoiding a narrow selection of films

Testing revealed that questions centered on a few famous films: [The Godfather](https://www.imdb.com/title/tt0068646/), [The Dark Knight](https://www.imdb.com/title/tt0468569/), [Inception](https://www.imdb.com/title/tt1375666/), and [The Shawshank Redemption](https://www.imdb.com/title/tt0111161/). All were near the top of IMDb's user ratings.

GPT learns from public web information. Frequently discussed movies likely have more training data than obscure ones. That imbalance influenced the prompt asking it to pick a random film.

I wanted a range of internationally known films praised by critics and audiences. I therefore **changed the opening instruction to create a quiz about {movie} and stored a list of films for random insertion into that placeholder**.

![Preparing the film list in Excel](/content/images/2023/05/project-p1-movie-list-1.png)

I collected IMDb Top 250 lists from 1996 through 2021 and used Excel to select **the top three hundred films with at least two hundred thousand user ratings**. I uploaded them to `quiz_movie` and attached each selected film's `id` to generated questions as a foreign key.

![Connecting Quiz and Movie tables](/content/images/2023/05/project-p1-quiz-with-movie-id-1.png)

The app now generated questions correctly for each supplied title, increasing both variety and depth.

### Preventing A from always being correct

As data accumulated, another problem emerged. Despite instructions to randomly choose one of four options as correct, **around 70% of questions had A as the answer**. The model tended to place the correct content in the first option.

![Most correct answers keep appearing as A.](/content/images/2023/05/project-p2-3.png)

Nobody wants a quiz where choosing the same letter always works. I first tried prompt engineering, but repeated experiments had little effect.

I eventually solved it by **shuffling options each time a question is displayed**. The server sends them in random order, while each frontend radio input retains the original `A`, `B`, `C`, or `D` as its `value` for grading against the database.

The `get_quiz()` function in [`views.py`](https://github.com/seongjinme/KinoQuizAI/blob/35bddce5c28e86feb6c1de41c54b37afd4223e82/quiz/views.py#LL345C8-L345C8) originally returned:

```python
	...

return JsonResponse({
        "quiz": {
            "quiz_id": quiz.id,
            "question": quiz.question,
            "option_a": quiz.option_a,
            "option_b": quiz.option_b,
            "option_c": quiz.option_c,
            "option_d": quiz.option_d
        }
    }, status=200)
```

I changed it to the following. I used `secrets.randbelow`, since `secrets.choice` already generated random quiz IDs and reusing the module was convenient. Python string slicing helped too:

```python
	...

# Shuffle the order of options to make user experiences more dynamic
    quiz_options = [quiz.option_a, quiz.option_b, quiz.option_c, quiz.option_d]
    quiz_option_a = quiz_options.pop(randbelow(len(quiz_options)))
    quiz_option_b = quiz_options.pop(randbelow(len(quiz_options)))
    quiz_option_c = quiz_options.pop(randbelow(len(quiz_options)))
    quiz_option_d = quiz_options.pop()

    # Considering shuffled order of options,
    # remove marks((A), (B), etc) from each option label before sending to the front-end.
    # Additionally, provide the original option values to fill values in the radio input form
    # which will be used to validate the user's choice.
    return JsonResponse({
        "quiz": {
            "quiz_id": quiz.id,
            "question": quiz.question,
            "option_a": quiz_option_a[4:],
            "option_b": quiz_option_b[4:],
            "option_c": quiz_option_c[4:],
            "option_d": quiz_option_d[4:],
            "option_values": [quiz_option_a[1], quiz_option_b[1], quiz_option_c[1], quiz_option_d[1]]
        }
    }, status=200)
```

This eliminated the fixed A-position problem. **Even users answering the same question see different option orders**, creating a more dynamic experience.

### Adding lives

More films and shuffled options made the game harder. Ending it after one mistake seemed too harsh. Around then, I discovered [QuizWa](https://quizwa.com/), [created by Jegwon Park](https://twitter.com/jinto/status/1634213993979027459). After seeing feedback that [children liked having three lives](https://twitter.com/joosings/status/1636623335777001472), I borrowed its heart-icon design and added lives to KinoQuizAI.

I added [a life IntegerField defaulting to 3](https://github.com/seongjinme/KinoQuizAI/blob/35bddce5c28e86feb6c1de41c54b37afd4223e82/quiz/models.py#L10) to `User`, and [reset it to 3 for each new game](https://github.com/seongjinme/KinoQuizAI/blob/35bddce5c28e86feb6c1de41c54b37afd4223e82/quiz/views.py#L129). In `get_result()`, incorrect answers subtract one, and the remaining value determines whether play continues:

```python
# If user's choice was wrong, reduce user's life by 1
if not is_user_choice_correct:
	user.life -= 1
	user.save()

# Check whether user's remaining life
game_continue = True if user.life > 0 else False

...

return JsonResponse({
	"quiz_result": {
		"is_user_choice_correct": is_user_choice_correct,
		"answer": quiz.answer,
		"explanation": quiz.explanation,
		"imdb_url": quiz.imdb_url
	},
	"user_status": {
		"life": user.life,
		"score": score,
		"game_continue": game_continue,
		"highest_record": highest_record,
		"is_new_record": is_new_record
	}
}, status=200)
```

The frontend uses JSON's `user_status.life` to display remaining lives and `user_status.game_continue` to change the button below the quiz when the game ends.

![KinoQuizAI with lives](/content/images/2023/05/kinoquizai-part2-800px-3.gif)

This **lowered the barrier to playing and naturally encouraged another attempt**.

## What I learned

Many commercial services already use GPT-like models to synthesize or summarize information. KinoQuizAI is only a small personal leisure project beside them. Still, I was pleased to **simplify the server by using a model as a content and data agent**, while **generating varied content and accumulating it in a database**.

From a customer's perspective, however, something was missing. As an engineer, I had created a stable generation and storage solution based on learned data. To a user, it was just another text quiz app. The playful unpredictability and live streaming of generated text familiar from ChatGPT or Bing Chat were absent.

Despite ongoing prompt engineering, I could not eliminate false content. Here is part of the 106th generated question:

```
In "Blade Runner 2049", what is the name of the company that created replicants?

(A) Wallace Corporation
(B) Tyrell Corporation
(C) Weyland-Yutani Corporation
(D) Waystar Royco

The correct answer is (B), Tyrell Corporation. In the original "Blade Runner" movie, replicants were created by the Tyrell Corporation. In "Blade Runner 2049", a new type of replicant has been developed by the Wallace Corporation, but they are still based on the original designs from Tyrell.
```

The actual answer is A, but the explanation's first sentence identifies B. The next sentence correctly explains why A must be right. Such **hallucinations**, mixing fact and falsehood, occurred in nine of the 106 questions.

Even with parameter tuning and prompting techniques, false responses remain an inherent possibility in language models. Services adopting GPT must also face or work through this problem. I would like to learn how they do it if I get the chance.

## References

- [OpenAI Documentation: Chat Completion API reference](https://platform.openai.com/docs/api-reference/chat/create)
- [Lilian Weng: Prompt Engineering](https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/)
- [The Stanford AI Lab Blog: How does in-context learning work? A framework for understanding the differences from traditional supervised learning](http://ai.stanford.edu/blog/understanding-incontext/)
