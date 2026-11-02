---
title: "Docker Swarm에서 서비스(Service) 생성하고 다루기"
description: "도커 스웜(Docker Swarm)에서 다루는 서비스(Service)와 태스크(Task)의 기본 개념을 소개한 뒤, 클러스터에서 서비스(Service)를 생성하고 다루는 방법을 안내한다."
pubDate: "2022-08-26T14:54:44.000Z"
tags: ["docker"]
---

## 서비스(Service)와 태스크(Task)

### 서비스(Service)란?

도커(Docker)를 접해본 사람이라면 `docker run` 명령을 기억할 것이다. 컨테이너를 새로 생성하고 구동시키는 명령이다. 컨테이너 이름, 이미지 이름을 지정하는 것만으로도 도커 엔진(Docker Engine)이 알아서 필요한 이미지를 내려받아 구동시킨다.

도커(Docker)의 기본 배포 단위가 컨테이너였다면, 도커 스웜(Docker Swarm)의 기본 배포 단위는 **서비스(Service)**다. 흔히 "같은 이미지에서 생성된 컨테이너의 집합"으로 알려져 있지만, 조금 더 엄밀하게 정의하자면 **단일 이미지 기반으로 클러스터 안에서 구동시킬 컨테이너 묶음을 정의한 객체**에 더 가깝다.

**서비스(Service)는 선언적(Declarative)으로 구성된다.** 원하는 상태를 정의하면, 도커는 그 상태를 유지하는 데에 필요한 작업을 지속적으로 수행한다. 이때 정의할 수 있는 요소들을 대략적으로 살펴보면 다음과 같다.

-   컨테이너로 배포할 이미지의 정보
-   전체 서비스를 구성할 컨테이너의 수
-   컨테이너의 배치 형태
-   컨테이너에 붙일 볼륨 정보
-   컨테이너를 배치시킬 노드 조건
-   컨테이너의 업데이트 전략 및 정책 지정

### 서비스(Service)와 태스크(Task)의 관계

이렇게 선언적으로 정의된 **서비스(Service)의 명세에 따라 생성되어 클러스터 노드에 배치되는 개별 컨테이너의 배포 단위**가 바로 **태스크(Task)**다. 각 태스크에는 `서비스명.일련번호` 형태의 이름이 붙게 되며, 미리 정의된 컨테이너의 수(`replicas`)만큼 생성되어 가용한 노드에 제각각 배치된다.

서비스와 태스크의 관계를 파악할 수 있는 구성도의 예시를 살펴보면 다음과 같다.

![서비스와 태스크의 관계가 포함된 구성도 (출처 : 공식 문서)](/content/images/2022/08/service-task.png)

위의 예시는 `nginx:latest` 이미지를 탑재한 3개의 레플리카로 정의된 Nginx 서비스와 태스크의 구성도를 나타낸 것이다. 이렇게 정의된 서비스의 명세를 스웜 매니저(Swarm Manager)가 파악한 뒤, 가용한 노드에 지정된 레플리카 수 만큼의 태스크를 만들어 할당한다. 각 태스크는 `nginx:latest` 이미지 기반의 컨테이너를 1개씩 포함하여 동작한다.

## 서비스 생성 기초

여기서 다루는 모든 명령어는 스웜 모드(Swarm Mode)의 매니저 노드(Manager Node)에서만 수행 가능하다는 점에 유의한다.

### 서비스 생성하기

CLI 환경에서는 `docker service create` 명령으로 서비스를 생성할 수 있다. 아래 예시는 5개의 레플리카로 구성된 `nginx` 서비스를 생성하는 명령어다. 여기서 맨 끝의 이미지 정보를 제외한 나머지 플래그들은 모두 선택 사항이다.

```bash
docker service create --name nginx \
  --replicas=5 \
  --publish=8080:80 \
  nginx:latest
```

-   `--name` : 서비스의 이름을 지정한다. 지정하지 않을 경우 임의의 단어 조합으로 생성된다.
-   `--replicas` : 서비스를 구성할 태스크(컨테이너)의 수를 지정한다. 지정된 숫자 만큼의 태스크가 클러스터의 가용 노드에 배치된다.
-   `--publish` : 포트 포워딩을 통해 클러스터 외부에서 해당 서비스로 접근 가능한 포트 경로를 지정한다. 개방시킬 클러스터 노드의 포트 번호(`published`)와 이에 대응하는 서비스의 포트 번호(`target`)로 구분된다. 위의 예시는 `--publish published=8080,target=80`으로 풀어쓸 수도 있다. 만약 따로 지정하지 않는다면, 스웜 매니저(Swarm Manager)가 `30000`~`32767` 범위 안에서 임의의 포트를 할당시킨다.
-   `nginx:latest` : 태스크에 포함시킬 이미지 정보를 지정한다.

### 서비스 조회하기

`docker service ls` 명령으로 현재 클러스터에서 구동 중인 서비스들의 목록을 살펴볼 수 있다. 위에서 소개한 명령어로 생성된 `nginx` 서비스의 현황을 조회하면 다음과 같은 화면이 나타난다. 아래 화면은 3개의 노드로 이루어진 클러스터 환경에 배포된 상황을 가정한 것이다.

