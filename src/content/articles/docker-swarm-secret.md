---
title: "Docker Swarm에서 시크릿(Secret)으로 패스워드 등 보안 정보 다루기"
description: "암호화되지 않은 채로 전송되거나 보관되어서는 안 되는 패스워드, 인증서, 키파일, 기타 텍스트 및 바이너리 파일을 다룰 때엔 시크릿(Secret)을 이용해보자."
pubDate: "2022-09-07T13:04:12.000Z"
tags: ["docker"]
featureImage: "/content/images/2022/09/cover-1.png"
---

2022년 9월 현재 이 블로그는 Ghost 5 버전에 MySQL 8이 조합된 형태로 운영되고 있다. MySQL을 쓰게 된 부득이한 계기에 대해서는 [이전의 업그레이드 안내 포스팅](/upgrade-to-ghost-v5-with-mysql-8-in-docker-compose/)에서 소개한 바 있다. 업그레이드 과정에서 도커의 편의성을 실감하기도 했지만, 한 가지 고민도 생겼다. 환경변수로 넘기는 **모든 정보가 호스트에 평문으로 남는다**는 것이다. 보안이 크게 필요치 않은 정보라면 괜찮겠지만, DBMS의 `root` 계정 비밀번호 등을 이런 식으로 다루는 것은 바람직하지 않다.

도커 스웜(Docker Swarm)에서는 클러스터 단위에서 보안이 필요한 정보를 조금 더 안전히 다룰 수 있는 도구를 제공한다. 이번에 살펴볼 **시크릿(Secret)**이 그것이다.

## 시크릿(Secret)의 용도와 특징

도커 스웜(Docker Swarm)에서 시크릿(Secret)은 **보안이 필요한 민감한 데이터를 클러스터 단위에서 안전하게 관리**하는 용도로 쓰인다. 암호화되지 않은 채로 전송되거나 보관되어서는 안 되는 패스워드, 인증서, 키파일, 기타 텍스트 및 바이너리 파일을 시크릿에 담아 사용할 수 있다.

시크릿을 사용할 때 유념해야 할 특징들은 다음과 같다.

-   **도커 스웜 모드에서 생성된 서비스에만 사용 가능**하다. `docker` 또는 `docker compose` 명령으로 생성된 개별 컨테이너에는 사용할 수 없다.
-   시크릿에 포함된 데이터는 **클러스터 안에 암호화되어 보관**된다.
-   시크릿에 포함된 데이터는 오직 **그 시크릿이 삽입된 서비스와, 이에 속하여 구동 중인 태스크의 컨테이너만이 접근**할 수 있다.
-   서비스에 삽입된 시크릿은 해당 서비스에 포함된 컨테이너의 `in-memory filesystem`에 복호화된 상태로 적재된다. 휘발성 메모리를 이용한 `tmpfs`와 유사한 형태다.
-   컨테이너에 마운트 된 시크릿 데이터는 컨테이너 내부에서 `/run/secrets/<시크릿명>` 경로를 통해 접근할 수 있다.
-   **시크릿도 언제든 서비스에 추가 또는 삭제될 수 있다.** 추가나 삭제가 발생한 서비스의 태스크(컨테이너)는 그 즉시 종료되고 새로 생성되어 스케줄링 된다.
-   시크릿이 포함된 태스크(컨테이너)가 중단되면, 복호화되어 마운트 되어 있던 시크릿의 데이터 원문은 즉시 마운트가 해제되며 노드의 메모리에서도 제거된다.
-   하나의 시크릿은 여러 서비스가 함께 사용할 수 있다.
-   하나의 서비스는 여러 시크릿을 동시에 사용할 수 있다.
-   현재 구동 중인 서비스와 연결된 시크릿은 클러스터에서 임의로 제거할 수 없다.
-   시크릿이 포함된 채로 동작 중인 태스크(컨테이너)는 해당 노드가 클러스터와 연결이 끊어지더라도 일단은 동작 상태를 유지한다. 그러나 클러스터와 노드가 다시 연결되지 않는 한, 시크릿의 추가/수정/삭제는 불가능하다.
-   도커 스웜에서는 `docker service inspect` 명령으로 특정 서비스에 어떤 컨픽들이 연결되어 있는지 확인할 수 있다. 그러나 반대로 특정 컨픽이 클러스터의 어느 서비스에 연결되어 있는지 알아볼 수 있는 방법은 아직 없다.

