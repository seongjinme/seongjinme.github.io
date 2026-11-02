---
title: "쿠버네티스의 워크로드 리소스 살펴보기"
description: "레플리카셋(ReplicaSet), 디플로이먼트(Deployment), 스테이트풀셋(StatefulSet), 데몬셋(DaemonSet)을 살펴본다.  들의 실행 구역을 논리적으로 분할하는 네임스페이스(Namespace)의 역할도 함께 들여다 본다."
pubDate: "2022-02-16T08:38:00.000Z"
tags: ["kubernetes"]
---

## 레플리카셋(ReplicaSet)

상용 환경에서 애플리케이션을 오직 하나의 파드로만 운영하는 경우는 거의 없다. 다운 타임 없는 안정적인 서비스를 위해서, 대부분의 경우는 여러 개의 파드를 동시 운영하게 된다. 이때 같은 애플리케이션을 위해 동시 구동되는 파드들의 집합을 **레플리카(Replica)**라고 한다.

**레플리카셋(ReplicaSet)**은 레플리카 구성을 갖춘 파드들의 배포 규격을 정의하고 이를 관리하면서, **규격에 정의된 수 만큼의 파드가 언제나 정상 구동될 수 있도록 보장하는 역할**을 한다. 만약 어떤 파드가 오류로 인해 정지되면, 동일한 스펙의 새 파드를 즉시 다시 배포시킨다.

쿠버네티스에서 사용되는 중요한 개념 중 하나가 바로 **선언적 구성**이다. **특정한 동작을 지시하는 것(_파드를 3개 만들어라_)이 아니라, 특정한 상태의 유지를 선언(_3개의 파드를 유지시켜라_)하는 것으로 시스템을 구성하는 개념이다.** 이 개념의 대표적인 구현체 중 하나가 레플리카셋이다. 파드를 3개 갖고 싶다고 선언했는데 원치 않는 상황으로 인해 파드가 삭제되거나 노드가 고장났다면, 해당 파드를 복제하여 가용한 워커 노드에 다시 채워넣는 방식으로 처음에 선언했던 상태를 계속 유지시킨다.

과거에는 레플리케이션 컨트롤러(Replication Controller)가 이를 담당했으나, 쿠버네티스 `1.2` 기준으로는 레플리카셋으로 이 역할이 대체되었다.

### 레플리카셋 생성하기

레플리카셋은 YAML 파일을 통해 생성 가능하다. 쿠버네티스 공식 메뉴얼에 게재된 예시를 살펴보자.

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: frontend
  labels:
    app: guestbook
    tier: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      tier: frontend
  template:
    metadata:
      labels:
        tier: frontend
    spec:
      containers:
      - name: php-redis
        image: gcr.io/google_samples/gb-frontend:v3
```

여기서 주의해야 할 점이 몇 가지 있다. 아래 사항들이 지켜지지 않으면 배포시 에러가 발생한다.

-   `apiVersion`이 `apps/v1`인 점에 주의할 것. 파드, 서비스와 달리 복수의 객체를 다루는 레플리카셋, 디플로이먼트 등에서는 `apps/v1`을 명시해야 한다.
-   `spec.selector.matchLabels`, `spec.template.metadata.labels`의 키-값 쌍은 반드시 동일해야 한다.

### 레플리카셋 관련 주요 명령어

대부분의 다른 쿠버네티스 객체들과 마찬가지로, `get` `describe` `delete` 등의 기본 커맨드를 활용 가능하다.

```bash
kubectl get rs
kubectl get replicaset

kubectl describe rs/frontend
kubectl edit rs/frontend

# 레플리카셋 신규 배포
kubectl create -f replicaset.yaml

# 레플리카셋 신규/수정 배포
kubectl apply -f replicaset.yaml

# 레플리카셋 명세가 포함된 yaml 파일을 새로 적용
kubectl replace -f replicaset.yaml

# yaml 파일 바탕으로 배포된 레플리카셋의 레플리카 수를 6으로 조정
kubectl scale --replicas=6 -f replicaset.yaml

