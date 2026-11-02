---
title: "파드(Pod)의 개념과 생명 주기, 그리고 상태 진단을 위한 프로브(Probe) 활용"
description: "쿠버네티스 클러스터에서 이용되는 최소 단위의 객체인 파드(Pod)에 대해 자세히 알아본다. 파드의 개념과 종류, 생명 주기, 그리고 프로브(Probe)를 이용한 상태 진단법을 살펴보기로 하자."
pubDate: "2022-02-07T08:13:00.000Z"
updatedDate: "2022-02-10T08:17:32.000Z"
tags: ["kubernetes"]
---

## 기본 개념

쿠버네티스에서 **파드(Pod)**는 **1개 이상의 컨테이너가 캡슐화 되어 클러스터 안에서 배포되는 가장 작은 단위의 객체**를 의미한다. [파드(Pod)는 본래 고래의 떼를 일컫는 용어인데,](https://www.whalefacts.org/what-is-a-group-of-whales-called/) [도커의 로고에 쓰인 Molly Dock이라는 고래의 이미지](https://www.networkworld.com/article/2942838/docker-the-container-company-with-a-whale-of-a-logo-adopted-a-real-whale.html#:~:text=The%20whale%20in%20Docker's%20logo,taking%20care%20of%20the%20whale.)를 따서 이런 명칭이 붙었다.

![파드(Pod) 자체가 도커의 고래 이미지를 따서 만든 명칭이다.](/content/images/2022/02/pods.jpg)

파드는 다음과 같은 특징을 가진다.

1.  기본적으로 하나의 파드에는 **하나 이상의 컨테이너**가 포함된다. 필요에 따라 하나의 파드에 여러 컨테이너를 포함시킬 수 있다.
2.  파드는 노드 IP와 별개로 **고유 IP**를 할당 받으며, 파드 안의 컨테이너들은 그 IP를 공유한다.
3.  파드 자체는 **일반적으로 1개의 IP**만 가진다. (단, [Multus CNI](https://github.com/k8snetworkplumbingwg/multus-cni) 이용 등 특정 조건에 한해 2개의 IP를 가질 수도 있다.)
4.  파드 안의 컨테이너들은 동일한 볼륨과 연결이 가능하다.
5.  파드는 클러스터에서 배포의 최소 단위이고, 특정 네임스페이스(Namespace) 안에서 실행된다.
6.  파드는 기본적으로 **반영속적(ephemeral)**이다.

위에서 6번 항목에 주목하자. 동일한 역할을 하는 파드라도 환경에 따라 다른 노드들에 각각 배치될 수 있고, 특정 노드가 죽으면 해당 노드의 파드들이 건강한 상태의 다른 노드로 옮겨지기도 한다. 또는 필요에 따라 파드 숫자의 구성도 수시로 달라질 수 있다. **쿠버네티스에서의 파드는 무언가가 구동 중인 상태를 유지하기 위해 동원되는 일회성 자원이며, 필요에 따라 언제든 삭제될 수 있는 것**임을 유념해야 한다.

## 단일 컨테이너 파드

**단일 컨테이너 파드(Single-Container Pod)**는 오직 하나의 컨테이너만을 포함하고 있는 파드를 의미한다. 쿠버네티스 클러스터에서 운용되는 대다수의 파드가 이에 해당한다.

단일 컨테이너 파드의 경우 CLI 화면에서 `kubectl` 명령으로 간편하게 직접 배포할 수 있다. 혹은 명세(`spec`)를 포함한 YAML 파일을 이용해서도 배포할 수 있다. 예를 들어 `nginx` 컨테이너가 포함된 `nginx`라는 이름의 파드를 구동한다고 가정해보자.

### 1\. CLI 명령으로 배포하기

마스터 노드에 터미널로 접속한 상태에서 다음과 같은 명령을 실행한다.

```bash
kubectl run nginx --image=nginx
```

-   위 명령은 `kubectl run [파드명] --image=<이미지명>` 형태로 구성된다.
-   `kubectl run`은 `--image` 플래그로 지정된 이미지를 가져와 `[파드명]`으로 지정된 이름의 파드를 생성하고 구동시키는 명령이다.
-   `--image` 플래그는 필수 항목이다. 지정되지 않으면 파드 생성이 불가능하다.

### 2\. YAML 파일로 배포하기

마스터 노드에 접속한 상태에서 원하는 경로에 아래 내용의 YAML 파일을 작성한 뒤, 터미널 화면에서 `kubectl apply -f <파일명.yaml>`을 실행한다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  containers:
  - name: nginx-container
    image: nginx
```

-   `.apiVersion` : 객체 생성에 쓰일 쿠버네티스 API 버전을 의미한다. 객체 종류에 따라 버전이 조금씩 다름에 유의할 것. 파드와 서비스는 `v1`, 레플리카셋과 디플로이먼트 등은 `apps/v1`으로 쓰인다.
-   `.metadata.labels` : 파드 구동에 영향을 주지 않는 순수 키-값 메타데이터 영역이다. 원하는 조합으로 키-값을 부여할 수 있다. 수천 개의 파드가 돌아가는 환경에서 원하는 파드를 찾아 필요한 작업을 수행하려면 이러한 라벨링 작업에 신경써주는 것이 좋다.
-   `.spec.containers` : 실제 파드에 담길 컨테이너의 속성을 정의하는 부분이다. 도커의 `docker-compose`에 들어가는 내용과 상당 부분 유사하다.  
    – YAML 파일에서 `-`는 상위 항목에 대해 리스트 형태의 하위 항목을 정의할 때 쓰인다.

### 3\. 파드 관리에 쓰이는 주요 명령어

```bash
# 클러스터 내 파드 목록 조회(default 네임스페이스)
kubectl get pods

# 클러스터 내 특정 네임스페이스의 파드 목록 조회
kubectl get pods -n <namespace>

# 파드 목록의 상세 조회(사설IP, 노드정보 포함)
kubectl get pods -o wide

# nginx 파드를 수정
kubectl edit pod nginx

# nginx 파드의 상세 정보 확인
kubectl describe pod nginx

# nginx 파드 내 구동 중인 컨테이너의 로그 확인
kubectl logs nginx				

# nginx 파드의 컨테이너에 접속하여 sh를 대화형으로 실행
kubectl exec -it nginx -- /bin/sh 

# nginx 파드 삭제
kubectl delete pod nginx
```

-   위에서 두번째 명령어에 삽입된 **"네임스페이스(Namespace)"**는 하나의 클러스터 안에서 다양한 워크로드 리소스들을 필요에 따라 격리하는 데에 쓰이는 요소다. 이에 대해서는 이후 워크로드 리소스를 다루는 글에서 다시 소개할 예정이다.

### 4\. 파드 배포시 유용한 팁

`kubectl`을 이용한 객체 생성 및 배포는 CLI 커맨드로 간편히 진행할 수도 있지만, 상세 설정 내용을 검토하고 적용하여 진행하려면 YAML 파일 작성을 통해 진행하는 것이 좋다.

파드를 비롯한 객체를 다룰 때 `kubectl` 커맨드에 `--dry-run=client`와 `-o yaml` 옵션을 추가하면, **해당 명령으로 적용될 YAML 명세의 기본 골격을 파일 형태로 저장할 수 있다.** 이 경우 오직 명령문에 따라 작업이 정상적으로 완료될 수 있을 때에만 YAML 파일이 생성된다. 또한 파일만 생성될 뿐 실제 명령이 클러스터에 바로 적용되는 것은 아니므로, 앞으로 진행하려는 작업을 사전 검토할 때에도 유용한 옵션이다.

```bash
# Redis 파드 명세를 yaml 파일로 생성
kubectl run redis --image=redis --dry-run=client -o yaml > redis.yaml

# 생성된 yaml 파일로 파드 구동(선언형 방식)
kubectl apply -f redis.yaml

# 생성된 yaml 파일로 파드 구동(명령형 방식)
kubectl create -f redis.yaml
```

## 멀티 컨테이너 파드의 관리

**멀티 컨테이너 파드(Multi-Container Pod)**는 2개 이상의 서로 다른 컨테이너를 포함하고 있는 파드를 의미한다. 본래 하나의 파드는 하나의 컨테이너를 포함하는 것이 일반적이지만, 반드시 함께 붙어있어야 하며 같은 생명주기를 공유하는 컨테이너들이 존재한다면 이들을 묶어 하나의 파드로 운영할 수 있다.

이렇게 하나의 파드에 묶여 배포된 컨테이너들은 아래와 같은 특징을 가진다.

1.  파드의 상태에 따라 함께 구동되고 함께 정지된다. 즉, 같은 생명주기를 공유한다.
2.  하나의 파드 안에서 서로 간편하게 통신이 가능하다.
3.  파드가 가진 스토리지(볼륨)를 함께 공유한다.

멀티 컨테이너 파드의 경우 실용성을 고려한 여러 **디자인 패턴**들이 정착되어 있다. 이에 대해서는 다음 글에서 보다 자세히 알아보기로 하자.

### YAML 파일로 배포하기

멀티 컨테이너 파드는 YAML 파일을 이용하여 배포해야 한다. 일반 파드를 배포할 때와 마찬가지로 아래 내용의 YAML 파일을 작성한 뒤, 터미널 화면에서 `kubectl apply -f <파일명.yaml>`을 실행한다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-redis
  labels:
    app: nginx-redis
spec:
  containers:
  - name: nginx-container
    image: nginx
  - name: redis-container
    image: redis
```

-   기본적인 작성법은 단일 컨테이너 파드와 동일하다.
-   `spec.containers` 아래에 리스트 형태로 삽입하고자 하는 컨테이너 정보를 입력한다.

### 컨테이너 로그 확인 및 접속

멀티 컨테이너 파드의 경우, 컨테이너 로그 확인 또는 접속시 컨테이너명을 함께 명시해줘야 한다.

```bash
# nginx-redis 파드의 redis-container 컨테이너의 로그 확인
kubectl logs nginx-redis redis-container

# nginx-redis 파드의 nginx-container 컨테이너에 접속하여 대화형으로 sh 실행
kubectl exec -it nginx-redis nginx-container -- /bin/sh
```

## 파드의 생명 주기와 재시작 정책

### 파드의 생명 주기

쿠버네티스에서 파드의 생명 주기는 크게 **네 가지 단계**로 구분된다.

1.  `Pending` : 클러스터 내 파드 생성이 승인되었지만 아직 내부의 컨테이너가 완전히 시작되기 전이며, 아직 노드에 배치되지 않은 상태다.
2.  `Running` : 파드가 클러스터의 특정 노드에 배치되었으며 내부의 모든 컨테이너가 생성 완료된 상태다. 하나 이상의 컨테이너가 구동되기 시작했거나 시작되는 중이다.
3.  `Succeeded` : 파드 안의 컨테이너가 유한한 수의 작업을 실행한 후 종료되도록 설계되었을 때에만 볼 수 있다. 이 경우는 파드에 있는 모든 컨테이너가 해당 작업을 정상적으로 마치고 종료된 것이다.
4.  `Failed` : 역시 파드 안의 컨테이너가 유한한 수의 작업을 실행한 후 종료되도록 설계되었을 때에만 볼 수 있다. 이 경우는 파드에 있는 컨테이너 중 하나 이상이 비정상 종료되었을 때 발생한다.

이 외에도 특수한 경우에만 파드에 부여되는 상태 정보(`.status.phase`)가 추가로 존재한다.

-   `unknown` : 파드의 상태 확인이 불가한 경우다. 대개 해당 노드의 네트워크 문제로 발생한다.
-   `terminating` : 파드를 삭제시켰을 때 볼 수 있다. 일반적으로 파드는 30초의 유예 시간 후에 완전히 삭제되며, 즉시 삭제를 원한다면 `kubectl delete` 명령에 `--force` 옵션을 더하면 된다. 이 항목은 파드의 생명 주기로 취급되지 않는다.

파드의 생명 주기와 현재 상태는 **kubelet**이 주기적으로 모니터링한다. 이렇게 모니터링된 상태 정보는 `kubectl get pods`의 출력 결과 중 `STATUS` 필드에서 볼 수 있다. 해당 파드 오브젝트의 `.status.phase` 필드에서도 확인 가능하며, 이때 필요한 명령어는 다음과 같다.

```bash
kubectl get pod <파드명> -o jsonpath='{.status.phase}'
```

### 파드 안 컨테이너의 재시작 정책

파드에 포함된 모든 각각의 컨테이너에는 **오류가 생겼을 때 재시작하기 위한 정책**을 가지고 있다. 이 정책은 크게 세 종류로 구분되며, 파드의 YAML 명세 중 `spec.restartPolicy`를 통해 직접 부여할 수 있다.

1.  `Always` : 컨테이너가 정상/비정상 종료 시 항상 재시작한다. **기본값**이다.
2.  `Onfailure` : 컨테이너가 오직 비정상 종료되었을 때에만 재시작한다.
3.  `Never` : 재시작하지 않는다.

컨테이너의 재시작 설정은 일정한 **지연 시간**을 두고 이루어진다. 이 지연 시간은 **최대 300초 한도 내에서 10초의 지수 단위로 반영**된다. 예를 들어 첫번째 재시작 시도는 10초 후에, 그 다음번의 재시작 시도는 20초 후에, 그 다음은 40초 후에 이루어지는 식이다. 만약 재시작에 성공한 컨테이너가 10분 동안 이상 없이 구동 상태를 유지한다면 해당 지연 시간은 초기화된다.

## 컨테이너 상태 진단을 위한 프로브(Probe) 활용

그렇다면, 쿠버네티스에서는 어떤 방법으로 컨테이너의 상태를 체크하여 위의 재시작 정책을 수행하게 될까? 이때 이용되는 것이 바로 **프로브(Probe)**다. 프로브(Probe)는 **kubelet**이 파드 안의 컨테이너 상태를 진단하여 컨테이너의 재시작 또는 종료가 필요한지 여부를 확인할 수 있게 해준다.

### 프로브(Probe)의 동작 방식

프로브가 컨테이너의 상태를 진단할 때에는 아래의 세 가지 방식이 쓰인다.

1.  **HTTP 방식** : HTTP GET 요청을 보내서 2XX 또는 3XX 응답이 오는지 체크한다.
2.  **TCP 방식** : TCP의 [3-Way Handshake](https://velog.io/@averycode/%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%81%AC-TCPUDP%EC%99%80-3-Way-Handshake4-Way-Handshake#-tcp%EC%9D%98-3-way-handshake)가 잘 맺어졌는지 체크한다.
3.  **Exec 방식** : 컨테이너에 특정 명령을 실행해서 종료 코드가 0인지 체크한다.

이러한 진단 결과는 크게 `Success`(성공), `Failure`(실패), `Unknown`(진단 실패)의 세 가지로 구분된다. 만약 진단 결과가 `Failure`로 나온다면, **kubelet**이 이를 감지하여 필요한 작업을 수행한다.

컨테이너 상태 진단을 위한 프로브는 크게 **Liveness**, **Readiness**, **Startup**의 세 종류로 구분된다. 이들의 용도와 동작 방식을 요약하면 다음과 같다.

![프로브들의 동작을 순서도로 표현하면 위와 같다.](/content/images/2022/02/probes-1.png)

이미지 출처: [Andrew Lock](https://andrewlock.net/deploying-asp-net-core-applications-to-kubernetes-part-6-adding-health-checks-with-liveness-readiness-and-startup-probes/)

1.  **Liveness Probe** : 컨테이너가 멈추거나 비정상 종료되는 상황이 감지되면 해당 컨테이너를 재시작시킨다.
2.  **Readiness Probe** : 컨테이너가 요청(Request)을 처리할 수 없는 상황이 감지되면 해당 파드로의 로드밸런싱을 중단시킨다. 단, 파드 자체는 건드리지 않는다.
3.  **Startup Probe** : 컨테이너가 시작되어 정상 구동되는 시점을 감지한다. 그 전까지는 다른 프로브(Liveness, Readiness)의 동작을 막고, 해당 시점을 기준으로 자기 자신의 역할을 종료한 뒤 프로브 기능을 다른 프로브들에게 넘긴다.

### 프로브 유형 1: Liveness Probe

위의 세 가지 방식의 진단을 통해 해당 컨테이너가 살았는지, 요청을 받아들일 준비가 되었는지를 확인한다. 만약 `Failure`가 떴다면, **컨테이너를 재시작**시킨다.

이 프로브를 통해 컨테이너 내부에 일부 문제가 있더라도 높은 가용성을 보장받을 수 있다. 그러나 만약 버그 등으로 인해 병목 현상이나 메모리 누수가 발생할 경우 프로세스가 아예 멈출 수 있으므로 주의해야 한다.

아래 예시는 컨테이너에 직접 명령을 실행해서 상태를 진단하는 **Exec 방식**의 Liveness 프로브를 설정하는 경우다. 이 내용은 파드 배포에 쓰이는 YAML 파일 중 `spec.containers` 아래의 컨테이너 명세에 추가된다.

```yaml
livenessProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
  initialDelaySeconds: 5
  periodSeconds: 5
```

-   위의 내용은 `initialDelaySeconds` 값에 따라 최초 5초를 대기한 뒤, **kubelet**이 `periodSeconds` 값에 따라 매 5초마다 `cat /tmp/healthy` 명령을 통해 프로브 기능을 실행하도록 하는 것이다.
-   만약 위와 같은 형식으로 파드(컨테이너) 생성때 이 프로브가 별도로 선언되지 않았다면, `Success`가 기본 상태인 것으로 간주된다.
-   만약 컨테이너가 완전히 `Running` 상태가 될 때까지 이 프로브의 동작을 멈추고 싶다면, `initialDelaySeconds` 값을 충분히 주거나 아래에서 설명할 **Startup Probe**를 함께 활용하는 것이 좋다.

### 프로브 유형 2: Readiness Probe

Liveness와 많은 부분 일치하는 프로브다. YAML을 통한 정의 내용도 같고, 진단 방식도 동일하다. 다른 점이 있다면, `Failure`가 떴을 경우 **해당 파드에 로드밸런싱을 하지 않는다**는 것이다.

외부에서 들어오는 요청(Request)을 파드에 적절히 분배하는 것이 쿠버네티스 클러스터의 서비스(Service)가 하는 역할인데, 만약 특정 파드에서 응답 없는 상태가 발생한다면? 이 경우 그 파드의 상태가 정상이 아닌 것으로 간주하고, 그 파드와 서비스 간의 연결을 끊어 로드밸런싱을 막는다. 이것이 Readiness Probe의 역할이다.

아래 예시는 **Exec 방식**의 Readiness 프로브를 설정하는 경우다. Liveness 프로브와 설정 방식이 완전히 같으며, 오직 명칭 자체만 `readinessProbe`로 다를 뿐이다.

```yaml
readinessProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
  initialDelaySeconds: 5
  periodSeconds: 5
```

-   만약 위와 같은 형식으로 파드(컨테이너) 생성때 이 프로브가 별도로 선언되지 않았다면, `Success`가 기본 상태인 것으로 간주된다.
-   Liveness 프로브는 Readiness 프로브와 별개로 동작한다. 어느 하나가 `Success` 될 때까지 대기하지 않는다. 따라서 둘을 함께 쓸 경우에는 주의해서 설정해야 한다.

### 프로브 유형 3: Startup Probe

**컨테이너에 탑재된 애플리케이션의 시작 시기를 확인**하는 프로브다. 만약 이 프로브가 선언되었다면, `Success`가 선언되기 전까지는 다른 프로브(Liveness, Readiness)가 활성화되지 않도록 막는다.

앞서 살펴본 프로브들(Liveness, Readiness)는 모두 파드의 컴퓨팅 자원을 사용하여 동작한다. 때문에 파드가 처음 시작할 때부터 이들이 많은 활동을 보이게 되면, 컨테이너와 파드가 `Running` 상태로 도달하는 시간이 그만큼 길어지게 된다. 따라서 파드가 정상적으로 구동되기 시작했다고 판단될 때까지는, 이 프로브가 다른 프로브 기능을 비활성화 시킨 상태에서 대신 상태 진단을 수행한다.

이 프로브는 특성상 파드나 컨테이너 상태가 `Failure`로 판명되어도 일단 넘어가게 되어있다. 실제로 YAML 파일을 통해 이 프로브를 선언할 때, 아래와 같이 **실패 허용 횟수**를 지정할 수 있다.

```yaml
startupProbe:
  httpGet:
    path: /health-check
    port: liveness-port
  failureThreshold: 30
  periodSeconds: 10
```

-   위의 YAML 내용은 **매 10초마다 수행하는 상태 진단을 30번까지 수행**하도록 설정한 경우다. 이 경우 최대 5분(300초)까지 파드와 애플리케이션 상태의 `Running` 전환을 대기할 수 있는 것이다.
-   `startupProbe.failureThreshold` : 최대 실패 허용 횟수를 의미한다.
-   `startupProbe.periodSeconds` : 프로브가 상태 진단하는 주기(초)를 의미한다.

만약 컨테이너와 파드의 정상 구동이 완전히 확인되었다면, Startup Probe는 상태 체크 Loop를 멈추고 프로브 기능을 Liveness와 Readiness에게 넘긴다.

## 맺음말

이번 글에서는 쿠버네티스에서 가장 작은 단위의 배포 개체이자 가장 핵심적인 워크로드 자원인 **파드(Pod)**에 대해 자세히 알아보았다. 아울러 파드가 가진 생명 주기, 그리고 **프로브(Probe)**를 이용한 컨테이너 상태 진단과 이를 이용한 재시작 정책도 함께 살펴보았다.

다음 글에서는 여러 컨테이너를 하나의 파드로 품은 **멀티 컨테이너 파드(Multi-Container Pod)의 대표적인 디자인 패턴**들을 들여다 볼 것이다.

## 참고자료

-   [쿠버네티스 공식 문서: Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
-   [쿠버네티스 공식 문서: Configure Liveness, Readiness and Startup Probes]([https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/])
-   [Adding health checks with Liveness, Readiness, and Startup probes](https://andrewlock.net/deploying-asp-net-core-applications-to-kubernetes-part-6-adding-health-checks-with-liveness-readiness-and-startup-probes/)
-   [파드의 생명주기와 컨테이너 프로브]([https://nearhome.tistory.com/89])
-   [TCP/UDP와 3-Way Handshake & 4-Way Handshake]([https://velog.io/@averycode/%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%81%AC-TCPUDP%EC%99%80-3-Way-Handshake4-Way-Handshake#-tcp%EC%9D%98-3-way-handshake])
-   [도커/쿠버네티스 온라인 부트캠프 with 카카오엔터프라이즈](https://classlion.net/class/detail/21) (11주차, 17주차 강의 중 일부)
