---
title: "Certified Kubernetes Administrator(CKA) 자격증 합격 후기 및 유용한 팁 (2022.02, v1.23)"
description: "CKA는 쿠버네티스 클러스터 관리 능력을 검증하는 대표적인 국제 자격증 중 하나다. 엔지니어 경험이 없는 초심자로서 이 CKA 자격증 시험에 도전하여 합격한 과정과 후기를 공유한다. 같은 시험을 준비하시는 분들께 도움이 될 만한 최신 내용과 팁도 함께 소개한다. (최근 수정일 : 2023년 2월 2일)"
pubDate: "2022-03-11T09:07:43.000Z"
updatedDate: "2023-03-21T06:48:39.000Z"
tags: ["kubernetes"]
featureImage: "/content/images/2022/03/cover.png"
---

이번에 **[Certified Kubernetes Administrator(이하 CKA) 자격증](https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/)**을 취득했다. 작년 8월부터 반년 동안 수강해 왔던 [도커/쿠버네티스 온라인 부트캠프](https://classlion.net/class/detail/21)에서의 배움을 다듬을 기회가 필요했고, 클라우드 엔지니어로 새출발하고 싶은 사람으로서 그동안 공부해 온 쿠버네티스 운영 능력을 검증받고 싶기도 했다. CKA 자격증은 이런 내게 꼭 필요한 목표점이 되어 주었다.

CKA 자격증 시험은 쿠버네티스 기술을 관리하는 [Linux Foundation](https://linuxfoundation.org/) 산하의 [Cloud Native Computing Foundation(CNCF)](https://www.cncf.io/)에서 주관하며, 컨테이너 관리 도구인 쿠버네티스 클러스터의 관리 능력 검증을 목적으로 한다. 따라서 **쿠버네티스 클러스터의 설치와 운영, 내부 리소스 배포 및 네트워크 설정, 그리고 클러스터에 발생한 문제 해결**에 이르기까지 넓은 범위의 응용 지식을 다룬다. 또한 단순 이론 암기를 지양하고 철저한 실습 위주로 검증하므로 배움의 과정 자체에서도 얻을 것이 많다.

이번 글에서는 CKA 자격 시험의 진행 방식을 간단히 알아본 뒤, 아직 엔지니어로서의 직업 경험이 없는 초심자로서 어떻게 시험을 준비하여 합격했는지 소개하려고 한다. 아울러 자격증 시험을 준비하시는 분들께 유용할 만한 팁도 함께 공유드린다.

> 💡 **2022년 6월 25일 전후로 시험 환경이 크게 바뀌었습니다.** 내 PC의 브라우저에서 CLI 화면을 보면서 시험을 치렀던 과거와 달리, 이제는 지정된 프로그램(PSI Bridge Secure Browser)을 통해 리눅스 기반 가상 데스크톱에 원격 접속하여 시험을 진행해야 합니다.  
>   
> 이 변화로 인해 달라진 사항들을 본문에 수정 반영했습니다. 이번에 갱신한 내용은 [GyeongSeon](https://gist.github.com/ShinGyeongseon367)님의 [CKA 자격 취득 후기 글](https://gist.github.com/ShinGyeongseon367/ee7815700f2e6432b7641c08fe5b776c), 그리고 [killer.sh](https://killer.sh/) 개발자인 [Kim Wüstkamp의 글](https://itnext.io/cks-cka-ckad-changed-terminal-to-remote-desktop-157a26c1d5e)을 바탕으로 한 것입니다. 제보해주신 [GyeongSeon](https://gist.github.com/ShinGyeongseon367)님께 감사드립니다.  
>   
> \- 수정일 : 2022년 8월 18일

> ⚠️ 최근 업데이트 된 [수험자 신분 인증 요건](https://docs.linuxfoundation.org/tc-docs/certification/lf-handbook2/candidate-identification-and-authentication)에 따라, 앞으로는 **시험 등록시 입력하신 이름(Verify Name)을 직접 확인할 수 있는 신분증만 본인 인증에 사용 가능**합니다. 만약 해당 이름을 국문으로 입력하셨다면 국문 주민등록증/운전면허증으로 인증이 가능합니다. 만약 영문 이름을 입력하셨다면 여권이나 영문 운전면허증을 준비하셔야 합니다.  
>   
> 변화된 인증 요건을 제보해주신 [twinholic](https://github.com/twinholic)님과 [kkkiadsl](https://github.com/kkkiadsl)님께 감사드립니다.‌‌‌‌  
>   
> \- 수정일 : 2023년 3월 21일

## 시험 진행 방식

### 시험 개요

-   Hands-on Practical Lab 형식의 온라인 원격 시험이다.
-   총 **120분** 동안 **약 15~20문제** 가량을 풀어야 한다.
-   **100점 만점(100%) 중 66점(66%) 이상**을 얻어야 한다.
-   시험은 항상 최신 버전의 쿠버네티스 환경에서 진행된다. 만약 새 버전이 릴리즈 될 경우 시험 환경에는 4-8주 이내에 반영된다.
-   1회 등록시 1년 이내에 총 2회까지 응시 가능하다. 1차에서 불합격해도 2차 기회가 주어진다.
-   자격 유효기간은 3년이다.

### 응시 환경 체크

온라인 원격 시험이므로 시험을 치르는 주변 환경에 대해 상당히 엄격한 점검이 이루어진다. 아래 사항들을 꼼꼼히 살펴서 미리 준비해두자.

-   **응시자 외에 아무도 없는 격리된 개인 공간**이어야 한다. 공공장소는 허용되지 않는다.
-   시험 공간 4면에 책장, 액자, TV 등 시선을 끌만한 요소가 없어야 한다.
-   **책상 위의 불필요한 물품을 모두 치워야 한다.** 내 경우엔 신분증도 신분 확인 후엔 치워야 했다. 단, 라벨 없는 투명한 물병은 허용되었다.
-   신분 인증을 위해서는 **시험 등록시 입력한 이름을 직접 확인 가능한 국가 공인 신분증**이 필요하다. 어떤 언어로 입력했느냐에 따라 준비해야 할 신분증이 달라진다. **국문**으로 입력했다면 주민등록증이나 국문 운전면허증으로 인증 가능하다. 만약 **영문**으로 입력했다면 **여권** 또는 **영문 운전면허증**을 반드시 준비하자. 얼굴 사진과 이름을 한 번에 확인 가능한 신분증이  권장된다.
-   웹캠이 필수다. 별도의 웹캠이 없다면 가급적 **15인치 이상**의 대형 노트북 사용을 권장한다.
-   **시험 화면과 응시자 얼굴이 모두 실시간으로 감독관에게 전송**된다. 인터넷 회선 속도와 연결 감도를 반드시 사전 점검해야 한다.
-   `8080/tcp`, `4505/tcp`, `4506/tcp` 포트가 열려있어야 한다. 방화벽 이슈가 있는지 꼭 확인해보자.
-   현재는 오직 1대의 모니터만 사용 가능하다. 노트북에 외장 모니터를 연결하는 것은 허용되지 않는다.
-   내 경우에는 노트북 거치대와 블루투스 키보드, 터치패드 사용이 허용되었다.
-   체크 과정에서 소요되는 시간은 주어진 시험 시간(120분)에 영향을 주지 않으므로 편안한 마음으로 진행하자.

### 시험 진행 환경 및 주의사항

실제 시험은 아래와 같은 UI 환경에서 진행된다. 이 내용은 2022년 8월, 쿠버네티스 v1.24 환경 기준으로 업데이트 된 내용임을 밝힌다.

![](/content/images/2022/08/exam-ui-new-1.png)

*새로 개편된 CKA 시험의 ExamUI 환경 (출처: [Linux Foundation](https://docs.linuxfoundation.org/tc-docs/certification/tips-cka-and-ckad#adjusting-font-and-windows-in-the-examui))*

-   응시자는 PSI Bridge Secure Browser를 통해 리눅스 기반의 VM에 원격 접속하여 시험을 치른다. 원격 응시 가능한 시스템 사양은 [여기서](https://helpdesk.psionline.com/hc/en-gb/articles/4409608794260-PSI-Bridge-Platform-System-Requirements) 확인할 수 있다.
-   PSI Bridge Secure Browser 상단의 `-`, `+` 버튼으로 VM 화면의 글자 크기를 조정 가능하다. 이밖에 [시험 화면 조정을 위한 방법](https://docs.linuxfoundation.org/tc-docs/certification/tips-cka-and-ckad#adjusting-font-and-windows-in-the-examui)도 함께 숙지하면 좋다.
-   VM에 포함된 터미널(Terminal)을 이용하여 문제 풀이를 진행한다.
-   오픈북 용도로 VM에 포함된 브라우저(Firefox)를 이용할 수 있다. [오직 지정된 경로의 문서들만 이용 가능하다.](https://docs.linuxfoundation.org/tc-docs/certification/tips-cka-and-ckad#resources-allowed-during-exam) **이밖의 다른 웹사이트 접속은 막혀있다.** 번역본 문서 열람이 허가되지 않는 경우도 있었다고 하니 영문 문서에 익숙해지는 것이 좋다. 대신 이제는 한 번에 여러 탭으로 여러 문서를 동시에 참고할 수 있다.
-   **사전에 정리해 둔 북마크는 더 이상 사용할 수 없다.** 미리 초기화 된 VM에 접속해서 시험을 치르므로 어쩔 수 없는 부분이다.
-   시험용 VM의 터미널에서 복사/붙여넣기 단축키는 `Ctrl+SHIFT+C`, `Ctrl+SHIFT+V` 를 이용해야 한다. **이 단축키는 오직 터미널 안에서만 동작한다.** 터미널 바깥에서는 `Ctrl+C`, `Ctrl+V` 를 이용한다. 단축키가 잘 듣지 않을 때엔 **마우스 오른클릭**을 이용하는 것이 좋다.
-   VM 내 브라우저(Firefox)에서 터미널로 복사-붙여넣기를 할 때 “Unsafe Paste” 경고가 뜬다. 이 경고는 그냥 무시해도 된다. 터미널의 `Edit > Preferences > General` 에서 `Show unsafe paste dialog` 옵션을 찾아 해제하면 경고가 뜨지 않는다.
-   시험 화면의 우측 상단에 메모장(notepad) 기능이 있지만, 이전과 달리 VM 화면과 메모장 사이의 텍스트 복사 기능이 막혀있으므로 쓸 이유가 거의 없다.
-   **대신 VM에 포함되어 있는 텍스트 편집기(Mousepad)를 이용하자.** 공식 문서의 샘플 YAML을 여기로 복사해서 편집한 뒤, 터미널의 vi 또는 vim 화면에 붙여넣는 식으로 활용할 수 있다.
-   VM 화면의 우측 상단에 보면 여러 개의 작업공간(Workspace)을 만들어 전환할 수 있는 버튼이 있다. 이걸 잘 활용하면 문서 참고용 Firefox 화면, YAML 편집 화면, 터미널 화면을 각각 넓게 구성해서 쓸 수 있다.
-   각 문제마다 `kubectl config set-context <컨텍스트명>` 형태로 문제를 수행할 클러스터를 지정하도록 되어 있다. 이전 문제와 같은 클러스터에서 작업하게 되더라도 실수를 줄이는 차원에서 꼭 다시 실행해주자.
-   2022년 8월 기준으로 시험용 클러스터의 OS는 **Ubuntu 20.04**로 지정되어 있다. 따라서 클러스터 설치 또는 업데이트 과제 수행시 패키지 관리를 `apt`로 해야 한다.
-   각 문제마다 참고할 만한 공식 문서 링크가 함께 첨부되어 있다. 그러나 큰 도움은 되지 않으므로 [https://kubernetes.io/docs/](https://kubernetes.io/docs/)에서 필요한 문서를 직접 검색하는 것이 좋다.
-   감독관과는 오직 채팅으로만 대화할 수 있다.

## 시험 준비 방법

### 리눅스 CLI 환경과 편집기에 적응하기

CKA 시험은 실제 구동되는 쿠버네티스 클러스터 환경에 직접 접속해서 문제를 해결하는 구성을 갖고 있다. 따라서 리눅스의 CLI 환경, 그리고 CLI를 통해 직접 사용 가능한 텍스트 편집기의 기초 사용법에 먼저 익숙해져야 한다. 리눅스 경험이 부족했던 내 경우에는 공부 기간 중 방송통신대학교에서 UNIX시스템 과목 수강을 병행하면서 파일 및 디렉터리 관리, 그리고 텍스트 탐색 및 편집 방법을 우선적으로 익혔다. 이 과정이 없었다면 이후의 학습 진행은 불가능했을 것이다.

CLI 환경에서의 텍스트 편집기는 `vi` 또는 `vim`을 주로 사용하게 된다. 이에 대한 사용법은 아래 블로그 포스팅들을 참고하여 익혔다.

-   [vi 초간단 사용법](https://lifeoncloud.kr/study/vi/) (by 라온클님)
-   [vim 기초 사용법 시리즈](https://velog.io/@skyinocean/series/vim-%EC%82%AC%EC%9A%A9%EB%B2%95) (by 바닷속하늘님)

### 컨테이너 기초 다지기

쿠버네티스는 컨테이너 오케스트레이션을 구현한 기술이다. 따라서 컨테이너와 도커, 네트워크에 대한 사전 지식이 필요하다.

내 경우에는 [도커/쿠버네티스 온라인 부트캠프](https://classlion.net/class/detail/21)에서 조경민 매니저님께서 진행하신 도커 강의와, [Eric Han님의 기술 블로그](https://futurecreator.github.io/)가 무척 큰 도움이 되었다. 만약 도커가 처음이라면, 아래 Eric Han님의 두 포스팅을 참고하면 좋다. 시간이 걸리더라도 차근차근 읽어보자.

-   [개발자를 위한 인프라 기초 총정리](https://futurecreator.github.io/2018/11/09/it-infrastructure-basics/) (by Eric Han님)
-   [도커 Docker 기초 확실히 다지기](https://futurecreator.github.io/2018/11/16/docker-container-basics/) (by Eric Han님)

도커를 통해 컨테이너 기반의 간단한 애플리케이션 배포를 직접 시험해보고 싶은 경우를 위해 예전에 연재했던 블로그 포스팅들도 함께 공유한다.

-   [Docker와 Ghost CMS로 Amazon Lightsail에 기술 블로그 만들기](/how-to-build-ghost-blog-with-docker/)
-   [Docker Compose로 Ghost 기반 기술 블로그를 간편하게 만들고 제어하기](/how-to-build-ghost-blog-with-docker-compose/)

### 모두가 아는 '그 강의'로 시작하기

CKA 시험 후기를 찾아보면 반드시 언급되는 강의가 있다. 모두가 알고 모두가 추천하는 그 강의, 바로 [Mumshad Mannambeth의 Certified Kubernetes Administrator (CKA) with Practice Tests](https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/)다. 실제 수강해보니 그 명성 답게 유익한 강의였다.

이 강의는 **쿠버네티스의 핵심 컨셉은 물론 클러스터의 주요 리소스들에 대한 기초적인 운용 방법을 명료하게 안내**해준다. 커리큘럼이 체계적으로 잘 정비되어 있고, 영상 강의 내용을 복기할 수 있는 간편한 실습 환경도 함께 겸비하고 있다. [KodeKloud](https://kodekloud.com/)를 통해 수십 가지 유형의 클러스터 실습 환경을 제공하며, 실제 시험 문제와 유사한 구성을 갖춘 **Mock Exams** 및 **Lightning Labs**도 포함되어 있다. 할인가 기준 2만 원 미만의 가격이 믿기지 않을 정도다.

아는 내용이라고 건너뛰지 말고 가급적 하나하나 찬찬히 들여다보길 권한다. 빽빽하게 구성된 커리큘럼 특성상 중간에 대충 넘겨짚고 넘어갔다가 나중에 어려움을 겪을 수 있다. 또한 강의 영상에서 한글 자막이 지원되지 않으므로 영어 독해 및 청해 능력이 필요하다. 영문 자막도 자동 생성 기반이어서 때때로 부정확한 내용이 출력될 수 있다는 점에 유의하자.

### 배운 것을 내 언어로 정리하기

모든 공부의 과정이 대체로 그렇듯이, 초반의 기초 지식을 익히는 시간이 가장 지루하고 힘들다. 그러나 이 단계를 잘 넘겨서 내것으로 소화해야 이후에 익혀야 할 정보량에 압도되지 않는다. 특히 **클러스터의 주요 구성요소들에 대한 개괄적인 이해가 있어야 최근 시험에서 비중이 높아진 트러블슈팅 상황에도 빠르게 대처**할 수 있다.

이 블로그에서는 쿠버네티스의 기초 구성요소에 대해 그동안 공부하고 익힌 내용을 [kubernetes 태그](/tag/kubernetes/)에 모아두고 있다. 어디선가 얻은 내용을 단순 요약하기보단 시간이 걸리더라도 부족하게나마 내 언어로 정리하기 위해 애썼다. 지난한 과정이었지만, 덕분에 실습 단계에서도 내게 필요한 정보를 빠르게 캐치하여 배움을 수월하게 이어갈 수 있었다.

비록 자격증 시험의 모든 범위를 다루고 있진 않지만, 입문 과정에서 조금이라도 도움이 될 수 있으리라 생각되어 작성글 목록을 공유한다. 앞서 소개한 Mumshad의 강의에서도 이 내용들을 대부분 다루고 있다.

-   [쿠버네티스와 컨테이너 오케스트레이션, 그리고 핵심 설계 사상](/kubernetes-core-concepts/)
-   [쿠버네티스의 클러스터 개념과 구성 컴포넌트 알아보기](/kubernetes-cluster-components/)
-   [파드(Pod)의 개념과 생명 주기, 그리고 상태 진단을 위한 프로브(Probe) 활용](/kubernetes-pods/)
-   [멀티 컨테이너 파드의 대표적인 디자인 패턴들](/kubernetes-multi-container-pod-design-patterns/)
-   [쿠버네티스의 워크로드 리소스 살펴보기](/kubernetes-workloads/)
-   [쿠버네티스에서 반드시 알아야 할 서비스(Service) 유형](/kubernetes-service-types/)
-   [쿠버네티스에서 명령형 접근법과 선언형 접근법의 차이 이해하기](/kubernetes-imparative-vs-declarative/)
-   [쿠버네티스에서 JSON 데이터 처리를 위한 JSONPath 사용법](/how-to-use-jsonpath-in-kubernetes/)

### 실습, 그리고 또 실습하기

터미널에서 직접 클러스터를 다루며 평가받는 시험이므로 반복적인 실습이 반드시 필요하다.

위에서 소개한 유데미 강의를 수강했다면 **Mock Exams** 과 **Lightning Labs**를 꼭 진행해보자. 문제를 풀어나갈 시험 환경이 어떤 형태로 구성되는지, 어떠한 문제 유형을 다루게 되는지 미리 적응할 수 있는 좋은 기회다. 실제로 경험해보니, 2022년 2월 기준으로 **Mock Exam 2**와 **Mock Exam 3**의 난이도가 **실제 시험에서 중간 또는 낮은 난이도의 문제들과 수준이 비슷했다.** 틀리는 문제 없이, 넉넉한 여유 시간을 두고 풀 수 있을 때까지 반복 연습하는 것을 권한다. 높은 난이도의 문제를 대비하려면 아래에서 소개할 [killer.sh](https://killer.sh/)를 이용하는게 좋다.

유데미 강의 없이 시험을 준비할 경우, 실습환경을 직접 구성해보는 것도 가능하다. 아래의 깃허브 리포지터리를 참고하자.

-   [https://github.com/alijahnas/CKA-practice-exercises](https://github.com/alijahnas/CKA-practice-exercises)

### killer.sh 시뮬레이터 도전하기

CKA 시험을 등록하면 [killer.sh](https://killer.sh/) 에서 문제 풀이 실습을 해볼 수 있는 무료 세션 2회분이 제공된다. 지금까지 배우고 연습한 것을 총정리한다는 마음으로 도전해보자.

![이름부터 살벌한 시뮬레이터, killer.sh 접속 화면](/content/images/2022/03/killer-sh.png)

*이름부터 살벌한 시뮬레이터, killer.sh 접속 화면*

많은 후기글에서 소개된 것처럼 **killer.sh의 난이도는 상당히 높다.** 그러나 대개는 하나의 문제 안에서 이것저것 해결해야 할 사항이 많거나, 일반적인 자격증 관련 강의에서 잘 다루지 않는 리소스 및 제약사항을 이용해야 하기에 까다로운 경우들에 속했다. 이를테면 `podAntiAffinity`를 이용하여 DaemonSet처럼 동작하는 Deployment를 구현하는 식이다. 실제로 경험해보니 시간만 충분하다면 쿠버네티스 공식 문서를 참고하며 풀어나갈 수 있는 문제들이었다.

killer.sh의 시뮬레이터는 리소스 디자인 및 배포, 정보 탐색, 클러스터 문제 해결 등 다양한 부문에서 빠른 시간 안에 실력을 점검하고 보완하기 좋은 구성을 갖췄다. 그러니 **1회차에는 시간 제한에 얽매이지 말고 모든 문제들을 직접 스스로 풀어본 뒤, 2회차에서 시간 내 완료에 도전해보길 권한다.** 나는 시험 전날 2회차를 진행하면서 25개 중 21개의 문제를 120분 안에 해결했고, 다음날 시험 과정에서 아무런 어려움을 겪지 않았다.

## 시험에 유용한 팁 소개

### kubectl 단축어와 자동 완성기능 이용하기

2022년 들어 기존 시험 환경에 응시자의 편의를 위한 요소들이 새로 추가되었다.

-   `kubectl`에 대한 단축어(alias) `k`를 모든 클러스터에서 바로 사용할 수 있다.
-   `kubectl` 명령에 대한 셸 자동완성(Bash autocompletion) 기능도 바로 사용할 수 있다.
-   YAML 또는 JSON 작업을 위한 `jq`, 그밖에 `tmux`와 `curl`, `wget`, `man`이 기본 지원된다.

### vim 설정파일 추가하기

아래 내용은 2022년 7월 전후로 시험 환경에 기본 적용된 사항이다. 그러나 만약을 대비하여 설정 방법을 남겨둔다.

시험 특성상 대부분의 문제 풀이 과정에서 YAML 파일을 편집하게 된다. 따라서 시험이 시작되면 처음 1분을 에디터 환경 편집에 할애하면 좋다. `vim` 기준으로 시험 과정에서 내가 사용한 설정값은 다음과 같다.

```bash
# tab을 2칸으로 설정
set tabstop=2

# tab 사용시 발생하는 공백을 띄어쓰기(스페이스)로 채움
set expandtab

# shift(>, >>, <, << 등)를 2칸으로 설정
set shiftwidth=2
```

위 내용을 외워서 과제 수행용 노드에 `~/.vimrc` 파일로 저장해 두면 편집 작업이 한결 수월해진다.

### kubectl의 달인이 되기

17개 내외의 문제를 해결하기에 120분의 시간은 조금 빡빡한 편이다. 조금이라도 시간을 절약하려면 가능한 한 많은 리소스 작업을 `kubectl` 명령 만으로 해결해낼 수 있어야 한다.

시험에서 다루는 리소스들 가운데 멀티 컨테이너 파드와 PV, PVC, 그리고 NetworkPolicy 정도를 제외하면 대부분 `kubectl`을 이용하여 빠르게 생성할 수 있다. 또한 `--dry-run=client -o yaml` 플래그와 결합하면 쿠버네티스 공식 문서 없이도 필요한 리소스의 기본 골격을 바로 뽑아서 편집할 수 있게 된다. 쿠버네티스 자격 시험에서 **시간 관리의 성패는 결국 `kubectl`을 얼마나 빠르게 잘 활용하느냐**에 달려 있다.

[kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)를 반드시 참고하자. 실제로 몇몇 문제는 여기에 기재된 명령어 만으로 바로 해결이 가능한 경우도 있었다.

### JSONPath 익히기

CKA 시험에는 클러스터/노드/리소스 관련 특정 정보를 찾아 양식에 맞게 가공하여 제출하는 문제가 반드시 출제된다. `kubectl get <리소스+리소스명> -o json` 명령으로 받아온 출력물을 뒤져서 답안을 한땀한땀 써내려 가는 것은 촉박한 시험 환경에선 무척 수고로운 일이다.

이럴 때 내게 필요한 정보만 가공해서 빠르게 출력시키는 수단으로 JSONPath를 익혀두면 도움이 된다. 내 경우에는 시험 중에 **특정 리소스의 정보를 찾아 주어진 조건대로 정렬해서 파일로 제출하는 형태의 문제**를 자주 만났는데, 이걸 익혀둔 덕분에 정말 많은 시간과 노력을 절약할 수 있었다.

아래의 공식 문서에서 `kubectl` 명령과 JSONPath를 어떻게 결합하여 쓸 수 있는지 확인할 수 있다. 보다 디테일한 사용 방법 또한 다른 포스팅에서 정리하여 두었으니 함께 참고하면 도움이 될 것이다.

-   [JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
-   [쿠버네티스에서 JSON 데이터 처리를 위한 JSONPath 사용법](/how-to-use-jsonpath-in-kubernetes/)

### 실수 줄이기

긴장도가 높은 환경에서 시간 제한을 두고 문제를 풀다 보면 의도치 않게 실수가 생길 수도 있다. 아래의 체크리스트를 반드시 떠올리자.

1.  내 리소스가 올바른 클러스터(컨텍스트)에 만들어졌는가?
2.  내 리소스가 올바른 네임스페이스에 만들어졌는가?
3.  내 리소스가 문제에 제시된 대로 잘 동작하고 있는가?
4.  내 리소스의 이름에 오탈자는 없는가?
5.  파일로 제출하는 답안의 경우, 해당 파일에 필요한 내용이 올바르게 들어가 있는가?

## 알아두면 좋은 핵심 문제 유형

### etcd 스냅샷 생성 및 복구

지정된 클러스터의 마스터 노드 `etcd` 백업 및 복원 방법을 반드시 익혀두자. 배점도 크기 때문에 놓치면 눈물 난다. 나는 `etcdctl` API의 버전 `3` 기준으로 CA인증서, 서버인증서 및 키파일 경로를 포함하여 `snapshot` 생성하고 복원하는 명령어 전체를 매뉴얼 없이 바로 입력 가능하도록 연습했다.

### 클러스터 노드 업그레이드

[마스터](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/#upgrading-control-plane-nodes) 또는 [워커 노드](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/#upgrade-worker-nodes)의 업그레이드 절차를 숙지하자. 공식 문서에 방법이 상세하게 안내되어 있으므로 참고하여 차근차근 진행하면 된다. 특히 업그레이드 과정 중간에 노드의 `drain`과 `cordon`, `uncordon` 절차를 반드시 따라야 한다.

### 파드 간 네트워크 구성

`Service`와 `Ingress`, 그리고 `NetworkPolicy`를 이용한 파드 간 네트워크 구성을 반드시 실습해보기 바란다. 이 유형은 위에서 소개한 유데미 강의 만으로는 커버되지 않으므로 killer.sh 또는 직접 구성한 클러스터를 통해 실습하는 것이 좋다. 내 경우에는 아래의 공식 문서에서 많은 도움을 얻었다.

-   [The NetworkPolicy resource](https://kubernetes.io/docs/concepts/services-networking/network-policies/#networkpolicy-resource)

### 로그 스트리밍용 사이드카(Sidecar) 컨테이너 구현

`emptyDir` 또는 `hostPath` 유형의 공유 볼륨을 이용하여 로깅 에이전트 기능을 하는 사이드카(Sidecar) 컨테이너 구현도 꼭 연습해보자. 이를 위해서는 멀티 컨테이너 파드를 구성하는 방법, 그리고 이 컨테이너들이 함께 공유하는 볼륨 설정법을 알아야 한다. 아래의 공식 문서와 블로그 포스팅을 각각 참고하자.

-   [Logging Architecture: Using a sidecar container with the logging agent](https://kubernetes.io/docs/concepts/cluster-administration/logging/#sidecar-container-with-logging-agent)
-   [멀티 컨테이너 파드의 대표적인 디자인 패턴들](/kubernetes-multi-container-pod-design-patterns/)

### 트러블슈팅(Troubleshooting)

2020년 9월부터 **트러블슈팅이 CKA 시험에서 가장 큰 채점 비중(30%)을 차지**하게 되었다. 66% 이상의 점수를 획득해야 하는 시험 구조상, 트러블슈팅 문제를 반드시 준비해야만 합격을 기대할 수 있다.

CKA 과정에서 다루게 되는 트러블슈팅의 유형은 크게 네 가지로 나뉜다.

1.  애플리케이션(파드/컨테이너) 구동 문제
2.  컨트롤 플레인 구성 요소의 구동 문제
3.  워커 노드의 구동 상태 확인 및 복원 문제
4.  네트워크 문제

2022년 2월 기준으로, 내 경우에는 위의 **1, 2, 3번 유형에 해당하는 트러블슈팅 문제**를 모두 경험했다. 특히 **컨트롤 플레인 관련 트러블이 해결되지 않으면 이어지는 2개 정도의 문제가 연이어 해결 불가능한 구조**로 출제되었다. 따라서 각 유형 별로 문제의 근원을 탐지하는 방법을 반드시 학습해 두어야 한다. 유데미 강의 또는 killer.sh에서 트러블슈팅을 실습해 볼 수 있으며, 아래의 공식 문서들 또한 문제 해결에 도움이 된다.

-   [Troubleshoot Applications](https://kubernetes.io/docs/tasks/debug-application-cluster/debug-application/)
-   [Troubleshoot Clusters](https://kubernetes.io/docs/tasks/debug-application-cluster/debug-cluster/)
-   [Debugging Kubernetes nodes with crictl](https://kubernetes.io/docs/tasks/debug-application-cluster/crictl/)
-   [Debug Services](https://kubernetes.io/docs/tasks/debug-application-cluster/debug-service/)

## 마치며

![](/content/images/2022/03/cka-certification-small.png)

CKA 시험은 도전적인 난이도로 잘 설계된 시험이다. 쿠버네티스에 대한 넓은 범위의 응용 지식을 다룬다는 점에서, 그리고 추상적인 이론적 지식의 주입에 그치지 않고 실습을 통한 역량 성장을 추구한다는 점에서 결과보다도 과정에 더욱 만족하게 되는 시험이었다. 특히 **주어진 상황의 핵심 이슈를 빠르게 파악하고 내게 필요한 정보를 신속히 얻어내어 문제를 해결해 나가는 엔지니어로서의 덕목을 단련**하는 데에 큰 도움이 되었다.

이 공부를 시작했던 작년 8월의 나는 리눅스와 도커, 쿠버네티스에 대해 전혀 아는 게 없었던 사람이다. 오직 클라우드 인프라 전문가로 새롭게 성장하고 싶다는 막연한 바람만 갖고 있었다. 용기 만으로 무모하게 시작했지만, 훌륭한 교육 과정들과 후기들을 자양분 삼아 공부하다 보니 6개월 만에 의미 있는 결과를 얻었다. 쿠버네티스 공부를 갓 시작하신 분들, 그리고 경력 발전을 위해 자격증 취득을 고려하시는 분들께 이 후기가 도움이 되길 바란다.
