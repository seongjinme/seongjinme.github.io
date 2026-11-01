---
title: "우아한테크코스 6기 프리코스 과정에서 배운 세 가지 디자인 패턴"
description: "같은 문제를 더 나은 방법으로 풀어내기 위해 노력하는 과정에서 배우는 것들이 있다. 디자인 패턴도 그 중 하나다. 싱글톤 패턴, 책임연쇄 패턴, 템플릿 메서드 패턴을 자바스크립트 코드와 함께 소개한다."
pubDate: "2023-11-21T05:51:04.000Z"
tags: ["javascript", "design-pattern", "woowacourse"]
featureImage: "/content/images/2023/11/cover-1.png"
---

지난 10월 중순부터 한 달 동안 [우아한테크코스](https://story.baemin.com/6193/) 6기의 프론트엔드 부문 프리코스를 수강했다. 본 교육의 지원자 선별을 위한 사전 과정일 뿐이지만, 여기에 참여하는 것만으로도 많은 변화를 겪었다. **4,500명**이 넘는 규모의 지원자 커뮤니티에서 어떠한 강제 없이도 온갖 채널과 수백 개의 포스트가 공유되었고, 덕분에 처음 코스를 시작할 때엔 알지 못했던 지식들을 4주 동안 압축적으로 배웠다. [컨벤션](https://github.com/airbnb/javascript)에 따른 코딩 스타일 준수, 테스트 코드 작성, 리팩토링, 객체 지향 프로그래밍, 그리고 깃허브 활용 및 상호 코드 리뷰의 경험은 이런 커뮤니티의 존재 없이는 불가능했을 것이다.

![짧은 수명이 정해진 커뮤니티지만, 그럼에도 정말 많은 분들께서 참여해주셨다.](/content/images/2023/11/woowacourse-community.png)

이번 글에서는 [우아한테크코스 6기 프리코스의 마지막 과제로 공개된 "크리스마스 프로모션" 미션](https://github.com/woowacourse-precourse/javascript-christmas-6)을 소재로, 과제 수행 과정에서 활용한 세 가지 디자인 패턴을 소개하고 이에 대한 예시 코드를 자바스크립트 언어로 함께 살펴보려고 한다. 여기서 살펴볼 디자인 패턴은 다음과 같다.

1.  [싱글턴 패턴 (Singleton Pattern)](/woowacourse-three-design-patterns-in-javascript/#%EC%8B%B1%EA%B8%80%ED%84%B4-%ED%8C%A8%ED%84%B4-singleton-pattern)
2.  [책임 연쇄 패턴 (Chain of Responsibility Pattern)](/woowacourse-three-design-patterns-in-javascript/#%EC%B1%85%EC%9E%84-%EC%97%B0%EC%87%84-%ED%8C%A8%ED%84%B4-chain-of-responsibility-pattern)
3.  [템플릿 메서드 패턴 (Template Method Pattern)](/woowacourse-three-design-patterns-in-javascript/#%ED%85%9C%ED%94%8C%EB%A6%BF-%EB%A9%94%EC%84%9C%EB%93%9C-%ED%8C%A8%ED%84%B4-template-method-pattern)

위의 과제 해결을 위해 작성한 전체 코드는 [여기](https://github.com/seongjinme/javascript-christmas-6-seongjinme/tree/refactor-231119)서 확인할 수 있다.

## 싱글턴 패턴 (Singleton Pattern)

**싱글턴 패턴**은 **애플리케이션 안에서 특정 클래스의 인스턴스가 오직 하나만 생성되도록 제한**하는 디자인 패턴이다. 특정 객체가 애플리케이션의 여러 영역에서 동일한 상태를 유지해야 할 때, 혹은 그 객체에 대해 전역적인 접근 지점을 제공해 주어야 할 때 활용할 만한 방법이다.

### 예시로 살펴보는 싱글턴 패턴

아래의 예시를 살펴보자. 식당 주문 애플리케이션을 구현하는 과정에서 `Menu`라는 클래스를 만들었다고 가정하자. `Menu` 클래스는 식당에서 제공하는 모든 메뉴의 정보를 담고 관리하는 객체로 설계되었다.

```js
class Menu {
  #items;

  constructor() {
    this.#items = {};
  }

  addMenuItem(name, price, category) {
    this.#items[name] = { price, category };
  }

  ...
}
```

이 `Menu` 클래스에 담긴 정보는 **애플리케이션 전역에 걸쳐 동일성이 유지**되어야 한다. 그런데 코드 여기저기서 매번 `new Menu();`가 실행된다면, 그때마다 각기 다른 인스턴스가 생겨나게 된다. 이렇게 되면 어느 인스턴스를 참조하느냐에 따라 메뉴의 내용이 달라질 수도 있게 된다. 식당에 들렀는데 자리마다 다른 메뉴를 받아보는 상황이 만들어지는 셈이다.

이런 상황을 예방하는 방법은 간단하다. `Menu` 클래스에 대한 인스턴스가 하나만 존재할 수 있도록 조정하고, 코드 전역에서 해당 인스턴스를 불러올 수 있는 내용을 클래스 안에 추가해주는 것이다. 이렇게 수정한 결과물은 다음과 같다.

```js
class Menu {
  #items;

  constructor() {
    // 이미 생성된 인스턴스가 존재하는지 체크한다.
    if (Menu.instance) {
      return Menu.instance;
    }

    // 만약 없다면, 새 인스턴스를 생성 후 저장한다.
    this.#items = {};
    Menu.instance = this;
  }

  addMenuItem(name, price, category) {
    this.#items[name] = { price, category };
  }

  // 전역에서 인스턴스 호출 가능한 static 메서드를 정의한다.
  static getInstance() {
    if (!Menu.instance) {
      Menu.instance = new Menu();
    }
    return Menu.instance;
  }

  // 필요시 인스턴스 초기화를 위한 static 메서드도 정의한다.
  static resetInstance() {
    if (Menu.instance) {
      Menu.instance = null;
    }
  }

  ...
}
```

이렇게 구현하면 `Menu` 클래스를 이용한 **인스턴스 생성을 시도할 때마다 항상 동일한 인스턴스가 반환**된다. 또한 애플리케이션 안에서는 `getInstance` 메서드를 통해 언제든지 `Menu` 클래스로 생성된 단일 인스턴스에 접근할 수 있게 된다. 애플리케이션 전체에서 공통적으로 사용되어야 하는 메뉴 정보를 단일 인스턴스로 관리함으로써 데이터의 일관성도 지킬 수 있다.

### 싱글턴 패턴의 장단점

싱글턴 패턴을 통해 얻을 수 있는 이점은 다음과 같다.

1.  객체의 불필요한 중복 생성을 방지하여 시스템 자원의 낭비를 줄일 수 있다.
2.  데이터베이스 또는 로그 연결 객체와 같이 애플리케이션 전체에서 공통으로 사용되는 리소스에 대해 일관된 접근 방식을 제공할 수 있다.
3.  애플리케이션 전역에서 객체에 접근할 수 있으므로, 별도의 파라미터 전달이나 의존성 주입과 같은 과정이 필요없다.

그러나 **단일 인스턴스가 애플리케이션 전역에 노출**된다는 특성상 아래 사항들을 주의해야 한다.

1.  싱글턴 객체가 사용된 코드에서는 단위 테스트(Unit Test) 수행이 어려워진다. 단일 인스턴스가 애플리케이션 코드의 여러 영역에 걸쳐 공유되어야 하는데, 이는 작은 기능 단위로 나뉘어 서로 독립적으로 수행되어야 하는 테스트를 구현하는 과정에 큰 어려움을 가져온다.
2.  멀티스레드 환경처럼 다수의 클라이언트가 동시에 접근할 때 발생하는 객체의 상태 변화에 유의해야 한다. 이런 환경에서 싱글턴 객체의 동기화가 보장되지 않는다면, 이에 의존하는 코드에 다양한 오류를 발생시킬 수 있다.
3.  이 패턴을 사용한 객체 구현은 객체의 리소스를 캡슐화하고, 외부로부터 은닉한다는 객체 지향적 설계 원칙에 어느 정도 어긋날 수 있다.

## 책임 연쇄 패턴 (Chain of Responsibility Pattern)

앞서 소개한 우아한테크코스 프리코스 6기 4주차 미션 요구사항을 한 문장으로 요약하면 다음과 같다.

> "고객들이 식당에 방문할 날짜와 메뉴를 미리 선택하면 이벤트 플래너가 주문 메뉴, 할인 전 총주문 금액, 증정 메뉴, 혜택 내역, 총혜택 금액, 할인 후 예상 결제 금액, 12월 이벤트 배지 내용을 보여주기를 기대합니다."

즉, **사용자의 주문 내역에 각종 할인 및 증정 혜택을 반영**하는 것이 해당 미션의 핵심 구현 요소다.

실생활에서 이러한 할인 및 증정 혜택에는 다양한 조건과 제약사항이 따라붙는다. 쇼핑몰의 경우를 생각해보자. 조건에 따라 일정 금액을 차감하는 쿠폰, 결제액 규모에 따라 일정 비율을 차감하는 쿠폰, 일정 금액대의 물품을 추가로 증정하는 쿠폰, 첫 결제에 한해 배송료를 차감하는 쿠폰 등 각양각색의 케이스가 존재한다. 이러한 쿠폰들을 어느 순서와 조합으로 엮었을 때 소비자 입장에서 가장 이득이 되는가를 계산하는 것도 중요할 것이다.

그러나 이번에는 위처럼 복잡한 경우의 수를 고려할 필요가 없었다. 아래와 같은 조건이 붙었기 때문이다.

1.  모든 혜택은 총 주문 금액에서 일정 금액을 차감하거나 특정 아이템을 무상 추가하는 형태로 한정된다.
2.  모든 혜택은 서로의 혜택 적용 여부나 혜택 내용에 영향을 미치지 않는다.
3.  여러 혜택의 동시 적용이 가능하다.
4.  혜택의 순서에 따라 결과가 달라지지 않는다.

이런 경우라면, 다음과 같은 구현 아이디어를 떠올려 볼 수 있다.

1.  각각의 혜택 내용을 객체로 표현한 뒤 이 객체들을 하나의 핸들러(Handler)가 관리하도록 구성한다.
2.  클라이언트(Client)는 주문 내역을 핸들러(Handler)에게 전달한다.
3.  핸들러(Handler)는 컬렉션에 있는 모든 혜택 객체를 순회하면서 주문 내역에 적용 가능한 혜택들을 모아 그 결과값을 반환한다.

이렇게 하면 **클라이언트는 핸들러에게 주문 내역에 대한 혜택을 요청하는 메시지만 보내면 되고, 핸들러는 혜택 객체들의 사슬(chain)을 돌면서 적용 가능한 혜택을 모아 담은 결과값만 클라이언트에게 전달**하면 된다. 이 구조 안에서 각각의 혜택 객체는 오직 자신의 역할만 수행하면 된다. 만약 새로운 혜택이 추가되거나 기존의 혜택이 변경되더라도, 해당하는 객체 내용만 수정하면 되므로 유지보수도 용이하다.

이처럼 **요청을 처리할 객체들의 연결 구조를 만들어 책임을 전달하는 방식**으로 설계된 패턴이 바로 **책임 연쇄 패턴**이다.

### 예시로 살펴보는 책임 연쇄 패턴

책임 연쇄 패턴은 일반적으로 다음과 같은 구조로 구현된다. **클라이언트(Client)**와 **핸들러(Handler)**, 그리고 실제 요청 처리를 담당하는 **구체 핸들러(ConcreteHandler)**로 구성요소가 나뉜다. 핸들러가 클라이언트로부터 메시지를 받아 구체 핸들러들의 연결체로 작업 처리의 책임을 넘기는 구조를 가지고 있다.

![책임 연쇄 패턴의 작동 구조](/content/images/2023/11/chain-of-responsibility-figure-1.jpg)

이러한 작동 구조를 좀 더 알기 쉽게 풀어보면 아래 그림과 같다. 핸들러와 구체 핸들러들이 각각 후속 처리자(successor) 정보를 통해 단방향으로 연결된 유사 연결 리스트의 구조를 가지고 있음을 알 수 있다.

![책임 연쇄 패턴에서 나타나는 각 핸들러들의 연결 구조](/content/images/2023/11/chain-of-responsibility-figure-2.jpg)

그러나 이번 미션 해결에 필요한 혜택 체인의 구조는 완전한 단방향 선형이다. 따라서 모든 핸들러에 후속 처리자 정보를 포함시킬 필요가 없다. 내 경우에는 **메인 핸들러에 혜택 클래스의 배열을 생성하고, 이를 순회하면서 주문 내역에 적용할 수 있는 혜택을 찾아 하나씩 추가**하는 방식으로 간단히 구현했다. 아래는 내가 작성한 메인 핸들러(`BenefitHandler`)의 예시 코드다.

```js
class BenefitHandler {
  #benefitItems;

  constructor() {
    this.#benefitItems = this.#createBenefits();
  }

  #createBenefits() {
	// 각각의 혜택 내용을 담은 클래스들의 배열을 생성한다.
    const benefitItems = [
      new ChristmasDDayBenefit(),
      new WeekdayBenefit(),
      new WeekendBenefit(),
      new SpecialDayBenefit(),
      new FreeMenuItemBenefit(),
    ];
    return benefitItems;
  }

  getBenefits() {
    let benefits = {};

    // 혜택 적용에 필요한 최소 구매 금액 조건을 만족하는지 검증한다.
    if (!this.#isMetConditionToApplyBenefit()) {
      return benefits;
    }

    // 개별 혜택 클래스를 순회하면서 적용 가능한 혜택 내용을 benefits에 추가한다.
    this.#benefitItems.forEach((benefitItem) => {
      if (benefitItem.isValid()) {
        benefits = benefitItem.applyBenefit(benefits);
      }
    });

    // 이렇게 하여 종합된 benefits 객체를 반환시킨다.
    return benefits;
  }

  #isMetConditionToApplyBenefit() {
    const totalOrderedAmount = Order.getInstance().getTotalOrderedAmount();
    if (totalOrderedAmount < SETTING.minOrderAmountForEvent) {
      return false;
    }
    return true;
  }
}
```

위의 코드에서 `createBenefits` 메서드를 보면 개별 혜택 내용이 포함된 서브 클래스들이 배열 안에 포함된 것을 알 수 있다. 이 각각의 클래스에는 해당 혜택을 적용 가능한 조건인지 체크하는 `isValid` 메서드와, 인자로 전달 받은 `benefits` 객체에 자신의 혜택 내용을 추가시키는 `applyBenefit` 메서드가 포함되었다. `benefitHandler` 는 클라이언트가 `getBenefits` 메서드를 호출했을 때 이 클래스들을 순회한 뒤 결과값을 반환하는 역할만 수행한다.

이렇게 하면 복잡한 로직을 사용하지 않고도 주문 내역에 따라 적용 가능한 모든 혜택 내역을 간단하게 받아낼 수 있다.

### 책임 연쇄 패턴의 장단점

책임 연쇄 패턴을 쓰는 목적은 **클라이언트의 요청을 처리할 객체들 간의 결합도를 낮추는** 데에 있다. 이를 감안하면 다음과 같은 이점을 얻을 수 있을 것이다.

1.  애플리케이션 구조에 유연성과 확장성을 높일 수 있다. 클라이언트 요청 처리에 필요한 객체를 추가하거나 수정하는 작업, 혹은 요청 처리 순서를 변경하는 작업이 모두 간편해진다.
2.  각 객체에 대한 단일 책임 원칙을 반영하기 용이하다. 역시 코드의 유지보수 및 확장에 도움이 된다.

그러나 장점만 있는 것은 아니다. 앞서 살펴본 `BenefitHandler` 코드를 예시로 살펴보자. 사용자의 주문 내역에 따라, 때로는 여기에 정의된 `benefitItems` 체인 안에서 어떠한 혜택도 받을 수 없는 경우 또한 존재할 수 있다. 이 경우 종합된 혜택 내역의 결과값은 빈 값(`{}`)이다. **클라이언트의 메시지를 처리하기 위해 체인 안의 모든 객체들이 돌아가며 연산을 수행했으나 얻은 것이 없는 셈이다.** 이처럼 책임 연쇄 패턴을 사용한 코드에서는 요청 처리가 가능한 객체를 찾을 때까지 순회가 이루어지므로 컴퓨팅 자원의 낭비가 발생할 수 있다는 점을 유념해야 한다.

아울러 이 패턴에서 활용할 모든 체인은 반드시 **일방향 비순환 그래프(Directed Acyclic Graph; DAG) 구조**여야 한다. 필요에 따라 여러 종류의 체인을 구성하거나 체인 안에 분기 처리를 해야 할 상황도 생길텐데, 이 경우 체이닝 구성에 주의하지 않으면 순환구조가 발생할 수 있다.

## 템플릿 메서드 패턴 (Template Method Pattern)

그런데 중요한 문제가 남아있다. 모든 개별 혜택에 대한 각각의 객체(클래스)를 매번 새로 구현하는 것은 아무래도 번거롭다. 유지보수 측면에서도 불리하다.

하지만 만약 상위 클래스에서 주문 내역에 혜택을 적용할 때 필요한 공통의 로직을 정의하고, 하위 클래스에서는 개별적인 적용 조건과 혜택 내용을 구현하도록 한다면 어떨까? 유지보수의 이점과 코드의 유연성을 모두 얻을 수 있을 것이다. 이처럼 **알고리즘의 기본적인 구조를 상위 클래스에 정의한 뒤 부분적으로 필요한 구체적인 구현을 하위 클래스에서 처리**하도록 디자인 된 패턴을 **템플릿 메서드 패턴**이라고 한다.

### 예시로 살펴보는 템플릿 메서드 패턴

내 경우에는 미션에서 요구되는 모든 혜택 클래스에 공통으로 필요한 로직을 다음과 같이 정의했다.

1.  `isValid()` : 해당 혜택의 적용 가능 여부를 판별하여 결과를 `boolean`값으로 반환한다.
2.  `getBenefit()` : 앞으로 적용시킬 혜택 내역을 계산한다.
3.  `applyBenefit()` : 이전 체인에서 받아온 `benefits` 객체에 앞으로 적용시킬 혜택 내역을 추가한 뒤 그 객체를 다음 체인으로 넘긴다.

이제 공통의 로직을 포함하는 추상 클래스로서 `Benefit`을 다음과 같이 정의한다. Java에서는 하위 클래스에서 구체적으로 구현하려는 메서드의 경우 `abstract` 키워드를 이용하여 추상 메서드로 정의할 수 있다. 그러나 JavaScript에서는 이러한 기능을 제공하지 않으므로 일반 메서드로 구현하였다.

```js
class Benefit {
  constructor() {
    this.startDate = SETTING.eventStartDate;
    this.endDate = SETTING.eventEndDate;
    this.reservedDate = Order.getInstance().getReservedDate();
  }

  isValid() {
    if (
      this.startDate <= this.reservedDate &&
      this.reservedDate <= this.endDate
    ) {
      return true;
    }
    return false;
  }

  getBenefit() {
    return { name: '', amount: 0 };
  }

  applyBenefit(benefits) {
    const benefit = this.getBenefit();
    benefits[`${benefit.name}`] = benefit.amount;
    return benefits;
  }
}
```

여기서 `getBenefit` 처럼 기본 행동만 정의되어 있으며 실제 필요한 내용은 하위 클래스에서 구현하도록 하는 메서드를 **후크(Hook) 메서드**라 부른다.

다음으로 각각의 혜택에 맞게 `Benefit`을 상속받는 하위 클래스들을 정의한다. 예를 들어 특정 기간 내에 특정 날짜에만 적용되는 할인 내용을 담은 `SpecialDayBenefit`는 다음과 같이 작성할 수 있다.

```js
class SpecialDayBenefit extends Benefit {
  constructor() {
    super();
  }

  isValid() {
    if (
      this.startDate <= this.reservedDate &&
      this.reservedDate <= this.endDate &&
      SETTING.specialEventDayPeriod.includes(this.reservedDate.getDate())
    ) {
      return true;
    }
    return false;
  }

  getBenefit() {
    return {
      name: BENEFIT_NAME.specialDayBenefit,
      amount: SETTING.specialEventDiscountAmount,
    };
  }
}
```

위의 코드를 보면 `applyBenefit`을 제외한 `isValid`와 `getBenefit` 메서드가 자신의 비즈니스 로직에 맞게 새로 구현된 것을 알 수 있다. 상위 클래스(`Benefit`)에서 정한 메서드의 이름은 그대로 사용하지만, 구현 내용은 하위 클래스에서 다르게 정의하는 것이다. 이처럼 **상위 클래스로부터 상속된 메서드를 재정의하여 사용**하는 것을 **메서드 오버라이딩(Method Overriding)**이라고 한다.

여기서 위와 같이 정의된 개별 혜택 클래스들을 순회시키는 `BenefitHandler` 클래스의 코드를 다시 살펴보자.

```js
// this.#benefitItems에 모든 각 혜택 클래스들의 배열이 저장되어 있다고 가정한다.
this.#benefitItems.forEach((benefitItem) => {
  if (benefitItem.isValid()) {
    benefits = benefitItem.applyBenefit(benefits);
  }
});
```

각각의 혜택 클래스들에 대하여 `isValid` 메서드로 적용 가능 여부를 판별한 뒤, `applyBenefit` 메서드로 `benefits` 객체에 혜택 적용 내역을 장바구니에 물건 담듯이 추가시킨다. 이때 `benefits` 객체에 추가되는 내용은 각 클래스 내부에 위치한 `getBenefit` 메서드가 정한다. 이러한 공통 로직을 해치지만 않는다면, 언제든 원하는 유형의 새로운 혜택 클래스를 간편하게 만들고 관리할 수 있을 것이다.

### 템플릿 메서드 패턴의 장단점

템플릿 메서드 패턴은 **코드의 재사용성과 유연성 증가**라는 명확한 장점을 가진다. 알고리즘 구현 구조를 명확하게 드러냄으로써 유지보수의 이점도 함께 얻을 수 있다.

그러나 모든 경우에 이러한 패턴이 유용한 것은 아니다. 앞서 위에서 정의했던, 모든 혜택 클래스에 공통으로 필요한 로직 자체가 변경되어야 하는 상황을 가정해보자. 이럴 때엔 상위 클래스(`Benefit`)를 비롯하여 혜택 내용이 포함된 모든 하위 클래스들의 코드 수정이 불가피하다. **개별 하위 클래스 구현의 유연성을 얻는 대신, 상위 클래스 알고리즘의 구조 변경에는 상대적으로 취약**해지는 것이다.

남용할 경우 클래스 계층 구조가 복잡해질 수 있다는 점도 감안해야 한다. **코드의 유연성과 구조적 복잡성 사이의 균형**을 어떻게 맞출 것인지, 추상화의 수준을 어디까지 가져갈 것인지를 항상 고민해야 한다.

## 참고자료

-   [에릭 감마 외 3명 지음, 김정아 옮김, <GoF의 디자인 패턴>, 프로텍미디어, 2015](https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=56051596)
-   [책임연쇄 패턴 (Chain of Responsibility Pattern) - 기계인간 John Grib](https://johngrib.github.io/wiki/pattern/chain-of-responsibility/)
-   [Patterns. The “Chain of Responsibility” pattern. Implementation in C++ | Bestprog](https://www.bestprog.net/en/2021/09/25/patterns-the-chain-of-responsibility-pattern-implementation-in-c/)
