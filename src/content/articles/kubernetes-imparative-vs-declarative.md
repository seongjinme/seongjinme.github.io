---
title: "쿠버네티스에서 명령형 접근법과 선언형 접근법의 차이 이해하기"
description: "kubectl create와 apply의 차이는 무엇일까? 이걸 이해하려면 명령형 접근법과 선언형 접근법의 개념을 이해해야 한다. 이번 글에서는 쿠버네티스에서 쓰이는 두 가지 접근법의 차이를 알아보고, 특히 선언형 접근법을 채택한 관리 환경에서 주의해야 할 점을 함께 들여다보기로 한다."
pubDate: "2022-03-02T00:55:00.000Z"
updatedDate: "2022-05-26T23:38:47.000Z"
tags: ["kubernetes"]
featureImage: "/content/images/2022/02/cover-11.png"
---

프로그래밍의 주요 패러다임으로 명령형 프로그래밍과 선언형 프로그래밍이 있듯이, 코드로서의 인프라(IaC; Infrastructure as a Code) 영역에서도 **명령형 접근법**과 **선언형 접근법**이 존재한다.

쿠버네티스에서는 두 가지 접근법이 모두 쓰인다. CLI 명령어를 통한 객체 관리는 **명령형 접근법**에, `kubectl apply` 명령을 통한 YAML 파일 기반 객체 관리는 **선언형 접근법**에 해당한다. 이 두 가지 접근법은 각각의 장단점이 있으므로, 상황과 필요에 따라 구분하여 활용해야 한다. 많은 개발 및 상용 환경에서는 프로젝트의 성격에 따라 클러스터 및 하부 요소들의 세밀한 관리가 요구되므로, YAML 기반의 선언형 접근법이 보다 주요하게 쓰일 것이다.

## 명령형(Imperative) 접근법

**명령형 접근법은, 원하는 상태를 만들기 위해 필요한 동작을 지시하는 방식이다.** 쿠버네티스에서는 아래와 같이 CLI 환경에서 `kubectl`을 통한 구성 요소 생성/수정/삭제 명령어를 수행하는 방식이 이에 해당한다. 이러한 접근법은 결국 **"요구되는 환경을 어떻게(how) 만들 것인가"**에 초점을 두고 있다.

```bash
kubectl run nginx --image=nginx
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80
kubectl edit deployment nginx
kubectl scale deployment nginx --replicas=5
kubectl set image deployment nginx nginx=nginx:1.18
kubectl <create|replace|delete> -f nginx.yaml
```

YAML 파일을 통해 '구성 요소의 상태'를 정의해 놓은 경우라도, `create`나 `replace`에 해당하는 작업을 실행한다면 이는 명령형 접근법에 속한다. 해당 파일의 내용을 토대로 어떤 작업을 수행할 것인지를(생성/대체/삭제) 명시적으로 지시하는 방식이기 때문이다. 예를 들어 `nginx` 파드가 이미 구동 중인 상태에서 같은 이름의 파드가 정의된 YAML 파일로 `create` 명령을 실행하면 중복 오류가 발생한다. 반대로 `nginx` 파드가 존재하지 않는데 같은 파일로 `replace` 명령을 실행한다면 마찬가지로 오류가 발생한다.

정리하자면, 명령형 접근법은 아래와 같은 한계점을 가진다.

1.  **명령어 만으로 수행 가능한 작업이 제한적이다.** 특히 멀티 컨테이너 파드처럼 복잡도가 있는 쿠버네티스의 구성 요소를 명령어 만으로 하나하나 설정하기는 어렵다.
2.  **작업 내역을 추적하기 어렵다.** 여러 사람이 함께 하는 협업 환경에서는 누군가가 명령어로 단순 생성시킨 특정 요소의 히스토리를 파악하기 힘들다.
3.  **현재 작업 환경의 설정사항을 직접 파악해야 한다.** 앞서 YAML 파일로 `create`, `replace`, `delete` 실행 시 오류가 발생하는 경우들을 살펴봤었다. 이런 오류의 가능성으로 인해, 명령 수행 전에 현재 작업 환경을 수동으로 체크해야 하는 과정이 추가로 요구된다.