```bash
ID             NAME      MODE         REPLICAS   IMAGE          PORTS
w1v8rn73q95w   nginx     replicated   5/5        nginx:latest   *:8080->80/tcp
```

-   `ID` : 서비스 자체의 고유 ID값이다.
-   `NAME` : 서비스에 부여된 이름이다. 역시 클러스터 안에서 고유하며 중복은 불가하다.
-   `MODE` : 서비스의 유형이다. 도커 스웜에서 서비스 유형은 `replicated`, `global`로 구분된다. 특별히 지정한 경우가 아니면 `replicated`로 분류된다. 둘의 차이점은 잠시 후에 다시 다룰 것이다.
-   `REPLICAS` : 서비스 명세에 정의된 태스크 레플리카의 수와 상태를 나타낸다.
-   `IMAGE` : 서비스의 기반이 되는 이미지 정보를 나타낸다.
-   `PORTS` : 설정된 포트 포워딩 정보를 나타낸다.

개별 서비스에 대한 상세 정보는 `docker service inspect` 명령으로 조회한다. 기본적으로는 `JSON` 포맷으로 출력되며, `--pretty` 플래그를 붙이면 보다 읽기 쉬운 포맷으로 가공되어 나타난다.

```bash
# docker service inspect <SERVICE-ID>
docker service inspect nginx --pretty

# 아래는 출력된 정보의 일부분이다.
ID:		3104e3cffp1ahfh401q2xhtqe
Name:		nginx
Service Mode:	Replicated
 Replicas:	5
Placement:
...
```

### 태스크 목록 및 상태 조회하기

특정 서비스에 포함된 태스크들의 현재 상태를 확인하려면 `docker service ps <서비스명>`을 입력한다. 서비스 목록을 조회하는 `ls` 명령과 혼동하지 않도록 주의하자.

```bash
# docker service scale <SERVICE-ID>
docker service ps nginx

ID             NAME          IMAGE          NODE             DESIRED STATE   CURRENT STATE                ERROR     PORTS
nhxtav0xuwit   nginx.1       nginx:latest   sjhong-node-01   Running         Running 24 minutes ago
vzv1rdk9j7vg   nginx.2       nginx:latest   sjhong-node-02   Running         Running 24 minutes ago
idxn4eijmbah   nginx.3       nginx:latest   sjhong-node-01   Running         Running about a minute ago
d5eihdbj6k1j    \_ nginx.3   nginx:latest   sjhong-node-03   Shutdown        Shutdown 53 seconds ago
tmrm8spqybaj   nginx.4       nginx:latest   sjhong-node-02   Running         Running 24 minutes ago
uj1jftdr2asu   nginx.5       nginx:latest   sjhong-node-01   Running         Running about a minute ago
q2ifir5siodm    \_ nginx.5   nginx:latest   sjhong-node-03   Shutdown        Shutdown 53 seconds ago
```

