---
title: "불변성과 얕은 복사, 깊은 복사"
date: "2026-08-19"
tags: ["JavaScript", "Immutability", "Redux", "React"]
description: "Redux useSelector가 왜 참조 비교로 동작하는지 읽다가, 그 밑에 깔린 원시값 vs 참조값, 얕은 복사와 깊은 복사 개념을 다시 정리한 노트."
draft: true
---

프론트엔드 성능 최적화 책의 리덕스 리렌더링 최적화 파트를 읽다가 걸린 부분이 있다. `useSelector`가 반환값을 **참조 동일성(reference equality)**으로 비교한다는 문장인데, 이걸 제대로 이해하려면 결국 "왜 객체는 값이 같아도 참조가 다를 수 있는가" — 즉 불변성과 얕은/깊은 복사 얘기까지 내려가야 했다. 그래서 이 노트는 책 내용 요약이 아니라, 그 문장 하나를 이해하기 위해 다시 정리한 기초 개념이다.

## 원시값과 참조값은 "같음"의 기준이 다르다

자바스크립트에서 값은 크게 두 종류로 나뉜다.

- **원시값(primitive)** — `number`, `string`, `boolean`, `null`, `undefined`, `symbol`, `bigint`. 변수에 담기는 건 값 그 자체다.
- **참조값(reference)** — `object`, `array`, `function`. 변수에 담기는 건 값이 아니라 그 값이 저장된 메모리 주소(참조)다.

```js
const a = 1;
const b = 1;
a === b; // true — 값 자체를 비교

const obj1 = { x: 1 };
const obj2 = { x: 1 };
obj1 === obj2; // false — 내용은 같지만 서로 다른 메모리에 있는 별개의 객체

const obj3 = obj1;
obj3 === obj1; // true — 같은 객체를 가리키는 참조이므로 같음
```

`===` 비교에서 객체/배열은 **내용이 아니라 참조 주소**를 비교한다. `obj1`과 `obj2`는 내용이 똑같아도 서로 다른 자리에 만들어진 별개의 객체라 `false`다. 이게 바로 `useSelector`가 매 렌더마다 `{ photos, loading }` 같은 객체 리터럴을 새로 반환하면, 안의 값이 그대로여도 매번 "다른 객체"로 판정되어 리렌더링이 트리거되는 이유였다.

## 불변성(immutability)이란

불변성은 "한번 만든 값을 직접 바꾸지 않고, 바꾼 결과를 담은 새 값을 만든다"는 원칙이다. 원시값은 애초에 재할당 자체가 새 값을 가리키는 것이라 자연히 불변이지만, 객체/배열은 내부를 직접 고칠 수 있기 때문에 의식적으로 지켜야 하는 규칙이 된다.

```js
// 불변성을 깨는 방식 — 기존 객체를 직접 수정(mutate)
const state = { count: 1 };
const next = state;
next.count = 2;
state.count; // 2 — state도 같이 바뀌어버림 (같은 참조를 공유하니까)

// 불변성을 지키는 방식 — 새 객체를 만들어서 교체
const state2 = { count: 1 };
const next2 = { ...state2, count: 2 };
state2.count; // 1 — 원본은 그대로, next2가 새 참조로 분리됨
```

React/Redux가 불변성을 강제하다시피 하는 이유가 여기 있다. React는 `useState`의 setter나 Redux의 리듀서가 반환한 값이 이전과 다른 참조인지만 보고 "다시 그릴지 말지"를 결정한다(`Object.is` 기반 비교). **상태 객체를 직접 mutate하면 참조가 그대로라 값이 바뀌었어도 리렌더링이 아예 안 일어나는 버그가 생기고, 반대로 안 바뀐 값까지 매번 새 객체로 감싸버리면 책에서 본 것처럼 불필요한 리렌더링이 생긴다.** 결국 "필요한 부분만 정확히 새 참조로 바꾸는 것"이 목표고, 그러려면 복사를 어떻게 하는지가 중요해진다.

## 얕은 복사(shallow copy)

얕은 복사는 **가장 바깥쪽 1단계(depth)**만 새 객체/배열로 만들고, 그 안에 중첩된 객체/배열은 원본과 참조를 그대로 공유하는 복사다.

