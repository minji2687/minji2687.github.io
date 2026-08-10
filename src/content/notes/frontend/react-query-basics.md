---
title: "React Query 기초 개념 정리 (공식문서 기반)"
date: "2026-07-20"
tags: ["React", "React Query", "커스텀 훅"]
description: "왜 커스텀 훅만으로는 부족하고 React Query가 필요한지, 기본 캐싱 동작과 query key를 TanStack Query 공식문서 기준으로 정리한다."
draft: false
---

## 검수 메모 — v5 기준 정리

- `useQuery({ queryKey, queryFn, ...options })` — 인자 3개 방식(v3) 아님, 객체 하나
- 패키지명 `@tanstack/react-query` (구 `react-query`)
- `cacheTime` → `gcTime`
- `isLoading` → `isPending` (isLoading은 `isPending && isFetching` 파생 플래그로 잔류)
- status 문자열 `'loading'` → `'pending'`
- `onSuccess`/`onError`/`onSettled` 쿼리 옵션 콜백 제거 → `useEffect`로 처리
- `suspense: true` 옵션 제거 → `useSuspenseQuery` 등 전용 훅으로 분리


## TanStack Query란

React Query는 정확히는 TanStack Query의 React 어댑터다. 공식 소개 문구가 "Powerful asynchronous state management"인데, 여기서 핵심은 "state management"가 아니라 "**asynchronous** state management"라는 점이다.

TanStack Query는 흔히 **"서버 상태(server state) 관리 라이브러리"**로 불린다. Redux나 Zustand로 다루는 "모달 열림 여부", "폼 입력값" 같은 값(클라이언트 상태)과, TanStack Query가 다루는 "서버 DB에 있는 데이터"(서버 상태)는 성격이 다르기 때문이다.

- 내 컴퓨터가 아니라 **서버에 있는** 데이터라, `fetch` 같은 **비동기 요청**으로만 얻을 수 있다
- 다른 사람도 같이 쓰는 데이터라, 내가 안 건드려도 **누가 바꿔놓을 수 있다**
- 그래서 방금 받아온 값도 시간이 지나면 **오래된(stale) 값**이 될 수 있다

Redux/Zustand가 이런 문제를 못 푸는 게 아니라, 애초에 그 라이브러리들이 풀도록 설계된 문제(클라이언트 상태)와 다른 문제라는 뜻이다.

TS/JS 기반이면 React뿐 아니라 Solid, Vue, Svelte에도 같은 코어를 쓸 수 있다는 것도 포인트. 즉 "React 전용 데이터 fetching 라이브러리"가 아니라 프레임워크에 독립적인 코어 위에 각 프레임워크용 어댑터가 얹힌 구조.

## 커스텀 훅으로 fetch를 감싸면 뭐가 부족한가

예를 들어 이런 훅이 있다고 하자.

```js
function useUserDetail(userId) {
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setErr(null);

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setUser(json))
      .catch((e) => {
        if (e.name !== 'AbortError') setErr(e);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [userId]);

  return { isLoading, err, user };
}
```

`useEffect` + `useState` 조합으로 로딩/에러/데이터 3가지 상태는 알 수 있다. 근데 딱 거기까지다.

- **캐시가 없다**: `userId`가 1 → 2로 바뀌어 새로 fetch하는 거야 당연하다. 문제는 그 다음, 다시 2 → 1로 **이미 조회했던 값으로 돌아왔을 때**다. 커스텀 훅은 방금 전에 1을 조회했던 결과를 기억하지 못해서 또 network 요청을 새로 던진다. 훅 내부 state는 `userId`가 바뀌어 effect가 다시 실행되는 순간 이전 값이 그냥 버려지니까.
- **재시도가 없다**: 네트워크가 일시적으로 끊겨서 fetch가 실패하면 그걸로 끝. `err`만 세팅되고, 사용자가 다시 시도하게 만드는 로직은 훅 밖에서 별도로 짜야 한다.
- **중복 요청 방지가 없다**: 같은 `userId`를 쓰는 컴포넌트가 화면에 두 개 떠 있으면, 이 훅을 두 번 호출한 셈이니 fetch도 두 번 나간다.