### 쿠버네티스 시크릿(Secret)과의 차이점

쿠버네티스에서도 같은 이름의 객체가 존재한다. 비밀번호나 SSH 인증서, 키파일 등을 관리하기 위한 객체라는 점도 동일하다. 암호화와 보안성의 측면에서 둘은 다음과 같은 차이점을 갖는다.

-   **도커 스웜의 시크릿**에 있는 데이터는 **항상 암호화되어 있다.** 전송(`in transit`), 보관(`at rest`) 과정에서도 암호화 상태가 유지된다. 오직 마운트 된 컨테이너 안에서만 평문으로 존재한다.
-   **쿠버네티스의 시크릿**에 있는 데이터는 **`base64`로 인코딩된 평문 상태**로 남아있다. 클러스터의 `etcd`에 접근할 권한이 있다면 시크릿의 내용에도 손쉽게 접근할 수 있다. 사실상 컨픽맵(ConfigMap)의 `base64` 버전인 셈이다.

한편 사용 편의성 측면에서도 차이가 있다.

-   **도커 스웜의 시크릿**은 오직 **파일 형태로만 컨테이너에 마운트**할 수 있다. 따라서 파일 형태의 환경변수 주입을 허용하지 않는 이미지에 시크릿을 사용하려면 별도의 `entrypoint` 셸 스크립트를 준비해야 한다. 또한 시크릿 안에 포함된 개별 `키=값` 데이터를 따로 활용할 수 없다.
-   **쿠버네티스의 시크릿**은 파일 형태 외에도 개별 파드의 명세에 `키=값` 데이터를 환경변수로 주입하는 것이 가능하다. 하나의 시크릿 안에 여러 개의 `키=값` 데이터가 존재한다면 명세 상에 `키`를 명시함으로써 선택적으로 사용하는 것도 가능하다.

## 시크릿(Secret) 활용 입문

도커 스웜의 시크릿 사용법은 대부분 [이전 글에서 소개한 컨픽(Config)](/docker-swarm-config/)과 거의 동일하다. 컨픽(Config) 사용에 능숙하다면 시크릿도 쉽게 활용할 수 있을 것이다.

### 시크릿 생성하기

시크릿 생성은 `docker secret create` 명령을 이용한다. 컨픽과 마찬가지로, 마지막 인수로 무엇을 입력하는가에 따라 시크릿의 생성 방법이 두 가지로 갈린다.

```bash
# 1. 지정된 경로의 텍스트 파일 내용을 읽어들여 생성한다.
docker secret create my-secret ~/my-secret.json

# 2. `STDIN`으로 들어온 입력값을 받아서 생성한다.
echo "this is my secret" | docker secret create my-secret -
```

`--label` 또는 `-l` 플래그로 `키=값` 형태의 레이블을 추가할 수 있다. 이 레이블은 오직 클러스터 내부에서 개별 시크릿 간의 구분 등의 관리상 편의를 위해 쓰인다.

```bash
# 파일로부터 불러들인 값으로 `my-secret`란 시크릿을 생성하고,
# 여기에 env=PROD, date=20220901 레이블을 추가한다.
docker secret create \
	--label env=PROD \
	--label date=20220901 \
	my-secret ~/my-secret.json
```

### 시크릿 정보 조회하기

`docker secret ls` 명령으로 현재 클러스터에 남아있는 시크릿 목록을 볼 수 있다.

```bash
ubuntu@sjhong-node-01:~$ docker secret ls

ID                          NAME        DRIVER    CREATED         UPDATED
afrubazrzcsnqn7epfi57jibs   my-secret             3 minutes ago   3 minutes ago
```

