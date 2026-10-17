---
title: "쿠버네티스의 클러스터 개념과 구성 컴포넌트 알아보기"
description: "이번 글에서는 쿠버네티스의 핵심 제어 단위인 클러스터(Cluster)와 구성 컴포넌트를 알아본다. 클러스터의 개념과 내부 구조를 먼저 살펴보고, 컨트롤 플레인(Control Plane)과 노드(Node)를 구성하는 주요 요소들을 자세히 들여다 보자."
pubDate: "2022-02-02T07:05:00.000Z"
updatedDate: "2022-02-10T08:10:52.000Z"
tags: ["kubernetes"]
featureImage: "/content/images/2022/02/cover-6.png"
---

## 쿠버네티스 클러스터란?

쿠버네티스 아키텍처에서 **클러스터(Cluster)**란 **컨테이너 형태의 애플리케이션을 호스팅하는 물리/가상 환경의 노드들로 이루어진 집합**을 의미한다.

[지난 글에서 소개한 바와 같이](/kubernetes-core-concepts/), 쿠버네티스에서는 호스트 환경에 구성된 자원들을 클러스터 단위로 추상화해서 관리한다. 하나의 클러스터 안에는 클러스터 내부 요소들을 제어하는 컨트롤 플레인(Control Plane) 역할을 수행할 마스터 노드(Master Node)를 두고, 관리자는 이 마스터 노드를 통해 클러스터 전체를 제어하는 구성을 따른다.

쿠버네티스에 대해 가장 널리 알려진 온라인 강의 중 하나인 [Mumshad Mannambeth의 Certified Kubernetes Administrator(CKA) 자격증 대비 과정](https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/)에서는 쿠버네티스 클러스터 구성을 선단의 개념에 비유한다. 온라인 인프라 영역에서의 컨테이너가 화물선에 선적되는 실물 컨테이너 개념에 비유된다면, **쿠버네티스 클러스터는 컨테이너들을 실은 컨테이너선과 이를 관리하는 통제함으로 이루어진 선단의 개념에 비유할 수 있는 것이다.**

![쿠버네티스 클러스터는 컨테이너선과 통제함으로 이루어진 선단의 개념에 비유할 수 있다.](/content/images/2022/02/container-ships.jpg)

*쿠버네티스 클러스터는 컨테이너선과 통제함으로 이루어진 선단의 개념에 비유할 수 있다.*

쿠버네티스 클러스터는 용도에 따라 크게 **워커 노드(Worker Node)**와 **마스터 노드(Master Node)**로 구분된다. 이를 위의 선단 개념에 비유하여 풀이하면 다음과 같다.

-   **워커 노드(Worker Node)** : 각기 다른 컨테이너들이 선적된 컨테이너선의 역할이다. 각기 다른 목적과 기능으로 세분화된 컨테이너들이 실제 배치되는 노드를 의미한다.
-   **마스터 노드(Master Node)** : 컨테이너 선단을 지휘하는 통제함의 역할이다. 대규모의 컨테이너를 운영하려면 각 워커 노드들의 가용 리소스 현황을 고려하여 최적의 컨테이너 배치와 모니터링, 그리고 각 컨테이너에 대한 효율적인 추적 관리가 필요해진다. 쿠버네티스 클러스터에서 이 역할을 수행하는 노드를 마스터 노드라 칭한다.

## 쿠버네티스 클러스터의 내부 구조

