---
title: "ChatGPT를 비롯한 대화형 AI 서비스에서 더 좋은 결과물을 얻게 해주는 프롬프트 엔지니어링 (Prompt Engineering)"
description: "대화형 인공지능이 생성하는 결과물의 품질을 높이는 프롬프트 엔지니어링(Prompt Engineering)을 소개한다. 왜 프롬프트 엔지니어링이 필요한가를 알아보고, 활용 사례와 요령을 안내한다."
pubDate: "2023-02-12T13:52:57.000Z"
tags: ["ai", "chatgpt", "prompt"]
featureImage: "/content/images/2023/02/cover.png"
---

대화형 인공지능(Conversation AI)의 본격적인 시대가 열렸다. ChatGPT(챗GPT)의 공개는 이 시대의 도래를 본격적으로 알린 신호탄이 됐다. [겨우 두어 달 전에 공개된 시험용 버전의 월 사용자가 이미 1억 명을 넘어섰다.](https://www.theguardian.com/technology/2023/feb/02/chatgpt-100-million-users-open-ai-fastest-growing-app) 소셜 미디어엔 ChatGPT의 재치 있는 답변에 놀란 사람들의 후기가 가득하고, 언론엔 각종 인증 시험들을 어렵지 않게 통과한 ChatGPT의 잠재력에 놀란 보도가 가득하다.

인공지능 서비스가 일상 생활 곳곳에 함께할 날도 머지 않았다. 구글은 지난 2월 6일에 [바드(Bard)라는 인공지능 기반 지식 정보 서비스를 공개했다.](https://blog.google/technology/ai/bard-google-ai-search-updates/) 바로 다음날인 2월 7일에는 마이크로소프트가 [자사 검색 엔진인 Bing과 Edge 브라우저에 ChatGPT 기반의 인공지능을 결합한다고 발표했다.](https://blogs.microsoft.com/blog/2023/02/07/reinventing-search-with-a-new-ai-powered-microsoft-bing-and-edge-your-copilot-for-the-web/) 이날 마이크로소프트는 의류회사인 Gap의 분기 보고서 PDF 파일을 Edge 브라우저로 불러들인 뒤, [간단한 채팅 입력만으로 요약본 텍스트를 얻어내는 충격적인 시연](https://youtu.be/rOeRWRJ16yY?t=2100)을 선보이기도 했다.

![PDF 보고서를 실시간으로 요약해낸 MS Edge Copilot 시연 화면 (출처 : Bing 공식 유튜브)](/content/images/2023/02/ms-edge-copilot.jpg)

대화형 인공지능은 우리가 정보를 다루는 방식에 큰 변화를 가져올 것이다. 그동안의 정보 활용 기술은 내게 필요한 '정보'를 신속하게 획득 가능한 검색 능력에 주로 의존해 왔다. 앞으로는 인공지능과 상호작용하여 필요한 '답'을 원하는 양식대로 빠르게 얻어내는 능력이 중요해질 것이다. 그렇다면, 이제는 **대화형 인공지능에 대한 가벼운 인상비평을 넘어 이것을 잘 활용할 수 있는 기술에 대한 이야기가 필요할 때**라고 본다.

이번 글에서는 인공지능이 생성해 주는 결과물의 품질을 높일 수 있는 **프롬프트 엔지니어링(Prompt Engineering)을 간략히 다룬다**. 우선 프롬프트(Prompt)의 개념과 이것의 올바른 엔지니어링 필요성을 정리한 뒤, ChatGPT를 통해 시험해 본 엔지니어링 사례를 소개한다. 아울러 그 과정에서 얻은 프롬프트의 작성 요령도 함께 안내할 것이다.

## 프롬프트(Prompt)란?

생성 인공지능(Generative AI) 분야에서 **프롬프트(Prompt)는 거대 언어 모델(Large Language Model; LLM)로부터 응답을 생성하기 위한 입력값**을 의미한다.

![프롬프트와 거대 언어 모델, 그리고 생성 결과물의 관계도 (이미지 출처 : co:here)](/content/images/2023/02/prompt-to-generate.jpg)

여기서 **거대 언어 모델**이란, **방대한 규모의 데이터셋을 바탕으로 특정한 텍스트/이미지/영상을 인식하고, 변환하며, 가공 또는 생성해내는 데에 쓰이는 딥러닝 알고리즘의 일종**이다. 위에서 소개한 ChatGPT는 이러한 거대 언어 모델 중 하나인 GPT-3.5를 채팅의 형식으로 사용할 수 있도록 만든 대화형 인공지능 서비스인 셈이다.

ChatGPT와 같은 대화형 인공지능 서비스는 사람과 대화를 나누듯 자연어를 주고 받으며 상호작용할 수 있도록 설계되었다. 이런 환경에서는 **응답을 얻어내기 위한 프롬프트 역시 자연어의 형식을 가진다.** `메일로 보낼 새해 인삿말을 써줘`와 같은 일상적인 지시, `이메일을 처음 개발한 사람은 누구야?` 같은 간단한 질문도 대화형 인공지능의 세계에서는 실제로 동작하는 프롬프트의 예시라고 볼 수 있다.

## 프롬프트 엔지니어링(Prompt Engineering)이란?

그동안 우리는 구글, 네이버 등 검색 서비스에서 더 정확한 검색 결과를 얻기 위해 다양한 방법들을 활용해 왔다. 각 서비스마다 포함된 고급 검색 기능을 이용하거나, 검색 엔진이 지원하는 각종 연산자를 함께 조합하여 쓰기도 했다.

이처럼 원하는 결과물을 보다 수월하게 얻어내기 위한 요령은 생성 인공지능 시대에도 필요하다. 인공지능에게 일을 더 잘 시키기 위한 프롬프트를 찾는 작업, 이것이 **프롬프트 엔지니어링**(Prompt Engineering)이라는 개념으로 이어진다. **프롬프트 엔지니어링(Prompt Engineering)은 거대 언어 모델로부터 높은 품질의 응답을 얻어낼 수 있는 프롬프트 입력값들의 조합을 찾는 작업**을 의미한다.

### 왜 프롬프트 엔지니어링이 필요할까?

GPT와 같은 거대 언어 모델에서는 프롬프트에 포함된 문구들의 미세한 조정이 결과물에 극적인 차이를 가져올 수 있다. 다음의 예시를 살펴보자.

-   `Tell me who invented the email.`
-   `Tell me about the person invented the email.`

위의 두 문장은 의미적으로 차이가 거의 없다. 그러나 이들을 ChatGPT에 프롬프트로 입력한 각각의 결과는 아래와 같이 달라진다.

!["Tell me who invented the email." 입력 결과](/content/images/2023/02/chatgpt-email-01.png)

!["Tell me about the person invented the email." 입력 결과](/content/images/2023/02/chatgpt-email-02.png)

`who`를 `about the person`으로 바꿨을 뿐인데 결과물의 양과 질이 판이하다. 약간의 표현 차이 만으로도 짧고 간결한 답이 풍부한 맥락으로 구성된 에세이 수준의 결과물로 바뀌었다. 이처럼 **내게 필요한 더 높은 품질의 응답을 얻으려면 해당 언어 모델이 잘 이해할 수 있는, 정제된 언어로 구조화된 프롬프트를 구성**하는 것이 중요하다.

생성 인공지능이 기반을 둔 언어 모델의 특성에 따라 적합도 높은 결과물을 얻어내는 프롬프트의 유형도 달라진다. 특정 모델로부터 특정 답안을 얻어내는 데에 완전히 최적화 된 프롬프트 해킹 수준의 기술은 이 글이 다루려는 범위를 넘어선다. 언어 모델에 대한 기술적 원리에 대해 상세히 파악하기 어려운 **일반 사용자 입장에서, 프롬프트 엔지니어링이란 결국 수많은 실험의 연속일 수밖에 없다.**

그렇다면 일반 사용자로서 시도해볼 수 있는 프롬프트 엔지니어링이란 어떤 것일까? ChatGPT를 사용하여 실험한 실제 사례를 예시로 소개해 보겠다.

## ChatGPT로 시험해 본 프롬프트 엔지니어링 사례

ChatGPT에게 "영화 퀴즈를 하나 만들어줘"라는 작업을 시켜보기로 하자. 일단 `Create a movie quiz.`라는 문장을 입력했다.

!["Create a movie quiz." 입력 결과](/content/images/2023/02/chatgpt-prompt-engineering-01.png)

그런대로 일을 해낸 것 같아 보인다. 하지만 결과물의 품질 측면에서 보면 개선 가능한 부분들이 있다. 내가 떠올린 개선점들은 다음과 같다.

-   한 개를 요청했는데 열 개를 내놓았다. 지시한 수만큼만 만들어주면 좋겠다.
-   단답형보다는 사지선다형처럼 여러 개의 보기 중 하나를 고르는 방식이 더 재밌을 것 같다.
-   퀴즈 내용의 진위를 확인할 겸, ChatGPT가 내놓는 답과 해설도 함께 보고 싶다.
-   각 문제가 무엇을 묻는지(제목, 배우, 감독 등) 미리 힌트를 주면 좋을 것 같다.
-   (6번, 9번처럼) 복수의 정답이 존재하는 애매한 문제는 없어야 한다.
-   IMDB에 정보가 존재하는 영화에 대해서만 퀴즈를 만들어야 한다.
-   매번 다른 영화, 다른 소재로 퀴즈가 생성되면 좋겠다.

지금부터 위의 개선점이 응답에 반영되도록 프롬프트를 계속해서 고칠 것이다. 이 변화가 실제 결과물에 어떻게 반영되어 가는지 살펴보자.

### 첫 번째 개선 버전

```
Create one quiz with 4 options. Follow the instructions below.

- The quiz must be about the movie currently exists in IMDb.
- There must be only 1 correct answer.
```

우선 **IMDB에 실제 존재하는 영화만을 소재로 삼으라는 조건**을 추가했다. ChatGPT는 어디까지나 프롬프트 다음에 올 내용을 추정하여 덧붙이는 메커니즘으로 작동하므로, 실제로 존재하지 않는 영화 정보를 그럴싸하게 포장하여 내놓을 위험이 있다. 그럴 가능성을 줄이고 싶었다.

아울러 내가 원하는 **퀴즈 생성 양식**을 정해두었다. 4개의 보기로 이루어진 하나의 퀴즈여야 하며, 오직 하나의 보기만 정답이어야 한다는 내용이다. 이제 결과물을 보자. 프롬프트에 몇 가지 조건을 간단히 추가한 것 만으로도 대부분의 개선점들이 한 번에 반영된 것을 볼 수 있다.

![첫 번째로 개선된 프롬프트의 입력 결과물](/content/images/2023/02/chatgpt-prompt-engineering-02.png)

다만 아쉬운 점도 있다. ChatGPT에서는 같은 세션(채팅방) 안에서 같은 프롬프트 입력을 반복할 수록 처음 내놓은 답과 유사한 유형의 응답이 반복적으로 나오곤 했다. 영화 퀴즈를 생성할 때에도 처음 생성한 문제와 동일한 영화 및 주제로 엇비슷한 퀴즈를 계속해서 내놓는 경향이 있었다. 아마도 제한된 학습 데이터와 이로 인한 편향 때문일 것으로 짐작된다.

그래서 새로운 세션을 만든 뒤, 아래와 같이 프롬프트를 수정했다.

### 두 번째 개선 버전

```
Create one quiz with 4 options. Follow the instructions below.

- The quiz must be about the movie currently exists in IMDb.
- The quiz must have a subject. Subject should be one of these: [Title, Director, Top Cast, Actor, Actress, Release Year, Storyline, Awards, Rates, Quotes, Soundtracks, Trivia].
- Do not choose the same subject twice or more.
- Do not choose the same movie twice or more.
- There must be only 1 correct answer.
```

![두 번째로 개선된 프롬프트의 입력 결과물](/content/images/2023/02/chatgpt-prompt-engineering-03.png)

이번에는 **문제가 다루는 주제의 범위**를 미리 정해두고, **같은 영화나 주제를 계속 반복하지 않도록 제약하는 조건**을 추가했다. 그러자 이전보다 더욱 다채로운 소재로 퀴즈가 생성되기 시작했다. 매번 프롬프트를 입력할 때마다 다른 유형의 문제가 만들어지니 재미 요소가 늘어났다.

이제 한 발 더 나아가 보기로 하자. 앞으로는 문제의 답에 대한 상세한 설명을 함께 확인하고 싶다. 아울러 퀴즈의 소재로 쓰인 영화에 대한 상세 정보도 함께 알 방법이 있으면 좋을 것 같다. 어떻게 하면 될까?

### 세 번째 개선 버전

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

프롬프트에 두 가지 항목을 추가했다. **출력 양식**을 일정하게 정했고, 마지막 줄에는 `"More Info"` 이름으로 관련 정보를 확인할 수 있는 **IMDB 링크**를 함께 알려주도록 만들었다. 가끔 ChatGPT가 임의로 영화 제목을 출력하면서 퀴즈 정답을 노출하는 경우를 대비하여 이에 대응하는 문구도 더했다.

![세 번째로 개선된 프롬프트의 입력 결과물](/content/images/2023/02/chatgpt-prompt-engineering-04.png)

의도한 대로 퀴즈 정답 아래에 설명(Explanation) 문구가 추가되었으며, 관련 정보를 직접 찾아볼 수 있는 IMDB 링크도 자동으로 생성되었다. 이처럼 **프롬프트에 디테일이 더해질 수록 결과물도 더욱 정교하게, 정제된 형태로 돌아온다**는 것을 알 수 있다.

## 프롬프트를 잘 쓰는 요령

남에게 무언가를 요청하여 제대로 된 결과를 얻으려면 지시를 잘 해야 한다. 지나치게 추상적이거나 장황한 지시, 횡설수설로 가득한 지시는 서로를 피곤하게 만들 뿐이다.

**수행할 작업을 구체적으로 지시하고, 지시를 이해하는 데에 필요한 맥락을 함께 제공하며, 얻고자 하는 바를 명확히 정의해야 한다.** 그래야 상호 간에 오가는 커뮤니케이션 비용을 줄일 수 있고, 원하는 결과물도 잘 얻을 수 있다. 이는 생성 인공지능을 다룰 때에도 똑같이 적용되는 요령이다.

1.  쉽고 간결한 표현을 사용하자.
2.  '열린' 질문보단 '닫힌' 지시문이 좋다.
3.  수행할 작업의 조건을 구체적으로 명시하자.
4.  지시의 맥락을 함께 제공하자.
5.  원하는 결과물 형식의 예시를 함께 입력하자.
6.  충분히 실험하자.

### 1\. 쉽고 간결한 표현을 사용하자.

아래의 두 프롬프트를 살펴보자.

-   `혹시 괜찮다면 제임스 웹 우주망원경이 무엇인지를 가지고 이제 갓 9살이 된 어린 아이도 알아들을 수 있을 만큼 쉽게 설명해주겠니?`
-   `제임스 웹 우주망원경을 9살 어린이에게 설명해줘.`

두 프롬프트는 완전히 똑같은 지시 내용을 담고 있다. 불필요한 미사여구가 많은 첫 번째보다는 오히려 두 번째 프롬프트가 원하는 응답을 얻어낼 가능성이 더 높다. 거대 언어 모델에서는 작은 입력값의 차이가 큰 변화로 이어질 수 있다. 가급적 쉽고 간결한 표현을 쓰도록 하자.

### 2\. '열린' 질문보단 '닫힌' 지시문이 좋다.

프롬프트의 내용은 응답 결과의 형식에도 영향을 미친다. 작업 목적에 맞는 일정한 형식의 응답을 원한다면 가급적 '닫힌' 지시문의 형태로 프롬프트를 작성하는 것이 좋다. `로봇이 의사의 역할을 대체할 수 있을까?` 보다는 `로봇이 의사의 역할을 대체할 수 있는가에 대해 에세이를 써줘.`가 좀 더 체계적으로 정리된 응답을 얻어낼 수 있다.

### 3\. 수행할 작업의 조건을 구체적으로 명시하자.

ChatGPT에게 에너지 드링크에 대한 카피라이팅을 시킨다고 가정해보자.

-   `Write some messages for an energy drink`
-   `Develop 5 key messages and 5 glogans for an energy drink targeting young adults aged 18-30.`

첫 번째 프롬프트 만으로도 쓸 만한 문구들을 얻는 데엔 문제가 없을 것이다. 그러나 두 번째 프롬프트처럼 작업 수행에 필요한 몇 가지 가이드라인을 추가하는 것만으로 훨씬 더 구조화 된 응답을 얻어낼 수 있다.

가이드라인은 구체적이고 명료해야 한다. GPT 같은 언어 모델이 알아서 판단해야 할 여지를 줄일수록 원하는 양식의 응답을 얻을 가능성이 높아진다.

-   `Write an short essay about James Webb Telescope.`
-   `Write 5 paragraphs of an essay about James Webb Telescope. Use 3 to 5 sentences for each paragraph.`

위의 두 프롬프트를 각각 ChatGPT에 입력시켜보자. 작업 가이드라인의 유무가 결과물의 품질을 어느 정도로 바꿀 수 있는지 실감할 것이다.

### 4\. 지시의 맥락을 함께 제공하자.

JavaScript 코딩 작업을 예시로 살펴보자. ChatGPT에게 `HTML` 문서의 폼에서 입력받은 값을 `/create` 경로로 `POST` 전송시키는 `create_post()` 함수를 작성하라고 지시해 보았다. 결과는 아래와 같다.

```js
/***************
프롬프트 입력 : "Let's write a JavaScript function 'create_post()'. Fetch the form inputs to url '/create'."
****************/

/***************
응답 생성 결과
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

요구사항이 간단한 만큼, 적합한 코드가 별다른 오류 없이 잘 생성되었다. 하지만 내 작업 환경에 필요한 맥락을 프롬프트에 적절히 추가해보니 더 좋은 품질의 응답을 얻을 수 있었다.

```js
/***************
프롬프트 입력 :
Let's write a JavaScript function 'create_post()' with given conditions:

- Get the input data from '#create-post-input'.
- Use `fetch` method to send the data to url '/create' with POST method without `await` calls.
- Parse the response to JSON format if the response status is `ok`.
- If the parsed response data has a 'message' or 'error' value, log it to the console.
- Add comments to your code.
****************/

/***************
응답 생성 결과
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

### 5\. 원하는 결과물 형식의 예시를 함께 입력하자.

ChatGPT를 개발한 [OpenAI의 API 관련 "Quickstart" 문서](https://platform.openai.com/docs/quickstart/add-some-examples)에 나오는 예시를 살펴보자. 슈퍼히어로 말에게 어울리는 3개의 이름을 지어달라는 내용의 프롬프트 입력 결과다.

```html
<!-- 프롬프트 입력 -->
Suggest three names for a horse that is a superhero.

<!-- 출력 결과 -->
1. Super Stallion
2. Captain Colt
3. Mighty Mustang
```

단순히 랜덤하게 생성된 3개의 답안을 얻고 싶었다면 이것만으로도 충분할 것이다. 하지만 아래와 같이 응답의 출력 예시를 프롬프트에 함께 입력해주면, 필요한 형식과 맥락에 적합한 응답을 얻을 가능성이 더 높아진다. 특히 일정한 양식에 정확히 들어맞는 답을 얻고자 할 때 이러한 방법이 유용하다.

```html
<!-- 프롬프트 입력 -->
Suggest three names for an animal that is a superhero.

Animal: Cat
Names: Captain Sharpclaw, Agent Fluffball, The Incredible Feline
Animal: Dog
Names: Ruff the Protector, Wonder Canine, Sir Barks-a-Lot
Animal: Horse
Names:

<!-- 출력 결과 -->
Super Stallion, Mighty Mare, The Magnificent Equine
```

### 6\. 충분히 실험하자.

위에서 소개한 "영화 퀴즈" 관련 프롬프트 엔지니어링은 퀴즈라는 고정된 형식의 결과물 생성에 최적화된 프롬프트를 찾아가는 과정이었다. 기업의 분기 보고서 요약, 과학 에세이 작성 등 사용자가 필요로 하는 작업의 속성에 따라 이런 과정의 디테일은 얼마든지 달라질 수 있다. GPT와 같은 언어 모델로부터 필요한 답안을 원하는 양식과 분량으로 적절하게 얻어내려면, 그러한 결과값에 이를 수 있는 자신만의 프롬프트 작성법을 계속해서 실험해야 한다.

어디서부터 시작해야 할지 막막하다면, 아래 링크를 참고해보자. 전세계의 많은 사용자들이 ChatGPT를 활용하면서 작성한 각종 프롬프트 예시들을 레시피처럼 활용할 수 있다.

-   [The Ultimate Collection of ChatGPT Products and Prompts](https://chatgpt.getlaunchlist.com/)

## 맺음말

어찌 보면 프롬프트 엔지니어링이란 결국 **인공지능으로부터 더 나은 응답을 얻어내기 위한 "좋은 질문"을 치밀하게 구성해 가는 과정**이라고도 할 수 있겠다. 흥미롭게도 이는 **사람을 상대로 잘 협업하기 위한 "좋은 질문"을 고민하는 과정**과 놀랍도록 닮아 있다. 질문을 잘 하는 요령이 협업 능력의 척도로 여겨졌던 것처럼, 앞으로는 프롬프트를 잘 디자인하는 법이 언어 모델 기반 인공지능 활용을 위한 하나의 교양으로 자리하게 될 것이다.

## 참고문서

-   [OpenAI Docs : Quickstart](https://platform.openai.com/docs/quickstart)
-   [NVIDIA Blog : What Are Large Language Models Used For?](https://blogs.nvidia.com/blog/2023/01/26/what-are-large-language-models-used-for/)
-   [co:here Docs : Prompt Engineering](https://docs.cohere.ai/docs/prompt-engineering)
-   [OpenAI Docs : Best practices for prompt engineering with OpenAI API](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api)
-   [GripRoom : How to Write Better Prompts for ChatGPT](https://www.griproom.com/fun/how-to-write-better-prompts-for-chat-gpt)
-   [The Ultimate Collection of ChatGPT Products and Prompts](https://chatgpt.getlaunchlist.com/)
