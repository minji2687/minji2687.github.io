---
title: "this 바인딩, 클로저와 정반대인 이유"
date: "2026-08-22"
tags: ["JavaScript", "this", "클로저"]
description: "this가 헷갈리는 이유는 클로저와 정반대 규칙으로 동작하기 때문이다. '정의 시점'이 아니라 '호출 시점'에 결정된다는 원리 하나로 4가지 바인딩 규칙과 화살표 함수 예외를 정리한다."
draft: false
---

`this`가 매번 헷갈렸던 건, 규칙을 따로따로 외우려고 했기 때문이었다. 사실 원리는 하나다 — **클로저와 정확히 반대로 동작한다**는 것. 클로저는 함수가 "정의되는 순간" 스코프가 고정되지만, `this`는 함수가 "호출되는 순간"마다 다시 결정된다. 이 하나의 원리에서 나머지 규칙이 전부 따라 나온다.

## 함수 자체에는 this가 없다

```js
function whoAmI() { console.log(this.name); }

const obj1 = { name: 'A', whoAmI };
const obj2 = { name: 'B', whoAmI };

obj1.whoAmI(); // "A"
obj2.whoAmI(); // "B" — 완전히 같은 함수인데 결과가 다르다
```

`obj1.whoAmI`와 `obj2.whoAmI`는 같은 함수 객체를 가리킨다. `this`가 함수에 각인돼 있었다면 둘 다 같은 값을 찍어야 하는데, 실제로는 다르다. 이게 `this`가 함수 안에 고정된 값이 아니라, **호출하는 코드 줄에서 그때그때 계산되는 값**이라는 증거다.

```js
const fn = obj1.whoAmI;
fn(); // TypeError (strict mode) — this가 undefined라서 this.name에서 터짐
```

`fn`은 `obj1.whoAmI`와 같은 함수인데, 이번엔 `this`가 아예 없다. 객체에서 메서드를 "떼어내서" 변수에 담고 점 없이 호출했기 때문이다. 클래스 메서드를 콜백으로 그냥 넘길 때(`setTimeout(obj.method, 1000)`) `this`가 깨지는 버그가 정확히 이 패턴이다.

## 판별법: "호출 코드에서 점(.) 왼쪽에 뭐가 있는가"

가장 흔한 케이스는 이 한 줄로 다 해결된다.

```js
const obj = {
  name: 'A',
  inner: {
    name: 'B',
    whoAmI() { console.log(this.name); }
  }
};
obj.inner.whoAmI(); // "B" — 바로 왼쪽의 inner가 this. obj는 상관없음
```

점이 없으면 `this`도 없다. 콜백 함수로 넘기는 순간 "점 없는 호출"이 되는 경우가 실무에서 제일 자주 걸리는 함정이다.

```js
const arr = ['a', 'b', 'c'];
arr.forEach(function () {
  console.log(this); // undefined(strict) / 전역 객체 — forEach가 내부적으로 fn()처럼 점 없이 호출하기 때문
});
```

## 점 왼쪽이 애매할 때: 4가지 우선순위 규칙

"점 왼쪽"이 명확하지 않은 경우(생성자 호출, 명시적 바인딩 등)를 위한 우선순위 체크리스트다. 외울 규칙이 아니라 위에서부터 순서대로 "이 중 뭐에 해당하지?"만 확인하면 된다.

**1순위 — `new` 바인딩**: `new`가 새로 만든 객체를 강제로 `this`에 꽂는다.

```js
function Person(name) { this.name = name; }
const p = new Person('민지');
p.name; // "민지"
```

**2순위 — 명시적 바인딩(`call`/`apply`/`bind`)**: "이걸 `this`로 써라"고 직접 지정.

```js
function greet() { console.log(`안녕, ${this.name}`); }
const user = { name: '민지' };

greet.call(user);        // "안녕, 민지" — 인자를 하나씩 나열
greet.apply(user, []);   // "안녕, 민지" — 인자를 배열로 전달

const boundGreet = greet.bind(user); // this를 영구히 고정한 새 함수를 반환(즉시 실행 X)
boundGreet(); // "안녕, 민지"
```