개별 컨픽에 대한 정보는 `docker secret inspect` 명령으로 확인한다. 역시 `JSON` 포맷으로 출력되며, `--pretty` 플래그를 붙이면 조금 더 읽기 편한 형태로 볼 수 있다. 아래에서 볼 수 있듯이, 시크릿의 경우에는 컨픽과 달리 `inspect` 명령을 사용하더라도 어떤 데이터가 담겨 있는지 노출되지 않는다. 시크릿에 담긴 데이터 원문은 오직 그 시크릿이 마운트 된 컨테이너 내부에서만 확인할 수 있다.

```bash
ubuntu@sjhong-node-01:~$ docker secret inspect my-secret

[
    {
        "ID": "afrubazrzcsnqn7epfi57jibs",
        "Version": {
            "Index": 899
        },
        "CreatedAt": "2022-09-07T11:46:24.211879525Z",
        "UpdatedAt": "2022-09-07T11:46:24.211879525Z",
        "Spec": {
            "Name": "my-secret",
            "Labels": {
                "date": "20220901",
                "env": "PROD"
            }
        }
    }
]
```

### 시크릿 삭제하기

`docker secret rm <시크릿명>` 명령으로 불필요한 시크릿을 클러스터에서 삭제한다. 특정 서비스에 마운트되지 않은 미사용 상태의 시크릿만 바로 삭제 가능하다.

```bash
ubuntu@sjhong-node-01:~$ docker secret rm my-secret

# 삭제가 완료되면 삭제된 시크릿명이 표기된다.
my-secret
```

## 시크릿(Secret)을 서비스에 활용하기

