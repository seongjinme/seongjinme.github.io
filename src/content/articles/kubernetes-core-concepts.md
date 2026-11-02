---
title: "쿠버네티스와 컨테이너 오케스트레이션, 그리고 핵심 설계 사상"
description: "컨테이너 오케스트레이션(Container Orchestration)의 개념과, 이것의 구현체로서 쿠버네티스가 가진 핵심적인 설계 사상들을 살펴본다."
pubDate: "2022-01-31T11:45:00.000Z"
updatedDate: "2022-02-10T01:05:35.000Z"
tags: ["kubernetes"]
---

## 쿠버네티스(Kubernetes)란?

**쿠버네티스(Kubernetes)**는 컨테이너화 된 애플리케이션의 대규모 배포, 스케일링 및 관리를 간편하게 만들어주는 오픈 소스 기반 **컨테이너 오케스트레이션(Container Orchestration)** 도구다.

같은 역할을 하는 도구로서 도커 스웜(Docker Swarm), 아파치 메소스(Apache Mesos), 노마드(Nomad) 등이 대규모 컨테이너의 효율적 제어라는 동일한 목적 아래 발전되어 왔으나, 2022년 현재는 쿠버네티스가 **컨테이너 기반 인프라 시장에서 사실상의 표준**으로 자리 잡은 상태다.

쿠버네티스는 과거 15년이 넘는 시간 동안 구글 내부에서 프로덕션 규모의 워크로드를 운영하는 수단으로 사용되었던 역사를 지녔다. 이렇게 검증받은 신뢰성과 효용이 쿠버네티스를 시장 지배적인 위치로 끌어올렸다. 이미 글로벌 3대 클라우드사(AWS, Azure, GCP) 뿐만 아니라 RedHat, VMWare 등에서도 자사 솔루션에 최적화된 버전의 쿠버네티스 플랫폼을 제공하고 있다. 공공/민간 IT 인프라의 클라우드 전환이 빠르게 일어나는 가운데, 앞으로의 애플리케이션 운영 인프라를 다루는 과정에서 쿠버네티스에 대한 이해는 필수가 될 것이다.

쿠버네티스의 쓸모와 목적을 이해하려면 **컨테이너 오케스트레이션(Container Orchestration)**을 함께 알아야 한다. 우선 **컨테이너 오케스트레이션(Container Orchestration)**의 개념과 필요성이 발생하게 된 배경을 간단히 소개하고, 다음으로는 이것의 구현체로서 **쿠버네티스가 가진 핵심적인 설계 사상**들을 살펴보기로 한다.

## 컨테이너 오케스트레이션(Container Orchestration)란?