```js
const original = { user: { name: "minji" }, count: 1 };
const copy = { ...original }; // spread — 대표적인 얕은 복사

copy.count = 2;
original.count; // 1 — 바깥쪽 필드는 서로 분리됨

copy.user.name = "changed";
original.user.name; // "changed" — 안쪽 user 객체는 여전히 같은 참조를 공유!
```

`copy`를 만들 때 `user` 필드는 "새로운 객체"가 아니라 "원본이 가리키던 그 객체의 주소"를 그대로 복사한 것이다. 그래서 `copy.user`와 `original.user`는 `===` 비교하면 `true`다. 얕은 복사로 만들 수 있는 방법은 몇 가지가 있다.

```js
const shallow1 = { ...original };
const shallow2 = Object.assign({}, original);
const arr = [1, 2, 3];
const shallowArr = [...arr];
const shallowArr2 = arr.slice();
```

## 깊은 복사(deep copy)

깊은 복사는 중첩된 객체/배열까지 재귀적으로 전부 새로 만들어서, 원본과 참조를 하나도 공유하지 않는 복사다.

```js
const original = { user: { name: "minji" } };
const deep = structuredClone(original); // 최신 환경(Node 17+, 대부분의 브라우저)에서 표준 API

deep.user.name = "changed";
original.user.name; // "minji" — 완전히 분리됨
```

과거엔 `JSON.parse(JSON.stringify(obj))`로 깊은 복사를 흉내 내는 경우가 많았는데, `function`/`undefined`/`Symbol`이 사라지고 `Date`가 문자열로 바뀌는 등 손실이 있어서 지금은 `structuredClone`이나 `lodash`의 `cloneDeep`을 쓰는 게 낫다. 다만 깊은 복사는 트리 전체를 순회하는 비용이 있어서, React/Redux 상태 업데이트처럼 자주 일어나는 작업에는 보통 과하다 — 그래서 실무에서는 "바뀐 경로만 얕은 복사를 중첩해서" 불변성을 지키는 패턴을 쓴다.

```js
// 중첩 객체의 특정 필드만 바꿀 때 — 바뀌는 경로를 따라서만 얕은 복사를 반복
const state = { user: { name: "minji", age: 20 }, count: 1 };

const next = {
  ...state,
  user: { ...state.user, age: 21 }, // user는 새 참조, count는 그대로
};

next === state; // false
next.user === state.user; // false — 바뀐 경로라서 새 참조
next.count === state.count; // true (원시값이라 항상 값 비교)
```

`count`는 안 건드렸으니 그대로 두고, `user`만 새로 만들어서 감싼다. 이렇게 하면 "바뀐 부분만 새 참조"가 되어서, `count`만 구독하는 컴포넌트는 리렌더링되지 않고 `user`를 구독하는 컴포넌트만 리렌더링된다.

## 다시 책 내용으로: shallowEqual이 필요했던 이유

책에서 두 번째 해결책으로 나온 `shallowEqual`이 정확히 "얕은 복사"와 짝을 이루는 개념이라는 걸 이제 알겠다. `useSelector(selector, shallowEqual)`은 selector가 반환한 객체를 **참조가 아니라 1단계 필드값**으로 비교한다 — 즉 얕은 복사로 새로 만들어진 객체라도, 그 안의 `src`, `alt` 같은 원시값 필드가 이전과 같다면 "실질적으로 같다"고 판단해서 리렌더링을 막아준다.

반대로 책 p.214에서 `allPhotos.filter(...)`를 selector 안에 그대로 두면 안 된다고 한 이유도 같은 맥락이다. `filter`는 매 호출마다 새 배열을 만드는 연산이라, `shallowEqual`로 배열 자체를 비교해도(배열끼리는 참조 비교) 매번 다른 배열이 나와서 무용지물이 된다 — 그래서 filter 같은 "새 참조를 만들어내는 연산"은 selector 밖, 컴포넌트 body로 옮겨서 memoization(예: `useMemo`나 `reselect`)으로 따로 관리해야 한다는 결론으로 이어진다.