다만 **필요한 요소를 명령어 한 줄로 즉시 생성하여 다룰 수 있게 해주는 것은 명확한 장점**이므로, 빠르고 간결한 작업 수행이 요구되는 환경에서 명령형 접근법은 여전히 유용할 수 있다.

## 선언형(Declarative) 접근법

**선언형 접근법은, 원하는 상태 그 자체를 선언하는 방식이다.** 쿠버네티스에서는 YAML 파일을 통해 원하는 구성 요소의 원하는 상태를 기술한 뒤, `kubectl apply -f <파일명.yaml>` 형태의 명령어로 이를 적용하는 방식이 해당된다. 이렇게 선언된 상태를 실제로 적용하기 위해 필요한 작업은 쿠버네티스 시스템이 알아서 판단하고 수행한다. 이 접근법은 결국 **"요구되는 환경이 무엇인가(what)"**에 초점을 둔다.

앞서 파드 설명 부분에서 다루었던 `nginx` 파드의 YAML 정의 파일(`nginx.yaml`)을 다시 참고하면 다음과 같다.

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

위의 파일을 통해 `nginx` 파드를 배포했는데, 이 파드에 쓰이고 있는 이미지를 특정 버전(`nginx:1.20.2`)으로 수정하여 재배포해야 한다고 가정해보자. 이 경우엔 우선 YAML 파일을 아래와 같이 수정할 수 있을 것이다.

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
    image: nginx:1.20.2
```

이렇게 수정된 내역을 기존의 파드에 적용하고 싶다면, 다음의 명령어를 실행하면 된다.

```bash
kubectl apply -f nginx.yaml
```

여기서 수행하는 `kubectl apply` 명령이 바로 쿠버네티스의 선언적 접근법에 해당하는 부분이다. 이 명령은 적용하고자 하는 YAML 파일이 요구되는 문법에 맞게 작성되었는지를 검토한 뒤, 해당되는 요소가 기존의 클러스터에 이미 배포되어 있는지를 체크하고 있다면 업데이트를, 없다면 신규 생성을 알아서 진행한다. **관리자가 선언한 특정한 상태를 시스템이 스스로 파악하여 반영하는 이 프로세스가 바로 쿠버네티스에서의 선언형 접근법이다.**

## 선언형 관리 환경에서의 주의점: 명령형 커맨드를 혼용하지 말 것!

YAML 등 구성 파일을 통해 쿠버네티스 요소들을 선언형으로 관리하는 환경이라면, `kubectl`에서 제공하는 `create`, `edit` 또는 `scale` 같은 명령을 `kubectl apply`와 절대 혼용해서는 안 된다. 만약 혼용할 경우, 이미 생성된 요소들의 추후 업데이트 과정에서 의도하지 않은 결과가 나오거나 업데이트 이력에 대한 추적 관리가 어려워진다. 왜일까?

이 문제를 이해하려면, 우선 **활성 객체 설정(Live Object Configuration)**이라는 개념과 이에 연관된 **`kubectl apply`의 동작 방식**을 이해해야 한다.

### 활성 객체 설정(Live Object Configuration)이란?

쿠버네티스에서는 클러스터 안에서 구동 중인 객체에 대한 정보를 담고 있는 일종의 데이터로, 쿠버네티스 클러스터 스토리지(대개의 경우 `etcd`)에 저장되어 있다. 이 내용은 `kubectl get <객체종류> <객체명> -o yaml` 명령으로 확인 가능하다.

만약 YAML 형식의 구성 파일로 만든 객체라면, 이 **"활성 객체 설정(live object configuration)"**에 한 가지 내용이 더 추가된다. 앞서 쓰인 YAML 파일의 내용이 JSON 포맷으로 변환되어 어노테이션(`metadata.annotation`) 안에 `kubectl.kubernetes.io/last-applied-configuration` 항목으로 함께 삽입되는 것이다. 여기에는 `kubectl apply`가 실행된 가장 최근의 시점을 기준으로 **원본 객체 구성 파일(Object Configuration File)**에 있던 내용이 그대로 반영되어 있다. 이것을 **최신 적용 설정(`last-applied-configuration`)**이라 부른다.

즉, 쿠버네티스의 선언형 관리 환경에서는 `kubectl apply` 명령으로 현재 활성 상태인 요소에 변화를 줄 때 다음의 3가지 항목이 함께 활용된다.

1.  YAML 포맷의 **원본 객체 구성 파일(Object Configuration File)**
2.  1번의 내용이 JSON 포맷으로 변환된 **최신 적용 설정(`last-applied-configuration`)**
3.  2번의 내용을 어노테이션으로 포함하고 있는 **활성 객체 설정(Live Object Configuration)**

### `kubectl apply`의 동작 방식

`kubectl apply`는 **원본 객체 구성 파일(1번)**의 내용을 **최신 적용 설정(2번)**으로 옮겨 업데이트 시키는 명령이다. 이때 **활성 객체 설정(3번)**이 업데이트 되는 과정은 경우에 따라 약간의 차이가 있다.

#### 경우 1. 항목(필드)이 추가되거나 수정될 경우

1.  쿠버네티스는 **활성 객체 설정(3번)**을 **원본 객체 구성 파일(1번)**과 대조시킨다.
2.  만약 서로 일치하지 않는 항목이 있다면 해당 항목이 새로 추가되거나 수정된 것으로 간주하고, 이를 **원본 객체 구성 파일(1번)** 기준으로 업데이트 시킨다.
3.  **최신 적용 설정(2번)**은 **원본 객체 구성 파일(1번)** 내용을 따라 업데이트 된다.

#### 경우 2. 항목(필드)를 삭제할 경우

1.  쿠버네티스는 **최신 적용 설정(2번)**에는 있지만 **원본 객체 구성 파일(1번)**에는 없는 항목을 탐색한다.
2.  이렇게 발견된 항목은 삭제 대상으로 간주하고, 해당 항목을 **활성 객체 설정(3번)**에서 제거시킨다.
3.  **최신 적용 설정(2번)**은 **원본 객체 구성 파일(1번)** 내용을 따라 업데이트 된다.

그렇다면 왜 **최신 적용 설정(2번)**과 **활성 객체 설정(3번)**을 굳이 별개로 구분하여 생각해야 하는 걸까? 만약 객체를 수정할 때 `kubectl apply` 대신 '명령형 접근법(`create`, `edit`, `scale` 등)'을 이용할 경우, **최신 적용 설정(2번)**은 업데이트 되지 않고 **활성 객체 설정(3번)** 부분만 바뀌게 된다. 선언형 관리 환경에서 명령형 커맨드를 잘못 혼용할 경우 **원본 객체 구성 파일(1번)과 최신 적용 설정(2번)엔 누락되어 있는 내용이 활성 객체 설정(3번)에는 버젓이 포함**된 채로 돌아갈 수도 있는 것이다.

### 예시로 살펴보는 `kubectl apply`의 동작 방식

위의 내용이 실제 환경에서 어떻게 적용되는지 [쿠버네티스 공식 문서의 예시](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/#how-to-create-objects)를 통해 살펴보자. 아래는 `nginx-deployment` 디플로이먼트의 **원본 구성 파일(1번)**이다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  minReadySeconds: 5
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
```