레드햇(Red Hat)의 정의에 따르면, IT 업계에서 오케스트레이션(Orchestration)이란 용어는 ["컴퓨터 자원과 어플리케이션, 서비스에 대한 자동화된 설정, 관리 및 제어 체계"](https://www.redhat.com/en/topics/automation/what-is-orchestration)를 의미한다. 같은 의미를 차용하여 컨테이너 오케스트레이션(Container Orchestration)을 해석하자면, "컨테이너화 된 애플리케이션에 대한 자동화된 설정, 관리 및 제어 체계"로 받아들일 수 있을 것이다.

마이크로서비스 아키텍처(MSA; Microservice Architecture)에서는 프로젝트에 포함된 세부 기능들이 작은 서비스 단위로 분리되어 구축된다. 이 각각의 서비스를 구현할 때 컨테이너 기술이 흔하게 이용된다. 한정된 적은 양의 컨테이너는 개별 관리자가 손수 관리할 수도 있겠지만, 대규모의 상용 프로젝트 환경에서 수많은 컨테이너를 이런 식으로 제어하는 것은 불가능하다. **동시에 수백, 수천 개의 컨테이너를 배포하고 관리해야 하는 상황이라면 아래의 4가지 이슈에 대한 해답을 반드시 찾아야 한다.**

1.  **배포 관리** : 어떤 컨테이너를 어느 호스트에 배치하여 구동시킬 것인가? 각 호스트가 가진 한정된 리소스에 맞춰 어떻게 최적의 스케줄링을 구현할 것인가? 어떻게 하면 이러한 배포 상태를 최소한의 노력으로 유지 관리할 수 있을 것인가?
2.  **제어 및 모니터링** : 구동 중인 각 컨테이너들의 상태를 어떻게 추적하고 관리할 것인가?
3.  **스케일링** : 수시로 변화하는 운영 상황과 사용량 규모에 어떻게 대응할 것인가?
4.  **네트워킹** : 이렇게 운영되는 인스턴스 및 컨테이너들을 어떻게 상호 연결할 것인가?

![각기 다른 요소들을 동시에 안정적으로 제어하는 것이 오케스트레이션의 핵심 역할이다.](/content/images/2022/02/orchestration.jpg)

위의 4가지 이슈를 해결하기 위해 나타난 개념이 바로 **컨테이너 오케스트레이션(Container Orchestration)**이다. 관현악 연주에서 각기 다른 파트를 맡은 연주자들이 하나의 연주를 위해 동시에 조화를 이루듯이, 온라인 인프라 환경에서 대규모의 컨테이너들이 안정적으로 운영될 수 있도록 관리의 복잡성을 줄여주고 이를 자동화하는 것이다. 쿠버네티스는 이러한 컨테이너 오케스트레이션 개념을 구현한 도구들 중 하나다.

## 쿠버네티스의 핵심 설계 사상 5가지

그렇다면 대규모 컨테이너 배포 및 관리를 위해 쿠버네티스가 제공하는 고유의 특징적인 설계 요소는 어떤 것들이 있을까? 크게 다섯 가지로 압축하여 보자면 다음과 같다.

### 1\. 선언적 구성 기반의 배포 환경

쿠버네티스에서는 동작을 지시하는 개념_(예: 레플리카를 5개 만들어라)_보다는 **원하는 상태를 선언하는 개념**_(예: 내 호스트의 레플리카를 항상 5개로 유지하라)_을 주로 사용한다.

쿠버네티스는 원하는 상태(Desired state)와 현재의 상태(Current state)가 상호 일치하는지를 지속적으로 체크하고 업데이트한다. 따라서 내게 필요한 요소에 대해 원하는 상태를 설정하는 것만으로도 호스트의 리소스 현황에 맞춰 최적의 배치로 배포되거나 변경된다. 만약 특정 요소에 문제가 생겼을 경우, 쿠버네티스는 해당 요소가 원하는 상태로 다시 복구될 수 있도록 필요한 조치를 자동으로 취한다.

![쿠버네티스는 원하는 상태가 현재의 상태로 될 수 있도록 계속해서 모니터링하고 관리한다.](/content/images/2022/02/declarative.jpg)

이미지 출처: [Leverage](https://www.leverege.com/iot-ebook/kubernetes-object-management-model)

### 2\. 기능 단위의 분산

쿠버네티스에서는 각각의 기능들이 개별적인 구성 요소로서 독립적으로 분산되어 있다. 실제로 노드(Node), 레플리카셋(ReplicaSet), 디플로이먼트(Deployment), 네임스페이스(Namespace) 등 클러스터를 구성하는 주요 요소들이 모두 컨트롤러(Controller)로서 구성되어 있으며, 이들은 [Kube Controller Manager](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/) 안에 패키징 되어 있다.

![쿠버네티스는 내부 요소들의 상태 관리를 위해 컨트롤러를 이용한다.](/content/images/2022/02/kube-controller.png)

이미지 출처: [iximiuz.com](https://iximiuz.com/en/posts/kubernetes-operator-pattern/)

### 3\. 클러스터 단위 중앙 제어

쿠버네티스에서는 전체 물리 리소스를 클러스터 단위로 추상화하여 관리한다. 클러스터 내부에는 클러스터의 구성 요소들에 대해 제어 권한을 가진 컨트롤 플레인(Control Plane) 역할의 마스터 노드(Master Node)를 두게 되며, 관리자는 이 마스터 노드를 이용하여 클러스터 전체를 제어한다.

![쿠버네티스는 클러스터 단위로 중앙 제어되는 구조를 가진다. (이미지 출처: Kubernetes Documentation)](/content/images/2022/02/cluster.png)

### 4\. 동적 그룹화

쿠버네티스의 구성 요소들에는 쿼리 가능한 레이블(Label)과 메타데이터용 어노테이션(Annotation)에 임의로 키-값 쌍을 삽입할 수 있다. 관리자는 `selector`를 이용해서 레이블 기준으로 구성 요소들을 유연하게 관리할 수 있고, 어노테이션에 기재된 내용을 참고하여 해당 요소의 특징적인 내역을 추적할 수 있다.

![레이블(Label)을 이용하면 구성 요소를 유연하게 그룹화할 수 있다.](/content/images/2022/02/labels.png)

이미지 출처: [K21Academy](https://k21academy.com/docker-kubernetes/labels-and-annotations-in-kubernetes/)

### 5\. API 기반 상호작용

쿠버네티스의 구성 요소들은 오직 Kubernetes API server(`kube-apiserver`)를 통해서만 상호 접근이 가능한 구조를 가진다. 마스터 노드에서 `kubectl`을 거쳐 실행되는 모든 명령은 이 API 서버를 거쳐 수행되며, 컨트롤 플레인(Control Plane)에 포함된 클러스터 제어 요소나 워커 노드(Worker Node)에 포함된 `kubelet`, 프록시 역시 API 서버를 항상 바라보게 되어 있다.

![쿠버네티스의 많은 핵심 요소들이 API 서버를 바라보는 구조로 되어있다.](/content/images/2022/02/apiserver.png)

이미지 출처: [Sysdig](https://sysdig.com/blog/monitor-kubernetes-api-server/)

## 마무리

이상으로 쿠버네티스와 컨테이너 오케스트레이션 개념에 대한 소개, 그리고 쿠버네티스가 가진 핵심 설계 사상을 살펴보았다.

다음 글에서는 쿠버네티스의 핵심 제어 단위인 클러스터(Cluster)의 개념과, 컨트롤 플레인(Control Plane) 및 노드(Node)를 구성하는 주요 요소들을 알아보기로 한다.

## 참고자료

-   [Kubernetes Documentation: What is Kubernetes?](https://kubernetes.io/docs/concepts/overview/what-is-kubernetes/)
-   [Red Hat Topics: What is orchestration?](https://www.redhat.com/en/topics/automation/what-is-orchestration)
-   [도커/쿠버네티스 온라인 부트캠프 with 카카오엔터프라이즈](https://classlion.net/class/detail/21) (10-11주차 강의 중 일부)