정리하면:

| 개념 | 무엇을 비교/복사하는가 |
|---|---|
| `===` (참조 비교) | 객체/배열은 메모리 주소, 원시값은 값 자체 |
| 얕은 복사 | 바깥쪽 1단계만 새 참조, 중첩된 값은 원본과 공유 |
| 깊은 복사 | 모든 depth를 재귀적으로 새 참조로 분리 |
| `shallowEqual` | 얕은 복사로 만들어진 객체를 1단계 필드값 기준으로 "같다" 판정 |

## 실무에서는 왜 뎁스를 얕게 설계할까

실무에서 깊은 복사보다 얕은 복사를 훨씬 많이 쓰는 이유는 간단하다. 상태 변화를 감지하려면 결국 참조가 바뀌어야 하는데, 매번 트리 전체를 깊은 복사하는 건 비용도 크고 낭비다. 그런데 얕은 복사만으로 참조를 바꾸려면, 위에서 본 것처럼 "바뀐 경로를 따라 매 depth마다 스프레드를 반복"해야 한다.

```js
// depth가 깊어질수록 스프레드도 그만큼 반복된다
const next = {
  ...state,
  user: {
    ...state.user,
    address: { ...state.user.address, city: "Seoul" },
  },
};
```

경로 중 한 단계라도 스프레드를 빼먹으면 그 지점에서 원본과 참조가 다시 공유되면서 불변성이 조용히 깨진다. 그래서 결론은 "무조건 depth 1로 강제"라기보다 — **얕은 복사가 감당 가능한 수준까지 depth를 낮게 설계하자**는 쪽에 가깝다. Redux 공식 문서가 권장하는 **정규화(normalization)**가 바로 이 문제를 구조적으로 푸는 방법이다.

**중첩된 구조 (지양) — 뎁스가 깊고, 업데이트하려면 배열을 뒤져야 한다**

```js
{
  posts: [
    {
      id: 1,
      title: "첫 글",
      author: { id: 10, name: "minji" },
      comments: [
        { id: 100, text: "좋은 글이네요", author: { id: 11, name: "guest" } },
      ],
    },
  ],
}
```

댓글 하나의 text만 바꾸려 해도 `posts` 배열에서 해당 post를 찾고, 그 안 `comments` 배열에서 해당 comment를 찾아 내려가야 한다 — 배열 인덱스 기반이라 위치도 매번 탐색해야 한다.

**정규화된 구조 (권장) — id로 바로 찾고, 업데이트는 항상 1~2뎁스**

post가 여러 개, 그 안에 각각 다른 comment/author가 물려 있는 상황을 예로 들면 이렇다.

```js
{
  posts: {
    byId: {
      1: { id: 1, title: "첫 글", authorId: 10, commentIds: [100, 101] },
      2: { id: 2, title: "얕은 복사 정리", authorId: 10, commentIds: [102] },
      3: { id: 3, title: "Redux 없이 살기", authorId: 12, commentIds: [] },
    },
    allIds: [1, 2, 3],
  },
  comments: {
    byId: {
      100: { id: 100, text: "좋은 글이네요", authorId: 11, postId: 1 },
      101: { id: 101, text: "저도 헷갈렸는데 정리됐어요", authorId: 12, postId: 1 },
      102: { id: 102, text: "normalize 개념 감사해요", authorId: 11, postId: 2 },
    },
    allIds: [100, 101, 102],
  },
  users: {
    byId: {
      10: { id: 10, name: "minji" },
      11: { id: 11, name: "guest1" },
      12: { id: 12, name: "guest2" },
    },
    allIds: [10, 11, 12],
  },
}
```

각 테이블이 서로를 참조하는 방식을 뜯어보면:

- `posts.byId[1].authorId`가 `10`이면, 그 글쓴이는 `users.byId[10]`을 보면 된다 — user 객체 전체를 post 안에 들고 있지 않고 id만 들고 있다.
- `posts.byId[1].commentIds`는 `[100, 101]` — 이 글에 달린 댓글이 몇 개인지, 어떤 순서인지가 이 배열 하나로 정해진다.
- `comments.byId[100].postId`는 `1` — 반대로 "이 댓글이 어느 글 소속인지"도 역참조로 바로 찾을 수 있다. (관계형 DB의 foreign key와 같은 발상)

