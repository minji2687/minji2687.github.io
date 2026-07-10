---
title: "이벤트 루프, 콜 스택, 콜백 큐"
description: "Node.js의 비동기 동작 원리 — 이벤트 루프가 콜 스택과 큐를 어떻게 조율하는지"
date: "2026-06-13"
tags: ["JavaScript", "Node.js", "async", "이벤트루프"]
---

## 전체 구조

Node.js는 스레드가 하나다. 그런데도 여러 요청을 동시에 처리할 수 있는 이유가 이벤트 루프다.

```
┌─────────────────┐     ┌──────────────────┐
│   Call Stack    │     │  Web APIs / I/O  │
│                 │     │                  │
│  (running now)  │     │  setTimeout      │
│                 │     │  DB query        │
└────────┬────────┘     │  network request │
         │              └────────┬─────────┘
         │ 스택 비면               │ 완료되면
         │ 꺼내서 올림              │ 큐에 넣음
         │              ┌────────▼─────────┐
         └──────────────│  Callback Queue  │
                        │  (pending tasks) │
                        └──────────────────┘
```

이벤트 루프의 역할: **콜 스택이 비어있으면 큐에서 꺼내서 스택에 올려줌**. 개념적으로는 그냥 무한 루프다.

```
while (true) {
  // 콜 스택이 비어있는지 확인
  // 비어있으면 마이크로태스크 큐 → (필요하면) 렌더링 → 태스크 큐 순으로 꺼내서 실행
}
```

`Web APIs` 박스에 들어가는 `setTimeout`, `fetch`, DOM 이벤트 리스너 같은 건 사실 **자바스크립트 "언어" 자체가 제공하는 게 아니라 브라우저(호스트 환경)가 제공하는 API**다. ECMAScript 스펙에는 `setTimeout`이 정의돼 있지 않다 — JS 엔진은 콜 스택과 힙만 담당하고, 비동기 작업 자체는 그 바깥(브라우저 또는 Node)이 처리한 뒤 완료되면 큐에 콜백을 넣어주는 구조다. Node.js는 브라우저가 아니라서 정확히는 "Web APIs"가 아니라 libuv 기반의 자체 바인딩(C++)으로 같은 역할을 한다 — 이름은 다르지만 "JS 엔진 바깥에서 비동기 작업을 처리하고 끝나면 큐에 넣어준다"는 구조 자체는 동일하다.

---

## 콜 스택

지금 실행 중인 코드가 쌓이는 곳이다. 함수가 호출되면 올라가고, 끝나면 내려온다.

```typescript
console.log("1번");       // 스택에 올라갔다가 즉시 내려옴
setTimeout(() => {
    console.log("3번");   // Web API에 넘겨짐, 지금 스택에 없음
}, 2000);
console.log("2번");       // 스택에 올라갔다가 즉시 내려옴

// 출력: 1번 → 2번 → (2초 후) 3번
```

---

## 큐가 두 개다

```
┌─────────────────────┐  ← 1순위 (먼저 전부 비움)
│  Microtask Queue    │  Promise.then(), await
└─────────────────────┘
┌─────────────────────┐  ← 2순위
│  Callback Queue     │  setTimeout, setInterval
└─────────────────────┘
```

```typescript
setTimeout(() => console.log("setTimeout"), 0);
Promise.resolve().then(() => console.log("Promise"));
console.log("sync");

// 출력: sync → Promise → setTimeout
// 0ms짜리 setTimeout도 Promise보다 늦게 실행됨
```

마이크로태스크 큐를 전부 비운 다음에야 콜백 큐로 넘어간다. 그런데 두 큐를 비우는 방식이 다르다 — **마이크로태스크 큐는 한 번에 전부 비우고, 콜백 큐(태스크 큐)는 한 번에 딱 하나씩만 꺼내 실행한다.** 그리고 그 하나가 끝날 때마다, 다음 태스크로 넘어가기 전에 마이크로태스크 큐부터 다시 확인한다.

