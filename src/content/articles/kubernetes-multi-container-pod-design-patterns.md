---
title: "멀티 컨테이너 파드의 대표적인 디자인 패턴들"
description: "쿠버네티스에서 때로는 하나의 파드 안에 여러 컨테이너를 함께 운영해야 할 수 있다. 메인 컨테이너의 기능 향상이나 안정성 확보, 또는 의존성 이슈를 체크할 때 유용할 수 있는 멀티 컨테이너 파드(Multi-Container Pod)의 대표적인 디자인 패턴들을 알아본다."
pubDate: "2022-02-10T08:23:08.000Z"
tags: ["kubernetes"]
featureImage: "/content/images/2022/02/cover-8.png"
---

## 멀티 컨테이너 파드란?

**멀티 컨테이너 파드(Multi-Container Pod)**는 2개 이상의 서로 다른 컨테이너를 포함하고 있는 파드를 의미한다. 일반적으로 하나의 파드 안에는 하나의 프로세스 = 하나의 컨테이너를 구동하게 되지만, 필요에 따라서는 메인 프로세스에 도움을 줄 수 있는 보조적인 역할의 컨테이너를 더해서 운영하는 것도 가능하다.

하나의 파드 안에서는 모든 컨테이너가 같은 네트워크 안에서 동작하므로, 같은 IP 주소와 포트를 공유하게 된다. 때문에 같은 포트를 사용하는 컨테이너들을 묶어서 하나의 파드로 배포해서는 안 된다. 또한 하나의 파드 안에 완전히 별개의 성격을 가진 다른 프로세스들을 묶어 배포하는 것도 권장되지 않는다. 이는 전체 서비스를 기능 단위로 분산하고 파드(Pod)를 최소의 배포 단위로 구성하는 쿠버네티스의 설계 사상에 맞지 않는 방식이다.

