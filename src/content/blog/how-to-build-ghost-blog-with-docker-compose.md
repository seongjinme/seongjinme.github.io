---
title: "Docker Compose로 Ghost 기반 기술 블로그를 간편하게 만들고 제어하기"
description: "Docker는 Docker Compose와 함께 쓰일 때 더욱 편리해진다. 더 이상 무언가를 바꿀 때마다 \"docker rm -f\"와 \"docker run\"을 반복할 필요가 없다. Docker Compose로 여러 개의 컨테이너를 선언적으로 정의하여, 손쉽게 배포하고 제어하는 방법을 소개한다."
pubDate: "2022-01-24T12:27:00.000Z"
updatedDate: "2022-07-26T02:26:49.000Z"
tags: ["docker", "blog", "career", "ghost-tag"]
featureImage: "/content/images/2022/02/cover-6.jpg"
---

[지난 글](/how-to-build-ghost-blog-with-docker/)에서 Docker와 Ghost CMS로 Amazon Lightsail에 기술 블로그를 간단히 개설하는 과정을 소개했다. Docker 환경에서는 Docker Engine만 설치되어 있다면 어디서든 원하는 구성으로 애플리케이션을 큰 무리 없이 배포할 수 있으므로, 내게 필요한 스택을 사전에 하나하나 준비해야 하는 스트레스로부터 자유로울 수 있다는 강점이 있다.

## CLI 명령어 만으로 Docker를 쓸 때의 문제점

그러나 오직 명령어 만으로 컨테이너를 운영하는 일에는 아래와 같은 불편이 따른다.

1.  **컨테이너의 생성 이력을 알기 어렵다.** CLI 환경에서 입력한 명령어의 내용은 해당 사용자의 세션 종료 후엔 휘발된다. 만약 컨테이너 생성시 함께 설정해 놓은 사항들을 별도로 저장해두지 않았다면 관리자가 컨테이너 정보를 직접 하나하나 살펴가며 찾아야 한다.
2.  **여러 컨테이너를 함께 관리하기 어렵다.** 일반적인 환경에서 하나의 컨테이너 만으로 무언가를 운영하는 경우는 흔치 않으며, 대개는 여러 컨테이너의 조합을 통해 원하는 애플리케이션 구동 환경을 갖추게 된다. 이들을 하나하나 수동으로 관리하는 것은 대단히 번거로운 일이다.

앞서 소개한 Docker 기반 Ghost 블로그는 리버스 프록시 역할의 `nginx-proxy` 컨테이너와 SSL 자동 인증 역할의 `nginx-proxy-acme` 컨테이너가 함께 올라가 있어야 동작한다. `nginx-proxy-acme` 역시 `nginx-proxy`에 의존하여 실행된다. 이들의 상호 의존성을 고려한 최적의 배포 설정값들을 오직 CLI 명령어 만으로 관리하는 것은 비효율적이다. 게다가 만약 실수로 각 컨테이너의 구동 순서가 뒤틀릴 경우, 블로그의 정상적인 동작도 어려워질 수 있다.

그렇다면, 어떻게 해야 여러 컨테이너를 동시에 의도한 대로 배포하고 간편하게 관리할 수 있을까? 만약 이들을 **여러 명령어의 지시적인(Imperative) 조합 대신, 하나의 파일로서 선언적으로(Declarative) 정의**하여 둔다면 불필요한 명령어의 반복 없이도 훨씬 효율적으로 관리해 나갈 수 있을 것이다. 이 고민을 해결해주는 도구가 바로 **Docker Compose**다.

## Docker Compose란?

**Docker Compose는 Docker의 컴포넌트 중 하나로, 여러 개의 컨테이너를 함께 정의하고 실행할 수 있는 도구다.** 앞서 명령어의 옵션 항목들로 하나 하나 지정했던 컨테이너 실행 조건들을 YAML 형식으로 명료하게 정리할 수 있다. Docker Compose를 이용하면 컨테이너들 간의 교신을 위해 필요한 네트워크 모드, 서로 공유되어야 하는 설정파일들, 상호 의존성 등을 보다 섬세하게 설정할 수 있다.

### Docker Compose 설치하기

Docker Compose는 Docker의 한 컴포넌트로 분류되지만, Docker에 기본으로 포함되어 있지 않으므로 추가 설치가 필요하다.

