---
title: "Docker Compose에서 Ghost 4 기반 블로그를 Ghost 5로 간편하게 업그레이드하기"
description: "도커 컴포즈(Docker Compose)로 배포한 Ghost 4 기반 블로그를 Ghost 5로 간편하게 업그레이드 하는 방법을 다룬다."
pubDate: "2022-07-12T09:20:20.000Z"
updatedDate: "2022-08-11T11:52:23.000Z"
tags: ["docker", "ghost-tag"]
featureImage: "/content/images/2022/07/cover.png"
---

본론으로 들어가기에 앞서, Ghost 5가 운영 환경 측면에서 예전과 달라진 점을 먼저 짚어보려고 한다. 기존에 Ghost 3.x 또는 4.x 버전을 설치형으로 이용해왔던 사용자에게 이번 변화점은 중요하다.

[(업그레이드 단계별 절차로 바로가기 ↓)](#%EC%97%85%EA%B7%B8%EB%A0%88%EC%9D%B4%EB%93%9C-%EB%8B%A8%EA%B3%84%EB%B3%84-%EC%A0%88%EC%B0%A8)

![Ghost 5 소개 이미지](/content/images/2022/07/ghost-v5.png)

이미지 출처: [Ghost 공식 웹사이트](https://ghost.org/changelog/5/)

## Ghost 5는 MySQL 8 전용

Ghost는 공식적으로 개인 창작자를 위한 콘텐츠 출판 플랫폼을 표방하고 있다. 따라서 그동안의 대다수 업데이트 내용은 이에 관계된 기능 추가 및 개선에 집중되는 경향이 있었다.

그러나 이번에는 다르다. Ghost 5로 메이저 업데이트가 이루어지면서 블로그 배포 및 운영 환경에 큰 변화가 생겼다. Ghost를 설치형 CMS로 사용 중인 사람이라면 아래 내용을 반드시 체크해야 한다.

1.  앞으로는 오직 **MySQL 8** 만을 프로덕션 환경에서 지원한다.
2.  **MySQL 5**는 더 이상 어떤 환경에서도 지원되지 않는다.
3.  **MariaDB** 역시 어떤 환경에서도 지원되지 않는다.
4.  **SQLite3**는 더 이상 프로덕션 환경에서 지원되지 않는다.
5.  공식적인 프로덕션 스택이 **Ubuntu 20, Node 16, MySQL 8**로 바뀌었다.

개인 창작자 환경의 성장을 도모한다는 플랫폼에서 특정 DBMS에의 종속을 강화하기로 한 것은 상당히 유감스러운 결정이다. 관련하여 [해당 업데이트 내용이 실린 깃허브 이슈 항목](https://github.com/TryGhost/Ghost/issues/14446)을 보니, **"소규모의 팀으로서 유지보수 비용 관리를 위해 이전부터 제한적인 범위의 운영 환경 만을 지원해 왔다"**는 CTO의 언급을 확인할 수 있었다. SQLite3의 프로덕션 환경 미지원 결정에 대해 [아래와 같은 강경한 코멘트](https://github.com/TryGhost/Ghost/issues/14446#issuecomment-1094464220)가 실린 것을 보건대, Ghost 개발진의 이런 기조는 앞으로도 지속될 듯 싶다.

> "To make Ghost super-fast we need to optimize the codebase to be performant on MySQL. If optimizations breaks parts of SQLite, so be it."

### 이것이 왜 문제인가?

현재 [Docker Hub](https://hub.docker.com)에서 Ghost 개발 커뮤니티를 통해 배포 중인 [Ghost 이미지](https://hub.docker.com/_/ghost/)는 SQLite3 이용을 전제하고 있다. 내 블로그 또한 컨테이너 관리의 편의를 위해 SQLite3를 이용해왔다. 단일 인스턴스에서 작은 규모의 개인 웹사이트를 굴리는 용도로 SQLite3는 여전히 유용하다고 생각한다.

그러나 Ghost CMS의 프로덕션 레벨에서 SQLite3가 지원되지 않는다는 점과, 앞으로는 오직 MySQL 8 버전에 한해서만 공식적인 지원을 받을 수 있다는 점을 감안할 때, 이제는 MySQL로의 데이터 마이그레이션을 고려하지 않을 수 없게 되었다. 따라서 나는 **앞으로의 블로그 유지보수를 위해 Ghost 5 업그레이드와 데이터 마이그레이션을 함께 하기로 결정**했다.

Docker 환경의 장점 중 하나는 **애플리케이션의 업데이트가 필요하다면 컨테이너 이미지 정보만 새로 갱신하여 다시 배포하면 된다는 것**이다. 또한 배포 단계에서 볼륨 설정을 잘 해두었다면, **컨테이너가 정지된 후에도 중요한 데이터를 호스트에 온전히 보존**시킬 수 있다. 이런 이점들을 활용하여 Ghost 5 업그레이드와 데이터 마이그레이션을 시작해보자.

## 업그레이드 단계별 절차

Docker 환경에서 Ghost 4를 Ghost 5로 업그레이드(+ MySQL 8로 데이터 이전)하기 위해 필요한 작업들은 다음과 같다. 여기서는 ["Docker Compose로 Ghost 기반 기술 블로그를 간편하게 만들고 제어하기"](/how-to-build-ghost-blog-with-docker-compose/#3-%EC%84%B8-%EC%BB%A8%ED%85%8C%EC%9D%B4%EB%84%88%EB%A5%BC-%ED%95%98%EB%82%98%EC%9D%98-yaml-%ED%8C%8C%EC%9D%BC%EB%A1%9C-%ED%95%A9%EC%B9%98%EA%B8%B0) 포스팅에서 소개한 Amazon Lightsail에서의 블로그 배포 정보를 기준으로 설명한다.

1.  Ghost 관리자 화면에서 기존 게시글과 환경설정 데이터를 `JSON` 포맷으로 내려받는다.
2.  1번 단계에서 제외된 블로그 데이터(이미지, 테마 등)를 다른 경로에 백업한다.
3.  Compose 파일을 재구성한다.
4.  기존의 블로그를 내리고, 재구성한 Compose 파일로 새 블로그를 구동시킨다.
5.  새로 구동된 블로그의 관리자 화면에서 1번 과정으로 내려받은 `JSON` 데이터를 업로드한다.

### 1\. 게시글 백업 받기

Ghost에서 게시글을 백업 받는 방법은 간단하다. 관리자 화면(`블로그주소/ghost`)에 접속한 뒤, 좌하단의 `Settings` 버튼을 누른 뒤 `Labs`로 이동하면 아래와 같은 `Migration Options` 항목들을 볼 수 있다.

![Ghost 블로그 관리자 페이지의 Settings > Labs 화면](/content/images/2022/07/step1_export.png)

여기서 `Export your content`의 `Export` 버튼을 누르면, 블로그의 모든 게시글과 계정 정보, 그리고 설정값들이 JSON 포맷으로 다운로드 된다. 여기에는 `Settings -> Code injection`을 통해 삽입한 코드들도 모두 포함된다.

### 2\. 기존 블로그 데이터 백업 받기

기존에 도커 볼륨을 미리 설정한 상태였다면, 컨테이너가 내려가더라도 해당 데이터는 호스트에 안전히 보관되어 있을 것이다. 그러나 만약을 대비하여 이 데이터도 따로 백업받아 두는 것이 권장된다.

현재 인스턴스에 설정되어 있는 도커 볼륨 목록은 `sudo docker volume ls` 명령으로 확인할 수 있다. 이들 가운데 `ghost` 컨테이너에 설정된 볼륨(`ghost-data`)을 백업 받아야 한다.

인스턴스 안에서 설정된 도커 볼륨들의 실제 디렉터리 경로는 인스턴스의 `/var/lib/docker/volumes` 에서 위치해 있다. `sudo docker volume inspect <볼륨명>` 명령을 사용하면 `Mountpoint` 항목에서 정확한 경로를 확인할 수 있다. 해당 경로에 접근하려면 `root` 권한이 필요하다.

![볼륨 정보 식별 명령을 실행한 결과 화면](/content/images/2022/07/step2_inspect_volume-1.png)

여기서는 백업 데이터를 원격으로 내려받기 위해 `scp`(secure copy protocol)를 이용했다. 다만 `root` 권한이 필요한 경로를 원격에서 접근할 수는 없으므로, 우선 해당 볼륨의 데이터를 압축하여 원격 접근 가능한 경로로 옮긴 뒤 내려받는 과정을 거쳤다.

```bash
# 원격 접근 가능한 경로에서 해당 볼륨 데이터 경로(/var/lib/docker/volumes/blog_ghost-data)의 내용을 압축한다.
$ tar cvfz backup-blog_ghost-data.tar.gz /var/lib/docker/volumes/blog_ghost-data/

# scp 명령으로 백업 파일을 원격 다운로드한다.
# 만약 원격 접속시 key file이 필요한 경우라면 -i 옵션을 함께 사용한다.
$ scp -i <keyfile> <계정명@인스턴스주소>:~/backup-blog_ghost-data.tar.gz ~/backup/backup-blog_ghost-data.tar.gz
```

![scp를 이용한 백업 파일 다운로드 화면](/content/images/2022/07/step2_scp.png)

#### YAML에서 지정한 볼륨명 앞에 Prefix가 붙는 경우

여기서 특이한 점이 하나 있다. [이전 글](/how-to-build-ghost-blog-with-docker-compose/)에서 나는 볼륨명을 `ghost-data`로 지정했었는데, 실제로 생성된 볼륨명은 `blog_ghost-data`가 되어 있다. 이는 `docker-compose`가 프로젝트명을 인식하는 로직과 관련이 있다.

`docker-compose`는 다중 컨테이너 애플리케이션을 배포하기 위한 도구로 설계되었다. 여기서 **각각의 애플리케이션은 프로젝트명을 기준으로 각자 분리된 환경을 갖게 된다.** 이 프로젝트명은 `docker-compose` 명령에서 `-p` 또는 `--project-name` 플래그로 설정하거나 지정할 수 있고, 이러한 과정을 통해 생성된 리소스들(볼륨, 컨테이너, 네트워크 등)에는 프로젝트명이 앞에 `prefix`로 붙게 된다.

**만약 프로젝트명을 따로 지정하지 않았다면, 배포에 쓰인 `YAML` 파일이 위치한 디렉터리명이 프로젝트명으로 간주된다.** 내 경우에는 배포 당시 `docker-compose.yaml` 파일이 홈 경로의 `/blog/`에 위치하였기에, `ghost-data`라는 이름으로 지정한 도커 볼륨의 실제 이름이 `blog_ghost-data`로 변경된 것이다. 하나의 인스턴스 안에 여러 애플리케이션을 `docker-compose`로 관리해야 한다면 이점에 꼭 유의하자.

### 3\. 업그레이드용 새 Compose 파일 구성하기

만약 컨테이너들의 이미지 태그로 `:latest`를 지정해 두었다면, 인스턴스의 콘솔 화면에서 `docker-compose pull && docker-compose up -d` 명령만 입력하면 Docker가 알아서 최신 이미지를 내려받고 각 컨테이너를 다시 구동시킨다. **데이터나 서비스 간 호환성 문제를 걱정할 필요가 없다면 이것만으로 모든 작업이 완료된다.**

그러나 내 경우에는 SQLite3에서 MySQL 8로의 데이터 마이그레이션을 선택했으므로, 기존의 배포용 `YAML` 파일에 MySQL 서비스를 추가한 뒤 이를 Ghost와 같은 네트워크에서 동작하도록 연결해 주어야 한다. 여기서는 예전에 내가 [Docker Compose로 블로그를 배포할 때 사용했던 `YAML` 파일 내용](/how-to-build-ghost-blog-with-docker-compose)을 예시로 하여 수정 내용을 차례로 소개한다.

#### 3-1. Ghost 서비스 항목 수정

```yaml
  ghost:
    image: ghost:5
    container_name: ghost
    depends_on:
      - nginx-proxy
      - nginx-proxy-acme
      - db
    restart: unless-stopped
    ports:
      - 8080:2368
    environment:
      VIRTUAL_HOST: ${GHOST_VIRTUAL_HOST}
      VIRTUAL_PORT: ${GHOST_VIRTUAL_PORT}
      LETSENCRYPT_HOST: ${GHOST_LETSENCRYPT_HOST}
      LETSENCRYPT_EMAIL: ${GHOST_LETSENCRYPT_EMAIL}
      database__client: ${GHOST_DB_CLIENT}
      database__connection__host: ${GHOST_DB_HOST}
      database__connection__port: ${GHOST_DB_PORT}
      database__connection__user: ${MYSQL_USER}
      database__connection__password: ${MYSQL_PASSWORD}
      database__connection__database: ${MYSQL_DATABASE}
      url: ${GHOST_URL}
    volumes:
      - ghost-data:/var/lib/ghost/content
```

-   컨테이너 이미지 정보를 `ghost:latest`에서 `ghost:5`로 수정했다. 이 부분은 사실 바꾸지 않아도 무방하지만, 메이저 버전업에 보다 안전하게 대응하기 위한 차원에서 변경했다.
-   `depends_on` 항목에 `db` 서비스를 추가했다. `db`는 MySQL 컨테이너가 탑재된 서비스다.
-   `db` 서비스(MySQL)를 `ghost`와 연결하기 위한 환경변수들을 추가했다. 이들은 `database__`를 `prefix`로 공유하고 있으며, 각 항목에 대한 설명은 [여기](https://ghost.org/docs/config/#database)서 확인할 수 있다.
-   각 환경변수의 값들을 각각 그에 대응하는 외부 변수값(`${변수명}`) 정보로 대체했다. 이에 대해서는 아래의 **3-4. 환경변수용 `.env` 파일 구성 파트**에서 다시 설명하기로 한다.

#### 3-2. DB 서비스 항목 추가

```yaml
  db:
    image: mysql:8
    container_name: db
    depends_on:
      - nginx-proxy
      - nginx-proxy-acme
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    volumes:
      - db-data:/var/lib/mysql
```

-   리버스 프록시(`nginx-proxy`), SSL 인증(`nginx-proxy-acme`) 서비스가 시작된 이후에 구동되도록 `depends_on` 항목을 구성했다.
-   생성된 데이터베이스의 영속성을 위해, 컨테이너의 `/var/lib/mysql` 경로에 대해 `db-data` 이름으로 도커 볼륨을 설정했다.

환경변수로는 아래의 네 가지를 추가했다. 이들 중 `MYSQL_ROOT_PASSWORD`는 필수이며, 나머지는 선택사항이다. MySQL 이미지에서 사용 가능한 전체 환경변수 목록은 [Docker Hub의 공식 이미지 설명문](https://hub.docker.com/_/mysql)에서 찾아볼 수 있다.

-   `MYSQL_ROOT_PASSWORD` : MySQL의 `root` 슈퍼유저 계정 비밀번호다.
-   `MYSQL_USER`, `MYSQL_PASSWORD` : 아래 항목을 통해 생성된 데이터베이스에 대해 슈퍼유저 권한을 가진 사용자를 생성한다.
-   `MYSQL_DATABASE` : 이미지 구동시 함께 생성할 데이터베이스의 이름을 정한다.

#### 3-3. SSL 인증서 갱신 컨테이너 수정

```yaml
  nginx-proxy-acme:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    depends_on:
      - nginx-proxy
    restart: unless-stopped
    environment:
      NGINX_PROXY_CONTAINER: ${NGINX_PROXY_CONTAINER}
    volumes:
      - certs:/etc/nginx/certs:rw
      - acme:/etc/acme.sh
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

-   `nginx-proxy-acme` 서비스는 `nginx-proxy` 서비스에 의존성을 가지고 있다. 따라서 이것이 도커 네트워크 안에서 `nginx-proxy` 서비스를 확실히 찾을 수 있도록 `NGINX_PROXY_CONTAINER` 환경변수를 추가했다. 이 변수의 값은 `nginx-proxy` 컨테이너가 돌아가는 서비스명으로 지정하면 된다. `${변수명}` 형태로 값을 입력한 이유는 바로 아래 항목을 참고하면 된다.

#### 3-4. 환경변수용 `.env` 파일 구성

Compose 파일 안에 구성해야 할 환경변수들이 많아지면, 이들을 `YAML` 파일 안에서 하나하나 찾아 입력하고 수정하는 작업이 번거로울 수 있다. 이럴 때엔 환경변수들을 별도의 외부 파일로 빼서 관리하는 것이 좋다.

Docker Compose에서는 환경변수들을 별도로 관리 가능한 여러 방법들을 제공한다. 여기서는 그 중 가장 간편한 방법으로, **각 줄마다 `변수명=값`으로 구성된 `.env` 파일을 만들어 Compose 파일과 같은 경로에 위치**시키도록 한다. 내가 구성한 `.env` 파일의 내용은 다음과 같다.

```yaml
# .env file for compose.yaml
# ENVs for Ghost service
GHOST_VIRTUAL_HOST=seongjin.me,www.seongjin.me
GHOST_VIRTUAL_PORT=2368
GHOST_LETSENCRYPT_HOST=seongjin.me
GHOST_LETSENCRYPT_EMAIL=<관리자 이메일 주소>
GHOST_DB_CLIENT=mysql
GHOST_DB_HOST=db
GHOST_DB_PORT=3306
GHOST_URL=https://seongjin.me

# ENVs for DB service(MySQL)
MYSQL_ROOT_PASSWORD=<비밀번호>
MYSQL_USER=ghost
MYSQL_PASSWORD=<비밀번호>
MYSQL_DATABASE=ghost

# ENVs for Acme-companion service
NGINX_PROXY_CONTAINER=nginx-proxy
```

이렇게 하면, 이후에 Docker Compose에서 `YAML` 파일을 통해 애플리케이션을 배포할 때 `.env`를 통해 설정해 둔 환경변수들의 값이 `YAML` 파일에 지정된 자리마다(`${변수명}`으로 표기된 부분) 자동으로 주입된다.

#### 3-5. 기타 참고 사항

이밖에 Compose 파일에 추가로 반영한 수정 사항은 다음과 같다.

-   기존에 각 서비스(컨테이너)에 포함되어 있던 `network_mode: bridge` 항목은 불필요하므로 삭제했다.
-   Docker Compose를 통해 애플리케이션에 포함된 모든 서비스(컨테이너)들은, 별도의 네트워크 설정이 없다면 `<프로젝트명>_default`라는 애플리케이션 범위의 기본 네트워크(app-wide default network)로 함께 묶이게 된다. 이 네트워크는 `docker-compose up`을 통해 자동으로 생성되며, `docker-compose down`이 실행되면 함께 삭제된다.
-   위의 예시에서는 **MySQL 접속 암호가 환경변수에 평문으로 포함**되어 있다. 편의를 위해 이렇게 해두었지만, 사실 보안 측면에서는 바람직하지 않은 방법이다. 실제 운영 환경에서 이를 어떻게 대체하였는지는 이후에 연재할 글들을 통해 소개하고자 한다.

#### 3-6. 최종 결과물

이렇게 해서 최종적으로 수정된 `compose.yaml` 파일의 내용은 다음과 같다. 기존 서비스들에 설정되어 있던 볼륨 정보는 그대로 보존하여 블로그 재배포 후에도 데이터가 온전히 유지되도록 했다.

`nginx-proxy` 컨테이너에 설정된 볼륨 정보는 [여기서](/how-to-build-ghost-blog-with-docker/#2-reverse-proxy-nginx-proxy-) 자세히 확인할 수 있다. 특히 `client_max_body_size.conf`의 경우, 호스트측 경로가 사용자 환경에 따라 각기 다를 수 있으므로 주의하자. 만약 이 파일이 필요하지 않은 경우라면 해당 항목을 삭제해도 좋다.

```yaml
version: '3.9'

services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    container_name: nginx-proxy
    ports:
      - 80:80
      - 443:443
    restart: unless-stopped
    volumes:
      - conf:/etc/nginx/conf.d
      - certs:/etc/nginx/certs:ro
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      # 업로드 용량 제한을 변경(1M->8M)하기 위한 볼륨 항목으로, 불필요한 경우 삭제한다.
      # 만약 필요하다면, 호스트측 경로와 파일 내용을 반드시 체크하자.
      - /home/ubuntu/blog/conf/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro
      - /var/run/docker.sock:/tmp/docker.sock:ro

  nginx-proxy-acme:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    depends_on:
      - nginx-proxy
    restart: unless-stopped
    environment:
      NGINX_PROXY_CONTAINER: ${NGINX_PROXY_CONTAINER}
    volumes:
      - certs:/etc/nginx/certs:rw
      - acme:/etc/acme.sh
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /var/run/docker.sock:/var/run/docker.sock:ro

  ghost:
    image: ghost:5
    container_name: ghost
    depends_on:
      - nginx-proxy
      - nginx-proxy-acme
      - db
    restart: unless-stopped
    ports:
      - 8080:2368
    environment:
      VIRTUAL_HOST: ${GHOST_VIRTUAL_HOST}
      VIRTUAL_PORT: ${GHOST_VIRTUAL_PORT}
      LETSENCRYPT_HOST: ${GHOST_LETSENCRYPT_HOST}
      LETSENCRYPT_EMAIL: ${GHOST_LETSENCRYPT_EMAIL}
      database__client: ${GHOST_DB_CLIENT}
      database__connection__host: ${GHOST_DB_HOST}
      database__connection__port: ${GHOST_DB_PORT}
      database__connection__user: ${MYSQL_USER}
      database__connection__password: ${MYSQL_PASSWORD}
      database__connection__database: ${MYSQL_DATABASE}
      url: ${GHOST_URL}
    volumes:
      - ghost-data:/var/lib/ghost/content

  db:
    image: mysql:8
    container_name: db
    depends_on:
      - nginx-proxy
      - nginx-proxy-acme
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    volumes:
      - db-data:/var/lib/mysql

volumes:
  conf:
  certs:
  vhost:
  html:
  acme:
  ghost-data:
  db-data:
```

### 4\. 새 Compose 파일로 블로그 재배포하기

이제 블로그를 재배포할 차례다. 기존에 구동 중인 블로그를 내리고, 새로 수정한 Compose 파일과 환경설정 파일(`.env`)을 이용하여 블로그를 새로 배포한다.

```bash
# 우선 기존에 구동 중인 블로그를 내린다.
$ docker-compose down

# 새로 수정한 Compose 파일 기반으로 블로그를 다시 배포한다.
$ docker-compose up -d
```

문제 없이 배포가 완료되었다면, `docker-compose ps`를 실행했을 때 아래와 같은 결과가 나올 것이다.

```bash
      Name                    Command               State                         Ports
--------------------------------------------------------------------------------------------------------------
db                 docker-entrypoint.sh mysqld      Up      3306/tcp, 33060/tcp
ghost              docker-entrypoint.sh node  ...   Up      0.0.0.0:8080->2368/tcp,:::8080->2368/tcp
nginx-proxy        /app/docker-entrypoint.sh  ...   Up      0.0.0.0:443->443/tcp,:::443->443/tcp,
                                                            0.0.0.0:80->80/tcp,:::80->80/tcp
nginx-proxy-acme   /bin/bash /app/entrypoint. ...   Up
```

### 5\. 백업 받은 게시글 데이터 복원하기

여기까지 진행한 상태에서 블로그로 접속하면, Ghost가 새로 설치되어 초기화 된 모습으로 나타날 것이다. 그렇다면 이제 마지막 단계만 남았다. **백업 받은 게시글 데이터를 복원**해야 한다.

관리자 화면(`블로그주소/ghost`)에 접속해서 기존의 관리자 아이디와 비밀번호로 재가입한 뒤, 앞서 1번 단계와 동일한 방법으로 `Settings`의 `Labs`로 이동한다. `Labs` 화면 상단에 있는 `Migration Options` 섹션의 `Import content`에서 `Import` 버튼을 눌러 기존에 백업받아 두었던 게시글 데이터(`JSON`)를 업로드한다.

![백업 데이터 복원 후 나타난 에러 메시지 화면](/content/images/2022/07/step5_error.png)

업로드가 끝나면 위의 스크린샷과 같이 몇 가지 경고메시지가 뜬다. 그러나 살펴보면, 중복된 사용자 정보와 테마 설정 정보가 Import 되지 않았다는 내용이 전부다. 만약 기존에 운영해왔던 Ghost 컨테이너의 `/var/lib/ghost/content` 경로를 도커 볼륨으로 잘 설정해 두었었다면, 그동안 올려둔 테마나 사진 등의 데이터는 도커 볼륨에 안전히 저장되어 있을 것이므로 안심해도 된다.

내 경우에는 `Settings` - `Design`으로 이동하여 기존에 사용해왔던 테마를 다시 `Activate`하고, 설정값을 다시 부여한 뒤 저장하는 과정을 거쳤다. 그리고 각 포스팅과 페이지의 내용, 그리고 삽입된 이미지들이 문제 없이 잘 복원된 것을 확인했다. 이로써 Ghost 5로의 업그레이드와 데이터 마이그레이션이 성공적으로 마무리 되었다.

## 맺음말

이번 업그레이드 작업을 하면서 **Docker의 편의성**을 다시 한 번 실감했다. DBMS로 MySQL을 추가하는 작업이 더해졌지만, **Compose 파일과 몇몇 환경변수의 추가 만으로 모든 작업이 간편하게 진행**되었다. 베어메탈 상태의 시스템에서 SQLite3나 MariaDB를 쓰다가 MySQL로 DBMS를 교체하는 작업을 수행해야 했다면 무척 난감했을 것이다.

해결해야 할 과제도 있다. **Docker에서 비밀번호 등 민감정보를 환경변수로 다룰 때 평문으로 호스트에 남아있도록 방치하는 것은 바람직하지 않다.** 컨테이너 환경의 특성상 컨테이너 내부에는 평문으로 남더라도, 호스트에서는 어떤 식으로든 암호화 되거나 외부에서 알아볼 수 없도록 하는 방법이 필요했다. 이 방법을 나름대로 고민하는 과정에서 배우게 된 것들은 이어지는 다음 포스팅 시리즈를 통해 차례차례 다룰 예정이다.
