---
title: "Three Design Patterns I Learned from Woowacourse Precourse"
description: "Trying to solve the same problem in a better way can teach us something new. Here are three design patterns I learned during the sixth Woowacourse frontend precourse, with JavaScript examples: Singleton, Chain of Responsibility, and Template Method."
pubDate: "2023-11-21T05:51:04.000Z"
lang: en
tags: ["javascript", "design-pattern", "woowacourse"]
---

For a month starting in mid-October, I took part in the frontend precourse for the sixth cohort of [Woowacourse](https://story.baemin.com/6193/). Although this was only a preliminary course for selecting applicants for the main program, participating brought about many changes for me. In a community of more than **4,500 applicants**, people voluntarily created all kinds of channels and shared hundreds of posts. Thanks to them, I learned a concentrated amount of new material over those four weeks. Following a [coding style guide](https://github.com/airbnb/javascript), writing tests, refactoring, practicing object-oriented programming, and using GitHub for mutual code reviews would not have been possible in the same way without that community.

![The community was only meant to last a short time, but so many people took part.](/content/images/2023/11/woowacourse-community.png)

In this article, I will introduce three design patterns I used while working on the [Christmas Promotion mission, the final assignment of the sixth Woowacourse precourse](https://github.com/woowacourse-precourse/javascript-christmas-6), with examples in JavaScript:

1. [Singleton](#singleton-pattern)
2. [Chain of Responsibility](#chain-of-responsibility-pattern)
3. [Template Method](#template-method-pattern)

The complete code for my solution is available [on GitHub](https://github.com/seongjinme/javascript-christmas-6-seongjinme/tree/refactor-231119).

## Singleton Pattern

The **Singleton pattern** restricts a class to **a single instance within an application**. It can be useful when different parts of an application need to share the same object state, or when an object needs a global access point.

### A Singleton example

Suppose we create a class called `Menu` for a restaurant ordering application. It holds and manages information about every item the restaurant serves.

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

The information in `Menu` needs to **remain consistent throughout the application**. But if different parts of the code repeatedly call `new Menu();`, each call creates a separate instance. The menu could then differ depending on which instance a piece of code refers to. It would be like visiting a restaurant and finding a different menu at every table.

One way to prevent this is to allow only one instance of `Menu` and add a way to access that instance throughout the code. Here is the revised class:

```js
class Menu {
  #items;

  constructor() {
    // Check whether an instance already exists.
    if (Menu.instance) {
      return Menu.instance;
    }

    // If not, initialize and store the new instance.
    this.#items = {};
    Menu.instance = this;
  }

  addMenuItem(name, price, category) {
    this.#items[name] = { price, category };
  }

  // Provide a static method to access the instance throughout the application.
  static getInstance() {
    if (!Menu.instance) {
      Menu.instance = new Menu();
    }
    return Menu.instance;
  }

  // Provide a static method to reset the instance when needed.
  static resetInstance() {
    if (Menu.instance) {
      Menu.instance = null;
    }
  }

  ...
}
```

With this implementation, **each attempt to create an instance returns the same instance**, unless it has been reset. The application can also access that instance through `getInstance`. Managing shared menu information in one instance helps keep the data consistent.

### Advantages and drawbacks of Singleton

The Singleton pattern offers several benefits:

1. It avoids unnecessary duplicate objects, reducing wasted resources.
2. It provides consistent access to resources shared throughout an application, such as database connections or logging objects.
3. Its global access point removes the need to pass the object through parameters or inject it as a dependency.

However, **exposing a single instance throughout the application** comes with tradeoffs:

1. Code that uses a singleton can be harder to unit test. An instance shared across different parts of the application makes it difficult to write small, independent tests.
2. Shared state needs care when multiple clients access it concurrently, as in a multithreaded environment. Without appropriate synchronization in such an environment, code that depends on that state can behave incorrectly.
3. Globally accessible state can work against object-oriented design goals such as encapsulation and hiding an object's resources from outside code.

## Chain of Responsibility Pattern

The fourth-week mission of the sixth Woowacourse precourse asked us to build an event planner. Customers would select their visit date and menu items in advance; the planner would then show the order, its total before discounts, any complimentary item, a breakdown and total of the benefits, the expected payment after discounts, and a December event badge.

The central requirement was to **apply discounts and complimentary-item benefits to a customer's order**.

In real life, these offers come with many different conditions and restrictions. Consider an online store: one coupon deducts a fixed amount, another takes a percentage off the purchase, another adds a complimentary item, and another waives shipping on the first order. The order and combination in which those coupons are applied may also determine which option is best for the customer.

For this assignment, however, we did not need to account for such complex combinations. The following conditions applied:

1. Every benefit either deducts a fixed amount from the order total or adds a particular item for free.
2. Applying one benefit does not affect the eligibility or value of another.
3. Multiple benefits can apply to the same order.
4. Changing the order in which benefits are applied does not change the result.

Under these conditions, we can consider the following implementation:

1. Represent each benefit as an object and let a handler manage those objects.
2. Have the client pass the order details to the handler.
3. Have the handler iterate over the collection, gather all applicable benefits, and return the result.

The **client only needs to ask the handler for the order's benefits. The handler walks through the chain of benefit objects and returns the accumulated result**. Each benefit object only needs to fulfill its own role. Adding or changing a benefit mainly involves working on the corresponding object, which makes maintenance easier.

The **Chain of Responsibility pattern** organizes objects into a chain through which responsibility for handling a request can pass.

### A Chain of Responsibility example

A typical implementation involves a **Client**, a **Handler**, and **ConcreteHandlers** that perform the actual work. The handler receives a request from the client and passes responsibility along the chain of concrete handlers.

![How the Chain of Responsibility pattern works.](/content/images/2023/11/chain-of-responsibility-figure-1.jpg)

The next diagram shows the connections more explicitly. Each handler refers to its successor, forming a structure similar to a singly linked list.

![The connections between handlers in the Chain of Responsibility pattern.](/content/images/2023/11/chain-of-responsibility-figure-2.jpg)

For this assignment, the benefits form a simple, one-way sequence. I therefore chose not to store successor information in every handler. Instead, I used a simplified variation: **the main handler stores an array of benefit instances, iterates over them, and adds each applicable benefit to the result**. Here is the main handler, `BenefitHandler`:

```js
class BenefitHandler {
  #benefitItems;

  constructor() {
    this.#benefitItems = this.#createBenefits();
  }

  #createBenefits() {
	// Create an array of instances representing the individual benefits.
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

    // Check whether the order meets the minimum amount for benefits.
    if (!this.#isMetConditionToApplyBenefit()) {
      return benefits;
    }

    // Iterate over the benefits and add each applicable one to benefits.
    this.#benefitItems.forEach((benefitItem) => {
      if (benefitItem.isValid()) {
        benefits = benefitItem.applyBenefit(benefits);
      }
    });

    // Return the combined benefits object.
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

The `#createBenefits` method puts instances of the individual benefit subclasses into an array. Each class has an `isValid` method that checks whether its benefit applies, and an `applyBenefit` method that adds that benefit to the `benefits` object passed as an argument. When the client calls `getBenefits`, `BenefitHandler` iterates over those instances and returns the result.

This makes it possible to collect every benefit applicable to an order without complicated branching logic.

### Advantages and drawbacks of Chain of Responsibility

The purpose of this pattern is to **reduce coupling between the objects involved in handling a client's request**. This can bring two benefits:

1. Greater flexibility and extensibility: adding or modifying handlers, or changing their processing order, becomes easier.
2. A clearer single responsibility for each object, which also helps maintenance and extension.

There are tradeoffs, too. Consider the `BenefitHandler` example. Depending on the order, none of the benefits in `benefitItems` may apply. In that case, the accumulated result is an empty object, `{}`. **Every object in the chain has been checked, but none has contributed a benefit.** Traversing handlers to find applicable ones has a computational cost, even when the request produces no useful result.

Care is also needed when linking handlers. The chains used here should form a **directed acyclic graph (DAG)**. If a more elaborate arrangement introduces multiple chains or branches, careless connections can create cycles.

## Template Method Pattern

There is still a problem to solve: implementing every benefit class from scratch is tedious and makes maintenance harder.

What if a superclass defined the shared logic for applying benefits, while subclasses supplied their own eligibility conditions and benefit calculations? That would help us preserve both maintainability and flexibility. The **Template Method pattern** does this by **defining the structure of an algorithm in a superclass and letting subclasses supply specific parts of its implementation**.

### A Template Method example

For the assignment, I identified three operations shared by the benefit classes:

1. `isValid()`: determine whether the benefit applies and return a `boolean`.
2. `getBenefit()`: calculate the benefit to apply.
3. `applyBenefit()`: add that benefit to the accumulated `benefits` object and return the object for further processing.

I then defined `Benefit` as the base class containing the shared logic. In Java, methods that subclasses must implement can be declared with the `abstract` keyword. JavaScript does not provide that keyword for class methods, so this example uses ordinary methods.

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

A method such as `getBenefit`, which supplies default behavior that subclasses can customize, is called a **hook method**.

Next, we define subclasses of `Benefit` for the individual offers. For example, `SpecialDayBenefit`, which provides a discount on particular dates within the event period, can look like this:

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

Here, `isValid` and `getBenefit` are reimplemented to match the specific business rules, while `applyBenefit` is inherited. The method names defined by the superclass, `Benefit`, remain the same, but their implementations differ in the subclass. Redefining an inherited method in this way is called **method overriding**.

Now look again at the part of `BenefitHandler` that iterates over the benefit instances:

```js
// Assume this.#benefitItems contains an array of all benefit instances.
this.#benefitItems.forEach((benefitItem) => {
  if (benefitItem.isValid()) {
    benefits = benefitItem.applyBenefit(benefits);
  }
});
```

For each benefit, `isValid` checks eligibility, then `applyBenefit` adds the benefit to the `benefits` object, much like placing an item in a shopping basket. The subclass's `getBenefit` method determines what is added. As long as a new benefit follows this shared structure, it can be added and maintained without changing the overall flow.

### Advantages and drawbacks of Template Method

The Template Method pattern has a clear advantage: **greater code reuse and flexibility**. Making the algorithm's structure explicit also helps with maintenance.

It is not useful in every situation, though. Suppose the shared logic itself needs to change. That may require changes to both the `Benefit` superclass and its subclasses. **Flexibility in individual subclasses comes with a stronger dependency on the structure defined by the superclass.**

Overusing the pattern can also make a class hierarchy complicated. It is worth continually considering **the balance between flexibility and structural complexity**, and how much abstraction the code actually needs.

## References

- [Erich Gamma et al., *Design Patterns*, Korean translation by Jung-A Kim, Protec Media, 2015](https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=56051596)
- [Chain of Responsibility Pattern: John Grib (in Korean)](https://johngrib.github.io/wiki/pattern/chain-of-responsibility/)
- [Patterns. The “Chain of Responsibility” pattern. Implementation in C++: Bestprog](https://www.bestprog.net/en/2021/09/25/patterns-the-chain-of-responsibility-pattern-implementation-in-c/)
