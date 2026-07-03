---
title: "TypeScript 고급 문법 정리"
description: "Generics부터 Conditional/Mapped Types까지, 어디까지 익숙하게 쓰고 어디부터 더 채워야 하는지 기준점 삼아 정리한다."
date: "2026-06-23"
tags: ["TypeScript"]
---

## 익숙하게 쓰는 것

### Generics

타입을 파라미터처럼 받는 문법. 함수/컴포넌트/훅을 타입에 묶이지 않게 만들 때 가장 먼저 손이 가는 도구다.

```ts
function wrapInArray<T>(value: T): T[] {
  return [value];
}

wrapInArray(1); // number[]
wrapInArray('a'); // string[]
```

React에서는 컴포넌트 props나 커스텀 훅 반환값에 자주 쓴다.

```ts
function useAsyncState<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  return { state, setState };
}
```

### Utility Types

타입을 변형해서 새 타입을 만드는 내장 도구들. 직접 타입을 새로 적기보다 기존 타입을 재활용하는 쪽이라 중복을 줄인다.

```ts
type User = {
  id: string;
  name: string;
  email: string;
};

type UserPreview = Pick<User, 'id' | 'name'>; // 일부만
type UserWithoutEmail = Omit<User, 'email'>; // 일부 제외
type UserDraft = Partial<User>; // 전부 optional
type UserStrict = Required<User>; // 전부 필수
type UserMap = Record<string, User>;
```

`Partial<User>`와 `Required<User>`는 `id`/`name`/`email` 중 일부가 아니라 **객체 안의 모든 필드**에 한꺼번에 적용된다. 풀어서 쓰면 이런 모양이다.

```ts
// UserDraft (Partial<User>)와 동일
type UserDraft = {
  id?: string;
  name?: string;
  email?: string;
};

// UserStrict (Required<User>)와 동일
type UserStrict = {
  id: string;
  name: string;
  email: string;
};
```

만약 일부 필드만 optional로 만들고 싶다면 `Partial`이 아니라 `Pick`/`Omit`을 섞어서 쓴다(예: `Partial<Pick<User, 'name'>> & Omit<User, 'name'>` — `name`만 optional, 나머지는 그대로).

`Record<K, V>`는 "키는 K 타입, 값은 V 타입인 객체"를 뜻한다. 즉 `UserMap`은 아래와 같은 모양의 객체에 타입을 붙인 것이다.

```ts
const usersById: UserMap = {
  'u1': { id: 'u1', name: '민지', email: 'a@a.com' },
  'u2': { id: 'u2', name: '철수', email: 'b@b.com' },
};

usersById['u1'].name; // string으로 추론됨, 자동완성도 됨
```

배열에서 `id`로 매번 `find`하는 대신, id를 키로 쓰는 객체(맵)로 들고 있으면 바로 꺼내 쓸 수 있다. `Record<string, User>`는 그 객체의 키·값 타입을 명시해주는 역할이다.

폼 입력 중간 상태(아직 다 안 채워짐 → `Partial`), API 응답 일부만 화면에 필요할 때(`Pick`) 같은 상황에서 자연스럽게 쓰게 된다.

### type vs interface

객체 모양을 정의할 때는 둘이 거의 똑같다.

```ts
type User = {
  id: string;
  name: string;
};

interface User {
  id: string;
  name: string;
}
```

차이가 드러나는 건 두 가지 경우다.

**① `type`은 객체가 아닌 것도 표현할 수 있다.**

```ts
type ID = string | number;         // 유니온
type Status = 'success' | 'error'; // 리터럴 유니온
type Pair = [string, number];      // 튜플

// interface는 객체(또는 함수/클래스) 모양만 표현 가능 — 위 셋은 못 만든다
```

**② 확장하는 방식이 다르다.**

```ts
// interface는 같은 이름으로 두 번 선언하면 자동으로 합쳐진다 (선언 합치기)
interface User {
  id: string;
}
interface User {
  name: string;
}
// User = { id: string; name: string }

// type은 같은 이름을 두 번 선언하면 에러
type User = { id: string };
type User = { name: string }; // ❌ 에러: 이미 선언된 이름
```

대신 `type`은 `&`(intersection)로 합치고, `interface`는 `extends`로 상속한다.

```ts
type Base = { id: string };
type WithName = Base & { name: string };

interface IBase {
  id: string;
}
interface IWithName extends IBase {
  name: string;
}
```

**기준**: 객체/클래스 모양이고 나중에 다른 곳에서 확장될 여지가 있으면 `interface`, union·튜플·함수 타입처럼 객체 모양이 아니거나 변형이 필요하면 `type`. React 컴포넌트 props는 둘 다 흔하게 쓰여서 팀 컨벤션 차이가 크다.

---

## 가끔 쓰는 것

### Mapped Types

기존 타입의 모든 키를 순회하면서 새 타입을 만드는 문법. Utility Type들(`Partial`, `Readonly` 등)도 내부적으로 이 방식으로 구현돼 있다.

```ts
type ReadonlyUser = {
  readonly [K in keyof User]: User[K];
};

// 값만 boolean으로 바꾸기
type FlagsOf<T> = {
  [K in keyof T]: boolean;
};
type UserFlags = FlagsOf<User>; // { id: boolean; name: boolean; email: boolean }
```

직접 만든 Utility Type이 필요할 때(예: 모든 필드를 폼의 "터치 여부"로 매핑) 가끔 쓴다.

---

## 다음에 채울 것

