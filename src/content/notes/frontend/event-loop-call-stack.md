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

이벤트 루프의 역할: **콜 스택이 비어있으면 큐에서 꺼내서 스택에 올려줌**

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

마이크로태스크 큐를 전부 비운 다음에야 콜백 큐로 넘어간다.

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

---

## Java 멀티스레드와 비교

```
[ Node.js ]
웨이터 1명 — DB 기다리는 동안 다른 손님 주문받음

[ Java ]
웨이터 여러 명 — 각자 손님 1명씩 맡아서 음식 나올 때까지 옆에서 대기
```

Node.js는 I/O 대기 시간에 다른 요청을 처리해서 효율을 높인다. 대신 CPU를 오래 점유하는 작업(무거운 계산)이 있으면 그동안 다른 요청이 전부 멈춘다 — 스택을 그 작업이 독점하기 때문이다.

---

> 더 공부할 것: 이벤트 루프 페이즈(timers, poll, check...), libuv, Worker Thread로 CPU 작업 분리
