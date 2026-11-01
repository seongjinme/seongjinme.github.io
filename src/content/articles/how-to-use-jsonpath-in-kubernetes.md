---
title: "쿠버네티스에서 JSON 데이터 처리를 위한 JSONPath 사용법"
description: "수십, 수백 개의 노드와 리소스가 돌아가는 상용 환경에서 내게 필요한 정보만 골라내려면 JSONPath를 써야 한다. JSONPath의 기본 문법과 사용법을 알아보자."
pubDate: "2022-04-15T09:34:45.000Z"
updatedDate: "2022-04-21T13:39:17.000Z"
tags: ["kubernetes"]
featureImage: "/content/images/2022/04/cover-1.png"
---

## JSONPath란?

JSONPath는 JSON 포맷의 데이터 구조를 손쉽게 처리할 수 있도록 고안된 표현식이다. [독일의 Stefan Gössner 교수가 2007년에 최초로 제안](https://goessner.net/articles/JsonPath/)했고, 이때 제안된 문법이 큰 변화 없이 지금도 쓰이고 있다.

당시에는 [자바스크립트와 PHP, C#](https://code.google.com/archive/p/jsonpath/downloads)로 구현되었으며, 현재는 Java, PHP, Golang 등의 언어로 된 구현 프로젝트가 깃허브에 올라와 있다.

-   [Jayway JsonPath (Java)](https://github.com/json-path/JsonPath)
-   [JSONPath for PHP](https://github.com/SoftCreatR/JSONPath)
-   [golang jsonpath library](https://github.com/oliveagle/jsonpath)

JSONPath 표현식을 직접 다뤄볼 수 있는 웹사이트도 있다. 아래의 본문 내용을 참고하면서 직접 써보면 도움이 될 것이다.

-   [JSONPath Online Evaluator - jsonpath.com](https://jsonpath.com/)

## JSONPath 사용법

### 기본 문법 요소

JSON의 데이터는 키-값 쌍으로 이루어진 요소들을 객체(object; `{}`로 표현) 또는 배열(array; `[]`로 표현)로 묶어놓은 형태를 가진다. 데이터 구조가 간단하다 보니 이를 처리하는 JSONPath의 기본 문법 요소도 비교적 간단하게 구성되어 있다. 자주 쓰이는 문법 요소들은 다음과 같다.

-   `$` : 루트 노드. JSONPath의 모든 표현식은 이것으로 시작된다.
-   `@` : 현재 노드. 아래에서 소개할 조건부 필터 표현식에서 사용된다.
-   `.` : 하위 노드
-   `..` : 중첩된 전체 하위 요소들(nested descendants)
-   `[]` : 배열 인덱스
-   `*` : 모든 요소와 매칭되는 와일드 카드
-   `?(boolean expression)` : 조건부 필터 표현식

아래에서부터는 위의 문법 요소들을 어떻게 사용하는지 안내할 것이다. 이 포스팅에 쓰인 모든 JSON 데이터 예제들은 [Stefan Gössner의 JSONPath 소개글](https://goessner.net/articles/JsonPath/)에서 가져왔다.

### 객체(object)를 다루는 문법

```json
{
	"bicycle": {
		"color": "red",
		"price": 19.95
	}
}
```

JSON 객체에서 현재 노드와 하위 노드는 `.`로 구분하고, 최상단에 위치한 가상의 노드로서 `$` 기호를 경로에 함께 표현해줘야 한다. 이에 유의하여 각 표현식별 결과를 살펴보면 다음과 같다.

| 표현식 | 출력 |
| --- | --- |
| `$.bicycle` | \[{"color": "red", "price": 19.95}\] |
| `$.bicycle.color` | \["red"\] |

주의할 점이 있다. JSONPath에서 모든 Query의 결과물은 반드시 배열 형태로 리턴된다. 즉, `$.bicycle.color`를 호출한 결과값은 `"red"`가 아니라 `["red"]`가 된다.

### 배열(array)을 다루는 문법

JSON 데이터에서 배열에 포함된 `n`개의 원소들은 기재된 순서에 따라 `0`에서 최대 `n-1`까지의 인덱스 값을 갖는다. 여기서 각 원소를 호출하는 방법은 다음과 같다.

-   여러 원소들을 함께 지정하려면 `[0,3]` 처럼 쉼표(`,`)를 이용한다.
-   모든 원소들을 지정하려면 와일드카드 문자(`*`)를 쓴다.
-   `[시작값:끝값+1]` 형태로 범위를 지정할 수 있다. `[0:3]`으로 입력하면 `0`에서 `2`까지의 인덱스값을 가진 원소들이 선택된다.
-   `[시작값:끝값+1:스텝]` 형태로 범위 및 스텝(건너뜀) 지정도 가능하다.

역순으로도 원소를 선택할 수 있다. 이때에는 `-1`부터 `-n`까지의 번호를 사용 가능하다. 단, 역순 번호 만으로 호출할 경우 특정 환경에서는 동작하지 않을 수 있으므로, 가급적  '범위' 포맷으로 지정해 주어야 한다.

-   배열의 마지막 원소를 지정할 땐 `[-1:0]` 또는 `[-1:]`와 같이 입력한다.
-   마지막 3개의 원소는 `[-3:]`와 같이 지정하면 된다.

위의 내용을 참고하여 아래의 예제에 대한 각 표현식별 결과를 살펴보자.

```json
{
	"book": [
		{
		"category": "fiction",
			"author": "Herman Melville",
			"title": "Moby Dick",
			"isbn": "0-553-21311-3",
			"price": 8.99
		},
		{
			"category": "fiction",
			"author": "J. R. R. Tolkien",
			"title": "The Lord of the Rings",
			"isbn": "0-395-19395-8",
			"price": 22.99
		}
	]
}
```

| 표현식 | 출력 |
| --- | --- |
| `$.book[0:1].isbn` | \["0-553-21311-3"\] |
| `$.book[-1:].title` | \["The Lord of the Rings"\] |
| `$.book[*].category` | \["fiction", "fiction"\] |

### 조건부 필터 다루기

JSONPath의 핵심 기능이 바로 여기서 소개할 조건부 필터 표현식이다. `TRUE` 또는 `FALSE`의 결과만을 갖는 `boolean` 표현식으로 원하는 조건에 맞는 데이터만 빠르게 골라낼 수 있다.

JSONPath에서 조건부 필터는 `?(boolean expression)` 형태로 표현된다. 이 조건문에는 기본적인 논리 연산자(`==`, `!=`, `>`, `<`, `>=`, `<=`) 사용이 가능하다. 환경에 따라 `in`, `nin` 등의 기타 연산자가 추가로 구현된 경우도 있을 수 있다.

이제 아래의 예제에 대한 각 표현식별 결과를 살펴보자.

```json
{
	"store": {
		"book": [
			{
				"category": "reference",
				"author": "Nigel Rees",
				"title": "Sayings of the Century",
				"price": 8.95
			},
			{
				"category": "fiction",
				"author": "Evelyn Waugh",
				"title": "Sword of Honour",
				"price": 12.99
			},
			{
			"category": "fiction",
				"author": "Herman Melville",
				"title": "Moby Dick",
				"isbn": "0-553-21311-3",
				"price": 8.99
			},
			{
				"category": "fiction",
				"author": "J. R. R. Tolkien",
				"title": "The Lord of the Rings",
				"isbn": "0-395-19395-8",
				"price": 22.99
			}
		],
		"bicycle": {
			"color": "red",
			"price": 19.95
		}
	}
}
```

| 표현식 | 출력 |
| --- | --- |
| `$..book[?(@.price < 10)].title` | \["Sayings of the Century", "Moby Dick"\] |
| `$.store..[?(@.category == "reference")].author` | \["Nigel Rees"\] |
| `$.store.[?(@.category == "reference")][title,author]` | \["Sayings of the Century", "Nigel Rees"\] |
| `$.store.[?(@.color == "red")].price` | \[19.95\] |

## 쿠버네티스에서의 JSONPath 사용법

쿠버네티스에서는 클러스터 컨픽 내용이나 노드, 리소스 정보를 조회할 때 JSONPath 템플릿을 사용할 수 있다. `kubectl get` 기본 명령 만으로는 접근할 수 없는 정보를 알아볼 수도 있고, 필요에 따라 출력 결과물을 원하는 조건에 따라 정렬시킬 수도 있다. 수십 개의 노드를 동시에 관리해야 하는 상용 환경에서도 내게 꼭 필요한 정보만 걸러내어 확인할 수 있게 해주는 것이 쿠버네티스에서의 JSONPath 템플릿이다.

아래의 내용은 [Mumshad Mannambeth의 Certified Kubernetes Administrator (CKA) with Practice Tests](https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/) 강의에서 소개된 사용법을 간략하게 요약한 것임을 밝힌다.

### 기본 문법

우선 `kubectl get <리소스> -o json` 명령의 출력 결과물에 익숙해져야 한다. 조회 명령의 JSON 포맷 데이터 구조를 알아야 JSONPath를 제대로 사용할 수 있다.

쿠버네티스의 `get` 명령에 JSONPath를 붙일 때엔 `-o jsonpath='{표현식}'` 형태로 사용한다. 예를 들어 각 파드들을 구성한 이미지 정보만 조회하고 싶다면, 다음과 같이 입력하면 된다.

```bash
kubectl get pods -o jsonpath='{.items[*].spec.containers[*].image}'
```

-   하나의 JSONPath 표현식은 중괄호(`{}`) 안에, 전체 표현식들의 조합은 홑따옴표(`''`)나 겹따옴표(`""`) 안에 묶여 있어야 한다.
-   표현식에서 `root`에 해당하는 `$` 문자는 생략 가능하다. 생략할 경우에는 `.`로 시작한다.

여러 개의 표현식을 조합해서 여러 항목의 정보를 한 번에 조회할 수도 있다. 아래 예시는 각 노드의 이름과 할당된 CPU 수를 조회하는 명령어다.

```bash
kubectl get nodes -o jsonpath='{.items[*].metadata.name}{"\n"}{.items[*].status.capacity.cpu}'

# 위 명령어의 출력 결과(예시)는 아래와 같다.
# master01 worker01
# 4        4
```

-   각 표현식의 구분은 `{}`로 한다.
-   `{"\n"}`로 줄 바꿈을, `{"\t"}`로 탭 추가를 할 수 있다.

### 반복 목록 만들기

쿠버네티스에서는 JSONPath 표현식에 `range`와 `end` 오퍼레이터를 결합하여 반복되는 목록을 생성시킬 수 있다.

위에서 살펴봤던 노드별 이름 및 CPU 수 조회 명령을 반복 목록의 형태로 구현해보자. 아래는 의사코드와 이를 JSONPath와 `range` 오퍼레이터로 구현한 예시다.

```bash
# 의사코드
FOR EACH NODE
  PRINT NODE NAME \t PRINT CPU COUNT\n
END FOR

# JSONPath 표현식
'{range .items[*]}
  {.metadata.name}{"\t"}{.status.capacity.cpu}{"\n"}
{end}'
```

이렇게 얻어낸 표현식을 `kubectl get -o jsonpath`와 결합해보자.

```bash
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.capacity.cpu}{"\n"}{end}'

# 위 명령어의 출력 결과(예시)는 아래와 같다.
# master01	4
# worker01	4
```

### 출력 결과에 칼럼별 이름 붙이기

만약 각 컬럼에 이름을 붙이고 싶다면? 아래와 같이 `-o jsonpath` 대신 `-o custom-columns`를 붙이면 된다. 여러 개의 컬럼은 쉼표(`,`)로 구분하며, 중괄호(`{}`)는 불필요하다. 기본 문법은 다음과 같다.

```bash
kubectl get <리소스> -o custom-columns=<NAME1>:<PATH>,<NAME2>:<PATH>,...
```

위 문법을 따라서, 앞서 살펴봤던 노드 이름 및 CPU 수 조회용 예시에 칼럼별 이름(`NAME`, `CPU`)을 붙여보자.

```bash
kubectl get nodes -o custom-columns=NODE:.metadata.name,CPU:.status.capacity.cpu

# 위 명령어의 출력 결과(예시)는 아래와 같다.
# NODE		CPU
# master01	4
# worker01	4
```

위의 예시 명령문을 잘 살펴보면 JSONPath 표현식 부분에 `.items[*]`가 생략되어 있음을 알 수 있다. `kubectl get` 명령 자체가 `.items[*]` 경로의 데이터 조회를 전제하고 있기 때문이다. 때문에 `-o custom-columns`를 쓸 때에는 `.items[*]` 이후의 경로만 적어주면 된다.

### 출력 결과 정렬하기

JSONPath는 조회 결과의 정렬에도 쓰일 수 있다. `--sort-by=<PATH>` 형식을 따르며, 역시 중괄호(`{}`)는 불필요하다. 이때 정렬은 오름차순(Ascending)으로 이루어진다. 아래 예시들은 [kubectl 치트시트](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)에 소개된 것들이다.

```bash
# 서비스 목록을 이름 순으로 정렬하여 출력
kubectl get services --sort-by=.metadata.name

# 파드 목록을 재시작 횟수로 정렬하여 출력
kubectl get pods --sort-by='.status.containerStatuses[0].restartCount'

# PV 목록을 용량에 따라 정렬하여 출력
kubectl get pv --sort-by=.spec.capacity.storage
```

위의 예시들에서도 JSONPath 표현식 부분에 `.items[*]`가 생략되어 있다. `--sort-by`를 쓸 때에도 표현식에서 `.items[*]` 이후의 경로부터 적어줘야 한다는 점에 주의하자.

## 참고자료

-   [JSONPath - XPath for JSON](http://goessner.net/articles/JsonPath/)
-   [쿠버네티스 공식 문서 : JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
-   [쿠버네티스 공식 문서 : kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
-   [Mumshad Mannambeth의 Certified Kubernetes Administrator(CKA) 자격증 대비 과정](https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/)