위의 디플로이먼트가 배포되었을 때 쿠버네티스 시스템 안에 생성되는 **활성 객체 설정(3번)**은 아래와 같다. `metadata.annotations` 아래에 **최신 적용 설정(2번)**이 JSON 포맷으로 함께 삽입되어 있다.

```yaml
apiVersion: v1
kind: Deployment
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"Deployment",
      "metadata":{"annotations":{},"name":"nginx-deployment","namespace":"default"},
      "spec":{"minReadySeconds":5,"selector":{"matchLabels":{"app":nginx}},"template":{"metadata":{"labels":{"app":"nginx"}},
      "spec":{"containers":[{"image":"nginx:1.14.2","name":"nginx",
      "ports":[{"containerPort":80}]}]}}}}
    ...
spec:
  minReadySeconds: 5
  selector:
    matchLabels:
      ...
      app: nginx
  template:
    metadata:
      ...
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx:1.14.2
        ...
        name: nginx
        ports:
        - containerPort: 80
        ...
...
```

여기서 아래와 같은 작업을 수행한다고 가정해보자.

1.  `kubectl scale deployment/nginx-deployment --replicas=2` 명령으로 레플리카 설정을 직접 추가한다.
2.  **원본 구성 파일(1번)**에 다음의 수정 사항을 반영하여 `kubectl apply`를 실행한다.  
    1\. `spec.containers`에 포함된 `image` 버전을 `nginx:1.20.2`로 변경2. `spec.minReadySeconds` 항목을 삭제3. 1번에서 적용한 `replicas` 항목은 파일에 추가하지 않음

