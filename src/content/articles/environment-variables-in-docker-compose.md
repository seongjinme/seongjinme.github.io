---
title: "Docker Compose에서 각 서비스 컨테이너에 쓰이는 환경변수를 다루는 방법"
description: "도커 컴포즈(Docker Compose)에서 환경변수를 다루는 방법들을 알아보고, 각 방법이 실제 배포 상황에서 어떤 우선순위를 갖는지, 그리고 주의해야 할 점은 무엇인지를 살펴보자."
pubDate: "2022-07-20T10:32:23.000Z"
updatedDate: "2022-08-11T11:53:21.000Z"
tags: ["docker"]
---

## 환경변수 삽입 및 관리 방법

Docker Compose에서 환경변수를 다루는 방법은 크게 네 가지로 구분된다. 여기서는 Docker Hub에서 제공되는 [MySQL 공식 이미지](https://hub.docker.com/_/mysql)를 예시로 하여 살펴보기로 하자.

1.  Compose 파일에 직접 입력하기
2.  쉘 환경변수로 등록하기
3.  환경변수 파일로 구성하기
4.  Dockerfile에 환경변수를 직접 삽입하기

### 1\. Compose 파일에 직접 입력하기

Docker Compose에서 환경변수를 주입하는 가장 직관적인 방법은 Compose 파일에 직접 입력하는 것이다. MySQL 이미지로 컨테이너를 구동시킬 때엔 MySQL의 관리자(`root`) 계정 비밀번호를 설정할 `MYSQL_ROOT_PASSWORD` 변수값이 반드시 필요한데, 이럴 땐 배포용 Compose 파일에서 `services.<서비스명>.environment` 부분에 해당 내용을 `변수명: 값` 또는 `- 변수명=값` 형태로 넣어주면 된다.

아래 예시는 MySQL 8 이미지에 `MYSQL_ROOT_PASSWORD` 환경변수값을 `password`로 지정하여 둔 Compose 파일 내용이다.

```yaml
version: '3.9'
services:
  mysql:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: password
```

### 2\. 쉘 환경변수로 등록하기

쉘 환경에서 변수를 선언한 뒤 이를 Compose 파일에 반영되도록 하는 방법도 있다. 예를 들어 아래와 같은 명령을 커맨드라인으로 입력해 둔 상황을 가정해보자.

```bash
$ export MYSQL_ROOT_PASSWORD=password
```

이때 Compose 파일은 아래와 같이 작성한다. `services.mysql.environment` 부분의 `MYSQL_ROOT_PASSWORD` 항목값이 `${MYSQL_ROOT_PASSWORD}`으로 대체된 것에 주목하자. **`YAML` 파일 외부로부터 환경변수를 주입받을 때, 그 값이 주입될 부분은 `${변수명}` 또는 `$변수명`의 형태로 명시**하도록 한다. 여기서는 외부 환경변수값이라는 점을 보다 잘 드러내기 위해 `${변수명}` 문법을 따랐다.

```yaml
version: '3.9'
services:
  mysql:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
```

이 상태에서 배포용 Compose 파일을 `convert` 시켜보면, 아래와 같이 쉘에서 등록한 변수값이 변수명에 대응하여 삽입된 것을 볼 수 있다.

```bash
$ docker compose convert
# ...
# environment:
#   MYSQL_ROOT_PASSWORD: password
```

### 3\. 환경변수 파일로 구성하기

배포용 Compose 파일에 환경변수를 하나하나 다 적어넣거나, 매번 쉘에서 변수로 직접 선언시키는 방법은 다소 비효율적이다. **필요한 환경변수 항목들만 골라내어 별도의 파일로 구성**해 둔다면 환경변수 관리를 보다 효율적으로 할 수 있을 것이다. 여기서는 실제 활용 시나리오에 따라 아래의 세 가지 방법으로 나누어 소개한다.

1.  하나의 `.env` 파일로 구성하기
2.  여러 개의 파일로 구성하기
3.  각 서비스마다 다른 환경변수 파일 반영하기

#### 3-1. 하나의 `.env` 파일로 구성하기

Docker Compose에서 환경변수 정보들을 떼어 별도의 파일로 구성할 때 가장 간편한 방법은 **Compose 파일이 위치한 동일 경로에 `.env` 파일을 따로 구성**하는 것이다. 이 `.env` 파일은 평문 텍스트 포맷으로, 아래의 문법을 따라 작성해야 한다.

-   각 줄마다 `변수명=값`의 형태로 입력한다.
-   주석 처리는 `#` 문자를 이용한다.
-   비어있는 줄은 무시된다.
-   따옴표 처리(`''`, `""`)는 불필요하다. 입력된 따옴표는 위치에 따라 `변수명`이나 `값`의 일부분으로 간주된다.

이렇게 작성된 `.env` 파일은 별다른 설정 없이도 Compose 파일에 바로 반영된다. 아래 Compose 파일을 예시로 살펴보자.

```yaml
version: '3.9'
services:
  mysql:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
```

위에서 `${MYSQL_ROOT_PASSWORD}`로 명명된 자리에 들어갈 값을 `.env` 파일에 아래와 같이 삽입한다.

```bash
MYSQL_ROOT_PASSWORD=password
```

이 상태에서 Compose 파일을 `convert` 시켜보면 아래와 같이 출력되는 것을 볼 수 있다.

```bash
$ docker compose convert
# ...
# environment:
#   MYSQL_ROOT_PASSWORD: password
```

이처럼 `.env` 파일을 이용하는 방식은 간편하기는 하지만, 오직 **Docker Compose에서 `docker compose up` 명령을 수행할 때에만 활용 가능**하다는 점에 유의하자. Docker Swarm에서 `docker stack deploy`를 실행할 경우에는 `.env` 파일을 사용할 수 없다.

#### 3-2. 여러 개의 파일로 구성하기

경우에 따라 여러 개의 환경변수 파일로 나누는 일이 필요할 수 있다. 이를테면 개발환경(`dev`)과 운영환경(`prod`)에 따라 주입해야 할 값들이 다른 경우를 가정해 볼 수 있다. 이런 경우엔 **각각의 환경에 맞는 별도의 `env_file`을 구성한 뒤, 배포할 때 `--env-file <파일경로>` 플래그로 불러올 파일을 직접 지정**할 수 있다.

예를 들어 아래와 같이 `.env.dev`와 `.env.prod` 파일을 각각 생성했다고 가정하자.

```bash
$ cat ./config/.env.dev
MYSQL_ROOT_PASSWORD=passwd_dev

$ cat ./config/.env.prod
MYSQL_ROOT_PASSWORD=passwd_prod
```

이 상태에서 Docker Compose의 `--env-file ./config/.env.dev` 플래그를 이용하면 해당 파일에 입력된 환경변수가 주입되는 것을 확인할 수 있다.

```bash
$ docker compose --env-file ./config/.env.dev config
# ...
# environment:
#   MYSQL_ROOT_PASSWORD: passwd_dev
```

#### 3-3. 각 서비스마다 다른 환경변수 파일 반영하기

때로는 각 서비스(컨테이너)에 대한 환경변수 파일을 별도로 관리해야 할 수도 있다. 이런 경우에는 **Compose 파일에 명시된 각 서비스 안에 `env_file` 항목을 함께 포함**시켜줄 수 있다. 만약 이 항목을 따로 명시하지 않았다면, 기본적으로는 `env_file: .env`이 적용된 상태라고 보아도 무방하다.

```yaml
version: '3.9'
services:
  mysql:
    env_file: # 파일이 여러 개라면 리스트 형태로 삽입한다.
      - a.env
      - b.env
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
```

이때 유의해야 할 사항이 있다. 위와 같이 여러 개의 환경변수 파일을 삽입했는데, 만약 두 파일에 똑같은 변수명으로 서로 다른 값이 들어있다면 어떻게 될까? 이 경우엔 **삽입된 순서를 기준으로 나중에 삽입된 파일의 변수값이 적용**된다.

위의 `YAML` 내용을 기준으로 살펴볼 때, 만약 `a.env`에선 `VAR=alpha`이고 `b.env`에선 `VAR=beta`라면, 해당 서비스가 배포될 때엔 나중에 삽입된 `b.env`의 내용대로 `VAR=beta`로 적용된다. 이처럼 여러 환경변수 파일을 서비스에 반영할 때엔 환경변수의 중복 여부, 파일 삽입 순서 등에 주의하는 것이 좋다.

### 4\. Dockerfile에 환경변수를 직접 삽입하기

만약 환경변수를 `YAML`이나 별도의 외부 파일로 담아두는 것이 꺼려진다면, **Dockerfile에 `ARG` 또는 `ENV`를 이용하여 환경변수를 직접 삽입한 뒤 나만의 이미지를 빌드하여 사용**하는 방법도 있다. 앞서 예시로 살펴보았던 `MYSQL_ROOT_PASSWORD: password`는 Dockerfile에서 다음과 같이 표현 가능할 것이다.

```dockerfile
FROM mysql:8
ENV MYSQL_ROOT_PASSWORD password
```

위의 Dockerfile을 이용하여 빌드한 나만의 MySQL 이미지를 사용한다면, 배포용 `YAML` 또는 `.env` 파일에 별도로 해당 환경변수를 명시할 필요가 없어진다.

## 환경변수 값이 선택되는 우선순위

마지막으로, Docker Compose에서 환경변수가 주어진 방식에 따라 값이 선택되는 우선순위를 살펴보자. [Docker 공식 문서](https://docs.docker.com/compose/environment-variables/#set-environment-variables-with-docker-compose-run)에 따르면 그 우선순위는 다음과 같다.

1.  Compose 파일에 직접 입력한 값
2.  쉘 환경변수로 등록한 값
3.  환경변수 파일로 입력된 값(`.env` 등)
4.  Dockerfile을 통해 삽입된 값

좀 더 직관적으로 이해할 수 있도록, 위에서 살펴본 네 가지 방법이 서로 중복되어 사용되었을 때 Docker Compose가 환경변수 값을 선택하는 방식을 알아보기로 하자.

### 우선순위 결정 예시

우선, Dockerfile로 아래와 같이 `seongjin_mysql`이라는 이미지를 빌드했다고 가정하자.

```dockerfile
FROM mysql:8
ENV MYSQL_ROOT_PASSWORD passwd_from_dockerfile
```

그리고 쉘 환경에서 아래와 같이 환경변수를 직접 입력한다.

```bash
$ export MYSQL_ROOT_PASSWORD=passwd_from_shell
```

다음으로는 `.env` 파일을 만들어 아래와 같이 환경변수를 설정했다고 치자.

```bash
MYSQL_ROOT_PASSWORD=passwd_from_envfile
```

마지막으로 배포용 `YAML`은 아래와 같이 작성했다고 가정한다.

```yaml
version: '3.9'
services:
  mysql:
    image: seongjin_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: passwd_from_yaml
```

이러한 환경에서 `docker compose up`을 실행했을 때, 해당 서비스(컨테이너)에 적용된 환경변수 `MYSQL_ROOT_PASSWORD`의 최종값을 상황 별로 알아보면 다음과 같다.

-   위의 상태 그대로 진행했다면, `MYSQL_ROOT_PASSWORD`의 최종값은 `YAML`에 직접 삽입된 `passwd_from_yaml`이 된다.
-   만약 `YAML`의 환경변수 항목이 `MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}`로 대체된다면, `MYSQL_ROOT_PASSWORD`의 최종값은 쉘에서 커맨드라인으로 입력된 `passwd_from_shell`이 된다.
-   만약 `YAML`의 환경변수 항목이 `MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}`로 대체되고 쉘 환경에서의 환경변수 입력 과정이 생략된다면, `MYSQL_ROOT_PASSWORD`의 최종값은 `.env` 파일에 삽입된 `passwd_from_envfile`이 된다.
-   만약 `YAML`에서 환경변수 항목이 완전히 삭제되고, 쉘 환경에서의 환경변수 입력 과정이 생략되며, `.env` 파일도 따로 만들어지지 않았다면, `MYSQL_ROOT_PASSWORD`의 최종값은 Dockerfile을 통해 삽입된 `passwd_from_dockerfile`이 된다.

## 보안 정보를 다룰 때의 한계점

지금까지 살펴본 Docker Compose에서의 환경변수 관리 방법에는 공통적인 단점이 하나 있다. **모든 정보가 평문(`plain text`)으로 저장**된다는 것이다. 이번 글에서는 환경변수의 예시로 MySQL 이미지의 `root` 패스워드를 다루었지만, 사실 이처럼 **중요한 보안 정보가 평문 상태로 호스트에 남아있도록 하는 것은 보안 측면에서 결코 바람직하지 않다.**

아쉽게도 Docker 자체만으로는 환경변수에 쓰인 보안 정보를 보호할 방법이 마땅치 않아 보인다. 물론 실제 운영 환경에서는 이를 보완하기 위한 다양한 방법들이 마련되어 있을 것이다.

-   이를테면 외부에 노출되지 않는 **프라이빗 레지스트리**를 구축한 뒤 보안 정보가 포함된 전용 이미지를 빌드하면서 운영하는 방법을 고려할 수 있다. 다만 이 경우 해당 보안 정보가 이미지의 특정 레이어에 계속 남게 되므로 이미지와 레지스트리 관리에 신중해야 할 것이다.
-   **쿠버네티스(Kubernetes), 도커 스웜(Docker Swarm)** 등 컨테이너 오케스트레이션 도구에서는 이러한 보안 정보를 조금 더 안전히 다룰 수 있는 **시크릿(Secret)**을 제공한다. AWS, Azure 등 주요 클라우드 서비스 제공자들이 지원하는 컨테이너 인스턴스들 역시 환경변수를 설정할 때 이러한 시크릿(Secret) 기능을 간편히 이용할 수 있도록 배려하고 있다.
-   만약 이보다 더욱 강화된 형태의 보안이 필요하다면 [하시코프 볼트(HashiCorp Vault)](https://www.vaultproject.io/) 등의 솔루션을 고려하는 것도 좋겠다.

## 맺음말

Docker Compose에서는 다양한 방식의 환경변수 관리 방법을 제공한다. 각 방법이 가진 구현법과 특성, 그리고 환경변수가 실제 애플리케이션에 적용될 때 그 방법에 따라 주어지는 우선순위를 숙지한다면 컨테이너 기반 서비스 운영에 도움이 되리라 생각한다.

그러나 Docker 환경에서 보안 정보를 환경변수로 다룰 때, 그것이 시스템에 평문으로 남아있게 된다는 점에는 반드시 유의해야 한다. 나 역시 블로그 데이터를 SQLite3에서 MySQL로 마이그레이션 하는 과정에서 이 문제를 마주하게 되었고, 이때문에 많은 고민을 반복해야 했다. 이어지는 포스팅 시리즈에서는 그 고민의 결과로 실험하게 된 **도커 스웜(Docker Swarm)**과 **시크릿(Secret)**을 소개하고, 이것을 블로그에 적용한 방법에 대해 공유하고자 한다.

## 참고자료

-   [Docker Docs: Compose file version 3 reference](https://docs.docker.com/compose/compose-file/compose-file-v3)
-   [Docker Docs: Environment variables in Compose](https://docs.docker.com/compose/environment-variables/)
-   [Docker Docs: Declare default environment variables in file](https://docs.docker.com/compose/env-file/)