# myapp 이름의 레플리카셋이 가진 레플리카 수를 6으로 조정
kubectl scale --replicas=6 replicaset myapp
```

## 디플로이먼트(Deployment)

**파드와 레플리카셋에 대한 선언적인 업데이트를 제공**하는 리소스다. 롤링 업데이트(Rolling Update)를 비롯하여 애플리케이션 버전 및 배포 관리에 주로 쓰인다. 레플리카셋이 파드들의 상태 체크와 개수 유지를 담당한다면, 디플로이먼트는 **레플리카셋을 포함하는 상위 객체**로서 애플리케이션 또는 서비스 단위의 관리를 위해 쓰인다고 보면 된다.

디플로이먼트 리소스로 배포된 파드들은 모두 `<디플로이먼트명>-<레플리카셋 고유번호>-<랜덤해시값>` 형태의 식별자를 가진다. 만약 레플리카 설정이 변경되거나, 파드가 삭제 후 재배포된 상황이라면 식별자도 함께 달라진다. 즉, 디플로이먼트에서 파드들의 식별자는 모두 상황에 따라 유동적으로 변화한다.

### 디플로이먼트 배포하기

#### CLI 커맨드로 생성하기

```bash
kubectl create deployment nginx --image=nginx:1.14.2 --replicas=3
```

-   위 명령은 `kubectl create deployment <디플로이먼트명> --image=<이미지명> --replicas=<레플리카수>` 형태로 구성된다.
-   `--image`로 지정된 이미지의 파드를 `--replicas`에 지정된 숫자 만큼 생성하고 유지하는 `[디플로이먼트명]`의 디플로이먼트를 생성한다.
-   `--image` 플래그는 필수 항목이다. `--replicas`는 지정하지 않을 경우 기본값인 `1`로 취급된다.

#### YAML 파일로 생성하기

마스터 노드에 접속하여 아래 YAML 파일을 작성, 저장한 뒤 터미널 화면에서 `kubectl apply -f <파일명.yaml>`을 실행한다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
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

-   `kind`의 값은 반드시 `Deployment`여야 한다. (대소문자 구분 필수)
-   레플리카의 수는 `spec.replicas`에 입력한다.
-   배포할 파드에 대한 정보는 `spec.template` 아래에 위치하게 된다. 파드에 들어갈 컨테이너 이미지 정보는 `spec.template.spec.containers` 아래에 입력한다.
-   이렇게 배포된 파드들을 일괄 관리하기 위해 `spec.selector.matchLabels` 항목을 통해 키-값 쌍을 부여한다.
-   `spec.selector.matchLabels`, `spec.template.metadata.labels`에 명시된 키-값 쌍은 반드시 동일해야 한다.

### 배포된 디플로이먼트의 설정 바꾸기

디플로이먼트로 배포되어 이미 구동 중인 파드의 이미지를 업데이트하거나, 레플리카의 수를 조정해야 할 때가 있다. 이런 경우엔 아래와 같이 조정해주자. 디플로이먼트에 대한 업데이트 및 롤백에 대한 자세한 내용은 별도의 포스팅으로 다시 소개할 예정이다.

#### 이미지 업데이트

우선 CLI 환경에서는 `kubectl set` 명령을 이용할 수 있다. 아래 명령은 위에서 배포한 `nginx-deployment`의 `nginx` 앱에 대해 컨테이너 이미지를 `nginx:1.14.2`에서 `nginx:1.16.1`로 업데이트하는 내용이다.

```bash
kubectl set image deployment/nginx-deployment nginx=nginx:1.16.1
```

다음으로는, `kubectl edit` 명령으로 배포된 디플로이먼트의 YAML 정보를 불러와 컨테이너 이미지 항목을 수정하는 방법이 있다. 이때 수정해야 할 항목은 `.spec.template.spec.containers[0].image`에 위치해 있다.

```bash
kubectl edit deployment/nginx-deployment
```

만약 YAML 파일로 직접 생성한 경우라면, 해당 YAML 파일을 열어 `spec.template.spec.containers`에 `image` 항목을 `nginx:1.16.1`로 변경한 뒤 `kubectl apply` 명령을 사용해도 된다.

#### 스케일링

CLI 환경에서 간단히 레플리카 수를 조정하고 싶다면 `kubectl scale` 명령을 이용할 수 있다. 아래 명령을 실행하면 `nginx-deployment`의 레플리카 수가 5개로 즉시 늘어난다.

```bash
kubectl scale deployment/nginx-deployment --replicas=5
```

단, 위의 명령은 실제 배포에 쓰인 YAML 파일 내용과 무관하게 명시적으로만 적용되는 변화다. `kubectl edit`이나 기존 배포에 쓰인 YAML 파일을 직접 수정 후 적용하는 방법도 있으므로 용도에 따라 방법을 선택하면 좋다.

## 스테이트풀셋(StatefulSet)

스테이트풀셋은 **애플리케이션의 상태를 저장하고 관리**하는데 사용되는 리소스다. 파드 구성과 유지, 스케일링 측면에서 디플로이먼트와 거의 동일한 특성을 가진다. 다른 점이 있다면, 스테이트풀셋은 디플로이먼트와 달리 **각 파드의 순서와 고유성을 보장**하며 **각각에 영구 스토리지(볼륨)를 할당**한다는 것이다.

### 디플로이먼트와의 차이점

1.  모든 파드가 각각 고유하며 영구적인 식별자를 갖는다.
2.  모든 파드는 삭제 후 재생성시 해당 식별자를 그대로 유지한다.
3.  모든 파드의 식별자 끝에는 번호가 붙는다. 이 번호는 레플리카의 수(N)를 기준으로 0에서 N-1까지 존재한다.
4.  모든 파드의 생성과 스케일링, 업데이트, 그리고 삭제는 위에서 부여된 번호에 따라 순서대로 이루어진다. 생성, 스케일링, 업데이트 등은 순차적으로, 삭제는 역순으로 진행된다.
5.  각각의 파드에는 각각의 영구적인 스토리지(볼륨)가 할당된다. 파드가 삭제되어도 볼륨은 남으며, 그 자리에 새로 생성된 파드는 해당 볼륨을 다시 이어 받는다.

### 어던 경우에 스테이트풀셋이 필요할까?

쿠버네티스에서 돌아가는 마이크로서비스 중 상당수는 **스테이트리스(Stateless)**의 특징을 갖는다. Nginx 같은 웹서버를 생각해보자. 요청이 들어오면 응답을 보내는 방식으로 정해진 역할을 수행한다. 어느 파드나 역할이 동일하므로 스토리지(볼륨) 역시 하나를 공용으로 쓰면 된다. 만약 어느 파드가 죽었다면, 동일한 파드를 다시 만들어 대체하면 그만이다. 쿠버네티스의 디플로이먼트는 정확히 이 역할을 자동화하는 유형의 객체다.

그러나 PostgreSQL 같은 DB를 클러스터에 구축한다고 가정해보자. 데이터의 안정성과 무결성 유지를 위해서는 보다 특별한 설계가 필요하다. 이를테면 CRUD가 모두 가능한 파드, Read만 수행하는 파드, 그리고 데이터의 무결성 유지 여부를 감시할 파드로 나누는 방안을 생각해 볼 수 있다. 데이터의 안정성 제고 차원에서 스토리지 또한 각각의 파드에 나뉘어 있어야 할 것이며, 이 스토리지는 파드의 상태와 무관하게 언제나 유지되어야 할 것이다.

이처럼 **스테이트풀(Stateful)**의 특징을 갖는 애플리케이션을 운영할 때에는 디플로이먼트가 제공하지 못하는 다른 요소를 갖춘 객체가 필요하다.

-   각각의 파드에 대한 안정적이고 고유한 네트워크 식별자
-   안정적이고 지속적인 스토리지
-   파드와 스토리지의 질서 정연한 배치, 그리고 확장성

이러한 필요를 해소시켜주는 워크로드 리소스가 바로 **스테이트풀셋(StatefulSet)**이다.

### 스테이트풀셋을 쓸 때 주의점

위에서 열거된 특성상 다음과 같은 이슈를 감안해야 한다.

1.  스테이트풀셋을 만들면 각 파드마다 **퍼시스턴트 볼륨(PV; Persistent Volume)**도 함께 만들어진다. 그러나 스테이트풀셋이 삭제될 때 이 볼륨은 삭제되지 않고 남는다.
2.  스테이트풀셋의 파드에 사용할 스토리지는 오직 **PVC(Persistent Volume Claim)**를 통해서만 가능하다. 만약 파드가 늘어나면 그때마다 볼륨이 동적으로 붙어줘야 하기 때문이다. 이를 위해 클러스터에 미리 [**PV(Persistent Volume)**](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)을 만들어 놓거나, [**StorageClass**](https://kubernetes.io/docs/concepts/storage/storage-classes/)를 이용해 동적으로 프로비저닝을 해줘야 한다.
3.  스테이트풀셋의 특정 파드에 요청(Request)을 전달하기 위한 매개체로 **헤드리스 서비스(Headless Service)**가 필요하다. 이 서비스는 오직 해당 파드의 고유한 네트워크 위치를 파악하기 위해서만 쓰이므로 별도의 IP가 부여되지 않으며, 그렇기 때문에 헤드리스(Headless)라 불린다.
4.  스테이트풀셋은 일반적으로 노드에 장애가 발생하더라도 파드를 다른 노드로 옮기지 않는다. 볼륨에 탑재된 데이터의 보호를 우선시하기 때문이다.

### 스테이트풀셋 배포하기

주로 YAML 파일 형식으로 배포하며, 기본 문법은 디플로이먼트와 거의 동일하다. 다만 `spec.serviceName`과 `spec.volumeClaimTemplates` 항목이 추가된 점에 유의하자.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nginx-statefulset
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  serviceName: "nginx"
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
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "my-storage-class"
      resources:
        requests:
          storage: 1Gi
```