TanStack Query 공식 소개 문구를 풀어보면 이런 얘기다: "촘촘하게 손으로 짜야 하는 상태 관리, 수동 refetch, 끝없이 얽히는 비동기 스파게티 코드는 이제 버려도 된다. TanStack Query는 선언적이고 항상 최신 상태로 자동 관리되는 query/mutation을 제공해서, 개발자 경험과 사용자 경험을 동시에 개선한다." 방금 `useUserDetail` 예시가 정확히 이 "수동 refetch"가 왜 필요한지를 보여준다 — 이 훅은 `userId`가 바뀔 때만 effect가 재실행돼 다시 fetch할 뿐, 에러 후 재시도나 창 포커스 복귀 시 최신값 확인 같은 건 전혀 처리해주지 않는다. 그런 게 필요하면 전부 개발자가 직접 코드로 챙겨야 한다는 게 "수동"이라는 말의 의미다. "async-spaghetti code"는 loading/error/data 세 state를 매 훅마다 손으로 반복하던 패턴을 가리키는 걸로 이해하면 된다.

## 커스텀 훅은 "로직"을 재사용하는 거지 "값"을 재사용하는 게 아니다

`useUserDetail`을 컴포넌트 A와 B에서 둘 다 호출하면, A와 B는 완전히 독립된 `isLoading`/`err`/`user` state와 독립된 `useEffect` 실행을 각자 가진다. 재사용되는 건 "fetch하고 상태 관리하는 절차(함수 본문)"이지, 그 결과로 나온 데이터가 아니다. 그래서 A가 이미 userId=1을 받아왔어도 B는 그 사실을 전혀 모르고 처음부터 다시 요청한다.

즉 커스텀 훅 레벨에서는 "여러 군데서 같은 데이터를 공유"한다는 개념 자체가 없다. 공유하려면 상위 컴포넌트나 전역 상태(context, store)로 끌어올려야 하는데, 그러면 이번엔 캐시 무효화 시점(언제 다시 fetch할지), 만료 시점을 직접 설계해야 한다.

## React Query가 메워주는 부분

- `queryKey` 단위로 결과를 캐시 → 같은 키면 재요청 없이 캐시된 값을 즉시 반환
- 실패 시 자동 retry (횟수/backoff 설정 가능)
- 같은 키로 동시에 여러 곳에서 요청해도 중복 fetch 없이 하나로 합쳐짐 (dedup)
- `staleTime` / `gcTime`으로 "언제까지 캐시를 신선하다고 볼지", "언제 캐시를 버릴지" 선언적으로 제어

## 공식 소개 페이지의 기능 체크리스트

- **Backend agnostic** — 백엔드가 REST든 GraphQL이든 뭐든 상관없다. TanStack Query는 "Promise를 반환하는 함수"만 받으면 되니까 서버 쪽 기술에 종속되지 않는다.
- **Dedicated Devtools** — 전용 개발자 도구로 쿼리 상태(fresh/stale, fetching 여부, 캐시 내용)를 눈으로 확인 가능.
- **Auto Caching** — 자동 캐싱.
- **Auto Refetching** — 조건이 맞으면 자동으로 다시 fetch.
- **Window Focus Refetching** — 브라우저 탭/윈도우로 다시 돌아오면 자동으로 refetch (백그라운드에 있는 동안 데이터가 오래됐을 수 있으니).
- **Polling/Realtime Queries** — 일정 주기로 반복 refetch (polling) 지원.
- **Parallel Queries** — 여러 쿼리를 동시에 병렬로 실행.
- **Dependent Queries** — 앞선 쿼리의 결과가 있어야 실행 가능한, 서로 의존 관계가 있는 쿼리.
- **Mutations API** — 생성/수정/삭제 같은 서버 데이터 변경을 위한 API.
- **Automatic Garbage Collection** — 더 이상 쓰이지 않는 캐시를 일정 시간 후 자동으로 정리 (`gcTime`).
- **Paginated/Cursor Queries** — 페이지 번호 기반, 커서 기반 페이지네이션 쿼리 지원.
- **Load-More/Infinite Scroll Queries** — "더보기" 버튼이나 무한 스크롤 패턴 지원.
- **Scroll Recovery** — 페이지 이동 후 돌아왔을 때 스크롤 위치 복원.
- **Request Cancellation** — 더 이상 필요 없어진 요청을 자동으로 취소.
- **Suspense Ready!** — React Suspense와 함께 쓸 수 있음.
- **Render-as-you-fetch** — 데이터를 다 받은 다음 렌더링을 시작하는 게 아니라, fetch를 시작하면서 동시에 렌더링도 진행하는 패턴.
- **Prefetching** — 필요해지기 전에 미리 데이터를 가져다 놓는 것.
- **Variable-length Parallel Queries** — 개수가 고정돼 있지 않은(동적인) 병렬 쿼리도 지원 (예: 배열 길이만큼 쿼리를 만드는 경우).
- **Offline Support** — 오프라인 상태에서의 동작 지원.
- **SSR Support** — 서버사이드 렌더링 지원.
- **Data Selectors** — 캐시된 데이터에서 필요한 부분만 골라 쓸 수 있는 selector.