**`allIds`는 순서를 담당한다.** `byId`는 객체라 순서를 신뢰할 수 없으니, "화면에 어떤 순서로 보여줄지"는 `allIds` 배열이 따로 책임진다. 예를 들어 정렬 기준을 바꾸고 싶으면 `byId` 안 데이터는 그대로 두고 `allIds` 배열 순서만 바꾸면 된다.

**화면에 리스트로 그리려면 `allIds`를 `byId`에 매핑해서 원래 배열 형태로 복원한다.**

```js
const postList = state.posts.allIds.map((id) => state.posts.byId[id]);
// [{id:1, title:"첫 글", ...}, {id:2, title:"얕은 복사 정리", ...}, {id:3, ...}]
```

**id로 바로 찾을 수 있어서 검색이 O(1)이다.** 배열이었다면 `posts.find(p => p.id === 2)`처럼 전체를 순회해야 했지만, 정규화된 구조에서는 `posts.byId[2]`로 바로 접근된다.

댓글 100번의 text를 바꾸는 업데이트는 이제 이렇게 끝난다.

```js
const next = {
  ...state,
  comments: {
    ...state.comments,
    byId: {
      ...state.comments.byId,
      100: { ...state.comments.byId[100], text: "수정된 댓글" },
    },
  },
};
```

여전히 스프레드를 몇 번 하긴 하지만, **어떤 엔티티를 업데이트하든 항상 같은 뎁스(byId → id)로 끝난다** — 배열을 순회해서 위치를 찾을 필요가 없고, post 안에 중첩되어 있던 author/comments가 각자 독립된 테이블로 분리되어 서로의 변경이 서로를 건드리지 않는다. 관계형 DB 테이블을 정규화하는 것과 같은 발상이다 (`postId`, `authorId`처럼 id로 참조).

이런 정규화 상태를 직접 손으로 짜는 게 번거로우면, RTK의 `createEntityAdapter`가 `{ ids: [], entities: {} }` 형태로 이 구조를 자동으로 만들어주고 CRUD용 reducer/selector까지 생성해준다.

## Immer는 왜 쓰는가 — 새 개념이 아니라 세 번째 방법의 자동화

상태를 업데이트하는 방법을 정리하면 사실상 세 가지다.

| 방법 | 뭘 복사하는가 | 문제 |
|---|---|---|
| 얕은 복사 1번 (`{...state}`) | 바깥 1단계만 | 중첩된 값을 고치면 원본까지 같이 바뀐다 (뎁스 2부터 안전하지 않음) |
| 깊은 복사 (`structuredClone`) | 트리 전체 | 안 건드린 부분까지 다 복사돼서 낭비, 매 업데이트마다 하기엔 비용이 크다 |
| 경로 따라 얕은 복사를 반복 (`{...state, user: {...state.user, age: 21}}`) | 바뀐 경로만 | 이게 정답인데, 손으로 쓰면 뎁스만큼 스프레드를 반복해야 해서 코드가 길고 실수하기 쉽다 |

Immer는 이 셋과 나란히 놓이는 새로운 복사 방식이 아니라, **세 번째 방법(경로 따라 얕은 복사 반복)을 그대로 실행해주는 도구**다. 결과로 만들어지는 최종 객체는 손으로 스프레드를 반복해서 만든 것과 완전히 같다 — 달라지는 건 문법뿐이다. `{...state, user: {...state.user, age: 21}}`라고 쓰는 대신 `draft.user.age = 21`이라고 쓰면, Immer가 내부적으로 그 경로만 얕은 복사를 반복해서 같은 결과를 만들어준다.

즉 "깊은 복사 대신 Immer를 쓴다"가 아니라, **손으로 하면 귀찮고 실수하기 쉬운 세 번째 방법을 도구가 대신 해주는 것**이다.

## 참고

- [Normalizing State Shape – Redux 공식 문서](https://redux.js.org/usage/structuring-reducers/normalizing-state-shape)