-   `kind`의 값은 반드시 `StatefulSet`이어야 한다. (대소문자 구분 필수)
-   레플리카의 수는 `spec.replicas`에 입력한다.
-   `spec.serviceName`에는 앞서 언급된 헤드리스 서비스(Headless Service)의 이름이 들어간다. 스테이트풀셋 배포시 반드시 필요한 정보다.
-   배포할 파드에 대한 정보는 `spec.template` 아래에 위치하게 된다. 파드에 들어갈 컨테이너 이미지 정보는 `spec.template.spec.containers` 아래에 입력한다. 스테이트풀셋 특성상 볼륨 정보를 `volumeMounts` 항목에 반드시 적어줘야 한다.
-   `spec.volumeClaimTemplates`에는 각 파드마다 부여될 볼륨에 대한 정보가 삽입된다. 클러스터 관리자가 클러스터에 PV(Persistent Volume)를 미리 만들어 놓은 상태여야 한다. 자세한 내용은 [이 문서](https://kubernetes.io/docs/concepts/storage/storage-classes/)를 참고하자.
-   `spec.selector.matchLabels`, `spec.template.metadata.labels`에 명시된 키-값 쌍은 모두 동일해야 한다.

아울러 위의 스테이트풀셋에 필요한 **헤드리스 서비스(Headless Service)**를 함께 만들어줘야 한다.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None
  selector:
    app: nginx
```

-   스테이트풀셋 YAML에서 선언된 `spec.serviceName`과 동일한 이름을 `metadata.name`에 부여해준다.
-   자체적으로 IP를 갖지 않는 서비스이므로, `spec.clusterIP`의 값을 `None`으로 한다.
-   쿠버네티스의 '서비스'에 대한 상세한 개념은 다음 글에서 다룰 것이다.

## 데몬셋(DaemonSet)

데몬셋은 **모든 노드, 또는 특정 레이블을 가진 노드에 하나씩의 동일한 파드를 구동**하게 해주는 리소스다.

해당되는 노드에 오직 하나씩만 배치한다는 점에서 디플로이먼트 또는 스테이트풀셋과 다르며, 따라서 별도의 레플리카 설정을 하지 않는다. 데몬셋이 구동 중인 클러스터에서 노드가 추가되면 해당 노드에도 데몬셋의 파드가 배치되지만, 삭제된 노드에 있던 데몬셋 파드가 다른 노드로 옮겨지지는 않는다.

데몬셋은 주로 워커 노드에 리소스 모니터링용 애플리케이션, 또는 로그 수집기를 배포할 때 쓰인다.

### 데몬셋 배포하기

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-elasticsearch
  namespace: kube-system
  labels:
    k8s-app: fluentd-logging
spec:
  selector:
    matchLabels:
      name: fluentd-elasticsearch
  template:
    metadata:
      labels:
        name: fluentd-elasticsearch
    spec:
      containers:
      - name: fluentd-elasticsearch
        image: quay.io/fluentd_elasticsearch/fluentd:v2.5.2
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      terminationGracePeriodSeconds: 30
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

-   `kind`의 값은 반드시 `DaemonSet`이어야 한다. (대소문자 구분 필수)
-   배포할 파드에 대한 정보는 `spec.template` 아래에 위치한다.
-   `spec.selector.matchLabels`, `spec.template.metadata.labels`에 명시된 키-값 쌍은 모두 동일해야 한다.
-   만약 특정 조건을 가진 노드에 데몬셋 파드를 배치하고 싶다면 `spec.template.spec.tolerations` 항목을 이용한다. 이에 대한 자세한 정보는 [이 문서](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)를 참고하자.
-   만약 특정 레이블값을 가진 노드에만 데몬셋 파드를 배치하고 싶다면 `spec.template.spec.nodeSelector` 항목을 이용한다. 이에 대해서는 [이 문서](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/#running-pods-on-select-nodes)를 참고하자.

## 네임스페이스(Namespace)

쿠버네티스는 **하나의 동일한 물리 클러스터를 공유하는 가상 클러스터**를 지원하는데, 이것을 **네임스페이스(Namespace)**라고 한다. 클러스터의 자원을 여러 사용자나 용도에 따라 나누는 기능이 필요할 때 쓴다. 네임스페이스는 워크로드 리소스는 아니지만, 하나의 클러스터 안에서 다양한 워크로드 리소스들을 필요에 따라 격리하는 데에 쓰인다.

### 왜 필요한가?

실제 프로젝트에서는 개발 단계에 따라 여러 환경(Dev, Staging, Production, etc...)을 동시 운영하게 될 수 있다. 네임스페이스는 별도로 물리적인 호스트 환경의 격리 없이, 이처럼 상호 다른 환경의 특성에 맞게 정책과 리소스량을 정하여 격리된 환경을 만들 수 있는 것이다.

예를 들어, 같은 네임스페이스 안에서 리소스의 명칭은 반드시 고유해야 하지만, 다른 네임스페이스들을 함께 통틀어서 고유할 필요는 없다. 정책(Policy), 리소스 호출 등도 네임스페이스 범위를 기준으로 적용된다.

`kubectl get` 명령어로 특정 유형의 리소스 목록을 조회할 때, 이 명령은 현재 유효한 네임스페이스의 범위 안에서만 적용된다. 별도로 특정 네임스페이스를 현재 작업 환경으로 지정한 상태가 아니라면, 기본값인 `default` 네임스페이스에 속한 리소스만 조회된다.

### 기본으로 주어지는 초기 네임스페이스

-   `default` : 다른 네임스페이스가 없는 오브젝트를 위한 기본 네임스페이스
-   `kube-system` : 쿠버네티스 시스템에서 생성한 오브젝트를 위한 네임스페이스
-   `kube-public` : 모든 사용자(인증되지 않은 사용자 포함)가 읽기 권한으로 접근할 수 있는 네임스페이스다. 주로 전체 클러스터 중에 공개적으로 드러나서 읽을 수 있는 리소스를 위해 예약되어 있다. 다만 이 특성은 단지 관례로서 적용되어 있을 뿐, 필수적인 사항은 아니다.
-   `kube-node-lease` : 클러스터가 스케일링될 때 노드 하트비트의 성능을 향상시키는 각 노드와 관련된 리스(lease) 오브젝트에 대한 네임스페이스

### 네임스페이스 관리하기

```bash
# 네임스페이스 목록 조회하기
kubectl get namespace -A

# 현재 네임스페이스 확인하기
kubectl config view | grep namespace

# 네임스페이스 "test" 추가하기
kubectl create namespace test

# 현재 활성상태인 네임스페이스의 이름 변경하기
kubectl config set-context --current --namespace=<새로-바꿀-이름>

# 네임스페이스 "test" 삭제하기
kubectl delete namespace test
```

-   주의할 점이 있다. 네임스페이스를 삭제할 경우, **해당 네임스페이스에 속한 모든 객체, 리소스가 함께 삭제**된다. 만약 `kube-system` 네임스페이스를 삭제한다면 클러스터가 동작하지 않게 된다.

### 객체 배포 조회시 네임스페이스 설정하기

`--namespace` 또는 `-n` 플래그를 사용한다. 예시는 다음과 같다.

```bash
# "test" 네임스페이스에 nginx 파드 배포하기
kubectl run nginx --image=nginx --namespace=test

# "test" 네임스페이스에 속한 파드 목록 조회하기
kubectl get pods -n test
```

### CLI 환경에서 사용할 네임스페이스 설정하기

`kubectl config set-context` 명령을 통해 이후 CLI 환경에서 사용하는 네임스페이스를 영구 지정할 수 있다. 기본적으로는 `default`로 설정되어 있다.

```bash
# 현재 CLI 환경에서 사용할 네임스페이스 설정하기
kubectl config set-context --current --namespace=test

# 현재 기본값으로 설정된 네임스페이스 확인하기
kubectl config view --minify | grep namespace:
```

### 서로 다른 네임스페이스 간의 네트워크 통신

같은 네임스페이스 안의 파드들은 이름(service name)을 기준으로 서로를 인식할 수 있다. 만약 다른 네임스페이스의 파드와 연결하고자 한다면, `<service-name>.<namespace>.svc.cluster.local`의 형식으로 원하는 대상을 찾아 식별할 수 있게 되어있다.

예를 들어 `dev` 네임스페이스에 속한 `db-service`란 이름의 파드를 호출하려면, `db-service.dev.svc.cluster.local` 형식으로 호출하면 된다.

## 맺음말

이상으로 쿠버네티스의 대표적인 워크로드 리소스인 레플리카셋(ReplicaSet), 디플로이먼트(Deployment), 스테이트풀셋(StatefulSet), 데몬셋(DaemonSet), 그리고 이들의 실행 구역을 논리적으로 분할하는 네임스페이스(Namespace)를 알아보았다.

다음 글에서는 쿠버네티스의 **서비스(Service)** 개념을 알아보고, 반드시 숙지해야 할 유형들을 살펴보기로 한다.

## 참고자료

-   [쿠버네티스 공식 문서: Workloads](https://kubernetes.io/docs/concepts/workloads/)
-   [쿠버네티스 공식 문서: Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
-   [Red Hat 토픽: 스테이트풀과 스테이트리스 비교](https://www.redhat.com/ko/topics/cloud-native-apps/stateful-vs-stateless)
-   [도커/쿠버네티스 온라인 부트캠프 with 카카오엔터프라이즈](https://classlion.net/class/detail/21) (11-14주차 강의 중 일부)