아직 실전에서 깊게 써본 적은 없지만, 다음에 직접 써보면서 채워나갈 것들.

### Conditional Types

타입 세계의 if/else다. JS 삼항 연산자(`조건 ? A : B`)랑 모양이 똑같은데, 비교 대상이 "값"이 아니라 "타입"이라는 점만 다르다.

```ts
type IsString<T> = T extends string ? true : false;
```

이렇게 읽으면 된다: "T가 string에 들어맞으면 true 타입, 아니면 false 타입."

```ts
type A = IsString<'hi'>; // T = 'hi' → string에 들어맞음 → true
type B = IsString<42>;   // T = 42 → string이 아님 → false
```

이 자체로는 거의 쓸 일이 없다. 진짜 쓰임은 "입력 타입에 따라 다른 출력 타입을 만들어주는 함수"를 만들 때 나온다. 예를 들어 배열이면 그 원소 타입을 꺼내고, 배열이 아니면 그대로 두고 싶다고 하자.

```ts
type ElementType<T> = T extends (infer U)[] ? U : T;

type A = ElementType<string[]>; // string
type B = ElementType<number>;   // number (배열이 아니니 그대로)
```

`T extends (infer U)[]`는 "T가 어떤 배열이라면, 그 안에 들어있는 원소 타입을 U라고 부르겠다"는 뜻이다(`infer`는 바로 아래에서 더 다룬다).

처음에 적었던 `ApiResult` 예시도 같은 패턴이다.

```ts
type ApiResult<T> = T extends { error: true } ? null : T;

type Success = ApiResult<{ data: string }>; // { data: string } — 조건에 안 맞으니 그대로
type Failure = ApiResult<{ error: true }>;  // null — 조건에 맞아서 null로 바뀜
```

"API 응답이 에러 모양(`{ error: true }`)이면 어차피 쓸 데이터가 없으니 타입을 `null`로 만들어버리고, 정상 응답이면 원래 타입을 그대로 쓴다"는 의도다. 즉 값이 아니라 **타입 자체**를 입력에 따라 다르게 계산해주는 도구.

### Type Guard / Discriminated Union

```ts
// 사용자 정의 타입 가드
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

// 태그된 유니온
type Result =
  | { status: 'success'; data: string }
  | { status: 'error'; message: string };

function handle(result: Result) {
  if (result.status === 'success') {
    console.log(result.data); // 이 분기에서는 data만 보임
  } else {
    console.log(result.message);
  }
}
```

### Template Literal Types

```ts
type EventName = 'click' | 'hover';
type HandlerName = `on${Capitalize<EventName>}`; // 'onClick' | 'onHover'
```

### infer

조건부 타입의 `extends` 절 안에서 타입의 일부를 "캡쳐"해서 새 타입 변수로 쓰는 키워드. 사실 위 `ElementType<T>`의 `infer U`가 이미 그 예시였다 — "배열이면 그 안의 원소 타입을 U라는 이름으로 뽑아내겠다"는 뜻이었다.

같은 패턴으로 함수의 반환 타입도 뽑아낼 수 있다.

```ts
type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser() {
  return { id: '1', name: '민지' };
}

type User = ReturnTypeOf<typeof getUser>; // { id: string; name: string }
```

풀어서 읽으면: "T가 어떤 함수 모양(`(...args: any[]) => 무언가`)에 들어맞으면, 그 '무언가'(반환 타입)를 R이라는 이름으로 뽑아낸다. 안 맞으면 never." `(...args: any[]) => infer R`에서 `infer R`이 있는 자리가 바로 "캡쳐할 위치"다 — 함수의 반환 타입 자리에 있는 게 뭐든 R로 부르겠다는 뜻. 실제로 이 유틸리티는 TS 내장 `ReturnType<T>`와 동일하다.

```ts
type Same = ReturnType<typeof getUser>; // ReturnTypeOf<typeof getUser>와 같은 결과
```

`infer`는 함수 반환 타입뿐 아니라 어떤 타입 구조 안에서도 쓸 수 있다. 예를 들어 `Promise`가 감싸고 있는 실제 값의 타입을 뽑아내고 싶다면:

```ts
type Unwrap<T> = T extends Promise<infer V> ? V : T;

type A = Unwrap<Promise<string>>; // string
type B = Unwrap<number>;          // number (Promise가 아니니 그대로)
```

패턴은 항상 같다: "T가 어떤 구조에 들어맞으면, 그 구조 안의 한 자리를 변수로 캡쳐해서 꺼내 쓴다." 배열이면 원소 타입을(`ElementType`), 함수면 반환 타입을(`ReturnTypeOf`), Promise면 내부 값 타입을(`Unwrap`) — 캡쳐하는 위치만 바뀔 뿐이다.

### 함수 오버로드 시그니처

```ts
function format(value: string): string;
function format(value: number): string;
function format(value: string | number): string {
  return String(value);
}
```

### satisfies

```ts
const config = {
  width: 100,
  height: 200,
} satisfies Record<string, number>;
// config.width는 number로 추론되면서, Record<string, number> 제약도 검사됨
```

### declare module / 네임스페이스 확장

서드파티 라이브러리에 타입이 없거나, 기존 타입에 필드를 더 얹어야 할 때.

```ts
declare module 'some-untyped-lib' {
  export function doSomething(x: number): void;
}
```

---

> 다음에 할 일: 위 "다음에 채울 것" 항목들을 실제 프로젝트 코드에서 써보고, 여기에 구체적 사례를 추가하기.