[지난 글에서 소개한 것과 같이](/kubernetes-core-concepts/#5-api-%EA%B8%B0%EB%B0%98-%EC%83%81%ED%98%B8%EC%9E%91%EC%9A%A9), 쿠버네티스에서 클러스터의 모든 구성 요소들은 오직 API 서버를 통해서만 상호 접근이 가능하도록 설계되어 있다. 이 점을 유념하여 쿠버네티스 클러스터의 내부 구조를 좀 더 상세하게 살펴보자.

![쿠버네티스 클러스터 구성도 (이미지 출처: Sysdig https://sysdig.com/blog/monitor-kubernetes-api-server/)](/content/images/2022/02/k8s-cluster.png)

*쿠버네티스 클러스터 구성도 (이미지 출처: [Sysdig](https://sysdig.com/blog/monitor-kubernetes-api-server/))*

위의 구성도에서 **"Kubernetes Master"**는 **마스터 노드(Master Node)**에 포함된 **컨트롤 플레인(Control Plane)**에 해당한다. **컨트롤 플레인**은 클러스터 전체의 워크로드 리소스 등 주요 구성 요소들을 배포하고 제어하는 역할을 한다. 여기에 포함된 것들을 간단히 소개하면 다음과 같다.

-   **etcd** : 클러스터 안의 각 구성요소들에 대한 정보가 키-값 형태로 저장된 데이터베이스
-   **스케줄러(kube-scheduler)** : 애플리케이션 구동에 필요한 각 컨테이너에 대해 클러스터 내 최적의 배포를 수행하는 스케줄러
-   **컨트롤러 매니저(kube-controller-manager)** : 노드(Node), 디플로이먼트(Deployment), 서비스 어카운트(Service Account) 등 클러스터에서 구동되는 리소스들을 유지 관리하는 프로세스들의 집합
-   **DNS 서버** : 클러스터 안에서 특정 도메인을 찾을 때 사용되는 네임 서버 (구성도에는 `kube-dns`라 되어 있으나, 쿠버네티스 `1.12` 버전부터는 `CoreDNS`로 대체됨)
-   **API 서버(kube-apiserver)** : 클러스터 구성 요소들의 상호 통신에 필요한 쿠버네티스 API를 관리하는 컴포넌트

다음으로 구성도 우측 상단에 위치한 **"Node"** 영역은 노드 안의 **파드(Pod)**들을 구동시키기 위한 구성 요소들에 해당하며, 이들은 **워커 노드(Worker Node)**와 **마스터 노드(Master Node)** 모두 공통적으로 갖고 있다. 해당 구성 요소는 다음과 같다.

-   **kubelet** : 클러스터의 각 노드에서 API 서버를 통해 들어오는 신호를 모니터링하고 파드에서 컨테이너가 제 기능대로 정상 동작하도록 관리하는 에이전트
-   **kube-proxy** : 클러스터의 각 노드에서 실행되는 네트워크 프록시 서비스
-   **컨테이너 런타임 엔진(container runtime engine)** : 노드에 배포된 파드(Pod) 내 컨테이너들을 구동시키는 엔진  
    – **파드(Pod)**는 클러스터 안에서 배포되는 가장 작은 단위의 객체로 하나 이상의 컨테이너를 포함하고 있다. 이에 대해서는 다음 글에서 보다 자세히 살펴볼 것이다.

마지막으로 클러스터를 제어하는 데에 쓰이는 커맨드라인 도구를 살펴보자.

-   [**kubectl**](https://kubernetes.io/docs/reference/kubectl/overview/) : 클러스터와 내부 구성 요소들을 CLI 환경에서 직접 제어하는 데에 쓰이는 도구로, 터미널 창에서 `kubectl [command] [TYPE] [NAME] [flags]` 형태로 사용

## 컨트롤 플레인 컴포넌트(Control Plane Components)

클러스터의 마스터 노드가 수행하는 각 컨테이너 및 워커 노드 관리는 [컨트롤 플레인 컴포넌트(Control Plane Components)](https://kubernetes.io/docs/concepts/overview/components/#control-plane-components)를 통해 이루어진다. 이 컴포넌트들은 기본적으로 해당 클러스터의 `kube-system` 네임스페이스 안에 파드 형태로 배포되어 있다.

### etcd

**etcd**는 **클러스터 안의 각 구성요소들에 대한 정보가 키-값 형태로 저장된 데이터베이스**다. 즉, 클러스터의 모든 핵심 데이터가 담겨있는 저장소인 것이다.

쿠버네티스에서는 클러스터에 노드가 몇 개인지, 각각의 파드들이 어떤 컨테이너를 들고 어느 노드에서 어떻게 동작하고 있는지가 모두 **etcd**에 기록된다. `kubectl` 명령을 통해 조회 가능한 모든 정보는 **etcd**를 거쳐 오며, 제어 명령을 통해 클러스터에 변화가 적용되었다면 그 역시 **etcd**에 업데이트 된다.

만약 **etcd**가 유실된다면 클러스터에 속한 모든 구성 요소들을 함께 잃어버리게 된다. 그러므로 쿠버네티스 클러스터를 구축할 때에는 **etcd**의 고가용성을 어떻게 확보할 것인지를 반드시 고민해야 한다. [쿠버네티스 공식 문서에서는 아래의 두 가지 방식을 소개하고 있으며](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/), 공통적으로 최소 3개 이상의 컨트롤 플레인을 갖춘 마스터 노드 구성을 권고하고 있다.

1.  **중첩된(stacked) etcd 토폴로지** : 각 컨트롤 플레인 노드마다 etcd 파드가 함께 스택된 형태의 클러스터로 구성하는 방식이다. 구현이 간단하고 인프라 자원 소모도 상대적으로 적지만, 노드가 죽으면 컨트롤 플레인 인스턴스와 etcd를 함께 잃어버리므로 중복성(redundancy) 이슈가 발생하게 된다. 이를 상쇄하고 고가용성을 유지하려면 가급적 많은 수의 컨트롤 플레인 노드를 동시 운영해야 한다.
2.  **외부(external) etcd 토폴로지** : 각 컨트롤 플레인 노드에 대응되는 etcd 파드를 함께 묶어서 별도의 외부 클러스터로 따로 생성하고 `kube-apiserver`로 이들을 연동하는 방식이다. 1번 방식에 비해 노드 상태에 따른 중복성 이슈의 영향이 덜하지만, 노드 숫자 만큼의 etcd 멤버를 별도 클러스터로 구성해야 하므로 2배의 인프라 자원과 비용을 더 소모하게 된다.

`kubeadm`에서는 1번 방식을 기본값으로 하고 있으며, 실제 상용 환경에서는 1번 방식에 L4 스위치를 결합한 형태를 주로 선호하는 것으로 알려져 있다. `kubeadm`을 통해 설치된 클러스터에서 1번 방식을 따랐을 경우, etcd 또한 `kube-system` 네임스페이스에 속한 `etcd-master` 이름의 파드 형태로 배포된다.

### 스케줄러(kube-scheduler)

**파드를 어느 노드에 배치할지 결정하는 프로세스다.** 결정만 한다는 점에 주의할 것. 실제로 해당 노드에 파드를 _배치_하는 작업은 아래에서 다룰 **kubelet**이 수행한다.

스케줄러가 파드를 할당할 때 노드에 우선순위를 부여하는 단계는 다음과 같다. 물론 여기에 적용되는 기준은 필요에 따라 우회하거나 변경할 수 있다.

1.  파드가 요구하는 컴퓨팅 자원_(CPU, 메모리 등)_ 기준으로 필터링
2.  파드가 배치된 이후 해당 노드에 남게 될 잔여 컴퓨팅 자원의 양을 기준으로 우선순위 책정

스케줄러는 기본적으로 `kube-system` 네임스페이스에 `kube-controller-scheduler-master` 파드로 존재한다. 이 파드의 정의 파일(yaml) 위치는 클러스터 구축 방법에 따라 다르다.

-   `kubeadm`으로 구축했다면 `/etc/kubernetes/manifests/kube-scheduler.yaml` 에 존재한다.
-   그 외의 방법으로 구축했다면 `/etc/systemd/system/kube-scheduler.service` 에 존재한다.

### 컨트롤러 매니저(kube-controller-manager)

**컨트롤러 매니저**는 **클러스터 안에서 구동되는 다양한 리소스들을 모니터링하며 이들이 원활하게 동작하도록 관리하는 프로세스**다.

노드(Node), 레플리카셋(ReplicaSet), 디플로이먼트(Deployment), 스테이트풀셋(StatefulSet), 데몬셋(DaemonSet), 서비스 어카운트(Service Account), 크론잡(Cronjob), 네임스페이스(Namespace) 등 각 구성 요소들을 관리하는 컨트롤러들이 하나로 패키징된 형태를 가지며, 이는 ["기능 단위의 분산"이라는 쿠버네티스의 설계 사상](/kubernetes-core-concepts/#2-%EA%B8%B0%EB%8A%A5-%EB%8B%A8%EC%9C%84%EC%9D%98-%EB%B6%84%EC%82%B0)에 따른 것이다.

컨트롤러 매니저 역시 `kube-system` 네임스페이스에 `kube-controller-manager-master` 파드로 존재한다. 이 파드의 정의 파일(yaml) 위치는 클러스터 구축 방법에 따라 다르다.

-   `kubeadm`으로 구축했다면 `/etc/kubernetes/manifests/kube-controller-manager.yaml` 에 존재한다.
-   그 외의 방법으로 구축했다면 `/etc/systemd/system/kube-controller-manager.service` 에 존재한다.

### API 서버(kube-apiserver)

쿠버네티스는 "모든 통신을 API 중심으로 한다"는 설계 사상을 바탕에 두고 있다. 이에 맞게, 쿠버네티스의 모든 객체들은 원칙적으로 API를 바라보며 API를 통해서만 통신하도록 되어 있다. 이렇게 **클러스터의 각 요소들을 모니터링하며 작업을 수행하도록 해주는 중앙 접근 포인트의 역할**을 하는 것이 **API 서버**다.

API 서버는 Stateless의 특성을 갖는다. 세션을 유지하지 않는 대신 etcd를 이용하여 그때그때 데이터를 체크하고 작업을 처리하는 방식이며 복제를 통해 병렬로 확장이 가능한 특징이 있다. **유저 인증, 요청사항 검증, 데이터 수신, etcd 업데이트, 스케줄링, kubelet 통신 등 다양한 역할을 담당**하며 주요한 기능은 다음과 같다.

1.  **API 관리** : 서버에서 API를 노출하고 관리하는 프로세스 역할을 한다. 일반적으로 쿠버네티스에서는 API 접근용 포트로 `6443`을 오픈한다. 다만 별도로 haproxy라는 오픈소스를 통해 `16443` 포트로 접근시 API 서버로 넘어가도록 하는 방법도 활용된다.
2.  **요청 처리** : 클라이언트의 개별 API 요청을 처리한다. 대부분 HTTP 형태로 이루어지나, 콘텐츠의 경우에는 일부 JSON 기반으로 하기도 한다.
3.  **내부 제어 루프** : API 작동에 필요한 백그라운드 작업도 담당한다. 다만 이 작업은 대부분 컨트롤러 매니저(controller-manager)가 대신 수행하는 편이다.

API 서버 또한 클러스터의 `kube-system` 네임스페이스 안에 파드 형태로 배포된다. 이 파드에 대한 정의 파일 경로는 다음과 같다.

-   `kubeadm`으로 구축했다면 `/etc/kubernetes/manifests/kube-apiserver.yaml` 에 존재한다.
-   그 외의 방법으로 구축했다면 `/etc/systemd/system/kube-apiserver.service.yaml` 에 존재한다.

#### 클러스터에서 API 서버가 동작하는 방식

`kubectl`을 이용해 새로운 파드를 생성한다고 가정해보자. 이 경우 API 서버는 새로운 파드 객체를 만든 뒤 `etcd`에 새 파드 정보를 업데이트한다. 그동안 다른 컴포넌트들은 API 서버를 모니터링하면서 변화된 상황에 맞게 각자의 역할을 수행한다. 이러한 작업의 흐름을 좀 더 자세히 살펴보면 다음과 같다.

1.  API 서버가 먼저 파드 객체를 생성한다.
2.  API 서버는 `etcd`에 새 파드가 생성되었음을 업데이트한다.
3.  스케줄러는 API 서버를 모니터링하여, 새 파드가 생겼음을 인지하고 이를 배포할 노드를 확인한다.
4.  API 서버는 `etcd`에 정보를 업데이트한다.
5.  API 서버가 해당 정보를 적합한 노드의 `kubelet`에 전달한다.
6.  `kubelet`이 해당 노드에 파드를 생성하고, 컨테이너 런타임 엔진에 해당 애플리케이션 이미지를 배포하도록 지시한다.
7.  `kubelet`은 API 서버에 상태를 업데이트시키고, API 서버는 이 상태 데이터를 `etcd`에 저장한다.

쿠버네티스에서 일어나는 많은 작업들이 대체로 이러한 흐름을 따른다. 예를 들어 `kubectl get`을 실행한다면, API 서버가 해당 요청(request)을 인증/확인 후 `etcd`에서 데이터를 검색해 반환하는 식이다. 클러스터 구성 요소들의 동작과 관리에 있어 API 서버의 중요성을 확인할 수 있는 부분이다.

## 노드 컴포넌트(Node Components)

노드 컴포넌트(Node Components)는 각 노드에서 파드와 컨테이너를 구동시키고 관리하기 위해 필요한 요소들을 의미한다. 이들은 **워커 노드(Worker Node)** 뿐만 아니라 **마스터 노드(Master Node)**에도 존재한다. 클러스터 제어에 필요한 [컨트롤 플레인 컴포넌트(Control Plane Components)](https://kubernetes.io/docs/concepts/overview/components/#control-plane-components) 역시 개별 파드로 구동되므로 이들을 관리할 수 있는 도구가 필요하기 때문이다.

### kubelet

**클러스터의 각 노드에서 파드 안 컨테이너들이 정상 구동되도록 조율**하는 에이전트다. 마스터 노드의 스케줄러(scheduler)가 파드를 노드에 할당하면, **kubelet**이 **해당 파드와 컨테이너를 배치**하게 된다. 또한 파드와 컨테이너의 상태를 주기적으로 체크하여 그 결과를 API 서버에 전송하는 역할도 맡는다.

`kubeadm`으로 클러스터를 구축할 경우 **kubelet**이 포함되어 있지 않음에 유의해야 한다. 따라서 `kubeadm`, `kubectl`과 함께 별도 설치를 진행해줘야 하며, 이때 상호 호환성 문제가 일어나지 않도록 셋의 버전을 반드시 일치시켜야 한다. 이에 대한 내용은 아래 링크에서 확인할 수 있다.

-   [kubernetes.io: Installing kubeadm, kubelet and kubectl](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/#installing-kubeadm-kubelet-and-kubectl)

### kube-proxy

**kube-proxy**는 **클러스터의 각 노드에서 구동되는 쿠버네티스 네트워크 프록시**다. 쿠버네티스에서 서비스(Service)라 불리는 객체로 들어온 내/외부 트래픽을 어느 파드로 포워딩할 것인지에 대한 규칙을 생성하고 관리하는 역할을 한다. 이를 위해 `kubeadm`은 모든 노드에 하나씩의 `kube-proxy` pod를 daemonset으로 배포하며, 이 정보는 `kubectl get daemonset -n kube-system` 명령을 통해 확인할 수 있다.

쿠버네티스에서 **파드들은 그 자체로 반영속적(ephemeral)이다.** 필요에 따라 파드들이 각기 다른 노드들에 배치되기도 하며, 때로는 특정 노드가 죽으면서 기존의 파드들이 다른 노드로 옮겨지기도 한다. 이처럼 노드와 파드의 상태는 언제나 유동적이므로 네트워크 상에서 접근 가능한 IP도 항상 바뀌게 된다. 이런 환경에서 파드들 간의 상호 네트워킹을 보장할 수 있는 방법이 바로 **서비스(Service)**를 이용하는 것이다.

쿠버네티스에서 **서비스(Service)**는 **파드들을 통해 실행되고 있는 애플리케이션을 네트워크에 노출(expose)시키는 가상의 컴포넌트**를 의미한다. 서비스는 파드나 컨테이너처럼 구체적인 실체가 없고, 오직 파드들 간의 네트워크 중계만을 수행한다. 노드/파드들의 목록을 관리하며 필요한 쪽으로 트래픽을 전달해주는 프록시 역할의 구현체라고 보면 된다. 이를 위해 서비스 역시 클러스터로부터 내부 IP를 할당 받으며, 파드들 간의 연결을 담당하는 게이트웨이와 같은 역할을 하게 된다. 이러한 역할을 하는 서비스로 파드들이 접근 가능하도록 해주는 프로세스가 **kube-proxy**인 것이다.

**kube-proxy**의 상세 역할은 쿠버네티스 `1.20` 버전을 전후하여 많이 변화되었다. 이전까지는 **kube-proxy**가 직접 user space proxy 역할을 수행했다면, 최근에는 **iptables**를 통해 netfilter를 조작하고 관리하는 역할까지만 담당하고 있다.

#### Case 1: user space proxy 역할 (`1.20` 이전)

특정 클라이언트 프로세스가 `10.3.241.152:80`로의 액세스 요청을 파드의 `veth0`인 `10.0.2.3`으로 보냈다고 가정해보자.

1.  kube-proxy가 `localhost` 인터페이스(예: `10.100.0.2`)에서 service의 요청을 받아내기 위해 `10400` 포트(임의)를 연다.
2.  kube-proxy가 (물리 서버의 커널에 있는) netfilter로 하여금 service IP(`10.3.241.152:80`)로 들어오는 패킷을 kube-proxy 자신에게 라우팅 되도록 설정을 한다.
3.  kube-proxy로 들어온 요청을 실제 server pod의 `<IP:Port>`(예: `10.0.2.2:8080`)로 요청을 전달한다.

위와 같은 경우라면, 클러스터의 모든 파드들이 서비스의 IP를 요청하면서 매번 kube-proxy를 불러내게 된다. 때문에 호스트 쪽에 부하가 많이 걸리고, 그만큼 비용도 소모된다.

#### Case 2: iptables를 통해 netfilter를 조작만 하는 역할 (`1.20` 이후)

이 경우에는 kube-proxy가 직접 proxy 역할을 수행하지 않고 그 역할을 전부 netfilter에게 맡긴다. 서비스 IP를 탐색하여 파드에게 전달하는 일은 모두 netfilter가 담당하며, kube-proxy는 단순히 netfilter의 규칙을 알맞게 수정하는 역할만 수행한다.

쿠버네티스는 새로운 서비스를 만들거나, 파드가 생기거나, 레플리카셋이 바뀌는 등의 변화가 일어났을 때 해당 리소스의 컨트롤러가 이를 인지하게 된다. 이때 컨트롤러는 kube-proxy에게 이 정보를 알려주고, kube-proxy는 리눅스 도구인 iptables를 통하여 netfilter에게 트래픽 분배 규칙을 그때그때 새로 전달하는 방식으로 동작한다.

### 컨테이너 런타임 엔진(container runtime engine)

**클러스터 내부에 컨테이너 이미지를 가져오고 구동시키는 엔진**이다. 파드가 노드 안에서 동작하려면 반드시 필요한 부분으로, 쿠버네티스 `1.23` 버전 기준으로 리눅스 OS에서 지원되는 런타임은 다음과 같다. [자세한 설명 및 설치 방법은 공식 문서를 참고하자.](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)

-   [containerd](https://containerd.io/)
-   [CRI-O](https://cri-o.io/)
-   Docker Engine (deprecated; `1.24`에서 삭제 예정)
-   [Mirantis Container Runtime](https://www.mirantis.com/software/container-runtime/)

#### Docker Engine 지원 중단 (v1.24 이후)

본래 쿠버네티스에서는 컨테이너 생성과 실행을 위한 런타임 엔진으로 도커(Docker)를 지원해 왔으나, [지난 2020년 12월에 `1.20` 버전 이후로 지원을 중단(deprecated)한다고 발표했다.](https://kubernetes.io/ko/blog/2020/12/02/dont-panic-kubernetes-and-docker/) 도커를 이용한 런타임 지원은 2022년 2월 기준으로 [곧 발표될 `1.24` 버전부터 완전히 중단될 예정](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/2221-remove-dockershim)이며, 현재는 `containerd`와 같은 대체 수단이 기본적으로 이용되고 있다.

런타임 엔진에서 도커가 제외된다는 것이 쿠버네티스 클러스터에서 도커 자체를 사용하지 못하게 된다는 뜻은 전혀 아니다. 오직 쿠버네티스에서 지원되는 런타임 엔진에서만 제외되는 것으로, 도커에서 생성된 이미지는 [OCI(Open Container Initiative)](https://opencontainers.org/)를 따르는 이미지이므로 이후에도 `containerd`와 `CRI-O` 등을 통해 문제 없이 구동 가능하다는 것이 The Linux Foundation 측의 공식 입장이다.

## 마무리

이상으로 쿠버네티스의 핵심 제어 단위인 클러스터(Cluster)의 구성도를 살펴보고, 컨트롤 플레인(Control Plane)과 노드(Node)를 구성하는 주요 요소들을 자세히 알아보았다.

다음 글에서는 쿠버네티스에서 가장 작은 단위의 배포 개체이자 가장 핵심적인 워크로드 자원인 파드(Pod)에 대해 살펴보기로 하자.

## 참고자료

-   [Understanding Kubernetes Architecture](https://arch.tkssharma.com/kubernetes-architecture-understanding/)
-   [쿠버네티스 공식 문서: Kubernetes Components](https://kubernetes.io/docs/concepts/overview/components/)
-   [쿠버네티스 공식 문서: Options for Highly Available Topology](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/)
-   [쿠버네티스 공식 문서: Container runtimes](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)
-   [쿠버네티스 공식 블로그: 당황하지 마세요. 쿠버네티스와 도커](https://kubernetes.io/ko/blog/2020/12/02/dont-panic-kubernetes-and-docker/)
-   [도커/쿠버네티스 온라인 부트캠프 with 카카오엔터프라이즈](https://classlion.net/class/detail/21) (10-12주차 강의 중 일부)
-   [Mumshad Mannambeth의 Certified Kubernetes Administrator(CKA) 자격증 대비 과정](https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/) (섹션 2: Core Concepts 중 일부)