이 목록을 보면, 앞서 짠 `useUserDetail` 훅이 커버하는 건 사실상 이 중 아무것도 없다는 게 명확해진다. 그 훅은 fetch 한 번 하고 loading/error/data 세 값을 반환하는 게 전부였고, 캐싱·refetch 조건·취소·페이지네이션·오프라인 대응 같은 건 전부 "필요하면 그때그때 직접 구현해야 하는" 영역이었다. TanStack Query는 이런 것들을 옵션 몇 개로 켜고 끌 수 있게 미리 만들어둔 것.

## 캐싱 확인: 같은 화면에 컴포넌트가 두 번 있어도 요청은 한 번만

실습에서 직접 확인한 부분. 완전히 같은 리스트 컴포넌트를 화면에 두 개 나란히 띄워봤다. 두 컴포넌트는 서로 다른 인스턴스이고 독립적으로 마운트되며, props도 동일하다(`inStockOnly: false`).

```jsx
function App() {
  return (
    <>
      <ProductPanel />
      <ProductPanel />
    </>
  );
}

function ProductPanel() {
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  // ... 리스트 렌더링, Toggle 버튼 등
}
```

만약 앞서 짠 `useUserDetail` 같은 커스텀 훅이었다면, `ProductPanel`이 두 번 마운트되니 network fetch 로그도 두 번 찍혔을 것이다. 각 인스턴스가 자기만의 `useEffect`를 독립적으로 돌리니까.

그런데 `useQuery`를 쓰면 콘솔에는 fetch 로그가 **딱 한 번만** 찍힌다.

두 `ProductPanel`이 같은 `queryKey`(`['products']`)를 쓰기 때문에, TanStack Query가 "이미 이 키로 요청 중이거나 캐시가 있다"고 판단해서 두 번째 컴포넌트는 네트워크 요청을 새로 보내지 않고 첫 번째 요청의 결과를 그대로 구독한다.

이게 앞서 "커스텀 훅은 로직만 재사용하고 값은 재사용하지 못한다"고 정리했던 부분이 정확히 뒤집히는 지점이다. `useQuery`도 훅 호출 자체는 컴포넌트마다 따로 하지만, 그 훅들이 같은 `queryKey`를 바라보고 있으면 내부적으로 요청과 캐시된 데이터를 공유한다 — 로직만이 아니라 "요청 결과(값)"까지 재사용되는 것.

## 공식 문서 — Query Keys

React Query는 핵심적으로 **query key를 기준으로 캐싱을 관리**한다. query key는 최상위 레벨에서 반드시 배열(Array)이어야 하고, 문자열 하나짜리 단순한 배열일 수도 있고, 여러 문자열과 중첩된 객체가 들어간 복잡한 배열일 수도 있다. **직렬화(serialize)가 가능하고, 그 쿼리의 데이터에 대해 고유(unique)하기만 하면** 뭐든 key로 쓸 수 있다.

바로 위에서 확인한 "컴포넌트가 두 개인데 요청은 한 번만 나간다" 현상이 정확히 이 규칙 때문이다. 두 `ProductPanel`이 똑같이 `queryKey: ['products']`를 썼으니 React Query 입장에서는 "같은 데이터를 가리키는 캐시"로 취급한 것. 반대로 만약 `inStockOnly` 값이 컴포넌트마다 다르다면, key도 `['products', { inStockOnly }]`처럼 그 조건을 포함시켜야 서로 다른 캐시로 구분된다 — key가 다르면 아예 다른 데이터로 취급되어 캐시가 공유되지 않고 각자 새로 fetch된다.

내부적으로는 이 배열을 그대로 참조 비교(`===`)하는 게 아니라, 안정적인 방식으로 직렬화/해시해서 같은 값이면 같은 캐시 엔트리로 매칭시키는 방식일 것이다. 그래야 매 렌더마다 새로 만들어지는 `['products', { inStockOnly }]` 같은 배열 리터럴(참조는 매번 다름)도 "내용이 같으면 같은 키"로 인식될 수 있다. 객체 안에서 key 순서가 달라도(`{ inStockOnly, page }` vs `{ page, inStockOnly }`) 같은 키로 취급되는 것도 이 직렬화 과정에서 key를 정렬한 뒤 해시하기 때문으로 이해하면 된다.
