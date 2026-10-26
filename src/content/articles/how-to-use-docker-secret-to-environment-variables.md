---
title: "Docker Swarm에서 시크릿(Secret)을 환경변수로 주입할 때 꼭 필요한 쉘 스크립트(Shell Script) 소개"
description: "도커 스웜(Docker Swarm)의 시크릿(Secret)은 오직 파일 마운트 방식으로만 환경변수를 주입할 수 있다. 따라서 이 방식을 지원하지 않는 도커 이미지에는 시크릿(Secret)을 환경변수에 사용하기 어렵다. 하지만 쉘 스크립트(Shell Script)와 도커파일(Dockerfile)을 조합하면, 안 되는 것을 되게 만들 수 있다. 그 방법을 소개한다."
pubDate: "2022-11-09T02:06:37.000Z"
tags: ["docker", "shell-script"]
featureImage: "/content/images/2022/11/cover.png"
---

도커 스웜(Docker Swarm)에서는 보안이 필요한 데이터를 따로 관리할 수 있도록 **시크릿(Secret)**이라는 객체를 제공한다. 시크릿에 담긴 데이터는 컨테이너 안의 인메모리 파일 시스템에 위치하고, 서비스는 이 데이터를 환경변수로 받아 컨테이너에 포함된 애플리케이션을 구동시킨다.

직관적인 방식이지만, 한 가지 치명적인 단점이 있다. **파일 마운트 방식의 환경변수 입력을 지원하지 않는 애플리케이션 이미지에는 도커 스웜의 시크릿을 환경변수에 쓸 수 없다는 것이다.**