-   설치 방법은 [Docker Compose 공식 메뉴얼](https://docs.docker.com/compose/install/)을 참고한다. Docker Engine이 미리 설치되어 있어야 한다.
-   [Docker Desktop](https://www.docker.com/products/docker-desktop)에는 Docker Compose가 함께 포함되어 있다. 이 경우에는 별도로 설치할 필요가 없다.

## Docker 명령어를 Docker Compose로 변환하기

[앞선 글](/how-to-build-ghost-blog-with-docker/)에서 Lightsail에 배포했던 Ghost 블로그용 컨테이너들을 Docker Compose에 맞게 다시 구성해보자.

### 1\. "nginx-proxy" 컨테이너

`nginx-proxy` 컨테이너를 배포할 때 실제로 사용된 Docker 명령어는 다음과 같다.

```docker
$ sudo docker run --detach --name nginx-proxy \
    --publish 80:80 \
    --publish 443:443 \
    --volume certs:/etc/nginx/certs \
    --volume vhost:/etc/nginx/vhost.d \
    --volume html:/usr/share/nginx/html \
    --volume /home/ubuntu/blog/conf/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro \
    --volume /var/run/docker.sock:/tmp/docker.sock:ro \
    --restart unless-stopped \
    nginxproxy/nginx-proxy
```

이를 Docker Compose에서 지원하는 YAML 형식으로 변환하면 다음과 같다.

```yaml
version: '3.9'

services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped
    volumes:
      - conf:/etc/nginx/conf.d
      - certs:/etc/nginx/certs:ro
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /home/ubuntu/blog/conf/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro
      - /var/run/docker.sock:/tmp/docker.sock:ro
    network_mode: bridge

volumes:
  conf:
  certs:
  vhost:
  html:
  acme:
  ghost-data:
```

`version`은 [Docker Compose 파일 포맷의 버전](https://docs.docker.com/compose/compose-file/)을 의미한다. 크게 `version 3`과 `version 2`로 구분되며, 둘은 명령어 혹은 표기법이 조금씩 다르다. 각 버전 별로 호환되는 Docker Engine 버전의 범위 또한 다르므로 사전에 반드시 확인해주어야 한다.

`services` 안에는 실제로 배포하고자 하는 컨테이너(들)의 정보가 삽입된다. 이 항목 아래로 붙는 이름(`services.nginx-proxy`)은 실제 컨테이너 이름이 아니며, Docker Compose 상에서 서비스별 구분을 위해 짓는 이름이다. 여기서는 하위로 아래 항목들이 함께 기재되어 있다.

-   `image` : 컨테이너에 붙일 이미지 정보다. `docker run`에서 마지막에 명시한 이미지 정보(`nginxproxy/nginx-proxy`)가 이 항목에 들어간다.
-   `container_name` : 컨테이너의 이름이다. `docker run`의 `--name` 부분에 해당한다. 이 항목을 기재하지 않을 경우 컨테이너 구동시 `<서비스명>-<랜덤난수>` 형태의 이름이 임의로 생성된다.
-   `ports` : 오픈시킬 포트 목록을 삽입한다. `docker run`의 `--publish`와 대응된다.
-   `restart` : 컨테이너 종료시 재시작 정책을 정한다. `docker run`의 `--restart` 옵션과 같다.
-   `volumes` : 해당 컨테이너에 대한 볼륨 설정들이 이곳에 위치한다. 만약 도커 볼륨을 이용하고자 할 경우 `<볼륨명>:<할당할 호스트 경로>` 형태로 기재한다. 여기에 포함된 각 볼륨별 설명은 [이전글](/how-to-build-ghost-blog-with-docker/#2-reverse-proxy-nginx-proxy-)에서 확인할 수 있다. 특히 `client_max_body_size.conf` 파일의 경우,  호스트측 경로가 사용자 환경에 따라 각기 다를 수 있으므로 주의하자. 만약 이 파일이 필요하지 않은 환경이라면 해당 항목을 삭제한다.
-   `network_mode` : Docker Engine 내부에서 동작하게 될 컨테이너의 네트워크 모드를 설정한다. 기본값은 `bridge`이며, 이 경우 Docker Engine이 기본 제공하는 `docker0`이라는 `bridge` 네트워크를 통해 컨테이너들이 상호 통신하게 된다. [Docker의 네트워크 설정에 대해서는 이 문서에서 보다 자세히 확인할 수 있다.](https://docs.docker.com/engine/reference/run/#network-settings)

마지막으로 `services`와 같은 레벨로 위치한 `volumes`가 있다. 여기에는 `services` 하위에 위치한 각 컨테이너들에 설정된 도커 볼륨들의 볼륨명이 나열된다. 만약 볼륨명 없이 `호스트경로:컨테이너경로` 형태로만 지정된 경우는 여기에 포함되지 않는다.

이렇게 하면 `nginx-proxy` 컨테이너를 Docker Compose로 배포할 수 있는 YAML 파일이 완성된다.

### 2\. "nginx-proxy-acme", "ghost" 컨테이너

앞서 살펴본 방식대로 나머지 컨테이너들의 정보도 차례로 변환해보자. 우선 `nginx-proxy-acme` 컨테이너를 생성할 때 쓴 Docker 명령어는 다음과 같다.

```bash
$ sudo docker run --detach --name nginx-proxy-acme \
    --volumes-from nginx-proxy \
    --volume /var/run/docker.sock:/var/run/docker.sock:ro \
    --volume acme:/etc/acme.sh \
    --restart unless-stopped \
    nginxproxy/acme-companion
```

이를 YAML 포맷으로 변환한 결과는 아래와 같다.

```yaml
version: '3.9'

services:
  nginx-proxy-acme:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    depends_on:
      - "nginx-proxy"
    restart: unless-stopped
    volumes:
      - certs:/etc/nginx/certs:rw
      - acme:/etc/acme.sh
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /var/run/docker.sock:/var/run/docker.sock:ro
    network_mode: bridge

volumes:
  certs:
  acme:
  vhost:
  html:
```

앞서 `nginx-proxy` 컨테이너를 변환한 결과와 거의 같지만, 여기에 한 가지 다른 사항을 추가했다. 바로 `depends_on` 항목이다.

-   `depends_on`은 특정 서비스가 먼저 시작된 것을 확인한 후에 시작되도록 지시하는 항목이다. `nginx-proxy-acme`는 `nginx-proxy` 없이는 동작할 수 없으므로, 이들을 함께 배포했을 때 시작 순서를 정해주는 것이다. 이때 들어가는 이름은 컨테이너가 아닌 서비스명을 기준으로 한다.
-   단, 이 옵션은 명시된 서비스_(여기서는 `nginx-proxy`)_가 완전히 구동되어 리스닝(listening) 상태가 되었는지까지 체크하지는 않는다. 오직 시작 여부만 가지고 판단한다.

같은 방식으로 `ghost` 컨테이너도 변환해보자.

```bash
$ sudo docker run --detach --name ghost \
    --volume ghost-data:/var/lib/ghost/content \
    --env "VIRTUAL_HOST=seongjin.me,www.seongjin.me" \
    --env "VIRTUAL_PORT=2368" \
    --env "LETSENCRYPT_HOST=seongjin.me" \
    --env "LETSENCRYPT_EMAIL=<관리자 이메일 주소>" \
    --env "url=https://seongjin.me" \
    --restart unless-stopped \
    ghost:latest
```

변환 결과는 다음과 같다. 역시 `depends_on` 항목을 추가하여 `nginx-proxy`와 `nginx-proxy-acme` 서비스에 대한 의존성을 추가했다.

```yaml
version: '3.9'

  ghost:
    image: ghost:latest
    container_name: ghost
    depends_on:
      - "nginx-proxy"
      - "nginx-proxy-acme"
    restart: unless-stopped
    environment:
      - VIRTUAL_HOST=seongjin.me,www.seongjin.me
      - VIRTUAL_PORT=2368
      - LETSENCRYPT_HOST=seongjin.me
      - LETSENCRYPT_EMAIL=<관리자 이메일 주소>
      - url=https://seongjin.me
    volumes:
      - ghost-data:/var/lib/ghost/content
    network_mode: bridge

volumes:
  ghost-data:
```

### 3\. 세 컨테이너를 하나의 YAML 파일로 합치기

이제 지금까지 변환한 YAML 정보를 하나의 `docker-compose.yaml`로 모아보자. `nginx-proxy`, `nginx-proxy-acme`, `ghost` 컨테이너의 정보를 각각의 서비스로 묶어 `services` 하위에 두고, 각 컨테이너들이 공유하는 도커 볼륨 정보를 `volumes` 하위에 별도로 표기하여 준다.

이렇게 해서 정리된 `docker-compose.yaml` 파일의 최종 버전은 다음과 같다.

```yaml
version: '3.9'

services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped
    volumes:
      - conf:/etc/nginx/conf.d
      - certs:/etc/nginx/certs:ro
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /home/ubuntu/blog/conf/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro
      - /var/run/docker.sock:/tmp/docker.sock:ro
    network_mode: bridge

  nginx-proxy-acme:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    depends_on:
      - "nginx-proxy"
    restart: unless-stopped
    volumes:
      - certs:/etc/nginx/certs:rw
      - acme:/etc/acme.sh
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /var/run/docker.sock:/var/run/docker.sock:ro
    network_mode: bridge

  ghost:
    image: ghost:latest
    container_name: ghost
    depends_on:
      - "nginx-proxy"
      - "nginx-proxy-acme"
    restart: unless-stopped
    environment:
      - VIRTUAL_HOST=seongjin.me,www.seongjin.me
      - VIRTUAL_PORT=2368
      - LETSENCRYPT_HOST=seongjin.me
      - LETSENCRYPT_EMAIL=<관리자 이메일 주소>
      - url=https://seongjin.me
    volumes:
      - ghost-data:/var/lib/ghost/content
    network_mode: bridge

volumes:
  conf:
  certs:
  vhost:
  html:
  acme:
  ghost-data:
```

## Docker Compose로 블로그 배포하기

이제 모든 재료가 준비되었다. 남은 것은 Docker Compose 도구를 이용하여 기술 블로그를 한 번에 배포시키는 것이다.

Docker Compose는 기본적으로 배포용 `.yaml` 파일이 위치한 경로에서 이용하도록 되어 있다. 앞서 작성한 `docker-compose.yaml`이 위치한 경로로 이동한 뒤, 아래 명령을 실행한다.

```bash
$ sudo docker-compose up --detach
```

잠시 기다린 후, `sudo docker-compose ps`를 실행해서 배포 상태를 확인해보자.

```bash
      Name                    Command               State                Ports             
-------------------------------------------------------------------------------------------
ghost              docker-entrypoint.sh node  ...   Up      2368/tcp                       
nginx-proxy        /app/docker-entrypoint.sh  ...   Up      0.0.0.0:443->443/tcp,:::443->44
                                                            3/tcp, 0.0.0.0:80->80/tcp,:::80
                                                            ->80/tcp                       
nginx-proxy-acme   /bin/bash /app/entrypoint. ...   Up        
```

위와 같이 모든 서비스들의 `State`가 `Up` 상태로 나온다면, 앞서 `ghost` 컨테이너에 지정해 두었던 URL로 접속해보자. **단 한 줄의 커맨드로 나만의 새로운 기술 블로그가 생성된 모습을 볼 수 있을 것이다.**

`docker-compose up` 명령의 자세한 사용법은 [이 문서](https://docs.docker.com/compose/reference/up/)에서 보다 살펴볼 수 있다.

## Docker Compose로 블로그 구성 요소 업데이트하기

파일의 형태를 빌어 구성 요소를 선언적으로 정의할 때의 장점 중 하나는, 현재 구동 중인 환경의 설정값들을 확인하고 필요한 사항을 바꿔 적용하기가 간편하다는 것이다.

`nginx-proxy` 서비스의 이미지를 특정 버전(`nginx-proxy:0.10.0`)으로 바꾸어 적용해야 하는 상황을 가정해보자. 이때 수행해야 할 절차는 다음과 같다.

1.  `docker-compose.yaml` 파일에서 `services.nginx-proxy.image` 항목의 값을 `nginx-proxy:0.10.0`로 수정한다.
2.  `sudo docker-compose pull` 명령으로 변경된 이미지를 새로 받아온다.
3.  `sudo docker-compose up --detach` 명령을 실행한다. **끝.**

위 과정을 실행할 때 기존에 구동 중인 서비스들을 굳이 `down`시키지 않아도 된다. `docker-compose up` 명령에는 Docker Compose 도구가 기존 서비스들의 실행 여부를 확인한 뒤, 이미지 정보가 변경된 서비스를 알아서 업데이트하고 재실행 시켜주는 과정이 포함되기 때문이다. 호스트와 연결되어 있는 볼륨 정보와 데이터 역시 그대로 보존된다.

만약 `docker-compose.yaml` 파일에 명시되지 않은 서비스(컨테이너)나 더 이상 사용되지 않는 이미지를 삭제하고 싶다면, 위의 3번 항목에 `--remove-orphans` 옵션을 추가하여 실행한 뒤 `sudo docker image prune` 명령을 입력하면 된다.

## 마무리

이렇게 해서 Docker 명령어들을 YAML 형식으로 변환하고, Docker Compose를 통해 실제 배포 및 업데이트하는 과정을 살펴보았다.

Docker는 그 자체로도 애플리케이션 구동 환경 관리의 번거로움을 많이 줄여주지만, Docker Compose와 결합되었을 때 편의성이 더욱 극대화 된다. 내가 원하는 애플리케이션을 올리기 위해 상호 의존성을 지닌 여러 컨테이너들을 한 번에 관리해야 할 때, Docker Compose는 무척 유용한 도구가 되어줄 것이다.