두 가지 변경 사항을 모두 적용한 뒤 쿠버네티스 메모리 상에 적용된 **활성 객체 설정(3번)**의 내용은 다음과 같다.

```yaml
apiVersion: v1
kind: Deployment
metadata:
  annotations:
    # 2-1, 2-2 항목이 아래의 JSON 내용에도 반영되었음을 알 수 있다.
    # 반면 kubectl scale로 추가시킨 replicas 설정은 누락되어 있다.
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"Deployment",
      "metadata":{"annotations":{},"name":"nginx-deployment","namespace":"default"},
      "spec":{"selector":{"matchLabels":{"app":nginx}},"template":{"metadata":{"labels":{"app":"nginx"}},
      "spec":{"containers":[{"image":"nginx:1.20.2","name":"nginx",
      "ports":[{"containerPort":80}]}]}}}}
    ...
spec:
  replicas: 2     # kubectl scale로 추가된 부분(1)
  # minReadySeconds 항목 삭제됨(2-2)
  selector:
    matchLabels:
      ...
      app: nginx
  template:
    metadata:
      ...
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx:1.20.2     # nginx 이미지 버전 변경(2-1)
        ...
        name: nginx
        ports:
        - containerPort: 80
        ...
...
```

-   **원본 구성 파일(1번)**에서 변경된 `nginx:1.20.2` 부분과 `minReadySeconds` 항목은 **활성 객체 설정(3번)**과 `last-applied-configuration`에 모두 올바르게 적용되었다.
-   그러나 `kubectl scale`로 추가된 레플리카 설정 항목은 **활성 객체 설정(3번)**의 `spec` 내부에만 명시될 뿐 `last-applied-configuration`에는 반영되지 않았다. **원본 구성 파일(1번)**에는 기록된 적 없는 수정사항이기 때문이다. 이 경우, 관리자는 원본 YAML에 존재하지 않은 채로 활성 상태의 객체에 적용되어 있는 항목을 직접 찾아서 YAML 파일에 다시 반영시켜야 하는 번거로움을 감수해야 할 것이다.
-   `kubectl edit`로 수정된 내용 역시 마찬가지의 난점을 가진다. 만약 YAML 파일로 생성한 요소를 이 방식으로 수정할 경우, 그 내용은 해당 요소가 동작하고 있는 쿠버네티스 시스템 메모리에만 반영될 뿐 기존의 YAML 파일에는 반영되지 않는다. 이는 추후 배포용 파일을 이용한 해당 요소의 버전 관리에 문제를 일으킬 수 있다.

## 맺음말

쿠버네티스의 선언형 관리 환경에서는 아래와 같은 유의점을 꼭 상기하자.

1.  `kubectl`에서 YAML 파일로 객체를 관리할 때에는 `create`나 `replace` 대신 `apply`를 사용한다.
2.  `kubectl`에서 `create`, `edit` 또는 `scale` 같은 명령을 `apply`와 절대 혼용하지 않는다.

쿠버네티스는 **"원하는 상태를 선언한다"**는 선언적 구성을 설계 사상으로 가지고 있다. 클러스터와 하부 요소들의 세밀한 관리를 위해서는 **선언형 접근법**에 보다 익숙해져야 할 필요가 있으며, 이러한 환경에서 자칫 클러스터 구성 요소들의 변경 이력 추적 등에 문제의 소지를 만드는 일이 없도록 유의점을 반드시 숙지해야 할 것이다.

## 참고자료

-   [쿠버네티스 공식 문서: Declarative Management of Kubernetes Objects Using Configuration Files](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/)
-   [Imperative vs. Declarative Kubernetes Management: A DigitalOcean Comic](https://www.digitalocean.com/community/tutorials/imperative-vs-declarative-kubernetes-management-a-digitalocean-comic)
-   [Declarative vs. Imperative in IaC | Linode](https://www.linode.com/blog/devops/declarative-vs-imperative-in-iac/)
-   [Mumshad Mannambeth의 Certified Kubernetes Administrator(CKA) 자격증 대비 과정](https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/) (섹션 2: Core Concepts 중 일부)
