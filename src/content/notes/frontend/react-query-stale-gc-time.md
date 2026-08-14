---
title: "React Query — staleTime과 gcTime"
date: "2026-07-20"
tags: ["React", "React Query", "staleTime", "gcTime"]
description: "React Query 캐시의 생명주기(staleTime/gcTime)와 자동 refetch 동작, 그리고 isPending/isFetching/isLoading 세 플래그의 차이를 정리한 노트."
draft: false
---

[react-query-basics](/notes/frontend/react-query-basics)에서 이어지는 내용이다.

## staleTime vs gcTime

이름이 비슷해서 헷갈리기 쉬운데, 이 둘은 서로 다른 질문에 답하는 옵션이다.

**staleTime — "이 데이터를 아직 믿고 써도 되나?"**

- 기본값: `0`
- 데이터를 받아온 시점부터 얼마가 지나야 stale(오래된 것)로 볼지 정하는 시간
- fresh 상태인 동안에는 같은 쿼리 키로 새 컴포넌트가 mount되거나 창에 다시 포커스가 와도 **자동 refetch가 아예 트리거되지 않는다** — 캐시된 값을 그대로 돌려준다
- stale이 된다고 화면에서 데이터가 사라지거나 캐시가 지워지지는 않는다. 캐시값을 계속 보여주면서, 동시에 background refetch를 트리거할 "자격"이 생기는 것뿐이다 (stale-while-revalidate)
- `Infinity`로 주면 `invalidateQueries`로 수동 무효화하기 전까지 절대 stale해지지 않는다

**gcTime — "아무도 안 보는 데이터를 캐시에 얼마나 더 들고 있을까?"**

- 기본값: `5 * 60 * 1000` (5분). v4까지는 `cacheTime`이라는 이름이었다 (동작은 거의 동일)
- 이 쿼리를 구독하는 컴포넌트(Observer)가 하나도 남지 않아 "inactive"가 된 시점부터 카운트 시작
- `gcTime`이 지나면 캐시가 메모리에서 완전히 삭제된다. 이후 같은 키로 다시 마운트하면 캐시가 없으니 loading 상태부터 새로 fetch
- `Infinity`로 주면 가비지 컬렉션 대상에서 빠져 캐시가 영구히 유지된다

### 둘의 관계

`staleTime`은 "다시 fetch할지"를, `gcTime`은 "캐시를 버릴지"를 결정한다 — 별개의 축이라 실제 동작은 이 둘의 조합으로 정해진다.

표를 보기 전에 `stale`의 뜻부터 짚고 가자. `stale`은 "신선하지 않다"는 부정형 단어다 — 즉 아래 표의 **stale 열에서 O는 "신선하지 않음(stale)"**, **X는 "아직 신선함(fresh)"**을 뜻한다. fresh/stale 어느 쪽이든 캐시에 데이터가 있을 수 있다는 점도 유의: stale은 "데이터가 없다"가 아니라 "있긴 한데 오래돼서 못 믿겠다(또는 애초에 없어서 믿을 게 없다)"는 뜻이다.

| 캐시 상태 | stale 여부 | 트리거 발생 | 결과 |
|---|---|---|---|
| 있음 (fresh) | X | — | fetch 안 함, 캐시값 그대로 사용 |
| 있음 (stale) | O | X | fetch 안 함, stale인 채로 캐시에 계속 남아있음 |
| 있음 (stale) | O | O | **fetch 함** — 캐시값을 화면에 즉시 보여주면서 백그라운드로 조용히 refetch (로딩 스피너 없음) |
| 없음 (`gcTime` 지나서 이미 삭제됨) | O (데이터가 없어 자동으로 stale) | O | **fetch 함** — 보여줄 캐시가 없어 loading 상태부터 시작 |

여기서 트리거 이벤트란 새 인스턴스 mount, 창 포커스 복귀, 네트워크 재연결, `refetch()` 수동 호출 등을 말한다. 표에서 보듯 fetch 여부를 결정하는 건 어디까지나 **stale 여부 + 트리거**고, 캐시(gcTime) 생존 여부는 "fetch가 도는 동안 화면에 뭘 보여줄지"만 바꾼다.

관례적으로 `gcTime`은 `staleTime`보다 같거나 길게 잡는다 — stale 판정을 받기도 전에 캐시가 사라지면 캐시값을 즉시 보여주는 이점을 못 살리기 때문이다.

## 실습: staleTime을 5초로 주고 토글해보기

```js
function IssueList() {
  const [onlyOpen, setOnlyOpen] = useState(true);

  const { error, data: issues } = useQuery({
    queryKey: ['issues', { onlyOpen }],
    queryFn: () => {
      console.log(`[issues] network fetch (onlyOpen=${onlyOpen})`);
      return fetch(`/api/issues?onlyOpen=${onlyOpen}`).then((res) =>
        res.json()
      );
    },
    staleTime: 5000,
  });

  // ... 리스트 렌더링, "Open만 보기" 토글 버튼 등
}
```