-   `ID` : 각 태스크의 고유 ID값이다.
-   `NAME` : 각 태스크의 고유 이름이다. 태스크의 이름은 `서비스명.일련번호` 형태로 자동 생성된다. 노드 에러 등으로 종료된 뒤 다른 노드에 재생성된 태스크의 경우, 이전에 종료된 태스크의 `NAME` 앞에 `\_` 기호를 붙여 구분한다.
-   `IMAGE` : 태스크에 포함된 컨테이너의 기반 이미지 정보다.
-   `NODE` : 태스크가 할당된 노드 이름이다.
-   `DESIRED STATE` : 스웜 매니저(Swarm Manager) 입장에서 유지되어야 할 현재 태스크의 상태를 의미한다. 발생 가능한 상태의 종류는 [여기서](https://docs.docker.com/engine/swarm/how-swarm-mode-works/swarm-task-states/) 확인할 수 있다.
-   `CURRENT STATE` : 현재 태스크의 실제 상태와, 해당 상태로 진입한 시점을 함께 표시한다.
-   `ERROR` : 만약 특정 태스크가 `Failed` 상태로 종료되었다면, 해당 문제에 관련된 에러 메시지가 여기에 표시된다.
-   `PORTS` : 태스크가 속한 서비스가 포트 포워딩 없이 직접 호스트의 IP를 가지고 클러스터 외부에 노출되도록 설정된 경우(`--publish` 플래그에 `mode=host` 값이 추가된 경우), 여기에 해당 포트 정보가 출력된다.

### 서비스 로그 확인하기

`docker service logs` 명령으로 서비스에 포함된 컨테이너(들)의 로그를 확인할 수 있다. 여기서 말하는 로그란 서비스의 `STDOUT`과 `STDERR`로 출력되는 모든 내용을 일컫는다.

```bash
docker services logs <옵션> <서비스명_또는_ID값|태스크_ID값>
```

로그 출력 대상으로는 `서비스명_또는_ID값`, `태스크_ID값` 중 택일할 수 있다.

-   `서비스명_또는_ID값`으로 지정할 경우, 서비스에 속한 모든 태스크(컨테이너)의 로그가 출력된다.
-   `태스크_ID값`으로 지정할 경우, 해당 태스크(컨테이너)의 로그만 출력된다.

위의 명령어에 옵션으로 추가 가능한 주요 플래그를 소개하자면 다음과 같다.

-   `--follow`, `-f` : 로그를 콘솔에 실시간으로 계속 스트리밍하여 출력한다.
-   `--tail`, `-n` : 로그를 가장 최근 것으로부터 몇 개까지 출력시킬지 숫자로 정한다. 만약 음수 또는 `all`로 지정할 경우 전체 로그를 출력한다.
-   `--since` : 지정된 시각 이후의 로그만 출력한다. `2022-08-26T13:23:37Z` 또는 `2022-08-26` 형태로 지정 가능하며, 혹은 `1h30m` 처럼 최근 일정 시간 동안의 로그를 출력하게 할 수도 있다.
-   `--timestamps`, `-t` : 로그의 각 줄마다 타임스탬프를 추가하여 출력시킨다.

### 서비스 외부 노출 및 로드 밸런싱하기

도커 스웜에서는 클러스터에 속한 노드들을 외부로 간편하게 노출시키는 동시에 로드 밸런싱을 수행할 수 있는 **`Ingress`** 네트워크를 기본적으로 제공한다. 따라서 위와 같이 `nginx` 서비스가 생성되면, **도커 스웜 클러스터에 포함된 어떤 노드에서든지 `8080` 포트를 통해 `nginx` 서비스에 포함된 5개의 태스크 중 하나로 접근**할 수 있게 된다. 예를 들어 1번 노드에만 태스크가 있다고 가정하면, `노드2:8080`로 접속해도 1번 노드의 태스크로 접근할 수 있는 것이다.

이러한 도커 스웜의 특성을 이용하여, 클러스터를 바라보는 별도의 외부 로드 밸런서를 운영하는 방법도 고려할 수 있다. [공식 문서](https://docs.docker.com/engine/swarm/ingress/)에서 가져온 아래 구성도를 예시로 살펴보자. 이렇게 하면 하나의 IP로 들어온 모든 트래픽을 클러스터 각 노드의 `8080` 포트로 분배하도록 처리할 수 있을 것이다.

![HAProxy를 외부 로드밸런서로 사용하는 Ingress 네트워크 구성도 (출처 : 공식 문서)](/content/images/2022/08/ingress-network.png)

### 서비스 삭제하기

`docker service rm` 명령으로 현재 구동 중인 서비스를 삭제할 수 있다. 서비스가 삭제되면 서비스에 포함된 모든 태스크(컨테이너)가 노드에서 함께 제거된다. 단, 서비스에 도커 볼륨(Docker Volume)을 마운트하여 사용하고 있었다면, 해당 볼륨은 별도로 삭제하지 않는 한 클러스터에 남아있게 된다.

```bash
docker service rm <서비스명>
```

## 서비스 다루기

### 서비스 스케일링하기

이미 배포된 서비스의 레플리카 수를 조정하려면 `docker service scale` 명령을 이용한다.

```bash
# docker service scale <SERVICE-ID>=<NUMBER-OF-TASKS>
docker service scale nginx=3

# 다시 서비스 목록을 조회해보면 레플리카 수가 3으로 줄어든 것을 볼 수 있다.
docker service ls

ID             NAME      MODE         REPLICAS               IMAGE          PORTS
w1v8rn73q95w   nginx     replicated   3/3                    nginx:latest   *:8080->80/tcp
```

**도커 스웜에서는 쿠버네티스와 같은 오토 스케일링(Auto Scaling) 기능을 제공하지 않는다.** 오직 커맨드라인 화면에서 명시적으로 명령을 실행하는 방법으로만 가능하다. 무척 아쉬운 부분이다.

### 서비스 유형 설정하기

위에서 `nginx` 서비스의 `MODE` 값을 살펴보면 `replicated`라고 명시되어 있다. 도커 스웜에서 서비스 유형은 크게 두 가지로 구분된다.

-   `replicated` : 필요한 만큼 복제된 태스크가 클러스터의 노드에 분배되어 할당된다. 대부분의 경우 서비스는 이 유형으로 설정되어 배포된다.
-   `global` : 모든 각 노드에 하나씩의 태스크가 할당되도록 강제하는 유형이다. 쿠버네티스의 데몬셋(DaemonSet)과 같은 형태다.

![Replicated, Global 서비스 유형 비교 (출처 : 공식 문서)](/content/images/2022/08/service-modes.png)

`global` 유형은 각 노드의 상태를 모니터링하는 로그 수집기 등을 배치할 때 유용하다. 이 유형의 서비스를 생성하려면 `docker service create` 명령에 `--mode` 플래그를 추가한다. 단, 이미 구동 중인 서비스의 유형을 바꿀 수는 없다.

```bash
docker service create --name logstash \
 --mode global \
 logstash:8.4.0
```

### 특정 노드에만 태스크 할당하기

실제 운영 환경에서는 용도 별로 노드가 구분되어 있는 경우가 많을 것이다. 이런 경우 노드에 라벨을 할당한 뒤 `--constraint` 플래그를 이용하면 특정 노드에만 태스크를 할당하거나, 반대로 특정 유형의 노드에는 태스크를 할당하지 않도록 막을 수 있다. 이때 `--replicas-max-per-node` 플래그로 각 노드에 할당 가능한 태스크의 최대 수를 지정하면 더욱 유용한 옵션이 될 수 있다.

바로 예시로 넘어가자. `sjhong-node-03` 노드에만 `type=redis`라는 라벨이 부여된 상태로 아래와 같이 `redis` 서비스를 배포해보자.

```bash
docker service create --name redis \
  --replicas 2 \
  --replicas-max-per-node 1 \
  --constraint node.labels.type==redis \
  redis
```

-   `--constraint` 플래그에는 `조건대상==값` 또는 `조건대상!=값`의 형태로 원하는 조건을 지정한다.
-   오직 일치(`==`)와 불일치(`!=`)로만 조건을 지정할 수 있다. 따라서 노드 라벨을 기준으로 지정할 경우 `키=값` 형태의 라벨만 이용할 수 있다.
-   노드에 붙은 `키=값` 라벨을 기준으로 할 경우, `조건대상`은 `node.label.<키>==<값>` 형태로 명시한다.
-   만약 여러 개의 조건을 중첩하고 싶을 때에는 원하는 갯수만큼 `--constraint` 플래그를 반복 사용한다.

위의 명령대로 실행하면 아래와 같은 이슈가 생긴다. 조건에 맞는 노드를 찾을 수 없어 두 번째 태스크를 할당하지 못하고 있다는 내용이다.

```bash
# 서비스 생성시 출력되는 에러 메시지
overall progress: 1 out of 2 tasks
1/2: running
2/2: no suitable node (scheduling constraints not satisfied on 2 nodes; max rep…
```

`ctrl+C`로 빠져나온 뒤 서비스 목록과 태스크 목록을 각각 조회해보자. 앞서 지정된 조건대로 `sjhong-node-03` 노드에만 태스크가 할당되었으며, `--replicas-max-per-node` 플래그로 지정된 개수(`1`)를 넘겼으므로 `redis.1` 태스크는 `Pending` 상태로 대기 중인 것을 확인할 수 있다.

```bash
# docker service ls 실행 결과
ID             NAME      MODE         REPLICAS               IMAGE          PORTS
w1v8rn73q95w   nginx     replicated   3/3                    nginx:latest   *:8080->80/tcp
ig98nchhrqd1   redis     replicated   1/2 (max 1 per node)   redis:latest
```

```bash
# docker service ps redis 실행 결과
ID             NAME      IMAGE          NODE             DESIRED STATE   CURRENT STATE           ERROR                              PORTS
uuny23s57c6i   redis.1   redis:latest                    Running         Pending 5 minutes ago   "no suitable node (scheduling …"
hl6gr16s1x0l   redis.2   redis:latest   sjhong-node-03   Running         Running 5 minutes ago
```

### '가급적' 특정 노드에만 태스크 할당하기

비슷해 보이지만 조금 다른 기능을 살펴보자. 특정 조건에 맞는 노드의 집합에 태스크를 골고루 분배하는 배치 선호(Placement Preference; `--placement-pref`)라는 옵션이다. 조건에 따라 노드를 선택하는 것은 `--constraint`와 비슷하지만, 조건에 맞는 노드가 없을 경우엔 다른 노드로 스케줄링한다는 차이점이 있다.

마찬가지로 `sjhong-node-03` 노드에만 `type=redis`라는 라벨이 부여된 상태에서 아래와 같이 `redis` 서비스를 배포해보자.

```bash
docker service create --name redis \
  --replicas 2 \
  --replicas-max-per-node 1 \
  --placement-pref 'spread=node.labels.type' \
  redis
```

-   `--placement-pref` 플래그는 `'<strategy>=<arg>'` 형태의 값을 취한다. 여기서 `<strategy>`는 스케줄링 전략(Scheduling Strategy)을, `<arg>`는 조건 대상을 의미한다.
-   현재 도커 스웜은 오직 **균등 분배(`spread`) 방식의 스케줄링 전략만 지원**한다. 따라서 `<strategy>` 부분의 값은 `spread`로 사실상 강제된다.
-   `--constraint`와 달리, `--placement-pref`에서의 조건 대상은 오직 `키`값만 지정 가능하다. `키==값` 형태의 조건은 지정할 수 없다.
-   따라서 위의 예시 명령문은 `type`라는 `키`가 부여된 모든 노드를 대상으로 태스크가 균등하게 분배(`spread`)되도록 만든다. 만약 조건에 맞는 노드가 더 이상 없다면, 나머지 다른 노드로 남은 태스크를 스케줄링한다.

위의 명령대로 실행하면 정상적으로 `redis` 서비스와 태스크가 배포된다. `type` 키가 포함된 라벨이 부여된 `sjhong-node-03` 노드에 우선적으로 태스크가 배정되었으나, 조건에 부합하는 다른 노드가 없기에 부득이하게 `sjhong-node-02` 노드로 나머지 1개의 태스크가 배치된 것을 확인할 수 있다.

```bash
# docker service ls 실행 결과
ID             NAME      MODE         REPLICAS               IMAGE          PORTS
w1v8rn73q95w   nginx     replicated   3/3                    nginx:latest   *:8080->80/tcp
pa5prvap05q8   redis     replicated   2/2 (max 1 per node)   redis:latest

# docker service ps redis 실행 결과
ID             NAME      IMAGE          NODE             DESIRED STATE   CURRENT STATE            ERROR     PORTS
ihx8uvlcejar   redis.1   redis:latest   sjhong-node-02   Running         Running 38 seconds ago
9gf09vi1zju0   redis.2   redis:latest   sjhong-node-03   Running         Running 43 seconds ago
```

### 볼륨 설정하기

`docker run`에서는 `--volume` 플래그를 이용하여 컨테이너와 연결할 수 있는 볼륨을 설정했었다. 도커 스웜의 서비스에 볼륨을 설정할 때엔 `--volume` 대신 `--mount` 플래그를 이용한다.

도커 스웜에서는 4가지 유형의 볼륨을 지원한다. `type`으로 지정할 수 있으며, 별도로 지정하지 않는다면 `volume`이 기본값으로 지정된다.

-   `type=volume` : 도커 볼륨(Docker Volume)을 컨테이너 안에 마운트한다.
-   `type=bind` : 호스트의 특정 경로나 파일을 컨테이너 안에 직접 마운트한다.
-   `type=tmpfs` : 메모리 상에 존재하는 [임시 파일 스토리지(Temp File Storage)](https://www.kernel.org/doc/html/latest/filesystems/tmpfs.html)를 마운트한다.
-   `type=npipe` : 호스트에 있는 [named pipe](https://docs.microsoft.com/en-us/windows/win32/ipc/named-pipes)를 마운트한다. 이 기능은 Windows 기반 컨테이너에만 사용 가능하다.

여기서는 실제 환경에서 자주 쓰이는 Data Volume(`volume`), 그리고 Bind Mounts(`bind`)의 두 가지에 대해서만 살펴보기로 한다.

#### Data Volume

Data Volume은 도커가 자체적으로 관리하는 도커 볼륨(Docker Volume)을 의미한다. 서비스를 새로 생성할 때 도커 볼륨을 함께 마운트 시키는 방법은 아래와 같다.

```bash
docker service create --name <서비스명> \
  --mount type=volume,source=<도커_볼륨명>,destination=<컨테이너_경로> \
  <이미지>
```

-   `--mount` 플래그에 `type`을 `volume`으로 명시한다. 아예 `type` 항목을 빼도 무방하다.
-   `source` 항목에는 마운트시킬 도커 볼륨명을 입력한다. 만약 클러스터에 해당 이름으로 도커 볼륨이 생성된 적이 없다면 서비스 생성 과정에서 자동으로 만들어진다.
-   `destination` 항목에는 위에서 만들어진 도커 볼륨을 컨테이너 안의 어느 경로와 연결할 것인지를 명시한다. 만약 존재하지 않는 경로라면 서비스 생성 과정에서 자동으로 만들어진다.

아래 명령은 3개의 레플리카를 가진 `nginx`에 `html`이라는 도커 볼륨을 컨테이너의 `/usr/share/nginx/html` 경로에 연결한 뒤, 해당 볼륨에 `type=html`이라는 라벨을 추가하여 생성하는 예시다. 이렇게 생성되어 연결된 도커 볼륨은 같은 서비스에 속한 모든 태스크가 공통으로 공유하게 된다.

```bash
docker service create --name nginx \
  --replicas 3 \
  --mount type=volume,source=html,destination=/usr/share/nginx/html,volume-label="type=html" \
  nginx
```

만약 여기서 `source`를 명시하지 않으면 어떻게 될까? 이 경우에는 이름이 없는 익명 볼륨(anonymous volume)이 각각의 레플리카(태스크)마다 따로 생성된다. 각 태스크마다 서로 공유되지 않는 임시적인 볼륨을 운영하고 싶을 때 활용하면 좋다. 단, 태스크가 더 이상 사용하지 않는 익명 볼륨은 시스템에서 제거된다.

이미 생성된 서비스에 도커 볼륨을 추가하거나 삭제할 때에는 `docker service update` 명령에 `--mount-add`, `--mount-rm` 플래그를 붙여 실행한다. 이때 볼륨을 삭제하는 `--mount-rm` 플래그의 경우, 볼륨명이 아니라 컨테이너 안에 연결된 경로를 지정해야 한다는 점에 주의하자.

```bash
# html2 볼륨을 컨테이너의 /usr/share/nginx/html2 경로에 추가
docker service update \
  --mount-add type=volume,source=html2,destination=/usr/share/nginx/html2 \
  nginx

# html2 볼륨을 컨테이너에서 삭제
docker service update \
  --mount-rm /usr/share/nginx/html2 \
  nginx
```

#### Bind Mount

Bind Mount는 호스트의 특정 경로나 파일을 컨테이너와 직접 연결하는 방식이다. 사용법은 다음과 같다.

```bash
docker service create --name <서비스명> \
  --mount type=bind,source=<호스트_경로>,destination=<컨테이너_경로> \
  <이미지>
```

-   `source`에는 호스트의 경로를, `destination`에는 컨테이너 내부의 경로를 지정해준다. 이렇게 하면 도커 엔진(Docker Engine)이 `source`로 지정된 경로를 컨테이너의 `destination` 경로로 마운트해준다.
-   이때 `source`로 지정될 경로는 호스트에 반드시 존재해야 한다. 그렇지 않은 경우에는 에러와 함께 서비스 생성이 중단된다.
-   기본적으로 `read-write` 모드로 마운트된다. 상호 읽기만 가능한 `read-only` 모드로 마운트하려면 `--mount` 플래그에 `readonly` 값을 추가한다.

Bind Mount는 실제 클러스터를 운영하는 환경에선 **별로 권장되지 않는 방식**이다. 이유는 다음과 같다.

-   도커 스웜(Docker Swarm)을 이용하는 클러스터 환경이라면, 적어도 여러 대의 노드가 함께 운영되고 있을 것이다. 앞서 살펴보았듯이, 이런 환경에서 배포된 서비스(Service)의 컨테이너는 가용 상태의 어느 노드에든 배치될 수 있다.
-   해당 컨테이너 구동에 필요한 설정 파일을 호스트의 특정 경로로부터 Bind Mount 시키도록 했다고 가정해보자. 도커 스웜은 호스트 안에 존재하지 않는 경로를 컨테이너로 연결해주지 않는다. 따라서 **가용 상태의 모든 각 노드에 동일한 설정 파일을 동일한 경로에 넣어주어야만 정상적인 컨테이너 구동**이 가능해진다.
-   이러한 단점은 결국 **서로 다른 호스트 환경에서의 동일한 애플리케이션 정상 구동을 보장하지 못하는 문제**로 이어진다. 특정 호스트의 특정 경로에 의존성을 강제하는 Bind Mount를 사용하는 이상, 개발 환경에서 잘 동작하던 컨테이너들이 운영 환경에서도 동일하게 동작하리라는 보장을 할 수 없게 되는 것이다.

### 롤링 업데이트(Rolling Update) 적용하기

#### 업데이트 정책

롤링 업데이트(Rolling Update)는 여러 개의 인스턴스로 구성된 서비스를 새 버전으로 올릴 때 한 번에 지정된 숫자 만큼의 인스턴스만 점진적으로 진행해 나가는 업데이트 전략을 의미한다. 이와 반대되는 전략으로 모든 인스턴스를 한꺼번에 재생성해서 대체하는 재생성(Recreate) 방식도 있다. 무중단 배포 및 업데이트의 이점을 활용하기 위하여, 분산 시스템 환경에서는 대체로 롤링 업데이트를 주로 사용한다.

여기서는 `redis` 서비스를 예시로 하여 서비스 생성시 롤링 업데이트 전략을 적용하는 방법을 살펴보자. 우선 서비스를 향후 업데이트할 때 적용될 옵션들인 `--update-delay`, `--update-parallelism` 플래그부터 소개한다.

```bash
docker service create --name redis \
  --replicas 5 \
  --update-delay 20s \
  --update-parallelism 2 \
  --update-failure-action rollback \
  redis:7.0.3
```

-   `--update-delay` : 각 태스크가 하나씩 업데이트 되는 사이의 시간 간격을 지정한다. 초(`s`), 분(`m`), 시(`h`) 단위로 정할 수 있으며 `5m30s` 처럼 두 단위를 함께 혼용하는 것도 가능하다. 기본값은 0초(`0s`)다.
-   `--update-parallelism` : 한 번에 업데이트 시킬 태스크의 수를 정한다. 기본값은 `1`이다. 만약 `0`으로 할 경우 모든 태스크가 동시에 업데이트 된다.
-   `--update-failure-action` : 업데이트 작업 도중 실패가 발생했을 때 대처방안을 정한다. 업데이트 작업을 중단시키거나(`pause`), 실패한 태스크를 두고 나머지 업데이트 작업을 계속 진행하거나(`continue`), 업데이트 작업 중단 후 이전 버전으로 롤백시키는(`rollback`) 3가지 옵션이 있다. 기본값은 `pause`다.

위의 명령은 `redis:7.0.3` 기반의 태스크 5개로 이루어진 `redis` 서비스를 배포시킨다. 이 서비스에는 각 업데이트 작업 사이에 20초의 시간 간격을 두고, 한 번에 2개 태스크를 동시에 업데이트 시키며 실패가 발생했을 때에는 이전 버전으로 다시 롤백시키는 정책이 적용되어 있다. 이렇게 배포된 `redis` 서비스의 상세 정보를 조회해보면 `UpdateConfig` 항목에서 해당 정책 내용을 확인할 수 있다.

```bash
# docker service inspect redis --pretty 실행 결과
ID:		quqyc3sordlv4fuqenk4snrcn
Name:		redis
Service Mode:	Replicated
 Replicas:	5
Placement:
UpdateConfig:
 Parallelism:	2
 Delay:		20s
 On failure:	rollback
 Monitoring Period: 5s
 Max failure ratio: 0
 Update order:      stop-first
...
```

#### 롤백 정책

업데이트 외에 롤백(Rollback) 정책도 정할 수 있다. 정하는 방식은 업데이트 항목과 거의 동일하다. 아래에 소개된 플래그들은 위의 업데이트 플래그들과 함께 동시에 사용할 수 있다.

```bash
docker service create --name redis \
  --replicas 5 \
  --rollback-delay 10s \
  --rollback-parallelism 1 \
  --rollback-failure-action pause \
  redis:7.0.3
```

-   `--rollback-delay` : 각 태스크가 하나씩 롤백 되는 사이의 시간 간격을 지정한다. 기본값은 0초(`0s`)다.
-   `--rollback-parallelism` : 한 번에 롤백 시킬 태스크의 수를 정한다. 기본값은 `1`이다. 만약 `0`으로 할 경우 모든 태스크가 동시에 롤백 된다.
-   `--rollback-failure-action` : 롤백 작업 도중 실패가 발생했을 때 대처방안을 정한다. 여기서는 롤백 작업을 중단하거나(`pause`) 실패한 태스크를 두고 나머지 롤백 작업을 계속 진행시키는(`continue`) 2가지 옵션만 있다. 기본값은 `pause`다.

위의 명령대로 생성된 `redis` 서비스의 상세 정보를 살펴보면 다음과 같이 롤백 옵션이 적용된 내용을 `RollbackConfig` 항목에서 확인할 수 있다.

```bash
# docker service inspect redis --pretty 실행 결과
ID:		ysags4buoofr0lxn8bu7o9g2f
Name:		redis
Service Mode:	Replicated
 Replicas:	5

...

RollbackConfig:
 Parallelism:	1
 Delay:		10s
 On failure:	pause
 Monitoring Period: 5s
 Max failure ratio: 0
 Rollback order:    stop-first
```

위에서 본 바와 같이, 업데이트 정책과 롤백 정책이 반드시 같을 필요는 없다. 예를 들어 태스크의 이미지를 업데이트할 때엔 한 번에 2개 태스크씩 진행하되, 롤백은 하나씩만 진행시키도록 설정해도 무방하다.

### 롤링 업데이트(Rolling Update) 실행하기

이제 실제로 서비스 업데이트 작업을 시험해보자. 위에서 업데이트 정책과 롤백 정책이 함께 적용된 `redis` 서비스의 이미지를 `redis:7.0.3`을 `redis:7.0.4`로 바꿔보자.

```bash
docker service update --image redis:7.0.4 redis
```

콘솔 화면의 `overall progress` 내용을 자세히 보면, 한 번에 2개의 태스크씩 새로 생성되어 `running` 모드로 변하는 것을 알 수 있다. 또한 앞서 `--update-delay`로 지정한 시간만큼 지연된 후에 다음 업데이트 작업이 수행되는 것 또한 확인 가능하다.

`verify: Service converged` 메시지를 확인한 후 서비스와 태스크 목록을 조회해보자. 이전 버전의 태스크들이 새 버전의 태스크로 대체되어 클러스터에 배포된 것을 볼 수 있다.

```bash
# 업데이트 후 `docker service ls` 실행 결과
ID             NAME      MODE         REPLICAS   IMAGE         PORTS
ysags4buoofr   redis     replicated   5/5        redis:7.0.4

# 업데이트 후 `docker service ps redis` 실행 결과
ID             NAME          IMAGE         NODE             DESIRED STATE   CURRENT STATE                 ERROR     PORTS
80stq3sx3q2p   redis.1       redis:7.0.4   sjhong-node-01   Running         Running 57 seconds ago
lvfjk8n5j42w    \_ redis.1   redis:7.0.3   sjhong-node-03   Shutdown        Shutdown about a minute ago
oz6ugjp3qlyw   redis.2       redis:7.0.4   sjhong-node-01   Running         Running 39 seconds ago
mn230m0gpfs6    \_ redis.2   redis:7.0.3   sjhong-node-01   Shutdown        Shutdown 40 seconds ago
m1b5pk92bayc   redis.3       redis:7.0.4   sjhong-node-02   Running         Running about a minute ago
jt86hc3ep1ru    \_ redis.3   redis:7.0.3   sjhong-node-02   Shutdown        Shutdown about a minute ago
nfo4xebv8gew   redis.4       redis:7.0.4   sjhong-node-02   Running         Running 17 seconds ago
wm1yrfs56ddp    \_ redis.4   redis:7.0.3   sjhong-node-03   Shutdown        Shutdown 18 seconds ago
3fzmk9fe6ouc   redis.5       redis:7.0.4   sjhong-node-03   Running         Running 35 seconds ago
q8qfivoh8yz2    \_ redis.5   redis:7.0.3   sjhong-node-02   Shutdown        Shutdown 36 seconds ago
```

### 롤백(Rollback) 실행하기

이번에는 `redis` 서비스를 다시 예전 버전인 `redis:7.0.3` 기반으로 돌려보자.

```bash
docker service update --rollback redis
```

롤백을 시킬 때엔 위와 같이 `--rollback` 플래그를 이용한다. 이 플래그는 가장 최근에 `docker service update`를 수행하기 이전의 상태로 해당 서비스를 복원시킨다. 아쉽게도 몇 단계 전의 상태로 지정하여 복구하는 형태의 작업은 불가능하다.

위의 명령을 실행하면 콘솔 화면의 `overall progress` 내용에 롤백 진행 상황이 표시된다. 앞서 설정해 두었던 것과 같이, 이번에는 한 번에 1개의 태스크가 롤백되며 10초 간격으로 작업이 이루어지는 것을 확인할 수 있다.

롤백 작업이 완료되면 서비스와 태스크 목록을 조회해보자. 클러스터에 배포된 서비스의 기반 이미지가 처음 설정했었던 `redis:7.0.3`으로 다시 돌아온 것을 볼 수 있다.

```bash
# 업데이트 후 `docker service ls` 실행 결과
ID             NAME      MODE         REPLICAS   IMAGE         PORTS
ysags4buoofr   redis     replicated   5/5        redis:7.0.3

# 업데이트 후 `docker service ps redis` 실행 결과
ID             NAME          IMAGE         NODE             DESIRED STATE   CURRENT STATE             ERROR     PORTS
b4nrae24zkyu   redis.1       redis:7.0.3   sjhong-node-03   Running         Running 2 minutes ago
80stq3sx3q2p    \_ redis.1   redis:7.0.4   sjhong-node-01   Shutdown        Shutdown 2 minutes ago
lvfjk8n5j42w    \_ redis.1   redis:7.0.3   sjhong-node-03   Shutdown        Shutdown 17 minutes ago
yb2rtwjobqjl   redis.2       redis:7.0.3   sjhong-node-01   Running         Running 2 minutes ago
oz6ugjp3qlyw    \_ redis.2   redis:7.0.4   sjhong-node-01   Shutdown        Shutdown 2 minutes ago
mn230m0gpfs6    \_ redis.2   redis:7.0.3   sjhong-node-01   Shutdown        Shutdown 17 minutes ago
tciegp38r0f7   redis.3       redis:7.0.3   sjhong-node-01   Running         Running 2 minutes ago
m1b5pk92bayc    \_ redis.3   redis:7.0.4   sjhong-node-02   Shutdown        Shutdown 2 minutes ago
jt86hc3ep1ru    \_ redis.3   redis:7.0.3   sjhong-node-02   Shutdown        Shutdown 17 minutes ago
5edbdb8g3wl8   redis.4       redis:7.0.3   sjhong-node-02   Running         Running 2 minutes ago
nfo4xebv8gew    \_ redis.4   redis:7.0.4   sjhong-node-02   Shutdown        Shutdown 2 minutes ago
wm1yrfs56ddp    \_ redis.4   redis:7.0.3   sjhong-node-03   Shutdown        Shutdown 16 minutes ago
ia4suok6yivv   redis.5       redis:7.0.3   sjhong-node-03   Running         Running 2 minutes ago
3fzmk9fe6ouc    \_ redis.5   redis:7.0.4   sjhong-node-03   Shutdown        Shutdown 2 minutes ago
q8qfivoh8yz2    \_ redis.5   redis:7.0.3   sjhong-node-02   Shutdown        Shutdown 17 minutes ago
```

참고로 [공식 문서](https://docs.docker.com/engine/reference/commandline/service_update/#roll-back-to-the-previous-version-of-a-service)에는 `--rollback` 플래그에 다른 플래그를 함께 조합할 수 있다고 되어 있다. 그러나 실제로 적용해보면 에러 메시지만 출력된다. 이 점에 유의하자.

```bash
docker service update --rollback --rollback-delay 5s redis

# 위 명령을 실행하면 아래와 같은 에러 메시지만 출력된다.
other flags may not be combined with --rollback
```

## 참고자료

-   [Docker Docs : Deploy services to a swarm](https://docs.docker.com/engine/swarm/services/)
-   [Docker Docs : Use swarm mode routing mesh](https://docs.docker.com/engine/swarm/ingress/)
-   [Docker Docs : View logs for a container or service](https://docs.docker.com/config/containers/logging/)
-   [Docker Docs : Use volumes](https://docs.docker.com/storage/volumes/)
-   [Docker Docs : Apply rolling updates to a service](https://docs.docker.com/engine/swarm/swarm-tutorial/rolling-update/)
-   [Docker Docs : docker service create](https://docs.docker.com/engine/reference/commandline/service_create/)
-   [Docker Docs : docker service update](docker%20service%20update)