```typescript
setTimeout(() => {
  console.log("macro 1");
  Promise.resolve().then(() => console.log("macro1 안에서 만든 micro"));
}, 0);

setTimeout(() => console.log("macro 2"), 0);

// 출력: macro 1 → macro1 안에서 만든 micro → macro 2
// macro 2가 아니라, macro 1 안에서 새로 생긴 micro가 먼저 실행된다 —
// 태스크를 하나 꺼내 실행한 직후 다음 태스크로 넘어가기 전에 마이크로태스크 큐부터 다시 비우기 때문이다.
```

---

## 렌더링은 언제 끼어드는가

두 큐에 실제로 뭐가 쌓이는지 정리하면 이렇다.

- **Task Queue(콜백 큐)**: `setTimeout`/`setInterval` 콜백, 클릭 같은 이벤트 콜백 — Web API가 처리를 끝내고 등록해주는 것들
- **Microtask Queue**: `Promise.then/catch/finally`, `queueMicrotask()`, 그리고 **`MutationObserver` 콜백**도 여기 포함된다

`MutationObserver`가 마이크로태스크인 건 의도된 설계다. 예전 DOM 변경 감지 API(Mutation Events)는 매번 이벤트처럼 즉시 실행돼서 성능 문제가 컸는데, 이를 대체한 `MutationObserver`는 변경 사항을 모아뒀다가 마이크로태스크 하나로 몰아서 처리하도록 만들어졌다.

그리고 이 둘 사이에 **렌더링(Render)** 단계가 끼어든다 — `requestAnimationFrame` 콜백 → Render Tree 계산 → Layout → Paint 순서다. 이 렌더링은 **마이크로태스크 큐를 전부 비운 직후, 다음 태스크로 넘어가기 전에** 필요하면 실행된다. "필요하면"의 기준이 대략 **초당 60번(60fps, 약 16.7ms에 한 번)** 이다 — 매 마이크로태스크 사이클마다 렌더링하는 게 아니라, 화면 주사율에 맞춰 그만큼의 주기로만 실행된다. `requestAnimationFrame`으로 등록한 콜백이 정확히 이 타이밍——화면이 다시 그려지기 직전, 초당 최대 60번——에 실행되는 이유가 이거다.

`requestAnimationFrame` 콜백은 Task Queue·Microtask Queue와는 별도로 **자기만의 콜백 리스트**에 쌓인다. 그 프레임이 그려지기 전까지 `requestAnimationFrame`을 여러 번 호출했다면, 그 콜백들이 리스트에 쌓여있다가 Render 단계의 "Request Animation Frame" 시점에 **등록된 순서대로 한꺼번에** 실행된 뒤, 그다음 Render Tree·Layout·Paint로 이어진다.

전체 흐름을 이어보면: **콜 스택 비움 → 마이크로태스크 큐 전부 비움 → (필요하면) 렌더링 → 태스크 큐에서 하나 꺼내 실행 → 다시 마이크로태스크 큐 확인 → …** 반복이다.

---

## async/await 내부 동작

`async/await`는 Promise를 읽기 좋게 감싼 문법이다. `await`를 만나면 함수가 스택에서 내려오고, 결과가 오면 마이크로태스크 큐를 통해 다시 올라온다.

```typescript
async function handleRequest() {
    console.log("A: 요청 들어옴");

    const user = await db.findUser(1);       // DB 쿼리 날리고 스택에서 내려옴
    console.log("B: 유저 찾음", user.name);  // 응답 오면 여기서 이어서 실행

    const posts = await db.findPosts(1);     // 또 내려감
    console.log("C: 포스트 찾음");
}

handleRequest();
console.log("D: 다른 요청 처리중");

// 출력: A → D → B → C
```

`A` 출력 후 `await` 만나는 순간 `handleRequest()`는 스택에서 내려온다. 그 사이에 `D`가 실행되고, DB 응답이 오면 마이크로태스크 큐를 통해 `B`부터 이어진다.



> 더 공부할 것: 이벤트 루프 페이즈(timers, poll, check...), libuv, Worker Thread로 CPU 작업 분리