**3순위 — 암묵적 바인딩(메서드 호출)**: 점 왼쪽에 있는 객체.

```js
const user2 = { name: '민지', greet() { console.log(`안녕, ${this.name}`); } };
user2.greet(); // "안녕, 민지"
```

**4순위 — 기본 바인딩**: 아무것도 해당 안 되면.

```js
function greet() { console.log(this); }
greet(); // strict mode: undefined / non-strict: 전역 객체(window)
```

**우선순위가 실제로 충돌하는 예시** — `bind`가 나중의 `call`보다 항상 이긴다.

```js
function greet() { console.log(this.name); }
const userA = { name: 'A' };
const userB = { name: 'B' };

const bound = greet.bind(userA); // 2순위로 this를 A에 고정
bound.call(userB); // "A" — 나중에 call로 B를 넘겨도 소용없음. bind가 한 번 고정하면 못 바꾼다
```

## 화살표 함수는 이 규칙 자체를 안 따른다

화살표 함수는 "호출될 때 다시 계산"하는 4가지 규칙 자체가 적용되지 않는다. 대신 **클로저처럼** 정의된 시점의 렉시컬 스코프에 있는 `this`를 그대로 물려받아 고정해버린다.

```js
class Timer {
  seconds = 0;
  start() {
    setInterval(() => { this.seconds++; }, 1000); // ✅ 화살표라 Timer 인스턴스의 this를 그대로 씀
  }
}
```

```js
class Timer {
  seconds = 0;
  start() {
    setInterval(function () { this.seconds++; }, 1000); // ❌ 일반 함수라 4순위(기본 바인딩)로 떨어짐 — this가 Timer 인스턴스가 아님
  }
}
```

`setInterval`이 콜백을 부를 때는 그냥 `fn()`처럼 점 없이 호출한다. 일반 함수라면 4순위 규칙이 적용돼 `this`가 사라지지만, 화살표 함수는 애초에 이 계산을 안 하고 `start()`가 호출되던 시점(`this === Timer 인스턴스`)의 `this`를 그대로 들고 있다.

## 실전에서 제일 자주 만나는 패턴

```js
class Button {
  label = '클릭';
  handleClick() { console.log(this.label); }
}
const btn = new Button();

element.addEventListener('click', btn.handleClick);
// ❌ 클릭하면 this === element (addEventListener가 리스너를 element.method()처럼 호출)
```

해결책은 셋 다 "호출 시점에 this가 날아가지 않게 묶어둔다"는 같은 원리다.

```js
element.addEventListener('click', () => btn.handleClick()); // 화살표로 감싸서 클로저처럼 btn을 붙잡음
element.addEventListener('click', btn.handleClick.bind(btn)); // bind로 this를 영구 고정
// 또는 클래스 필드 자체를 화살표 함수로 선언
class Button {
  label = '클릭';
  handleClick = () => { console.log(this.label); }; // 인스턴스마다 생성 시점에 this가 고정됨
}
```

## 왜 이렇게 설계됐나

JS 함수는 원래 특정 객체 전용으로 못 박혀 있지 않고, 아무 객체에나 메서드로 빌려 쓸 수 있게 설계됐다 — 맨 위 `obj1.whoAmI` / `obj2.whoAmI`가 같은 함수를 공유했던 예시가 그 증거다. 이 재사용을 가능하게 하려면 `this`가 함수 정의에 고정돼 있으면 안 되고, "지금 누가 부르는가"에 따라 매번 달라져야 한다. 그래서 클로저(정의 시점에 스코프 고정)와 정반대로, `this`는 일부러 호출 시점 동적 바인딩으로 설계됐다.

## 한 줄 요약

`this`를 볼 때 함수가 어디 적혀있는지는 무시하고, **그 함수를 호출하는 코드 줄에서 점(`.`) 왼쪽에 뭐가 있는지만** 본다. 점이 없으면 4가지 우선순위(`new` > `call/apply/bind` > 점 왼쪽 > 기본값)를 순서대로 확인한다. 화살표 함수만 예외 — 이 계산 자체를 안 하고 클로저처럼 정의 시점의 `this`를 그대로 쓴다.