`onlyOpen`이 바뀌면 `queryKey`도 `['issues', { onlyOpen: true }]` ↔ `['issues', { onlyOpen: false }]`로 바뀌어 캐시 엔트리가 두 개 따로 생긴다. 여기서 확인한 건 **같은 키로 다시 돌아왔을 때** 5초 안이었는지 밖이었는지에 따라 결과가 갈린다는 것.

- 5초 안에 토글 버튼을 껐다 켰다 반복 → fetch 로그 추가로 안 찍힘 (아직 fresh, 캐시 재사용)
- 5초가 지난 뒤 같은 키로 복귀 → 그제서야 새로 fetch

## React Query Devtools에서 쿼리 상태 확인하기

Devtools를 열면 쿼리별로 지금 상태가 어떤지 한눈에 볼 수 있다. `['issues', { onlyOpen: true }]` 키를 가진 쿼리를 선택하면 오른쪽 패널(Query Details)에서:

- 지금 이 쿼리가 `fresh` / `fetching` / `paused` / `stale` / `inactive` 중 어떤 상태인지
- **Observers** — 지금 이 쿼리 데이터를 구독 중인 컴포넌트(정확히는 `useQuery` 호출)가 몇 개인지
- **Last Updated** — 마지막으로 데이터를 성공적으로 받아온 시각

을 확인할 수 있다. [react-query-basics](/notes/frontend/react-query-basics)에서 "컴포넌트 두 개가 같은 queryKey를 쓰면 요청이 한 번만 나간다"고 확인했던 것도, Devtools에서 Observers 값이 실제로 2로 찍히는 걸 보면 눈으로 검증된다.

## isPending, isFetching, isLoading

앞의 표에서 "로딩 스피너 없음"이라고만 짚고 넘어갔던 부분을, 여기서 `isPending` / `isFetching` / `isLoading` 세 플래그로 자세히 풀어본다. 이름이 비슷해서 헷갈리기 쉬운데, 셋은 서로 다른 질문에 답하는 값이다.

| 플래그 | 무엇을 보는가 |
|---|---|
| `isPending` | **지금 이 순간**, 아직 최종 결과(성공/실패)가 확정되지 않은 상태인가? |
| `isFetching` | 지금 이 순간 요청이 실제로 진행 중인가? |
| `isLoading` | `isPending && isFetching`로 계산되는 파생값 — 데이터도 없고 지금 진짜 요청 중일 때만 true |

### isPending은 "판결" 개념이다

`isPending`은 "데이터 유무"가 아니라 **"판결이 났는가"**가 기준이다. 쿼리 상태는 `pending`(심리 중) → `success`(성공) 또는 `error`(실패)로 전이되는데, `isPending`은 오직 "아직 심리 중이냐"만 본다.

- 성공하면 → `isPending: false`, 그 뒤로 계속 유지된다
- 실패해도 → `isPending: false`, `isError: true`가 된다 — 데이터는 없지만 판결은 났으므로 pending이 아니다

**한 번 성공한 뒤엔 캐시 객체가 살아있는 동안만 `isPending: false`가 유지된다.** `gcTime`이 지나 캐시 객체 자체가 삭제되면, 같은 키로 다시 mount할 때 완전히 새 쿼리 객체가 생성되고, 이 새 객체는 fetch 이력이 없으므로 `isPending`이 다시 `true`로 리셋된다. "예전에 성공했었다"는 사실은 전역적으로 기억되지 않고, 그 객체의 생애에 국한된다.

**실패 후 재시도하면 스피너가 다시 뜬다.** 데이터를 아직 한 번도 못 받은 상태(`dataUpdatedAt` 없음)에서 재시도(자동 retry든 수동 `refetch()`든)가 시작되면, 그 시점에 `status`가 다시 `pending`으로 리셋된다 — `isPending`이 영구 확정이 아니기 때문이다. 그래서 `isPending: true` + `isFetching: true` 조합이 다시 만들어지고 `isLoading`도 다시 `true`가 된다.

반대로 **한 번이라도 성공해서 데이터가 있는 상태**라면, 이후 refetch가 실패해도 `dataUpdatedAt`이 이미 있어서 `status`가 `pending`으로 안 돌아간다 — `isPending`은 계속 `false`로 유지되고 `isError`만 갱신되며, 화면엔 기존 데이터가 그대로 보인 채 에러 표시만 추가된다.

### refetch가 끝나면 화면은 어떻게 바뀌나

refetch가 성공하면 캐시가 새 데이터로 교체되고, 그 쿼리를 구독 중인 모든 컴포넌트의 `data`가 자동으로 새 값으로 바뀌며 리렌더링된다. 이때는 이미 캐시값이 있어 `isPending`이 계속 `false`이므로 `isLoading`도 뜨지 않는다 — 대신 `isFetching`만 refetch가 도는 동안 `true`가 된다. "새로고침 중" 표시를 넣고 싶으면 `isFetching`을 쓰면 된다.

새 데이터가 이전 데이터와 내용이 완전히 같다면, TanStack Query는 **구조적 공유(structural sharing)**로 객체 참조를 그대로 유지해서 불필요한 리렌더링을 막는다 — 값이 실제로 달라졌을 때만 화면이 다시 그려진다.