지난 Ghost 5 업그레이드 안내 포스팅에서 [`mysql:8` 이미지 기반의 DB 서비스를 추가](/upgrade-to-ghost-v5-with-mysql-8-in-docker-compose/#3-2-db-%EC%84%9C%EB%B9%84%EC%8A%A4-%ED%95%AD%EB%AA%A9-%EC%B6%94%EA%B0%80)한 바 있다. 이때 사용했던 환경변수 목록은 아래와 같다.

```yaml
  db:
    image: mysql:8
    container_name: db
    ...
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    ...
```

사용자 계정명(`MYSQL_USER`)과 DB명(`MYSQL_DATABASE`)은 기존과 같이 평문으로 두어도 되지만, `root` 계정 비밀번호(`MYSQL_ROOT_PASSWORD`)와 사용자 비밀번호(`MYSQL_PASSWORD`)는 보안이 필요한 정보들이다. 이번에는 하나의 예시로서, 이들을 기존의 평문 대신 시크릿으로 대체하여 주입시켜 볼 것이다.

### 시크릿 생성하기

보안이 필요한 데이터를 파일로 담아 시크릿으로 생성하는 방법은 편리하지만, 여전히 평문 데이터의 노출 가능성이 남아있다. 직접 값을 입력해서 만들 경우에는 `~/.bash_history`에 입력 내용이 평문으로 남겨지게 되므로 해당 기록의 관리에 신경써야 한다는 단점이 있다.

하지만 **임의의 랜덤 문자열을 생성 즉시 시크릿으로 주입**한다면 위와 같은 위험 요소를 걱정하지 않아도 된다. 문자열 생성 방법은 여러 가지가 있지만, 여기서는 `OpenSSL`의 랜덤값 생성 명령어인 `rand`를 이용한 방법을 소개하기로 한다.

```bash
openssl rand -base64 <바이트수> | docker secret create <시크릿명> -
```

-   `openssl rand <바이트수>`는 해당 바이트 만큼의 암호를 무작위로 생성한다.
-   `-base64`는 생성된 암호를 `base64`로 인코딩하는 플래그로, 암호를 `alphanumeric + 일부 특수문자` 형태로 가공하여 범용성을 높이기 위해 쓰인다.

이렇게 시크릿을 생성하면 실제 생성된 문자열이 시스템에 평문으로 남지도 않고, 호스트와 컨테이너를 오가는 과정에서 평문이 노출될 위험도 없어진다. 오직 시크릿이 삽입되어 구동된 컨테이너 내부의 특정 경로(`/run/secrets/<시크릿>`)에 직접 접근해야만 내용을 확인할 수 있게 된다.

아래와 같이 `mysql_root_password`, `mysql_password`라는 두 개의 시크릿을 생성해주자.

```bash
openssl rand -base64 32 | docker secret create mysql_root_password -
openssl rand -base64 32 | docker secret create mysql_password -
```

생성된 시크릿이 클러스터에 잘 저장되었는지 `docker secret ls` 명령으로 체크한다.

```bash
ubuntu@sjhong-node-01:~$ docker secret ls

ID                          NAME                  DRIVER    CREATED              UPDATED
x57ulnzz04ubh0gy0mlzr28aw   mysql_password                  About a minute ago   About a minute ago
f4etgiqia5xad1l70s329kkd4   mysql_root_password             About a minute ago   About a minute ago
```

### 시크릿을 서비스에 적용하기

위에서 생성한 시크릿을 포함한 서비스 `db`를 클러스터에 배포시킨다. 이때 사용할 명령어는 아래와 같이 구성한다.

```bash
docker service create \
  --name db \
  --env MYSQL_USER="seongjin" \
  --env MYSQL_DATABASE="seongjin_test" \
  --env MYSQL_ROOT_PASSWORD_FILE="/run/secrets/mysql_root_password" \
  --env MYSQL_PASSWORD_FILE="/run/secrets/mysql_password" \
  --secret source=mysql_root_password,target=mysql_root_password \
  --secret source=mysql_password,target=mysql_password \
  --mount type=volume,source=db-data,destination=/var/lib/mysql \
  --replicas 1 \
  mysql:latest
```

-   `--env` 플래그에는 개별 환경변수를 `변수명=값` 형태로 지정한다.
-   `--secret` 플래그로 개별 시크릿을 서비스에 마운트한다. `source`에는 시크릿 이름을, `target`에는 시크릿이 마운트 될 경로를 지정한다. 도커 스웜에서 모든 시크릿은 기본적으로 `/run/secrets/` 안에 `target`으로 지정된 이름의 경로를 갖게 된다.
-   이렇게 생성된 각 시크릿별 마운트 경로값을 `MYSQL_ROOT_PASSWORD_FILE`과 `MYSQL_PASSWORD_FILE` 환경변수에 넣어준다. **앞서 `YAML`에서 보았던 환경변수 이름에 `_FILE`이 추가된 점에 유의하자.** [MySQL의 공식 이미지](https://hub.docker.com/_/mysql)는 보안이 필요한 몇몇 환경변수에 한하여 `값` 대신 `파일경로`를 넣을 수 있도록 이와 같이 배려하고 있다.
-   `--mount` 플래그로 DB 저장 공간에 대한 도커 볼륨 `db-data`를 설정해준다.
-   MySQL 공식 이미지로 컨테이너를 구동시킬 경우 경우 `MYSQL_ROOT_PASSWORD` 또는 `MYSQL_ROOT_PASSWORD_FILE` 환경변수가 반드시 있어야 한다. 나머지는 선택사항이다.

### 시크릿 내용 확인하기

앞서 언급했듯, 시크릿의 데이터 원문은 오직 시크릿이 마운트된 컨테이너 내부에서만 확인할 수 있다. 예를 들어 위에서 `MYSQL_PASSWORD_FILE` 환경변수에 주입된 실제 값은 `db` 서비스에 속한 컨테이너 내부의 `/run/secrets/mysql_password` 경로에 저장되어 있다.

아래와 같이 `docker container exec` 명령을 이용하여 컨테이너의 해당 경로에 접근하면 `mysql_root_password` 시크릿이 가지고 있는 실제 데이터값을 확인할 수 있다.

```bash
# 컨테이너에 접근하여 명령을 수행하고자 할 때에는
# docker container exec <플래그> <컨테이너ID> <명령어 조합> 형태로 실행한다.
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=db -q) cat /run/secrets/mysql_password

# 앞서 openssl rand -base64 명령어로 생성한 비밀번호가 출력된다.
C97wMywvpnsAHqJA6Z+C9Bu0yHDV1o5Yiw9sc361Ec0=
```

### 시크릿 적용 여부 확인하기

시크릿으로 주입한 비밀번호 값이 `db` 서비스의 MySQL에 잘 적용 되었는지 확인해보자. `docker container exec` 명령에 `-it` 플래그를 더하면 MySQL 로그인에 필요한 커맨드를 간편하게 바로 실행할 수 있다.

```bash
# db 컨테이너의 MySQL에 root 계정으로 접속한다.
ubuntu@sjhong-node-01:~$ docker container exec -it $(docker ps --filter name=db -q) bash -c 'mysql -u root -p'

# 앞서 위에서 확인한 secret 원문의 비밀번호를 입력한다.
Enter password:

# 아래와 같이 root 계정으로 MySQL에 로그인된 것을 확인할 수 있다.
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 8
Server version: 8.0.30 MySQL Community Server - GPL

Copyright (c) 2000, 2022, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql>
```

### 시크릿 연결 해제하고 삭제하기

컨픽과 마찬가지로, 시크릿 또한 서비스에서 마운트 해제된 상태에서만 삭제가 가능하다. 현재 상태에서 `mysql_password` 시크릿 삭제를 시도할 경우 아래와 같은 에러가 발생한다.

```bash
ubuntu@sjhong-node-01:~$ docker secret rm mysql_root_password

# 해당 시크릿이 어느 서비스에 마운트 되어 있는지 알려주는 에러 메시지가 출력된다.
Error response from daemon: rpc error: code = InvalidArgument desc = secret 'mysql_root_password' is in use by the following service: db
```

MySQL의 경우 일단 데이터베이스가 생성되고 나면 사용자 계정 정보가 MySQL DB 안에 보관된다. `db` 서비스를 처음 배포할 때 `db-data`라는 이름으로 MySQL의 데이터가 저장된 도커 볼륨을 설정하여 두었으므로, `db` 서비스는 이후로도 앞서 설정된 계정 정보를 온전히 보유한 상태로 계속해서 잘 동작할 것이다. 따라서 초기 설정 때에만 필요한 `mysql_root_password`, `mysql_password` 시크릿은 더 이상 `db` 서비스에 연결되어 있지 않아도 무방하다.

`docker service update` 명령을 이용해서 아래와 같이 불필요한 시크릿들의 연결을 해제한다. **서비스로부터 시크릿 연결을 해제할 때에는 해당 시크릿과 연계된 환경변수 항목도 함께 제거**해야 한다는 점을 유의하자.

```bash
docker service update \
  --secret-rm mysql_root_password \
  --secret-rm mysql_password \
  --env-rm MYSQL_ROOT_PASSWORD_FILE \
  --env-rm MYSQL_PASSWORD_FILE \
  db
```

`docker service update` 명령은 해당 서비스의 변화점을 반영하여 태스크(컨테이너)를 새로 배포하고 스케줄링 시킨다. 앞서 확인했던 MySQL `root` 계정의 패스워드 원문이 컨테이너에 아직 남아있는지 체크해보자.

```bash
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=db -q) cat /run/secrets/mysql_root_password

# 주입되었던 시크릿 데이터가 사라졌으므로 대상을 찾을 수 없다는 에러가 리턴된다.
cat: /run/secrets/mysql_root_password: No such file or directory
```

이렇게 서비스와의 연결이 해제된 시크릿은 `docker secret rm` 명령으로 클러스터에서 삭제할 수 있다. 연결되었던 서비스가 중단되거나 삭제되더라도 시크릿 자체는 클러스터에 남아있게 되므로, 불필요한 시크릿이 계속 남아있지 않도록 주기적인 관리가 요구된다.

```bash
docker secret rm mysql_root_password mysql_password

# 삭제가 완료되면 삭제된 시크릿명이 표기된다.
mysql_root_password
mysql_password
```

## 참고자료

-   [Docker Docs : Manage sensitive data with Docker secrets](https://docs.docker.com/engine/swarm/secrets/)
-   [Docker Docs : docker secret create](https://docs.docker.com/engine/reference/commandline/secret_create/)
-   [Docker Docs : docker service create](https://docs.docker.com/engine/reference/commandline/service_create/)
-   [Docker Docs : docker service update](https://docs.docker.com/engine/reference/commandline/service_update/)
