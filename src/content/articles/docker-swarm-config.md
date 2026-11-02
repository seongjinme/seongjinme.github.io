---
title: "Docker Swarm에서 컨픽(Config)으로 컨테이너에 설정값 삽입하고 관리하기"
description: "이번 글에서는 도커 스웜(Docker Swarm)에서 컨테이너 기반 서비스를 운영할 때 필요한 설정값이나 파일을 간편하게 삽입할 수 있는 컨픽(Config) 기능을 살펴본다."
pubDate: "2022-09-06T07:54:13.000Z"
tags: ["docker"]
---

현재 이 블로그에는 [리버스 프록시(Reverse Proxy)](https://www.cloudflare.com/ko-kr/learning/cdn/glossary/reverse-proxy/) 용도로 [`nginx-proxy`](https://hub.docker.com/r/nginxproxy/nginx-proxy) 컨테이너가 붙어있다. 이 컨테이너는 `http`를 통해 이루어지는 파일 업로드 용량을 최대 `2MB`로 제한한다.

나는 블로그에 이미지, 테마 등 고용량의 파일을 업로드할 일이 종종 있기 때문에 이 용량을 `8MB`로 올려서 사용 중이다. 처음에는 [이 포스팅](/how-to-build-ghost-blog-with-docker/#2-reverse-proxy-nginx-proxy-)에서 소개했던 것처럼 `client_max_body_size` 값을 `8M`으로 명시한 별도의 설정 파일(`.conf`)을 만든 뒤, `nginx-proxy` 컨테이너의 `/etc/nginx/conf.d/` 경로에 읽기 전용 모드로 `bind-mount`하여 구현했었다.

```yaml
services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    ...
    volumes:
      ...
      - /home/ubuntu/blog/conf/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro
      ...
```

이 방법은 간단하고 직관적이다. 이 컨테이너를 오직 하나의 호스트에서만 운영할 계획이라면 별 문제가 없을 것이다. 하지만 여러 노드로 구성된 클러스터에선 사정이 복잡해진다. 지난 글에서 [`bind-mount` 방식의 볼륨 연결이 가지는 문제점](/docker-swarm-services/#bind-mount)을 이미 살펴본 바 있다. 위와 같이 볼륨을 설정한다면, 결국에는 가용한 모든 노드의 동일한 호스트 경로에 오직 이 컨테이너를 위한 `.conf` 파일을 하나하나 배치시켜야 하는 상황에 이르게 된다. 애플리케이션을 컨테이너화하여 얻는 강점 중 하나가 호스트 환경에 대한 의존성 감소다. `bind-mount`는 그 강점을 무용하게 만든다.

만약 별도의 전용 이미지 레지스트리를 구축해 둔 환경이라면 도커파일(Dockerfile)을 이용하여 나만의 이미지를 직접 빌드하는 방법도 있겠다. 하지만 이번에 소개할 **컨픽(Config)**을 이용한다면, 이런 수고로움 없이도 내가 원하는 설정값 또는 파일을 도커 스웜(Docker Swarm)의 서비스(Service)에 반영시킬 수 있다.

## 컨픽(Config)의 용도와 특징

도커 스웜(Docker Swarm)에서 컨픽(Config)은 **보안에 민감하지 않은 컨테이너 설정 정보를 클러스터 단위에서 관리**하는 용도로 쓰인다. 이미지 기반 컨테이너 구동에 필요한 설정 파일이나 설정값들을 외부에서 주입해야 할 때에 유용하다.

컨픽을 활용할 때 숙지해야 할 특징들을 요약하면 다음과 같다.

-   **오직 도커 스웜 모드에서 생성된 서비스에만 사용 가능**하다. `docker` 또는 `docker compose` 명령으로 생성된 개별 컨테이너에는 사용할 수 없다.
-   **컨픽에 포함된 데이터는 암호화 되지 않는다.** 접근 권한이 있는 모든 노드에서 평문으로 내용을 확인할 수 있다.
-   서비스에 삽입된 컨픽은 **해당 태스크(컨테이너)의 파일시스템에 직접 마운트된다.**
-   **컨픽은 언제든 서비스에 추가 또는 삭제될 수 있다.** 컨픽의 추가나 삭제가 발생한 서비스의 태스크(컨테이너)는 그 즉시 종료되고 새로 생성되어 스케줄링 된다.
-   하나의 컨픽은 여러 서비스가 함께 사용할 수 있다.
-   하나의 서비스는 여러 컨픽을 동시에 사용할 수 있다.
-   현재 구동 중인 서비스와 연결되어 있는 컨픽은 클러스터에서 임의로 제거할 수 없다. 오직 서비스와의 연결을 끊은 후에만 제거가 가능하다.
-   컨픽이 포함된 채로 동작 중인 태스크(컨테이너)는 해당 노드가 클러스터와 연결이 끊어지더라도 일단은 동작 상태를 유지한다. 그러나 클러스터와 노드가 다시 연결되지 않는 한, 컨픽 내용의 추가/수정/삭제는 불가능하다.
-   도커 스웜에서는 `docker service inspect` 명령으로 특정 서비스에 어떤 컨픽들이 연결되어 있는지 확인할 수 있다. 그러나 반대로 특정 컨픽이 클러스터의 어느 서비스에 연결되어 있는지 알아볼 수 있는 방법은 아직 없다.

## 컨픽(Config) 활용 입문

### 컨픽 생성하기

컨픽은 `docker config create` 명령으로 생성한다. 문법은 다음과 같다.

```bash
docker config create <컨픽명> <파일경로|->
```

명령어의 마지막 인수로는 `파일경로` 또는 `-` 중 하나를 입력한다. 무엇을 입력하는가에 따라 컨픽을 생성하는 방법이 달라진다.

1.  `파일경로`를 입력할 경우, 지정된 경로의 텍스트 파일 내용을 읽어들여 생성한다.
2.  `-`를 입력할 경우, `STDIN`으로 들어온 입력값을 받아서 생성한다.

```bash
# 1. 지정된 경로의 텍스트 파일 내용을 읽어들여 생성한다.
docker config create my-config ~/my-config.conf

# 2. `STDIN`으로 들어온 입력값을 받아서 생성한다.
echo "this is my config" | docker config create my-config -
```

`--label` 또는 `-l` 플래그를 사용하면 컨픽에 `키=값` 형태의 레이블을 추가할 수 있다. 플래그 하나당 하나씩의 레이블이 추가된다. 여러 개의 레이블을 추가하려면 각각의 `키=값` 항목 앞에 플래그를 붙여주면 된다. 이 레이블은 컨픽으로 삽입될 값에 영향을 미치지 않는다. 오직 개별 컨픽 항목들 간의 구분을 비롯한 관리상 편의를 위해 쓰인다.

```bash
# 파일로부터 불러들인 값으로 `my-config`란 컨픽을 생성하고,
# 여기에 env=DEV, date=20220901 이란 레이블을 추가한다.
docker config create \
	--label env=DEV \
	--label date=20220901 \
	my-config ~/my-config.conf
```

### 컨픽 정보 조회하기

현재 클러스터에 저장되어 있는 컨픽 목록은 `docker config ls` 명령어로 확인할 수 있다.

```bash
ubuntu@sjhong-node-01:~$ docker config ls

ID                          NAME        CREATED              UPDATED
pfg1utw1q5w72q9bja4zor542   my-config   About a minute ago   About a minute ago
```

개별 컨픽의 상세 내용은 `docker config inspect <컨픽명|컨픽ID값>`으로 확인할 수 있다. 별도의 플래그를 붙이지 않았다면 `JSON` 포맷으로 출력된다. 이 출력물에는 컨픽 자체의 고유 ID값과 생성일, 라벨, 원본 데이터 등의 정보가 담겨있다.

```bash
ubuntu@sjhong-node-01:~$ docker config inspect my-config

[
    {
        "ID": "j1xbrhfjeshm1moxe7zgczrk8",
        "Version": {
            "Index": 2043
        },
        "CreatedAt": "2022-09-05T12:01:34.308994929Z",
        "UpdatedAt": "2022-09-05T12:01:34.308994929Z",
        "Spec": {
            "Name": "my-config",
            "Labels": {
                "date": "20220901",
                "env": "DEV"
            },
            "Data": "dGhpcyBpcyBteSBjb25maWcK"
        }
    }
]
```

위의 출력물에서 컨픽으로 저장된 실제 데이터 값은 `.Spec.Data`에 있는데, 이 값은 컨픽 생성시 입력된 텍스트 데이터를 단순히 `base64`로 인코딩한 것이다. 이처럼 문자열 데이터를 통해 생성된 컨픽의 내용은 `base64 --decode`를 통해 원래 데이터를 바로 확인할 수 있다.

```bash
ubuntu@sjhong-node-01:~$ echo "dGhpcyBpcyBteSBjb25maWcK" | base64 --decode

# 컨픽 생성시 쓰인 데이터 값이 원문 그대로 출력된다.
this is my config
```

`docker config inspect`에 `--format` 플래그를 더하여 `.Spec.Data` 경로로 직접 접근하면 아스키(ASCII) 코드로 이루어진 문자 배열이 그대로 노출되는 것을 볼 수 있다.

```bash
ubuntu@sjhong-node-01:~$ docker config inspect --format='{{.Spec.Data}}' my-config

# ASCII 코드 문자 배열이다. 해석하면 "this is my config\n"이 된다.
[116 104 105 115 32 105 115 32 109 121 32 99 111 110 102 105 103 10]
```

`--format` 플래그 대신 `--pretty` 플래그를 통해서도 컨픽에 포함된 데이터 원문을 확인할 수 있다.

```bash
ubuntu@sjhong-node-01:~$ docker config inspect --pretty my-config

# ID, Name, Label, 생성/업데이트 날짜 및 원문 데이터가 출력된다.
ID:			j1xbrhfjeshm1moxe7zgczrk8
Name:			my-config
Labels:
 - date=20220901
 - env=DEV
Created at:            	2022-09-05 12:01:34.308994929 +0000 utc
Updated at:            	2022-09-05 12:01:34.308994929 +0000 utc
Data:
this is my config
```

### 컨픽 삭제하기

삭제할 컨픽 항목이 있다면, `docker config rm <컨픽명>`을 입력한다. **클러스터의 특정 서비스와 연결되지 않은 컨픽 항목만 삭제 가능**하며, 그렇지 않은 경우엔 에러 메시지가 출력된다. 이에 대해서는 아래에서 이어질 컨픽 활용 과정에서 다시 다룰 것이다.

## 컨픽(Config)을 서비스에 활용하기

이제 도커 스웜(Docker Swarm)에서 컨픽을 서비스에 삽입하여 활용하는 방법을 살펴보자. 그 예시로, 글 서두에 소개했던 `nginx` 서비스의 최대 업로드 용량 변경 사례를 `bind-mount` 대신 컨픽으로 대체해서 구현할 것이다. 이를 위해 아래와 같이 두 개의 컨픽과 한 개의 환경변수를 이용하기로 한다.

1.  `nginx` 서비스에 변경된 파일 업로드 용량을 적용시킬 설정 파일 **컨픽(`size.conf`)**
2.  설정된 업로드 용량을 확인할 수 있는 `index` 파일 **컨픽(`index.html`)**
3.  `nginx` 서비스 생성 시점에 업로드 용량을 정할 수 있는 **환경변수(`BODY_SIZE`)**

### 컨픽 생성용 템플릿 만들기

우선 `size.conf` 컨픽을 위한 템플릿 파일(`size.conf.tmpl`)을 아래와 같이 생성한다.

```bash
server {
    client_max_body_size    {{ env "BODY_SIZE" }};
}
```

-   `nginx` 서비스의 `server` 모듈에 포함시킬 설정 항목으로 `client_max_body_size`를 추가한다.
-   일반적으로는 `client_max_body_size 8M;`과 같이 입력하지만, 환경변수 `BODY_SIZE`로 입력된 값을 주입하여 서비스 생성 시점에 용량을 자유롭게 정할 수 있도록 값 부분에 `{{ env "BODY_SIZE" }}`를 대신 입력한다.

다음으로는 `index.html` 컨픽용 템플릿 파일(`index.html.tmpl`)을 생성한다. 이 파일은 `nginx` 서비스가 구동 중인 노드에 접속했을 때 사용자에게 노출될 내용을 담고 있다.

```html
<html lang="ko">
  <head>
    <title>여기는 {{ .Service.Name }} 서비스입니다.</title>
  </head>
  <body>
    <p>현재 "client_max_body_size"의 설정값은 {{ env "BODY_SIZE" }} 입니다.</p>
  </body>
</html>
```

-   `{{ .Service.Name }}`는 이 템플릿이 동작할 서비스명이 주입될 자리다.
-   `{{ env "BODY_SIZE" }}`는 서비스 구동시 입력받을 환경변수 `BODY_SIZE`의 값이 주입될 자리다.

### 각 템플릿으로 컨픽 생성하기

이렇게 해서 만들어진 각 템플릿 파일을 아래와 같이 컨픽으로 생성시킨다.

```bash
docker config create --template-driver golang size.conf size.conf.tmpl

docker config create --template-driver golang index.html index.html.tmpl
```

-   `--template-driver`는 지정된 템플릿 엔진을 이용하여 컨픽 데이터가 실제로 컨테이너에 주입될 때 템플릿에 지정된 내용들을 채워넣도록 하는 플래그다. 여기서는 `golang`을 사용한다.

### 컨픽을 서비스에 적용하기

이제 컨픽과 환경변수를 포함한 서비스 `nginx`를 클러스터에 배포시킨다.

```bash
docker service create \
  --name nginx \
  --env BODY_SIZE="8M" \
  --config source=index.html,target=/usr/share/nginx/html/index.html \
  --config source=size.conf,target=/etc/nginx/conf.d/size.conf,mode=0440 \
  --publish published=3000,target=80 \
  --replicas 3 \
  nginx:latest
```

-   `--env` 플래그로 개별 환경변수를 `변수명=값` 형태로 지정한다. 여기서는 `BODY_SIZE="8M"`으로 정했다.
-   `--config` 플래그로 개별 컨픽을 서비스에 주입시킨다. `source`에는 컨픽 이름을, `target`에는 컨픽 내용을 주입시킬 컨테이너 호스트 경로를 명시한다. `mode`는 선택 사항이며, 컨테이너로 주입된 데이터 파일의 권한을 지정하는 부분이다.
-   `--publish`와 `--replica`에 대한 설명은 [이 포스트](/docker-swarm-services/#%EC%84%9C%EB%B9%84%EC%8A%A4-%EC%83%9D%EC%84%B1%ED%95%98%EA%B8%B0)를 참고하도록 하자.

### 컨픽 적용 여부 확인하기

`nginx` 서비스와 태스크 배포가 잘 마무리 되었다면, 이제 지정한 컨픽들이 잘 적용되었는지 확인할 차례다. 컨테이너에 접근해서 확인해야 할 컨픽별 경로는 다음과 같다.

-   `size.conf` 컨픽 → `/etc/nginx/conf.d/size.conf`
-   `index.html` 컨픽 → `/usr/share/nginx/html/index.html`

**쿠버네티스와 달리, 도커 스웜에서는 개별 컨테이너 내부로 접근하려면 그 컨테이너가 돌아가고 있는 호스트에 접속한 상태여야만 한다.** 예를 들어 `sjhong-node-03` 노드에 할당된 태스크의 컨테이너에 접속해서 무언가를 체크해야 할 경우, 관리자는 `SSH` 등을 통해 `sjhong-node-03`로 직접 이동해서 `docker exec` 명령을 실행해야 한다는 뜻이다.

앞서 배포된 `nginx` 서비스는 3개의 레플리카로 구성되었다. 각 레플리카가 어느 노드에 배치되었는지 먼저 확인해보자.

```bash
ubuntu@sjhong-node-01:~$ docker service ps nginx

ID             NAME      IMAGE          NODE             DESIRED STATE   CURRENT STATE            ERROR     PORTS
ewsa3mch16ki   nginx.1   nginx:latest   sjhong-node-02   Running         Running 16 minutes ago
4kv9rkd47vfl   nginx.2   nginx:latest   sjhong-node-03   Running         Running 16 minutes ago
tg8ig98bpogu   nginx.3   nginx:latest   sjhong-node-01   Running         Running 16 minutes ago
```

다행히 현재 접속 중인 노드를 포함하여 모든 노드에 하나씩 골고루 배치되어 있다. 현재는 `sjhong-node-01` 노드에 접속 중이므로, 이런 경우에는 `nginx.3` 태스크에 포함된 컨테이너 내부에 직접 접근이 가능할 것이다.

우선 `size.conf` 컨픽이 반영되어야 할 `/etc/nginx/conf.d/` 경로부터 살펴보자.

```bash
# 컨테이너에 접근하여 명령을 수행하고자 할 때에는
# docker container exec <플래그> <컨테이너ID> <명령어 조합> 형태로 실행한다.
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=nginx -q) ls -al /etc/nginx/conf.d

total 24
drwxr-xr-x 1 root root 4096 Sep  6 00:10 .
drwxr-xr-x 1 root root 4096 Aug 23 03:58 ..
-rw-r--r-- 1 root root 1093 Sep  6 00:10 default.conf
-r--r----- 1 root root   41 Sep  6 00:10 size.conf
```

앞서 컨픽으로 생성하여 연결했던 `size.conf` 파일이 지정된 경로에 잘 삽입되었다. 원하는 내용이 파일에 잘 반영되어 있는지도 한 번 확인해보자. 앞서 환경변수 `BODY_SIZE`로 입력한 `8M`이란 값이 올바르게 들어간 것을 알 수 있다.

```bash
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=nginx -q) cat /etc/nginx/conf.d/size.conf

server {
    client_max_body_size    8M;
}
```

다음으로 `index.html` 컨픽의 반영 여부도 체크해보자. 아래와 같이 `curl` 명령을 실행시켜보면, `index.html` 컨픽으로 올린 템플릿과 환경변수 `BODY_SIZE`의 설정값 `8M`이 모두 잘 반영된 것을 확인할 수 있다.

```bash
ubuntu@sjhong-node-01:~$ curl localhost:3000

<html lang="ko">
  <head>
    <title>여기는 nginx 서비스입니다.</title>
  </head>
  <body>
    <p>현재 "client_max_body_size"의 설정값은 8M 입니다.</p>
  </body>
</html>
```

여기서 환경변수로 삽입된 값은 `docker service update` 명령에 `--env-add` 또는 `--env-rm` 플래그를 더하여 언제든 바꾸거나 제거할 수 있다.

```bash
# 8M으로 설정되었던 BODY_SIZE 환경변수 값을 10M으로 바꾼다.
docker service update --env-add BODY_SIZE=10M nginx

# 컨테이너에 들어간 size.conf를 확인하면 용량이 바뀐 것을 확인할 수 있다.
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=nginx -q) cat /etc/nginx/conf.d/size.conf

server {
    client_max_body_size    10M;
}
```

### 사용 중인 컨픽 교체하기

일단 생성된 컨픽의 데이터를 바꾸는 것은 불가능하다. 만약 컨픽에 삽입된 데이터를 변경하고 싶다면, 새 컨픽을 생성한 뒤 `docker service update` 명령으로 기존 컨픽이 마운트 된 경로에 해당 컨픽을 새로 연결시켜 주어야 한다.

먼저 아래와 같은 내용으로 `size-new.conf`라는 새 컨픽을 생성한다.

```bash
server {
    client_max_body_size    {{ env "BODY_SIZE" }};
    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm index.php;
    }
}
```

그리고 `docker service update` 명령으로 기존의 `nginx` 서비스에 새 컨픽을 적용시킨다.

```bash
docker service update \
  --config-rm size.conf \
  --config-add source=size-new.conf,target=/etc/nginx/conf.d/size.conf,mode=0440 \
  nginx
```

-   `--config-rm` 플래그는 기존에 마운트 되어 있던 컨픽을 해제시킨다. 이때에는 `source`에 해당하는 컨픽명만 명시한다.
-   `--config-add` 플래그는 새 컨픽을 마운트시킨다. `source`에는 컨픽명을, `target`에는 마운트 위치를 지정한다. 여기서는 기존에 `size.conf` 컨픽이 연결되어 있던 경로를 그대로 명시해준다.

`nginx` 서비스의 업데이트 과정이 끝나면, 아까와 같은 방법으로 `/etc/nginx/conf.d/` 경로의 `size.conf` 파일에 바뀐 내용이 잘 반영되어 있는지 체크한다.

```bash
docker container exec $(docker ps --filter name=nginx -q) cat /etc/nginx/conf.d/size.conf

# 새로 생성한 size-new.conf 컨픽 내용이 주입된 것을 볼 수 있다.
server {
    client_max_body_size    8M;
    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm index.php;
    }
}
```

참고로 `docker service update` 명령은 해당 서비스의 기존 태스크를 종료시킨 뒤, 새로 바뀐 내용이 포함된 태스크를 클러스터에 새로 스케줄링시킨다. 따라서 해당 컨테이너의 고유 `ID`값 또한 갱신된다. 그러므로 해당 컨테이너에 접속하려면 `docker ps` 명령을 이용하여 바뀐 `ID`값을 새로 찾아야 한다. 위와 같이 `$(docker ps --filter name=<서비스명> -q)` 명령을 다른 도커 명령어와 조합하면, 이처럼 때때로 달라지는 `ID`값을 찾는 수고를 줄일 수 있다.

### 컨픽 연결 해제하고 삭제하기

아까 잠시 살펴보았던 `docker config rm` 명령으로 `nginx` 서비스에 연결된 컨픽을 삭제해보자. 삭제가 되는 대신 아래와 같은 에러 메시지가 출력될 것이다.

```bash
# docker config rm index.html 실행 결과
ubuntu@sjhong-node-01:~$ docker config rm index.html

Error response from daemon: rpc error: code = InvalidArgument desc = config 'index.html' is in use by the following service: nginx
```

클러스터의 특정 서비스와 연결된 컨픽은 연결이 해제되기 전까진 임의로 삭제할 수 없다. 어딘가에 연결되어 사용 중인 컨픽이라면, 삭제하기 전에 연결 해제 작업을 먼저 완료시켜 주어야 한다. 앞서 컨픽을 교체할 때 썼던 `docker service update --config-rm` 명령을 이용하면 서비스와 컨픽 간의 연결을 해제할 수 있다.

```bash
# nginx 서비스에 연결되어 있던 컨픽들을 모두 제거한다.
ubuntu@sjhong-node-01:~$ docker service update --config-rm size-new.conf --config-rm index.html nginx

# Service converged 메시지가 뜰 때까지 대기한다.
nginx
...
verify: Service converged
```

이제 컨픽들이 제거된 `nginx` 서비스의 상태를 확인해보자. 먼저 컨테이너 안의 `/etc/nginx/conf.d` 경로부터 살펴본다. 기존에 삽입되었던 `size.conf` 파일이 제거된 것을 알 수 있다. 컨픽 연결이 끊어지면, 해당 컨픽에 대응하는 내용 또한 컨테이너의 파일시스템에서 사라진다.

```bash
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=nginx -q) ls -al /etc/nginx/conf.d

total 20
drwxr-xr-x 1 root root 4096 Sep  6 04:42 .
drwxr-xr-x 1 root root 4096 Aug 23 03:58 ..
-rw-r--r-- 1 root root 1093 Sep  6 04:42 default.conf
```

컨테이너 안의 `index.html` 페이지도, 컨픽으로 주입되었던 템플릿 내용이 제거되고 기존의 "Welcome to nginx!" 페이지로 대체된 것을 확인할 수 있다.

```bash
ubuntu@sjhong-node-01:~$ curl localhost:3000

<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

## 참고자료

-   [Docker Docs : Store configuration data using Docker Configs](https://docs.docker.com/engine/swarm/configs/)
-   [Docker Docs : docker config](https://docs.docker.com/engine/reference/commandline/config/)
-   [Docker Docs : docker service create](https://docs.docker.com/engine/reference/commandline/service_create/)
-   [Docker Docs : docker service update](https://docs.docker.com/engine/reference/commandline/service_update/)