2022년 11월 현재 이 블로그에서 사용 중인 [Ghost](https://hub.docker.com/_/ghost) 이미지를 예시로 살펴보자. 도커 스웜 클러스터의 매니저 노드에서 DB 연결에 필요한 개별 설정값을 각각의 시크릿(Secret)으로 생성해두고, 이를 배포용 `YAML` 파일에 아래와 같이 삽입하여 배포해 보았다.

```yaml
version: '3.9'

services:
  ghost:
    image: ghost:5
    ...
    environment:
      database__client: mysql
      database__connection__host: /run/secrets/ghost_db_host
      database__connection__user: /run/secrets/ghost_db_user
      database__connection__password: /run/secrets/ghost_db_password
      database__connection__database: /run/secrets/ghost_db_database
      ...
    secrets:
      - ghost_db_host
      - ghost_db_user
      - ghost_db_password
      - ghost_db_database
  db:
    image: mysql:8
    ...
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/ghost_db_password
    secrets:
      - ghost_db_password
...
```

시크릿을 컨테이너에 주입하는 성공적인 예시를 모두 따랐건만, 막상 실행하면 `ghost` 서비스가 제대로 구동되지 않는다. `ghost` 서비스에 속한 태스크의 로그를 살펴보면 다음과 같다.

```
[2022-11-03 04:43:19] INFO Ghost is running in production...
[2022-11-03 04:43:19] INFO Your site is now available on http://localhost:8000/
[2022-11-03 04:43:19] INFO Ctrl+C to shut down
[2022-11-03 04:43:19] INFO Ghost server started in 0.663s
[2022-11-03 04:43:19] ERROR Invalid database host.

Invalid database host.

"Please double check your database config."

Error ID:
    500

Error Code: 
    ENOTFOUND

----------------------------------------

Error: getaddrinfo ENOTFOUND /run/secrets/ghost_db_host
    at /var/lib/ghost/versions/5.22.4/node_modules/knex-migrator/lib/database.js:50:23
    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:109:26)
```

`getaddrinfo ENOTFOUND <텍스트>`는 인식 불가능한 호스트가 주어졌을 때 발생하는 에러다. 여기서 `<텍스트>` 부분을 주목하자. 앞서 주입한 시크릿(`ghost_db_host`)의 마운트 경로에 존재하는 원문을 읽어와야 하는데, 경로명 자체가 그대로 주입되어 있다. 이것이 `ghost` 서비스 구동 실패의 원인이다.

도커 스웜에서 시크릿을 서비스 컨테이너에 삽입시킬 때엔 일반적으로 `/run/secrets/시크릿명` 형태의 경로를 환경변수값으로 지정하는 방식을 따른다. 그런데 스웜 매니저는 서비스를 구동시킬 때 입력받은 환경변수값을 별다른 가공 없이 컨테이너에 바로 넘겨버린다. 즉, `/run/secrets/시크릿명` 경로에 위치한 **시크릿 내부의 데이터 원문에 접근하여 그 값을 컨테이너의 환경변수값으로 적용시키는 작업은 스웜 매니저가 아니라 서비스 컨테이너의 몫**이 되는 것이다. 이러한 시나리오를 고려하지 않고 빌드된 이미지에는 도커 스웜의 시크릿(Secret)을 환경변수에 주입할 수 없다.

도커 허브에 올라온 많은 공식 이미지들은 다행히 도커 스웜의 시크릿(Secret) 사용을 전제한 별도의 환경변수 항목을 제공한다. 예를 들어 `MySQL`의 경우, [DB 계정 관련하여 보안이 필요한 5개 환경변수에 한해 `_FILE` 접미어를 포함시켜 시크릿(Secret)을 이용할 수 있도록 지원](https://hub.docker.com/_/mysql)한다. 하지만 이런 방법을 지원하지 않는 이미지 기반 컨테이너라면 어떻게 해야 할까?

방법이 없는 것은 아니다. 조금 번거롭긴 하지만, **쉘 스크립트(Shell Script)와 도커파일(Dockerfile)을 조합**하면 불가능도 가능으로 만들 수 있다. 이번 글에서는 이에 필요한 작업 절차를 다음과 같이 안내할 것이다.

1.  쉘 스크립트(Shell Script) 작성하기
2.  확장 이미지(Extension Image)용 도커파일(Dockerfile) 만들기
3.  확장 이미지(Extension Image) 빌드하기
4.  배포하기

## 쉘 스크립트(Shell Script) 작성하기

이제부터 소개할 스크립트는 **MySQL 8 공식 이미지의 `docker-entrypoint.sh`에 포함된 코드**에 기초한 것임을 밝혀둔다. 실제로 [Wordpress](https://hub.docker.com/_/wordpress), [MongoDB](https://hub.docker.com/_/mongo), [PostgreSQL](https://hub.docker.com/_/postgres) 등 도커 허브에 올라온 많은 공식 이미지들이 동일한 방법으로 도커 스웜의 시크릿을 지원하고 있다. 여기서는 이 블로그에 쓰인 [Ghost 5.x 공식 이미지](https://hub.docker.com/_/ghost)를 예시로 사용할 것이다.

앞으로 작성할 쉘 스크립트 파일을 `add-file-env.sh`로 이름짓기로 한다. 이 스크립트로 구현할 내용은 아래와 같다.

1.  시크릿 이용이 필요한 환경변수 목록을 배열로 받아둔다.
2.  입력 받은 환경변수명에 대하여 만약 `_FILE` 접미어가 추가된 변수명으로 지정된 값이 있다면, 그 값이 가리키는 경로의 내용을 읽어들여 원래의 환경변수값으로 넘겨준다. 만약 `_FILE`이 포함된 변수명으로 지정된 값이 없다면 원래의 환경변수를 그대로 읽어들인다.
3.  1번 배열에 포함된 모든 각 환경변수가 2번 작업을 거치도록 한다.

쉘 스크립트 입문자로서 이 코드를 적용하는 일이 쉽지는 않았다. 나와 같은 어려움에 처한 분들을 위해 각 코드 내용 별로 해설을 함께 첨부했으니 참고하길 바란다.

### 1\. 환경변수 배열 선언

```bash
# Import original DB envs of Ghost5
envs=(
	"database__connection__host"
	"database__connection__user"
	"database__connection__password"
	"database__connection__database"
)
```

`bash`에서 배열은 `변수=(값1 값2 값3)` 형식으로 선언할 수 있다. 위에서는 운영(Production) 환경에서 Ghost 컨테이너를 구동할 때 필요한 DB 관련 각 환경변수를 `envs` 변수에 배열 형태로 삽입했다. DB 설정을 위해 삽입 가능한 전체 환경변수 목록은 [여기서 확인할 수 있다](https://ghost.org/docs/config/#database).

### 2\. `file_env()` 정의

```bash
# file_env() function imported from MySQL8 docker image
# usage: file_env VAR [DEFAULT]
#    ie: file_env 'XYZ_DB_PASSWORD' 'example'
# (will allow for "$XYZ_DB_PASSWORD_FILE" to fill in the value of
#  "$XYZ_DB_PASSWORD" from a file, especially for Docker's secrets feature)
file_env() {
	local var="$1"
	local fileVar="${var}_FILE"
	local def="${2:-}"
	if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
		echo >&2 "Both $var and $fileVar are already set"
		exit 1
	fi
	local val="$def"
	if [ "${!var:-}" ]; then
		val="${!var}"
	elif [ "${!fileVar:-}" ]; then
		val="$(< "${!fileVar}")"
	fi
	export "$var"="$val"
	unset "$fileVar"
}
```

`file_env()` 함수는 도커 이미지에 파일 형태의 환경변수 주입을 가능하게 하는 구현부를 포함한다. 위의 코드는 `bash`에서 `file_env 환경변수명 [기본값]` 형태로 실행 가능하다. 이렇게 실행되면 다음과 같이 동작한다.

1.  `file_env()`는 두 개의 인자를 매개변수로 받는다. 첫 번째인 `환경변수명`에는 위의 1번 단계에서 정의된 개별 환경변수명을 입력한다. 두 번째인 `기본값`에는 앞의 변수명에 대응하는 기본값을 입력한다. 이들 중 `기본값` 인자는 선택사항이다.
2.  만약 `환경변수명`에 `_FILE` 꼬리표가 추가된 변수명(`환경변수명_FILE`)으로 지정된 값이 컨테이너 구동 정보에 존재한다면, 그 값이 가리키는 경로의 내용을 읽어들여 원래의 `환경변수명`에 대응하는 값으로 넘겨준다.
3.  만약 컨테이너 구동 정보에 `환경변수명_FILE` 변수 자체는 존재하는데 값이 없다면, 두 번째 인자로 받은 `기본값`을 원래의 `환경변수명`에 대응하는 값으로 넘겨준다.
4.  만약 컨테이너 구동 정보에 `환경변수명_FILE` 변수 자체가 존재하지 않는다면, 원래의 `환경변수명`에 주어진 값을 그대로 사용하도록 한다.

길지 않은 코드지만, 쉘 스크립트 문법이 낯설다면 내용 파악이 조금 어려울 수 있다. 코드를 조금 더 찬찬히 뜯어보기로 하자.

```bash
local var="$1"
local fileVar="${var}_FILE"
local def="${2:-}"
```

-   `bash`에서 변수명 앞의 `local`은 지역변수를 선언할 때 쓰인다. 반대로 1번 단계의 `envs`처럼 별도의 접두어가 없는 경우는 전역변수로 취급된다.
-   `$1`, `$2` 등은 `bash`에서 인자로 입력받은 순서대로의 각 매개변수를 의미한다.
-   `${변수}`는 해당 변수의 값을 치환하여 넣는 문법이다.
-   `${변수:-}`에서 변수명 끝에 붙은 `:-`는 `bash`에서 매개변수 확장 기호 중 하나다. 본래는 `${변수:-단어}` 형태로 쓴다. 지정된 변수값을 출력하되, 변수값이 없거나(`null`) 변수 자체가 정의되지 않은 상태(`unset`)라면 `단어`에 해당하는 값을 대신 출력하라는 뜻이다. 위와 같이 `단어`가 비어있는 경우라면, 해당 `변수`값이 존재하지 않을 경우 빈 값으로 대체하라는 뜻이 된다.

```bash
if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
	echo >&2 "Both $var and $fileVar are already set"
	exit 1
fi
```

-   `bash`에서 `${!변수}`는 [`변수`의 값을 이름으로 가진 다른 변수의 값을 가리킨다.](https://stackoverflow.com/questions/23817820/bash-what-does-mean-as-in-echo-var) 만약 해당 변수의 값이 없거나 변수 자체가 존재하지 않는다면 빈 값을 돌려준다.
-   `echo >&2 "메시지"`에서 `>&2`는 `stderr`를 가리킨다. 즉, `stderr`로 `메시지`를 출력하라는 의미가 된다.
-   따라서 위의 코드를 해석하면, 컨테이너의 특정 환경변수에 설정값으로 주입할 값이 중복으로 존재하는 경우, 즉 같은 항목에 대하여 텍스트형 환경변수(`var`)와 파일형 환경변수(`fileVar`)가 동시에 설정된 경우에는 `>&2`가 가리키는 `stderr`로 에러 메시지를 출력한 뒤 스크립트를 종료시키라는 내용이 된다.

```bash
local val="$def"
if [ "${!var:-}" ]; then
	val="${!var}"
elif [ "${!fileVar:-}" ]; then
	val="$(< "${!fileVar}")"
fi
```

-   `bash`에서 `<`는 입력 재지정 용도로 쓰이는 메타 문자다. 따라서 `$(< "${!fileVar}")`는 `fileVar` 변수값으로 부여된 텍스트를 경로로 가진 특정 파일의 내용을 읽어들이라는 뜻이 된다.
-   결국 위의 코드는 원래의 환경변수에 들어갈 내용(`val`)을 선별하는 역할을 한다. 원래 변수명으로 주어진 값(`${!var:-}`)이 있다면 그것을 쓰고, 아니라면 `_FILE`이 붙은 변수명으로 주어진 값(`${!fileVar:-}`)을 찾아 쓰며, 둘 다 없다면 함수 실행시 주어진 기본값 인자(`$def`)를 쓰도록 하는 것이다.

```bash
export "$var"="$val"
unset "$fileVar"
```

-   위에서 최종적으로 정해진 환경변수값(`$val`)을 원래의 환경변수명(`$var`)에 대입하여 `export` 명령어를 통해 새로운 환경변수로 선언한 뒤, 임시적으로 만들었던 `$fileVar` 변수를 선언 해제한다.

### 3\. 각 환경변수에 값 주입하기

```bash
# Run file_env() to fill the value of every original env from either $var or $fileVar
for env in "${envs[@]}"; do
	file_env "$env"
done
```

-   `${envs[@]}`에서 `@`는 배열의 모든 인덱스를 가리키는 문자다.
-   위의 구문은 1번 단계에서 지정된 `envs` 배열의 각 환경변수(`env`)에 대해 2번 단계에서 정의한 `file_env()` 함수를 실행시키는 내용이다.

### 4\. 원래 이미지의 entrypoint 파일 불러오기

대부분의 도커 이미지에는 컨테이너 구동에 필요한 `entrypoint` 스크립트 파일이 포함되어 있다. 컨테이너의 정상 동작을 위해서는 이 원본 이미지의 스크립트 파일이 현재 작성 중인 새 스크립트와 함께 실행되도록 만들어 주어야 한다.

원래 이미지에 포함된 `entrypoint` 파일의 내용을 먼저 살펴본 뒤, 현재 작성 중인 스크립트 내용과 대조하여 어느 시점에 실행시켜 줄 것인지를 정해야 한다. 이 글에서 예시로 사용할 `ghost` 이미지의 경우, **원본 베이스 이미지에 포함된 [`docker-entrypoint.sh`](https://github.com/docker-library/ghost/blob/master/5/debian/docker-entrypoint.sh) 파일이 현재 작성 중인 `add-file-env.sh`보다 나중에 실행**되어야 한다. 따라서 아래 코드를 마지막 부분에 덧붙여준다.

```bash
# Call the original entrypoint bash script
source docker-entrypoint.sh
```

-   `source`는 `bash`에서 지정된 경로의 파일을 읽어 그 내용을 실행하도록 하는 명령으로 쓰인다. 이때 실행되는 내용은 **기존 스크립트와 동일한 프로세스에서 실행**되므로, 해당 파일에서 지정된 변수 및 함수가 함께 공유된다.
-   `ghost` 원본 이미지의 [도커파일(Dockerfile)](https://github.com/docker-library/ghost/blob/master/5/debian/Dockerfile)을 보면, 원본 `docker-entrypoint.sh` 파일이 컨테이너의 `/usr/local/bin`에 삽입되도록 설정되어 있다. (Debian 기준) 따라서 위의 `source` 명령을 쓸 때 해당 파일의 경로를 별도로 지정하지 않아도 된다.

### 5\. 하나의 파일로 합치기

지금까지 작성된 단계별 코드를 모아 `add-file-env.sh` 파일로 합치면 아래와 같이 정리된다.

```bash
#!/bin/bash
set -euo pipefail

# file_env() function imported from MySQL8 docker image
# usage: file_env VAR [DEFAULT]
#    ie: file_env 'XYZ_DB_PASSWORD' 'example'
# (will allow for "$XYZ_DB_PASSWORD_FILE" to fill in the value of
#  "$XYZ_DB_PASSWORD" from a file, especially for Docker's secrets feature)
file_env() {
	local var="$1"
	local fileVar="${var}_FILE"
	local def="${2:-}"
	if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
		echo >&2 "Both $var and $fileVar are already set"
		exit 1
	fi
	local val="$def"
	if [ "${!var:-}" ]; then
		val="${!var}"
	elif [ "${!fileVar:-}" ]; then
		val="$(< "${!fileVar}")"
	fi
	export "$var"="$val"
	unset "$fileVar"
}

# Import original DB envs of Ghost5
envs=(
	"database__connection__host"
	"database__connection__user"
	"database__connection__password"
	"database__connection__database"
)

# Run file_env() to fill the value of every original env from either $var or $fileVar
for env in "${envs[@]}"; do
	file_env "$env"
done

# Call the original entrypoint bash script
source docker-entrypoint.sh
```

위 스크립트의 최상단에 포함된 아래의 두 줄에 주목하자.

```bash
#!/bin/bash
set -euo pipefail
```

-   맨 윗줄의 `#!`로는 이 스크립트가 어떤 쉘로 실행되어야 할지 지정한다. 위와 같이 `#!/bin/bash`로 썼다면, `bash`로 해당 스크립트를 실행하도록 지시하는 셈이다.
-   두 번째 줄의 `set -euo pipefail`은 쉘 스크립트 실행 도중 에러가 발생했을 때 에러코드와 함께 `bash`를 종료시키기 위해 쓰인 명령문이다. 커맨드라인 환경에서 쉘을 사용할 때엔 불필요한 옵션이지만(뭔가 잘못된 명령을 한 번 쳤다고 쉘 화면이 곧바로 꺼지는 상황을 원하는 사람은 없을 것이다), 위와 같이 스크립트만 실행하는 상황에서는 반드시 필요하다. 보다 자세한 내용과 설정법에 대해서는 [이 문서](https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425)를 참고하도록 하자.

## 확장 이미지(Extension Image)용 도커파일(Dockerfile) 만들기

기존에 존재하는 이미지를 베이스로 실제 개발/운영 환경에 필요한 내용을 추가하여 빌드한 이미지를 확장 이미지라고 한다. 여기서는 도커 허브(Docker Hub)에 등록된 `ghost:5`를 베이스로, 앞서 작성한 `add-file-env.sh`가 포함된 새로운 확장 이미지를 빌드할 것이다.

`add-file-env.sh` 파일과 같은 경로에 새 `Dockerfile`을 아래와 같이 작성한다.

```dockerfile
FROM ghost:5

COPY add-file-env.sh /usr/local/bin
RUN chmod +x /usr/local/bin/add-file-env.sh
ENTRYPOINT ["add-file-env.sh"]

CMD ["node", "current/index.js"]
```

-   `FROM`으로 베이스로 사용할 이미지 정보를 지정한다.
-   `COPY`로 앞서 작성한 쉘 스크립트를 이미지 컨테이너의 `/usr/local/bin` 경로로 복사한다.
-   `RUN`으로 위에서 복제된 스크립트를 실행 가능 모드로 전환시킨다.
-   `ENTRYPOINT`로 스크립트를 실행시킨다. `/usr/local/bin` 경로에 존재하므로 별도의 경로명을 지정할 필요가 없다.
-   `CMD`로 원본 베이스 이미지(`ghost:5`)의 도커파일에 지정되어 있던 `ghost` 애플리케이션 구동용 명령어를 입력하고 실행시킨다.

참고로 도커파일에는 오직 하나의 `ENTRYPOINT`와 `CMD`만 명시할 수 있다. 둘의 용도는 다음과 같다.

-   `ENTRYPOINT` : 컨테이너 구동 시 항상 실행되어야 하는 명령 지정
-   `CMD` : 컨테이너 구동 시 실행시킬 명령이나, `ENTRYPOINT`로 지정된 명령에 파라미터 값을 지정

여기서 예시로 쓰인 `ghost:5` 원본 이미지의 [도커파일 소스](https://github.com/docker-library/ghost/blob/master/5/debian/Dockerfile)를 살펴보면, 최하단에 `ENTRYPOINT`와 `CMD` 항목을 확인할 수 있다.

```dockerfile
...

COPY docker-entrypoint.sh /usr/local/bin
ENTRYPOINT ["docker-entrypoint.sh"]

EXPOSE 2368
CMD ["node", "current/index.js"]
```

그런데 확장 이미지의 도커파일에서 `ENTRYPOINT`를 새로 사용했다면, 기존 이미지의 `ENTRYPOINT` 항목과 `CMD` 항목은 모두 무시된다. 새 이미지의 컨테이너를 정상적으로 구동시키려면, 원본 이미지에서 `ENTRYPOINT`와 `CMD`로 지정된 명령들이 새 이미지에서도 똑같이 실행되도록 해주어야 한다. 그래서 앞서 작성한 `add-file-env.sh`에서 원래 이미지의 `docker-entrypoint.sh`를 불러오도록 하고, 새 도커파일에서도 `CMD` 명령으로 똑같은 실행 구문을 추가한 것이다.

## 확장 이미지(Extension Image) 빌드하기

`add-file-env.sh`와 `Dockerfile` 작성이 끝났다면, 이제 확장 이미지를 빌드할 차례다. 두 파일이 함께 위치한 경로에서 [`docker build` 명령으로 새 이미지를 생성](https://docs.docker.com/engine/reference/commandline/build/)한다.

```bash
# docker build 명령의 기본 사용법
docker build --tag <리포지터리명>/<이미지명:버전명> <경로>

# 자신의 리포지터리명과 ghost:5 태그를 가진 새 이미지를 로컬에 빌드한다.
docker build --tag seongjinme/ghost:5 .
```

![정상적으로 완료된 Ghost 확장 이미지 빌드 과정](/content/images/2022/11/extension-image-build.png)

## 배포하기

### 도커 스택(Docker Stack) 간단 소개

도커 스웜 환경에서는 여러 개의 서비스로 구성된 애플리케이션을 관리하기 위해 **스택(stack)**이라는 도구를 제공한다. `docker stack` 명령으로 애플리케이션을 배포하거나, 애플리케이션을 구성하는 각 서비스 및 태스크에 대한 정보를 확인하고 관리할 수 있다.

도커 스택(Docker Stack)에 쓰이는 `YAML` 형식은 기본적으로 `Compose file version 3`을 따른다. 도커 컴포즈(Docker Compose)에서 쓰이는 형식과 상당 부분 동일하나, 몇 가지 차이점을 가진다. 주요 사항만 추려서 요약하면 다음과 같다.

-   각 서비스마다 `deploy` 항목을 정할 수 있다. 여기에는 총 레플리카 수와 노드 배치 정보, 재시작 정책(`restart_policy`) 등을 명시할 수 있다. 도커 컴포즈에서 사용할 경우 이 옵션들은 무시된다.
-   도커 스택에서는 각 서비스에 `build` 항목을 쓸 수 없다. 스택을 통해 배포하려는 서비스의 이미지는 클러스터에 등록된 리포지터리에 미리 빌드되어 있어야 한다.
-   도커 스택에서는 `container_name` 항목으로 컨테이너별 이름을 지정할 수 없다. 각 컨테이너가 서비스에 소속된 태스크(Task) 개념으로 묶여있기 때문이다.
-   도커 스택에서는 `depends_on` 항목으로 서비스 간 구동 순서를 지정할 수 없다. [별도의 도구 또는 스크립트를 통해 이를 직접 설정](https://docs.docker.com/compose/startup-order/)해 주어야만 한다.
-   도커 스택에서는 `restart` 항목으로 서비스의 재시작 정책을 정할 수 없다. 대신 위에서 소개한 `deploy` 항목을 통해 지정한다.

이밖의 차이점에 대해서는 도커에서 제공하는 [Compose file version 3 reference](https://docs.docker.com/compose/compose-file/compose-file-v3/)를 참고하도록 하자.

### 스택 배포용 YAML 작성

이제 배포용 `stack.yaml`을 작성한다. 내 경우에는 아래와 같이 작성했다. 여기서는 DB 호스트(`ghost_db_host`), 사용자 계정명(`ghost_db_user`), 데이터베이스명(`ghost_db_database`), 접근 암호(`ghost_db_password`) 등 4개 항목에 대한 도커 시크릿을 사전에 만들어 두었다고 전제한다.

```yaml
version: '3.9'

services:
  ghost:
    # 아래의 image 항목에는 본인이 생성한 리포지터리명/이미지명을 삽입한다.
    image: seongjinme/ghost:5
    ports:
      - 8080:2368
    environment:
      database__client: mysql
      database__connection__host_FILE: /run/secrets/ghost_db_host
      database__connection__user_FILE: /run/secrets/ghost_db_user
      database__connection__password_FILE: /run/secrets/ghost_db_password
      database__connection__database_FILE: /run/secrets/ghost_db_database
      url: http://localhost:8080
    deploy:
      replicas: 1
    secrets:
      - ghost_db_host
      - ghost_db_user
      - ghost_db_password
      - ghost_db_database
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/ghost_db_password
    deploy:
      replicas: 1
    secrets:
      - ghost_db_password

secrets:
  ghost_db_host:
    external: true
  ghost_db_user:
    external: true
  ghost_db_password:
    external: true
  ghost_db_database:
    external: true
```

-   위에서 시크릿으로 삽입할 환경변수명의 끝에 `_FILE` 접미어가 잘 붙어있는지 확인하자. 이렇게 해야 앞서 작성한 쉘 스크립트가 의도대로 잘 동작할 것이다.
-   `YAML` 파일 최하단에 각 시크릿마다 붙어 있는 `external: true`는 지정된 시크릿이 `YAML` 외부에서 미리 생성되어 있음을 나타내는 문구다.

### 스택 배포

이제 모든 준비가 끝났다. `docket stack deploy` 명령을 이용하여 `ghost` 스택을 배포해보자.

```bash
$ docker stack deploy --compose-file stack.yaml ghost

Creating network ghost_default
Creating service ghost_ghost
Creating service ghost_db
```

잠시 후 매니저 모드에서 `ghost` 스택에 포함된 서비스 정보를 확인한다. 각각 지정된 이미지 기반으로 서비스들이 잘 배포된 것을 확인할 수 있다.

```bash
$ docker stack services ghost

ID             NAME          MODE         REPLICAS   IMAGE                PORTS
lcmidpzfogqb   ghost_db      replicated   1/1        mysql:8.0
18ss20b0qdrv   ghost_ghost   replicated   1/1        seongjinme/ghost:5   *:8080->2368/tcp
```

`ghost` 스택에 포함된 태스크(컨테이너) 목록도 살펴보자. `ghost_ghost` 서비스에 속한 태스크가 두어 번 비정상 종료된 뒤 정상 구동 중인 모습을 확인할 수 있다.

```bash
$ docker stack ps ghost

ID             NAME                IMAGE                NODE             DESIRED STATE   CURRENT STATE           ERROR                       PORTS
jygugpf8gzci   ghost_db.1          mysql:8.0            docker-desktop   Running         Running 3 minutes ago
tnvw83gwylib   ghost_ghost.1       seongjinme/ghost:5   docker-desktop   Running         Running 3 minutes ago
k8fq7wwotqe4    \_ ghost_ghost.1   seongjinme/ghost:5   docker-desktop   Shutdown        Failed 3 minutes ago    "task: non-zero exit (2)"
yqwnge1sld54    \_ ghost_ghost.1   seongjinme/ghost:5   docker-desktop   Shutdown        Failed 3 minutes ago    "task: non-zero exit (2)"
```

`ghost_db` 서비스에 포함된 MySQL은 컨테이너가 구동된 후 서비스 가능 상태로 활성화 되기까지 약간의 시간이 소요된다. MySQL 활성화 이전에 생성된 Ghost 컨테이너는 사전에 환경변수로 지정된 DB 정보에 접근할 방법이 없으므로 위와 같이 비정상 종료되는 것이다. 개인 블로그 규모라면 이런 정도의 이슈는 무시해도 좋겠지만, 실제 운영 환경에서는 이러한 일이 발생하지 않도록 의존성을 지닌 서비스들 간에 상호 상태를 체크할 수 있는 도구 또는 스크립트를 추가로 구성해야 할 것이다.

이제 마지막으로 배포 완료된 Ghost 블로그에 접속해보자. 갓 생성된 블로그 첫 화면이 반갑게 맞아줄 것이다.

![도커 시크릿이 환경변수로 적용된 Ghost 블로그 첫 화면](/content/images/2022/11/ghost-welcome-screen.png)

## 맺음말

> 도커(Docker) 환경에서 보안 정보를 환경변수로 다룰 때, 시스템에 평문으로 남아있지 않도록 관리하려면 어떻게 해야 할까?

지난 7월에 [도커 컴포즈(Docker Compose)에서 환경변수를 다루는 법](/environment-variables-in-docker-compose/)을 정리하던 중 품었던 의문이다. 이 하나의 의문이 결과적으로 많은 공부 거리를 안겨주었다. 지난 얼마 동안 다루었던 [도커 스웜(Docker Swarm)의 기본 개념](/docker-swarm-introduction-nodes/), [클러스터 내결함성을 지키는 뗏목 합의 알고리즘의 원리](/raft-consensus-algorithm/), [서비스(Service)를 생성하고 다루는 법](/docker-swarm-services/), [컨픽(Config)](/docker-swarm-config/)과 [시크릿(Secret)](/docker-swarm-secret/)의 사용법은 모두 이 의문을 풀어나가면서 차례로 배운 것들이다. 새로운 배움을 사슬처럼 연쇄적으로 엮어가는 이 과정은 학생으로서 고되지만 보람 있는 일이었다.

이번 글 또한 위에서 배운 것을 블로그에 적용하다가 마주한 문제를 해결하는 과정에서 얻게 된 팁을 요약한 것이다. 도커 스웜(Docker Swarm)의 시크릿(Secret)을 활용하는 과정에서 어려움을 겪으신 분들께 도움이 되길 바란다.

## 참고문서

-   [Bash 입문자를 위한 핵심 요약 정리 (Shell Script)](https://blog.gaerae.com/2015/01/bash-hello-world.html)
-   [Understanding Shell Script's idiom: 2>&1](https://www.brianstorti.com/understanding-shell-script-idiom-redirect/)
-   [Bash Manual : 3.5.3 Shell Parameter Expansion](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html)
-   [Compose file version 3 reference | Docker Documentation](https://docs.docker.com/compose/compose-file/compose-file-v3/)
-   [docker build | Docker Documentation](https://docs.docker.com/engine/reference/commandline/build/)
-   [docker stack deploy | Docker Documentation](https://docs.docker.com/engine/reference/commandline/stack_deploy/)
