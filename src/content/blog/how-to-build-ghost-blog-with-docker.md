---
title: "Docker와 Ghost CMS로 Amazon Lightsail에 기술 블로그 만들기"
description: "Docker를 이용하면 단 세 번의 명령어 실행으로 Ghost CMS 환경을 간편하게 구축하고 관리할 수 있다. Amazon Lightsail에서 Docker를 통해 SSL 인증서까지 포함된 기술 블로그를 개설하는 과정을 소개한다."
pubDate: "2022-01-13T05:24:00.000Z"
updatedDate: "2022-02-08T06:57:45.000Z"
tags: ["docker"]
featureImage: "/content/images/2022/02/cover-4.jpg"
---

설치형 [Ghost](https://ghost.org/)는 Node v14, MySQL 5.7 혹은 8.0, 그리고 Nginx를 기본 스택으로 요구한다. 그러나 Docker를 이용하면 [Ghost](https://ghost.org/) 기반 CMS를 서버 환경에 구애받지 않고 간편하게 구축할 수 있다. 이렇게 구축된 환경에서는 **필요한 개별 스택을 직접 관리해야 하는 번거로움이 줄어들고, 구성요소의 배포 및 업데이트 과정을 단 한 줄의 명령어로 빠르게 처리**할 수 있게 된다.

이 글은 [Amazon Lightsail](https://aws.amazon.com/lightsail/)에서 Ghost CMS 환경 구축에 필요한 컨테이너들을 Docker로 배포하고, 이들을 이용하여 기술 블로그를 새롭게 개설하는 과정을 소개한다.

## 미리 준비해야 할 것들

우선 Docker를 운영할 수 있는 인스턴스, 그리고 연결할 도메인이 필요하다. 여기서는 [Amazon Lightsail의 Ubuntu 18.04 LTS 인스턴스](https://lightsail.aws.amazon.com/ls/docs/ko_kr/articles/getting-started-with-amazon-lightsail) 사용을 전제한다. 인스턴스 사양은 1개의 vCPU와 1GB 이상의 램이 권장된다. Lightsail 기준으로는 월 5달러 플랜이면 적합하다. Docker 설치가 가능한 OS 환경이라면 DigitalOcean 등 다른 클라우드 컴퓨팅 인스턴스를 이용해도 무방하다.

![Lightsail에서 저렴하고 간편하게 인스턴스를 생성할 수 있다.](/content/images/2022/01/Lightsail_price.png)

*Lightsail에서 저렴하고 간편하게 인스턴스를 생성할 수 있다.*

아울러 아래 사항들이 반드시 완료되어 있어야 다음 단계를 진행할 수 있다.

-   [인스턴스에 고정 IP 주소가 연결](https://lightsail.aws.amazon.com/ls/docs/ko_kr/articles/lightsail-create-static-ip)되어 있어야 한다.
-   고정 IP 주소와 도메인을 연결하기 위해 [DNS 영역과 레코드 추가](https://lightsail.aws.amazon.com/ls/docs/ko_kr/articles/lightsail-how-to-create-dns-entry)가 되어 있어야 한다.
-   인스턴스의 포트 `80`과 포트 `443`에 대한 [외부 액세스를 반드시 허용](https://lightsail.aws.amazon.com/ls/docs/ko_kr/articles/understanding-firewall-and-port-mappings-in-amazon-lightsail)해야 한다. 포트 `80` 액세스를 허용하지 않을 경우 Let's Encrypt를 통한 SSL 인증서 발급이 제대로 진행되지 않는다.

## Docker를 이용한 Ghost CMS 구축 과정

아래 과정은 [Docker의 공식 메뉴얼](https://docs.docker.com/), [Docker Hub](https://hub.docker.com)의 [nginxproxy/acme-companion 메뉴얼](https://hub.docker.com/r/nginxproxy/acme-companion), 그리고 [Ghost의 도커 버전 설치 공식 메뉴얼](https://hub.docker.com/_/ghost/) 내용을 함께 참고하여 구성했다.

### 1\. Docker 설치

우선 인스턴스에 Docker Engine을 설치한다. 만약 여러 컨테이너를 함께 묶어 yaml 파일 형태로 관리하고 싶다면 Docker Compose도 함께 설치해 주어야 한다. 상세 설치 과정은 아래의 공식 메뉴얼을 따라 진행한다.

-   [Docker Engine 설치 공식 메뉴얼 (Ubuntu)](https://docs.docker.com/engine/install/ubuntu/)
-   [Docker Compose 설치 공식 메뉴얼 (선택사항)](https://docs.docker.com/compose/install/)

### 2\. Reverse Proxy 설치 : nginx-proxy 컨테이너 구동

도커 환경에서 웹 서비스를 원활하게 구동하려면 [Reverse Proxy](https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/) 역할을 할 애플리케이션이 필요하다. 도커에서의 Reverse Proxy 필요성에 대해서는 Jason Wilder의 ["Automated Nginx Reverse Proxy for Docker"](http://jasonwilder.com/blog/2014/03/25/automated-nginx-reverse-proxy-for-docker/)란 글에 간결히 정리되어 있다.

여기서는 Reverse Proxy 기능이 자동화 된 형태의 Nginx가 포함된 [nginx-proxy](https://hub.docker.com/r/nginxproxy/nginx-proxy) 컨테이너를 이용할 것이다. 접속자가 `seongjin.me`로 접속하면 실제 Ghost가 동작하는 컨테이너로 트래픽을 중계해주고, HTTP(포트 `80`)로 들어온 연결을 HTTPS(포트 `443`)로 돌려주는 역할을 한다.

Docker Engine 설치가 완료된 인스턴스에서 아래 명령을 입력한다.

```bash
$ sudo docker run --detach --name nginx-proxy \
    --publish 80:80 \
    --publish 443:443 \
    --volume certs:/etc/nginx/certs \
    --volume vhost:/etc/nginx/vhost.d \
    --volume html:/usr/share/nginx/html \
    --volume <path>/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro \
    --volume /var/run/docker.sock:/tmp/docker.sock:ro \
    --restart unless-stopped \
    nginxproxy/nginx-proxy
```

`docker run`은 컨테이너를 새로 생성하고 구동시키는 명령이다. 여기에 포함된 세부 옵션을 살펴보면 다음과 같다.

-   `--detach`는 백그라운드 모드로 구동시키는 옵션이다.
-   `--name`에서는 컨테이너의 고유 이름을 지정한다. 없을 경우 임의의 단어 조합으로 생성된다.
-   `--publish`는 호스트(host)와 컨테이너 간의 포트 포워딩을 세팅하는 내용이다. 여기서는 포트 `80`(HTTP)과 포트 `443`(HTTPS)에 대한 포워딩을 각각 지정했다.
-   `--volume`은 호스트의 특정 경로와 컨테이너의 특정 경로가 서로 공유되도록 설정한다. 컨테이너에서 발생한 데이터는 기본적으로 컨테이너 안에 기록되며, 운영 상의 이유로 컨테이너가 삭제될 경우 그 데이터도 함께 유실된다. 따라서 중요한 설정 또는 시스템 파일의 지속 관리를 위해서는 호스트의 일부 영역을 컨테이너에 할당해 스토리지로 쓸 수 있도록 해줘야 한다.
-   `--restart`는 컨테이너 종료시 재시작 여부를 설정하는 옵션이다. 블로그가 돌아가려면 모든 컨테이너들이 항상 동작하고 있어야 하므로, 트러블슈팅을 위해 직접 중단하지 않는 이상 언제나 구동될 수 있도록 `unless-stopped` 옵션값을 주었다. 이 항목에 대한 자세한 설명은 [Docker Docs의 Restart policies 문서](https://docs.docker.com/engine/reference/run/#restart-policies---restart)를 참고하자.
-   마지막에는 컨테이너로 구동시킬 이미지를 지정한다. 여기서는 `nginxproxy/nginx-proxy` 를 이용한다.

**위의 예시에서는 총 3개의 볼륨 연결이 필요하다.** 모두 Let's Encrypt를 이용한 SSL 인증서 발급 및 적용을 위해 필요한 것들이다.

-   `certs:/etc/nginx/certs`에는 SSL 인증서와 인증용 키 파일 등이 저장된다.
-   `vhosts:/etc/nginx/vhost.d`에는 가상 호스트 설정 사항이 담긴다. SSL 인증서 요청에 필요한 챌린지 파일에 CA(Certificate Authority)가 접근 가능하도록 하기 위해 필요하다.
-   `html:/usr/share/nginx/html`은 위에서 언급된 인증용 챌린지 파일을 위해 필요한 공간이다.

**또한 호스트와 `nginx-proxy` 컨테이너 간의 연결이 필요한 요소가 2개 있다.**

-   `--volume /var/run/docker.sock` 항목은 호스트의 도커 통신에 필요한 소켓을 컨테이너와 연결하는 내용이다. `nginx-proxy` 컨테이너 구동을 위한 필수사항이다.
-   `--volume <path>/client_max_body_size.conf>` 항목은 꼭 필요하진 않으나 권장되는 사항이다. Nginx에서는 기본적으로 업로드 제한 용량이 1M로 제한되기 때문이다. 컨테이너에 직접 접속해서 `nginx.conf`를 바꿔도 되지만, 호스트의 특정 위치에 `client_max_body_size.conf`를 만들어 놓고 이를 컨테이너의 `etc/nginx/conf.d/` 경로에 연결한다면 컨테이너 재시작 후에도 설정값 유지가 가능하다. 이때 작성한 `conf` 파일 경로를 `<path>` 부분에 넣는 것을 잊지 말 것. [자세한 설정 방법은 여기서 확인할 수 있다.](https://github.com/nginx-proxy/nginx-proxy/issues/981#issuecomment-355765223)

만약 컨테이너 구동에 성공했다면, `sudo docker ps` 명령 실행 시 아래와 같이 출력될 것이다.

```bash
CONTAINER ID   IMAGE                    COMMAND                  CREATED          STATUS          PORTS                                                                      NAMES
f3f3231bcc13   nginxproxy/nginx-proxy   "/app/docker-entrypo…"   21 seconds ago   Up 20 seconds   0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp   nginx-proxy
```

### 3\. SSL 인증 자동화 : acme-companion 컨테이너 구동

[acme-companion](https://hub.docker.com/r/nginxproxy/acme-companion)은 [nginx-proxy](https://hub.docker.com/r/nginxproxy/nginx-proxy)에 SSL 인증과 자동 갱신 기능을 더해주는 일종의 보조 컨테이너다. `nginx-proxy` 컨테이너가 구동 중인 상태에서 `nginx-proxy-acme`라는 이름으로 아래와 같이 컨테이너를 생성하고 구동시킨다.

```bash
$ sudo docker run --detach --name nginx-proxy-acme \
    --volumes-from nginx-proxy \
    --volume /var/run/docker.sock:/var/run/docker.sock:ro \
    --volume acme:/etc/acme.sh \
    --env "DEFAULT_EMAIL=<mail@address.com>" \
    --restart unless-stopped \
    nginxproxy/acme-companion
```

-   `volumes-from nginx-proxy`는 `nginx-proxy` 컨테이너에 생성되어 있는 볼륨들을 가져온다는 뜻이다.
-   `--volume /var/run/docker.sock` 항목이 `nginx-proxy` 컨테이너와 마찬가지로 포함된다.
-   `acme:/etc/acme.sh`는 Let's Encrypt를 이용한 SSL 인증서 발급과 갱신에 쓰일 `acme.sh` 설정 사항이 저장될 공간이다.
-   `--env`에 명시된 `DEFAULT_EMAIL` 항목은 SSL 인증서의 만료일 안내문이 발송될 주소다. 기입하지 않아도 무관하다.
-   `nginx-proxy` 컨테이너와 동일하게 `--restart` 항목을 `unless-stopped`로 정해준다.
-   마지막으로 이 컨테이너에 쓰일 `nginxproxy/acme-companion` 이미지를 지정한다.

여기까지 잘 진행되었다면, `sudo docker ps` 실행 시 아래와 같이 출력될 것이다.

```bash
CONTAINER ID   IMAGE                       COMMAND                  CREATED              STATUS          PORTS                                                                      NAMES
60de7a53c197   nginxproxy/acme-companion   "/bin/bash /app/entr…"   About a minute ago   Up 59 seconds                                                                              nginx-proxy-acme
f3f3231bcc13   nginxproxy/nginx-proxy      "/app/docker-entrypo…"   26 minutes ago       Up 2 minutes   0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp   nginx-proxy
```

### 4\. Ghost 컨테이너 구동

[Docker Hub](https://hub.docker.com)에서는 [Ghost의 컨테이너 배포용 이미지](https://hub.docker.com/_/ghost/)를 공식 지원하고 있다. 개발사가 직접 지원하는 이미지는 아니지만, Ghost 개발 커뮤니티의 손을 거쳐 CMS 운영에 필요한 최소한의 스택이 모두 포함된 패키지 형태로 제공되고 있다.

[설치형 Ghost는 메인 DB로 MySQL 이용을 권장하고 있다.](https://ghost.org/docs/install/ubuntu/#install-mysql) 그러나 Docker용 Ghost 이미지에서는 SQLite가 대신 탑재되어 있다. Docker 환경에서 Ghost와 MySQL을 함께 사용하려면 둘을 멀티 컨테이너로 구성하고 [`docker-compose`](https://docs.docker.com/compose/reference/)를 이용해 배포하는 것이 좋다. 하지만 빈번한 업데이트가 필요치 않은, 단일 인스턴스에서 구동될 작은 규모의 블로그라면 더 적은 컴퓨팅 자원으로 효율적인 운영과 관리가 가능한 SQLite도 충분히 매력적이라고 생각한다.

여기서는 이 블로그의 개설 과정과 동일하게, MySQL 없이 Ghost 컨테이너만 생성하기로 한다.

```bash
$ sudo docker run --detach --name ghost \
    --volume ghost-data:/var/lib/ghost/content \
    --env "VIRTUAL_HOST=<blog.address, www.blog.address>" \
    --env "VIRTUAL_PORT=2368" \
    --env "LETSENCRYPT_HOST=<blog.address>" \
    --env "LETSENCRYPT_EMAIL=<mail@address.com>" \
    --env "url=<https://blog.address>" \
    --restart unless-stopped \
    ghost
```

-   SQLite DB 파일이 저장되는 경로를 `ghost-data`라는 이름의 도커 볼륨으로 지정한다. 설령 Ghost 컨테이너에 문제가 생기거나 추후 업데이트를 하게 되더라도 데이터가 유실되지 않도록 하기 위함이다.
-   `VIRTUAL_HOST`에는 호스트(인스턴스)와 연결된 도메인 주소를 삽입한다. `www`가 포함된 도메인과 그렇지 않은 도메인을 함께 삽입해야 DNS에 등록된 CNAME record대로 redirect가 정상 동작할 수 있다.
-   `VIRTUAL_PORT`는 외부에서 들어온 트래픽(포트 `80`, 포트 `443`)을 도커 내부의 어느 포트로 중계해줄 것인지를 정하는 부분이다. Ghost 컨테이너로 접근 가능한 내부 포트는 `2368`으로 지정되어 있다.
-   `LETSENCRYPT_HOST`, `LETSENCRYPT_EMAIL`에는 SSL 인증용 정보가 들어간다. 앞서 `VIRTUAL_HOST`에 입력된 도메인 주소와 SSL 인증용 이메일 주소를 각각 삽입한다.
-   `url`에는 내 블로그의 실제 URL이 될 주소를 적는다. `https://`가 앞에 반드시 들어가야 한다.
-   Ghost 컨테이너 역시 트러블슈팅 상황을 제외하면 언제나 구동 중이어야 하므로, `--restart unless-stopped` 옵션을 추가한다.
-   마지막으로 `ghost` 이미지를 지정한다.

여기까지 진행되었다면, `sudo docker ps` 실행 시 아래와 같이 3개의 컨테이너가 구동 중인 모습을 확인할 수 있다.

```bash
CONTAINER ID   IMAGE                       COMMAND                  CREATED          STATUS          PORTS                                                                      NAMES
7a67c0dc94e7   ghost                       "docker-entrypoint.s…"   20 minutes ago   Up 20 minutes   2368/tcp                                                                   ghost
f610030e417f   nginxproxy/acme-companion   "/bin/bash /app/entr…"   21 minutes ago   Up 21 minutes                                                                              nginx-proxy-acme
695b0267de67   nginxproxy/nginx-proxy      "/app/docker-entrypo…"   21 minutes ago   Up 21 minutes   0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp   nginx-proxy
```

이제 블로그에 접속해보자. SSL 인증서가 적용된 블로그가 잘 개설된 것을 확인할 수 있다. 설령 개별 컨테이너에 문제가 생기더라도 블로그 데이터와 SSL 인증 정보가 도커 볼륨에 저장되어 있으므로 안심하고 트러블슈팅을 진행할 수 있다.

## Docker를 이용했을 때 생기는 이점들

애플리케이션의 개발 및 배포는 대체로 개발, 테스트, 스테이징, 운영 등 여러 단계를 거쳐 이루어진다. 그러나 각 단계 별로 완벽히 동일한 서버 환경을 보장하기 어렵기에, 개발 단계에서 검증된 코드가 운영 환경에서 예상치 못한 문제를 일으키는 경우가 적지 않다. 각각의 단계마다 애플리케이션이 요구하는 의존성 문제를 해결하며 구동 환경을 조성하는 데에도 많은 수고가 필요하다.

Docker는 이런 수고를 극적으로 줄여준다. Docker에서 이용되는 애플리케이션 이미지 안에는 애플리케이션의 실행에 필요한 모든 요소가 포함되어 있다. **Docker Engine이 설치되어 있다면 어디서든 애플리케이션의 구동 환경을 동일하게 유지할 수 있다.**

-   필요한 애플리케이션이 있다면 해당 이미지를 찾아 컨테이너 형태로 즉시 실행할 수 있다.
-   애플리케이션의 업데이트가 필요하다면 기존 컨테이너의 이미지 정보만 새로 갱신하여 다시 배포하면 된다.
-   [나만의 애플리케이션 구동 환경을 갖춘 나만의 이미지](https://docs.docker.com/engine/reference/builder/)를 만들어 공유할 수도 있다.
-   컨테이너 정지 후에도 호스트에 보존되어야 할 정보는 볼륨 기능으로 관리할 수 있다.
-   특별한 경우가 아니라면 위의 모든 작업을 각각 몇 줄의 명령문 만으로 처리할 수 있다.
-   [Docker Compose](https://docs.docker.com/compose/)를 함께 이용한다면 yaml 파일 형태로 여러 개의 컨테이너를 체계적으로 배포하고 관리할 수 있다.

**이 블로그는 단 세 번의 도커 명령어 실행으로 완성되었다.** Docker를 이용한 기술 블로그 만들기, 결코 어렵지 않다.