따라서, 멀티 컨테이너 파드는 **메인 프로세스를 네트워크 또는 스토리지의 밀접한 공유가 필요한 다른 컨테이너와 함께 운영**하고자 할 때에 고려하는 것이 바람직하다. 이러한 경우를 쓸모에 따라 명확히 구분하여 놓은 것이 바로 아래와 같은 **파드 디자인 패턴**들이다. 이들은 단일 노드에서 구동되는 단일 파드에 적용 가능한 것들로, 마지막에 소개할 "초기화(Init) 컨테이너" 외에는 모두 구글의 Brendan Burns와 David Oppenheimer가 2016년에 발표한 ["Design patterns for container-based distributed systems"](https://www.usenix.org/system/files/conference/hotcloud16/hotcloud16_burns.pdf)라는 논문에서 정리된 분류에 해당한다.

![멀티 컨테이너 파드의 대표적인 디자인 패턴으로는 Sidecar, Adapter, Ambassador 등이 있다.](/content/images/2022/02/pod-design-patterns.png)

이미지 출처: [Matthew Palmer](https://matthewpalmer.net/kubernetes-app-developer/articles/multi-container-pod-design-patterns.html)

## 사이드카(Sidecar) 컨테이너

기존 파드의 기능을 향상하기 위해 **파드의 파일시스템을 공유하는 형태의 보조 컨테이너**를 **사이드카 컨테이너**라고 부른다. 쿠버네티스 환경에서 실제 이용되는 많은 수의 멀티 컨테이너 파드가 이런 디자인 패턴을 따르고 있다.

![사이드카(Sidecar) 컨테이너가 포함된 파드의 구성 형태](/content/images/2022/02/sidecar-container.png)

이미지 출처: [Brendan Burns, David Oppenheimer의 논문](https://www.usenix.org/conference/hotcloud16/workshop-program/presentation/burns)

예를 들어 Nginx가 돌아가는 파드 안에 Nginx의 로그를 수집하는 사이드카 컨테이너를 두는 경우를 생각해보자. 이 경우 아래와 같은 구성이 가능할 것이다.

1.  파드 안에 Nginx의 최신 로그를 스트리밍하는 사이드카 컨테이너를 따로 둔다.
2.  이 컨테이너가 Nginx 로그를 stdout 또는 stderr로 내보내면,
3.  별도로 운영되는 Logging backend(logging agent pod) 또는 logrotate 같은 별도의 로그 관리 서비스가 여기에 접근하게 된다.

위의 예시에 대한 가장 간단한 형태의 구현물을 아래 YAML 형식으로 살펴보자.

### 예시 YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-sidecar
spec:
  containers:
  - name: nginx
    image: nginx
    ports:
    - containerPort: 80
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
  - name: sidecar-access
    image: busybox
    args: [/bin/sh, -c, 'tail -n+1 -f /var/log/nginx/access.log']
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
  - name: sidecar-error
    image: busybox
    args: [/bin/sh, -c, 'tail -n+1 -f /var/log/nginx/error.log']
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
  volumes:
  - name: logs
    emptyDir: {}
```

-   위의 예시는 하나의 `nginx` 컨테이너에 더하여 두 개의 `busybox` 컨테이너를 붙였다.
-   이 `busybox` 컨테이너들은 각각 `nginx`의 `/var/log/nginx/`에 기록되는 `access.log`와 `error.log`를 스트리밍하는 사이드카 컨테이너로서 기능한다.
-   이 스트리밍 기능을 위해, `busybox` 컨테이너에는 `tail -n+1 -f`라는 쉘 명령어가 구동과 함께 실행되도록 설정되어 있다.
-   이렇게 스트리밍되는 로그들은 `kubectl logs nginx-sidecar [컨테이너명]` 명령을 통해 터미널에서 바로 확인할 수 있다.

## 어댑터(Adapter) 컨테이너

**어댑터 컨테이너**는 주로 파드에 탑재된 특정 애플리케이션의 출력물 규격을 필요에 맞게 다듬는 용도로 쓰인다.

![어댑터(Adapter) 컨테이너가 포함된 파드의 구성 형태](/content/images/2022/02/adapter-container.png)

이미지 출처: [Brendan Burns, David Oppenheimer의 논문](https://www.usenix.org/conference/hotcloud16/workshop-program/presentation/burns)

오픈소스 애플리케이션을 이용하다 보면, 각각 엇비슷한 역할을 하는 프로그램인 경우에도 출력물의 규격이 제각각인 사례가 많다. 예를 들어 어떤 서버에서는 로그의 날짜 포맷이 `YYYY-MM-DD`인데 다른 서버에서는 `DD/MM/YYYY`인 경우가 있을 것이다. 이런 환경에서 로그 수집기로 로그들을 하나로 취합하다 보면 이처럼 서로 다른 규격 때문에 문제가 발생할 수 있다.

이럴 때 어댑터 컨테이너를 이용해서 출력물의 규격을 조정해 준다면 작업이 훨씬 간편해질 것이다. 이 경우 원래 애플리케이션이 탑재된 컨테이너를 별도로 건드릴 필요가 없어진다. 즉, 서로 다른 이질적인 애플리케이션들로부터 출력물의 상호 호환성을 만들어주는 용도로 도입하는 것이 바로 **어댑터 컨테이너**다.

### 어댑터 컨테이너 활용 예시

쿠버네티스가 포함된 도커 데스크탑 환경, 또는 minikube가 설치된 환경에서 아래 리포지터리를 이용한다. 아래의 예시에 대한 자세한 설명은 [원작자의 블로그 게시물](https://medium.com/bb-tutorials-and-thoughts/kubernetes-learn-adaptor-container-pattern-97674285983c)에서 확인할 수 있다.

```bash
# Example source by Bhargav Bachina(@bbachi)
https://github.com/bbachi/k8s-adaptor-container-pattern.git
```

위의 예시에서 어댑터 컨테이너가 포함된 전체 파드의 배포 정보(`pod.yml`)를 살펴보면 다음과 같다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: adapter-container-demo
spec:
  containers:
  - image: busybox
    command: ["/bin/sh"]
    args: ["-c", "while true; do echo $(date -u)'#This is log' >> /var/log/file.log; sleep 5;done"]
    name: main-container
    resources: {}
    volumeMounts:
    - name: var-logs
      mountPath: /var/log
  - image: bbachin1/adapter-node-server
    name: adapter-container
    imagePullPolicy: Always
    resources: {}
    ports:
      - containerPort: 3080
    volumeMounts:
    - name: var-logs
      mountPath: /var/log
  dnsPolicy: Default
  volumes:
  - name: var-logs
    emptyDir: {}
```

-   위의 예제는 `busybox` 이미지가 구동되는 메인 컨테이너의 로그 출력을 `bbachin1/adapter-node-server` 이미지가 탑재된 `node` 컨테이너가 받은 뒤,
-   `node` 컨테이너가 탑재한 `server.js` 파일의 코드를 통해 메인 컨테이너의 로그를 JSON 형태로 변환하는 내용을 담고 있다.
-   이처럼 특정한 로그나 출력물을 보편적인 포맷으로 변환하여 주는 것이 어댑터 컨테이너의 주요한 용도 중 하나다.

## 앰버서더(Ambassador) 컨테이너

**앰버서더 컨테이너**는 **파드 외부의 서비스에 대한 엑세스를 간소화**하는 특수한 유형의 컨테이너다. 메인 컨테이너가 수행해야 할 네트워크 통신을 대신해주는 역할을 소화한다고 해서 이런 이름이 붙었다.

![앰버서더(Ambassador) 컨테이너가 포함된 파드의 구성 형태](/content/images/2022/02/ambassador-container.png)

이미지 출처: [Brendan Burns, David Oppenheimer의 논문](https://www.usenix.org/conference/hotcloud16/workshop-program/presentation/burns)

이러한 구조를 가진 파드에서 메인 컨테이너는 오직 앰버서더 컨테이너를 통해서만 외부와 통신이 가능하며, 외부로부터의 접근 또한 앰버서더 컨테이너를 통해서만 가능하다. 즉, 앰버서더 컨테이너는 **메인 컨테이너의 네트워크를 전담하는 프록시 역할**을 수행하는 것이다.

### 앰버서더 컨테이너 활용 예시

아래 예시는 [Magalix 사의 기술 블로그](https://www.magalix.com/blog)에서 소개된 내용으로, 파드 안의 `redis` 서버가 외부의 `redis` 인스턴스들에 접근할 수 있도록 프록시 역할의 컨테이너를 활용하는 사례를 구현한 것이다. 보다 자세한 설명은 [원작자의 블로그 게시물](https://www.magalix.com/blog/kubernetes-patterns-the-ambassador-pattern)에서 확인할 수 있다.

위 게시물에서 앰버서더 컨테이너가 포함된 전체 파드의 정의 내용(YAML)을 살펴보면 다음과 같다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ambassador-example
spec:
  containers:
  - name: redis-client
    image: redis
  - name: ambassador
    image: malexer/twemproxy
    env:
    - name: REDIS_SERVERS
      value: redis-st-0.redis-svc.default.svc.cluster.local:6379:1 redis-st-1.redis-svc.default.svc.cluster.local:6379:1
    ports:
    - containerPort: 6380
```

-   위 파드의 메인 프로세스는 `redis-client`로, 클라이언트 역할을 하는 `redis` 컨테이너다.
-   앰버서더 역할의 `ambassador` 컨테이너는 프록시 역할을 하며, `6380` 포트를 이용하여 `redis` 컨테이너와 `REDIS_SERVERS`로 명명된 네트워크 위치 간의 연결을 맡는다.
-   `REDIS_SERVERS`로 명명된 위치는, `redis-svc` 서비스를 바라보는 `redis-st-0`과 `redis-st-1` 파드를 의미한다. 따라서 위의 설정대로 파드가 정상 구동되려면, `redis-svc` 서비스와 더불어 `redis-st`라는 이름의 스테이트풀셋(StatefulSet) 생성이 추가로 필요할 것이다. 이 리소스들에 대해서는 다음 글에서 자세히 다룰 것이다.

## 초기화(Init) 컨테이너

**파드의 메인 컨테이너 실행 전에 일종의 초기화 역할**을 담당하는 컨테이너다. 즉, 파드의 메인 프로세스를 구동하는 데에 필요한 사전 작업이나 조건을 걸어두고, 이들이 완료된 것을 확인한 후에 메인 프로세스가 시작되도록 해주는 것이다.

초기화 컨테이너는 다른 일반 컨테이너와 달리 다음과 같은 차이점을 갖는다.

1.  모든 초기화 컨테이너는 의도된 작업이 끝나면 **반드시 종료**되어야 한다.
2.  그러므로 초기화 컨테이너에는 생명 주기(`lifecycle`) 관련 옵션이나 프로브(`livenessProbe`, `readinessProbe`, `startupProbe`)를 사용할 수 없다.
3.  만약 여러 개를 함께 운영한다면 하나씩 순차적으로 시작된다. 먼저 시작된 컨테이너가 **정상 종료**되면 다음 컨테이너의 순서로 넘어간다.
4.  만약 초기화 컨테이너의 구동이 실패했다면, **kubelet**은 이것이 **성공(정상 종료)할 때까지 컨테이너를 계속 재시작**시킨다. 단, 파드의 명세 상에 `restartPolicy`가 `Never`로 명시된 경우라면 파드 전체가 구동 실패(`Failure`)한 것으로 간주하고 작업을 종료한다.

이런 특성 덕분에 초기화 컨테이너는 여러 방면으로 응용이 가능하다. 대표적인 방식 중 하나는 다른 애플리케이션에 **의존성을 가진 파드**를 배포할 때 사전 체크 용도로 활용하는 것이다.

### 초기화 컨테이너 활용 예시

[쿠버네티스 공식 문서](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)에 소개된 예시를 아래와 같이 살펴보자.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
  labels:
    app: myapp
spec:
  containers:
  - name: myapp-container
    image: busybox:1.28
    command: ['sh', '-c', 'echo The app is running! && sleep 3600']
  initContainers:
  - name: init-myservice
    image: busybox:1.28
    command: ['sh', '-c', "until nslookup myservice.$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace).svc.cluster.local; do echo waiting for myservice; sleep 2; done"]
  - name: init-mydb
    image: busybox:1.28
    command: ['sh', '-c', "until nslookup mydb.$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace).svc.cluster.local; do echo waiting for mydb; sleep 2; done"]
```

-   초기화 컨테이너는 `spec` 아래에 `initContainers` 항목으로 따로 구분하여 표기한다. 위의 예시에서는 2개의 초기화 컨테이너가 쓰였다.
-   `init-myservice`는 같은 네임스페이스 안에 `myservice`라는 서비스가 발견될 때까지 2초마다 `waiting for myservice`라는 메시지를 출력하도록 설정되었다.
-   `init-mydb` 역시 `mydb`라는 서비스가 발견될 때까지 동일한 유형의 메시지를 출력하도록 쉘 스크립트가 설정되었다.

위의 내용대로 파드 `myapp-pod`를 배포한 뒤 `kubectl get`으로 상태 정보를 확인하면 다음과 같은 결과가 나온다.

```bash
NAME        READY     STATUS     RESTARTS   AGE
myapp-pod   0/1       Init:0/2   0          2m
```

-   `spec.containers`에는 오직 하나의 컨테이너(`myapp-container`)만 선언되었으므로 `READY` 항목에 `0/1`이 뜨게 된다. 현재 이 컨테이너는 시작되지 않은 상태다.
-   `STATUS` 항목에 일반적인 상태명 대신 `Init:0/2`가 떴다. `spec.initContainers`로 2개의 초기화 컨테이너가 설정되었으며, 현재 둘 모두 종료되지 않은 상태다.
-   이 상태에서 `kubectl logs myapp-pod <init컨테이너명>` 명령을 실행해보면, `waiting for <서비스명>` 메시지들이 출력될 것이다. 해당 서비스들이 배포되어 있지 않으므로 초기화 컨테이너가 종료되지 않고 계속 대기 중인 것이다.

이제 앞서 YAML에서 설정된 초기화 컨테이너들의 종료 조건을 충족시켜보자. 아래와 같이 서비스들을 정의하여 `kubectl apply -f` 명령으로 배포한다.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myservice
spec:
  ports:
  - protocol: TCP
    port: 80
    targetPort: 9376
---
apiVersion: v1
kind: Service
metadata:
  name: mydb
spec:
  ports:
  - protocol: TCP
    port: 80
    targetPort: 9377
```

서비스들의 배포 상태를 확인한 후, 아까 살펴봤던 파드 `myapp-pod`의 상태 정보를 다시 체크해보자. `READY` 항목과 `STATUS` 항목이 나란히 바뀌어 정상 구동 중임을 확인할 수 있을 것이다.

```bash
NAME        READY     STATUS    RESTARTS   AGE
myapp-pod   1/1       Running   0          5m
```

이처럼 초기화 컨테이너는 의존성을 가진 파드를 배포할 때 사전 조건의 충족 여부를 확인하는 용도로 유용하게 쓸 수 있다. 단, 일단 `Running` 상태로 진입한 파드는 앞서 초기화 컨테이너를 통해 전제해 두었던 조건들이 추후에 달라지게 되더라도 재시작시키지 않는 이상 계속 `Running` 상태가 유지된다는 점에 유의하자.

## 맺음말

이상으로 2개 이상의 멀티 컨테이너를 갖춘 파드의 대표적인 디자인 패턴들을 살펴보았다. 파드에 포함된 메인 컨테이너의 기능 향상이나 안정성 확보, 의존성 이슈 체크가 필요할 때 이러한 패턴들이 도움을 줄 수 있을 것이다.

다음 글에서는 **쿠버네티스의 핵심 워크로드 리소스**인 레플리카셋(ReplicaSet), 디플로이먼트(Deployment), 스테이트풀셋(StatefulSet), 데몬셋(DaemonSet)을 알아보기로 한다. 또한 이들의 실행 구역을 필요에 따라 논리적으로 나누어 주는 네임스페이스(Namespace)의 역할도 살펴볼 것이다.

## 참고자료

-   ["Design patterns for container-based distributed systems" by Brendan Burns and David Oppenheimer, Google (2016)](https://www.usenix.org/conference/hotcloud16/workshop-program/presentation/burns)
-   [Multi-Container Pod Design Patterns in Kubernetes](https://matthewpalmer.net/kubernetes-app-developer/articles/multi-container-pod-design-patterns.html)
-   [Kubernetes Patterns : The Ambassador Pattern](https://www.magalix.com/blog/kubernetes-patterns-the-ambassador-pattern)
-   [쿠버네티스 공식 문서: Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
-   [도커/쿠버네티스 온라인 부트캠프 with 카카오엔터프라이즈](https://classlion.net/class/detail/21) (17주차 강의)
