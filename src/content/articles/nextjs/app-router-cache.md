---
title: "Next.js App Router 캐싱 전략 정리"
description: "왜 헷갈리는지부터 시작해서, 각 캐시 레이어가 무엇을 저장하는지, v13~15 모델과 v16 use cache 기반 모델을 정리한다."
date: "2026-05-10"
category: "Next.js"
tags: ["Next.js", "App Router", "Caching", "ISR", "PPR"]
featured: false
---

# Next.js App Router 캐싱 전략 정리

## 왜 헷갈리는가

Next.js 캐싱이 어려운 건 "캐시가 하나"가 아니기 때문이다. App Router에는 서로 다른 위치에서 동작하는 캐시 레이어가 4개 있고, 같은 fetch 요청이라도 어느 레이어에서 hit하느냐에 따라 API 호출이 일어나기도 안 일어나기도 한다.

거기다 v13, v14, v15, v16을 거치면서 기본값이 달라졌다. v13~14에서 캐시됐던 동작이 v15에서 바뀌고, v16에서 아예 다른 모델로 전환된다.

---

## 캐시 4개: 각각 무엇을 저장하는가

| 레이어 | 위치 | 지속 범위 | 저장하는 것 |
|---|---|---|---|
| Request Memoization | 서버 (요청 단위) | 단일 렌더 패스 | 같은 렌더링 중 중복 fetch 결과 |
| Data Cache | 서버 (지속) | 빌드~재검증 전까지 | fetch/DB 결과 |
| Full Route Cache | 서버 (지속) | 빌드~재검증 전까지 | 렌더링된 HTML/RSC Payload |
| Router Cache | 클라이언트 | 세션 동안 | 방문한 라우트의 RSC Payload |

### Request Memoization — 한 렌더 패스 안에서 중복 제거

같은 렌더링 안에서 여러 컴포넌트가 같은 데이터를 요청하면 첫 번째 결과를 재사용한다.

```typescript
async function Title({ id }: { id: string }) {
  const post = await getPost(id)  // 첫 호출 → API 실행
  return <h1>{post.title}</h1>
}

async function Body({ id }: { id: string }) {
  const post = await getPost(id)  // 같은 렌더 패스 → 결과 재사용, API 안 침
  return <p>{post.body}</p>
}
```

렌더 패스가 끝나면 사라진다. `fetch`에는 내장되어 있고, ORM이나 직접 DB 호출에는 `react`의 `cache()`를 직접 써야 한다.

```typescript
import { cache } from 'react'

export const getPost = cache(async (id: string) => {
  return db.query.posts.findFirst({ where: eq(posts.id, id) })
})
```

### Data Cache — fetch/DB 결과 저장

실제 API 호출이나 DB 쿼리 결과를 서버에 저장한다. 재검증하거나 무효화하기 전까지 유지된다.

```typescript
fetch(url, { cache: 'no-store' })           // 캐시 안 함
fetch(url, { next: { revalidate: 3600 } })  // 캐시, 1시간 후 재검증
fetch(url, { next: { tags: ['posts'] } })   // 캐시, 태그 달기 (on-demand 무효화용)
```

ORM이나 직접 DB 쿼리는 `unstable_cache`로 같은 효과를 낸다.

```typescript
import { unstable_cache } from 'next/cache'

export const getCachedPosts = unstable_cache(
  async () => db.select().from(posts),
  ['posts'],
  { tags: ['posts'], revalidate: 3600 }
)
```

### Full Route Cache — 렌더링된 페이지 결과 저장

페이지 전체를 렌더링한 결과(HTML + RSC Payload)를 서버에 저장한다. Full Route Cache가 hit되면 렌더링 자체를 건너뛰고, Data Cache도 조회하지 않는다.

`dynamic = 'force-dynamic'`이나 `revalidate: 0`을 쓰면 이 레이어는 비활성화된다.

### Router Cache — 브라우저 캐시

서버가 아니라 브라우저 메모리에 저장된다. 방문한 라우트의 RSC Payload를 저장해두어, 뒤로 가기나 이미 방문한 페이지 이동을 빠르게 한다. 브라우저를 닫거나 세션이 끝나면 사라진다.

---

## 요청이 들어왔을 때 실제 흐름

사용자가 `/blog`에 처음 들어왔을 때:

```
사용자 → /blog 요청
↓
Full Route Cache 확인 → 없음
↓
페이지 렌더링 시작
↓
fetch('/posts') 실행 → Data Cache 확인 → 없음 → 실제 API 호출
↓
Data Cache에 저장
↓
페이지 렌더링 완료 → Full Route Cache에 저장
↓
사용자에게 응답
```

두 번째 요청부터:

```
사용자 → /blog 요청
↓
Full Route Cache hit → 렌더링 건너뜀, fetch도 실행 안 됨
↓
저장된 HTML/RSC 응답
```

Full Route Cache를 무효화해야 Data Cache도 다시 조회된다.

---

## v13~15 모델: 기본 캐시, 명시적 무효화

### v13~14 기본 동작

v13~14에서는 `fetch`가 기본적으로 캐시된다(`force-cache`). 캐시를 끄거나 주기적으로 갱신하려면 명시적으로 옵션을 준다.

```typescript
// 기본: 무기한 캐시 (force-cache)
const data = await fetch('https://api.example.com/posts')

// 캐시 안 함
const data = await fetch('https://api.example.com/posts', {
  cache: 'no-store',
})

// n초마다 재검증
const data = await fetch('https://api.example.com/posts', {
  next: { revalidate: 3600 },
})

// 태그 달기 (on-demand 재검증용)
const data = await fetch('https://api.example.com/posts', {
  next: { tags: ['posts'] },
})
```

### v15에서 달라진 것

v15부터 `fetch`, GET Route Handler, Client Router Cache의 기본값이 uncached로 바뀌었다. Next.js 15 업그레이드 문서도 "fetch requests are no longer cached by default"라고 명시하고 있다.

```typescript
// v15: 기본적으로 캐시 안 됨
const data = await fetch('https://api.example.com/posts')

// 캐시하려면 명시해야 함
const data = await fetch('https://api.example.com/posts', {
  cache: 'force-cache',
})
```

### Route Segment Config

페이지·레이아웃·라우트 핸들러 파일에서 export하면 해당 세그먼트 전체에 적용된다.

```typescript
// app/blog/page.tsx
export const dynamic = 'auto'          // (기본) 가능한 한 캐시
export const dynamic = 'force-dynamic' // 항상 동적 렌더링
export const dynamic = 'force-static'  // 항상 정적

export const revalidate = 3600  // 1시간마다 재검증
export const revalidate = 0     // 항상 동적
export const revalidate = false // (기본) 무기한 캐시
```

여러 세그먼트에 서로 다른 `revalidate` 값이 있으면 가장 낮은 값이 전체 라우트에 적용된다.

예를 들어 `/blog/[slug]` 경로가 있을 때, `layout.tsx`에 `revalidate = 3600`(1시간), `page.tsx`에 `revalidate = 60`(1분)이 선언되어 있으면, 전체 라우트는 60초로 동작한다. 더 자주 갱신해야 하는 세그먼트가 전체 주기를 결정한다.

```
app/
  layout.tsx      ← revalidate = 3600 (1시간)
  blog/
    layout.tsx    ← revalidate = 600  (10분)
    [slug]/
      page.tsx    ← revalidate = 60   (1분)  ← 이 값이 전체에 적용됨
```

### 재검증 전략

**시간 기반**: 설정한 시간이 지나면, 다음 요청이 왔을 때 백그라운드에서 새로 생성한다. 생성 완료 전까지는 이전 캐시를 계속 서빙한다(stale-while-revalidate). 시간이 지났다고 자동으로 갱신되는 게 아니라, 그 다음 요청이 트리거 역할을 한다.

**온디맨드**: Server Action이나 Route Handler에서 명시적으로 무효화한다.

```typescript
import { revalidateTag, revalidatePath } from 'next/cache'

revalidateTag('posts')   // 해당 태그가 달린 fetch 캐시 전부 무효화
revalidatePath('/blog')  // 특정 경로의 캐시 무효화
```

---

## v16 모델: 기본 동적, 명시적 캐시

### 핵심 철학

v13~14 모델의 문제는 아무것도 안 해도 캐시된다는 점이었다. 의도치 않게 stale data가 남거나, 사용자별로 달라야 하는 응답이 공유 캐시에 들어가는 일이 생겼다.

v16은 이걸 뒤집는다.

**아무것도 안 하면 캐시 안 된다. 캐시하고 싶으면 명시해야 한다.**

`next.config.ts`에 `cacheComponents: true`를 추가하면 이 모델이 활성화된다.

```typescript
// next.config.ts
const nextConfig = {
  cacheComponents: true,
}
```

이 플래그 하나가 `ppr`, `useCache`, `dynamicIO` 세 experimental 플래그를 함께 켠다.

### v13~14 vs v15 vs v16 한눈에 비교

| | v13~14 | v15 | v16 (cacheComponents) |
|---|---|---|---|
| fetch 기본 동작 | 캐시됨 (force-cache) | 캐시 안됨 | 캐시 안됨 |
| 캐시 선언 방법 | fetch 옵션 / Route Segment Config | fetch 옵션 / Route Segment Config | `'use cache'` 디렉티브 |
| 페이지 렌더링 | 정적 or 동적 | 정적 or 동적 | PPR: 정적 shell + 동적 streaming |

### use cache 디렉티브

기존 방식은 fetch 호출에 캐시 옵션을 붙이는 것이었다.

```typescript
// 기존 방식 (v13~15)
fetch(url, { next: { revalidate: 3600 } })
```

v16에서는 함수나 컴포넌트 자체를 캐시 단위로 선언한다.

```typescript
// v16 방식
export async function getPosts() {
  'use cache'
  cacheLife('hours')

  return db.query.posts.findMany()
}
```

`'use cache'`를 선언하면 그 함수나 컴포넌트의 반환값이 캐시된다. 인자나 클로저 값이 자동으로 캐시 키의 일부가 된다.

`cacheLife`는 캐시 유효 기간을 이름으로 지정한다: `'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`.

데이터 함수뿐 아니라 컴포넌트에도 선언할 수 있다.

```typescript
import { cacheLife, cacheTag } from 'next/cache'

async function BlogPosts() {
  'use cache'
  cacheLife('hours')
  cacheTag('posts')

  const posts = await getPosts()
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

`cacheTag`로 태그를 달고, Server Action에서 `updateTag`로 무효화한다.

```typescript
import { updateTag } from 'next/cache'

async function createPost(formData: FormData) {
  'use server'
  await db.post.create({ data: { title: formData.get('title') } })
  updateTag('posts')  // 'posts' 태그가 달린 캐시 전부 무효화
}
```

### PPR — 한 페이지 안에서 정적과 동적을 섞는다

기존 모델에서는 페이지 전체가 정적이거나 동적이었다. 일부만 실시간 데이터가 필요해도 페이지 전체가 동적으로 렌더링됐다.

PPR은 이 제약을 없앤다. 한 페이지 안에서 컴포넌트마다 다른 전략을 쓸 수 있다.

```typescript
export default function BlogPage() {
  return (
    <>
      {/* 거의 안 바뀜 → 정적 shell에 포함 */}
      <Header />

      {/* 캐시 가능 → 'use cache'로 정적 shell에 포함 */}
      <BlogPosts />

      {/* 사용자마다 다름 → 요청 시점에 streaming */}
      <Suspense fallback={<p>로딩 중...</p>}>
        <UserInfo />
      </Suspense>
    </>
  )
}
```

- **정적 shell**: `'use cache'`로 선언된 컴포넌트와 순수 정적 컴포넌트는 빌드 타임에 렌더링된다. 요청 즉시 서빙된다.
- **동적 streaming**: `<Suspense>`로 감싼 컴포넌트는 요청 시점에 렌더링되어 스트리밍으로 전달된다.

### cookies, headers를 use cache 안에서 쓰면 안 되는 이유

`cookies()`, `headers()` 같은 Runtime API는 요청마다 달라진다. A 사용자는 dark theme, B 사용자는 light theme일 수 있다.

그런데 `'use cache'` 안에서 이 값을 직접 읽으면, A 사용자의 캐시 결과가 B 사용자에게 서빙될 수 있다.

해결책은 cached scope 밖에서 읽어 인자로 전달하는 것이다. 인자가 캐시 키의 일부가 되어 사용자별로 별도 엔트리가 생성된다.

```typescript
// 잘못된 예: use cache 안에서 Runtime API 직접 호출 → 에러
async function UserData() {
  'use cache'
  const session = await cookies().get('session')  // ❌
}

// 올바른 예: 밖에서 읽어 인자로 전달
async function ProfilePage() {
  const session = (await cookies()).get('session')?.value
  return <CachedUserData sessionId={session} />
}

async function CachedUserData({ sessionId }: { sessionId?: string }) {
  'use cache'
  // sessionId → 캐시 키의 일부, 사용자별로 별도 엔트리 생성
  const user = await getUser(sessionId)
  return <div>{user.name}</div>
}
```

Runtime API를 사용하는 컴포넌트는 `<Suspense>`로 감싸야 한다. 감싸지 않으면 빌드 시 에러가 발생한다.

---

## 실무에서 헷갈렸던 점

**`revalidate`는 "N초마다 자동 갱신"이 아니다.** 정확히는 "N초가 지난 뒤, 다음 요청이 왔을 때 백그라운드에서 갱신"이다. 그 요청이 올 때까지 갱신은 시작되지 않는다.

**`no-store`와 `revalidate: 0`은 내부가 다르다.** `no-store`는 Data Cache 자체를 건너뛰고, `revalidate: 0`은 Data Cache에 저장하되 즉시 만료로 처리한다. 실제 동작은 거의 같지만 처리 경로가 다르다.
