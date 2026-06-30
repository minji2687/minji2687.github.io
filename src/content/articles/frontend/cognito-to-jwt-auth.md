---
title: "Cognito에서 JWT로 — React 앱 인증 레이어 직접 만들기"
description: "AWS Cognito + Amplify 기반 인증을 자체 JWT 방식으로 전환하면서 axios 인스턴스, useAuth 훅, React Query 기반 토큰 자동 갱신 구조를 직접 설계한 과정."
date: "2026-06-29"
category: "Frontend"
tags: ["React", "React Query", "JWT", "Axios", "인증"]
featured: false
draft: false
---

# Cognito에서 JWT로 — React 앱 인증 레이어 직접 만들기

Pluva Care 웹/앱에서 기존 AWS Cognito + Amplify 기반 인증을 걷어내고 자체 서버 JWT 방식으로 전환했다. 처음엔 단순히 "로그인 API 바꾸기"처럼 보였지만, 인증이 앱 전반에 얼마나 깊이 연결돼 있는지 다시 생각하게 된 작업이었다.

---

## 왜 Cognito를 걷어냈나

발단은 백엔드에서 나온 의견이었다. Cognito로 회원을 관리하다 보니 자체적인 회원 데이터를 갖기 어렵다는 의견이 나왔다. Cognito가 해주는 게 많긴 했지만, AWS에 회원 정보 자체가 종속된다는 점이 문제였다. 자체 회원 서비스를 만들고 직접 관리하자는 방향으로 결론이 났다.

프론트엔드에서도 같은 불만이 있었다. Cognito를 붙이려면 Amplify를 써야 하는데, **Amplify는 버전이 올라갈 때마다 API가 크게 바뀌었다.** v5에서 v6으로 넘어갈 때 `Auth.signIn()` 하나가 완전히 다른 형태가 됐고, 그때마다 인증 관련 코드를 전부 다시 맞춰야 했다. 백엔드와 프론트엔드 모두 같은 결론이었다.

---

## 기존 구조의 문제

Cognito + Amplify를 쓰면 인증 자체는 편하다. `Auth.signIn()` 한 줄이면 로그인이 되고, 토큰 갱신도 Amplify가 알아서 해준다. 문제는 **Amplify 의존성이 앱 전반에 깔린다**는 것이다.

API 호출마다 Amplify에서 토큰을 꺼내야 하고, 인증 상태 확인도 Amplify API를 거쳐야 한다. 백엔드가 Cognito에서 자체 서버 JWT로 전환되는 순간, 앱 곳곳을 다 바꿔야 했다.

---

## 프론트엔드에서 처리해야 할 것들

인증을 직접 구현하면 Amplify가 알아서 해주던 것들을 하나씩 직접 챙겨야 한다. 목록으로 정리하면:

- **로그인**: 아이디/비밀번호로 서버에 요청 → accessToken, refreshToken 수신
- **자동 로그인**: 앱 재진입 시 저장된 refreshToken이 있으면 토큰 갱신 → 로그인 화면 스킵
- **로그인 유지**: accessToken 만료 전에 자동으로 갱신 (백그라운드 포함)
- **로그아웃**: 서버에 로그아웃 요청 + 로컬 토큰 삭제 + 헤더 초기화
- **인증 실패 처리**: 토큰 갱신 실패 시 강제 로그아웃
- **전역 로그인 상태 관리**: 앱 어디서든 "로그인 상태인가?"를 알 수 있어야 함

이 모든 것을 `useAuth` 훅 하나에서 관리하도록 구현했다.

---

## 새로운 구조 설계

교체 후 구조는 세 레이어로 나뉜다.

```
axios 인스턴스 (axios.ts)
    ↓
auth API 함수 (auth.ts)
    ↓
useAuth 훅 (useAuth.ts)
```

### 1. axios 인스턴스

모든 API 호출이 공유하는 axios 인스턴스를 하나 만든다. `baseURL`과 `withCredentials`만 설정한다.

```ts
// src/api/row/axios.ts
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
});

export default axiosInstance;
```

`withCredentials: true`는 크로스 오리진 요청에서도 쿠키와 인증 헤더를 포함시키는 옵션이다. 프론트엔드(예: `localhost:3000`)와 API 서버(예: `api.example.com`) 도메인이 다를 때, 기본 설정으론 쿠키가 전송되지 않는다. 이 옵션을 켜야 서버가 Set-Cookie로 심은 쿠키가 이후 요청에도 붙어 나간다. 단, 서버 측에서도 CORS 설정에서 `Access-Control-Allow-Credentials: true`와 정확한 오리진을 허용해야 쌍이 맞는다.

Authorization 헤더는 여기서 설정하지 않는다. `axios.create()`는 앱이 처음 로드될 때 실행되는데, 그 시점엔 아직 로그인 전이라 토큰 자체가 없기 때문이다. 대신 로그인 성공 후 `setHeader()`로 헤더를 동적으로 주입한다. `axiosInstance.defaults.headers`를 직접 수정하는 방식이라 이후 모든 요청에 자동으로 반영된다.

```ts
// src/utils/header.ts
export const setHeader = (key: string, value: string) => {
  axiosInstance.defaults.headers.common[key] = value;
};

export const removeHeader = (key: string) => {
  delete axiosInstance.defaults.headers.common[key];
};
```

### 2. auth API 함수

로그인, 토큰 갱신, 로그아웃 API를 TypeScript 타입과 함께 정의한다.

```ts
// src/api/row/auth.ts
type ResponseToken = {
  accessToken: string;
  refreshToken: string;
};

// 로그인
const postLogin = async ({ loginId, password }: LoginRequestUserType): Promise<ResponseToken> => {
  const { data } = await axiosInstance.post('/users/login', { loginId, password });
  return data;
};

// refreshToken으로 새 accessToken 발급
const getAccessToken = async (): Promise<ResponseToken> => {
  const refreshToken = localStorage.getItem('refreshToken');
  const { data } = await axiosInstance.get('/users/refresh-token', {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
  return data;
};

const logout = async () => {
  await axiosInstance.post('/users/logout');
};
```

### 3. useAuth 훅

React Query로 인증 상태를 관리한다.

```ts
// src/hooks/useAuth.ts
function useLogin(mutationOptions?: UseMutationCustomOptions) {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: postLogin,
    onSuccess: ({ accessToken, refreshToken }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setHeader('Authorization', accessToken);
      dispatch(setAuth(true));
      queryClient.invalidateQueries('getUserinfo');
    },
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ['auth', 'getAccessToken'] });
    },
    ...mutationOptions,
  });
}
```

로그인 성공 시 세 가지를 한다.
- `accessToken`, `refreshToken` → 둘 다 localStorage에 저장
- `accessToken` → axios 기본 헤더에 주입 (이후 모든 API 요청에 자동 포함)
- Redux `isAuthenticated` → `true`로 업데이트 (전역 로그인 상태 즉시 반영)

### 4. 토큰 자동 갱신

accessToken은 만료 시간이 짧다. `useGetRefreshToken`이 앱 루트에서 항상 실행되며 주기적으로 토큰을 갱신한다.

```ts
function useGetRefreshToken() {
  const { isSuccess, data, isError } = useQuery({
    queryKey: ['auth', 'getAccessToken'],
    queryFn: getAccessToken,
    staleTime: 1000 * 60 * 60 - 1000 * 60 * 3,       // 57분 (만료 3분 전)
    refetchInterval: 1000 * 60 * 60 - 1000 * 60 * 3,  // 57분마다 재실행
    refetchOnReconnect: true,
    refetchIntervalInBackground: true,                  // 백그라운드 탭에서도 갱신
  });

  useEffect(() => {
    if (isSuccess) {
      setHeader('Authorization', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isError) {
      removeHeader('Authorization');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }, [isError]);

  return { isSuccess, isError };
}
```

interval을 60분이 아닌 **57분(만료 3분 전)**으로 잡은 건 여유를 두기 위해서다. 정각에 맞추면 네트워크 지연이나 타이밍 오차로 토큰이 이미 만료된 채 요청이 나갈 수 있다.

`refetchIntervalInBackground: true`도 중요하다. 없으면 탭이 백그라운드로 내려간 상태에서 갱신이 멈추고, 다시 돌아왔을 때 이미 만료된 토큰으로 API 요청이 나가 401을 받는다.

---

## axios 인터셉터로 토큰 만료 자동 처리

accessToken 만료 시간이 1시간이라 `refetchInterval`을 57분으로 맞췄지만, 실제로는 싱크가 딱 맞지 않는 경우가 있었다. 타이밍이 어긋나면 토큰이 이미 만료된 상태에서 API 요청이 나가고, 401을 받아버린다.

결국 두 가지 방식을 병행했다. `useGetRefreshToken`은 만료 전에 미리 갱신하는 1차 방어선이고, 인터셉터는 그래도 401이 발생했을 때 대응하는 2차 안전망 역할이다.

이를 처리하기 위해 axios response 인터셉터를 구성했다. 흐름은 다음과 같다.

1. API 요청 → 서버에서 **401 응답** 반환
2. 인터셉터가 401을 감지
3. localStorage에서 `refreshToken`을 꺼내 **토큰 갱신 API 호출**
4. 새 `accessToken` 수신 → localStorage와 axios 기본 헤더에 업데이트
5. **실패했던 원래 요청을 새 토큰으로 재시도**
6. 토큰 갱신마저 실패하면 → 로그아웃 처리

이 구조 덕분에 토큰 만료를 사용자가 인식하지 못한 채 자연스럽게 넘어간다. 로그인 화면으로 튕기는 일이 줄어든다.

> 해당 코드는 Bitbucket으로 저장소 이전 이후 작성돼 현재 로컬에 남아있지 않다.

---

## Redux와 함께 관리하기

이 프로젝트는 원래부터 Redux를 전역 상태관리로 쓰고 있었다. 인증도 기존 흐름에 맞게 Redux와 함께 연동했다.

Redux store(`appStore`)에는 두 가지를 보관한다.

- `isAuthenticated`: 로그인 여부 (`boolean | null`, 초기값 `null`은 아직 확인 중인 상태)
- `loggedInUser`: 현재 로그인한 유저 정보

React Query가 서버 통신(토큰 갱신, 유저 정보 fetch)을 담당하고, 그 결과를 Redux에 반영하는 구조다. `onSuccess/onError`에서 dispatch를 호출하면, 이후 컴포넌트 어디서든 Redux selector 하나로 로그인 상태를 바로 읽을 수 있다.

```ts
// 유저 정보 조회 — 토큰 갱신 성공 후에만 실행
function useGetUserinfo(queryOptions?) {
  const dispatch = useAppDispatch();
  return useQuery(['auth', 'getUserinfo'], getUserInfo, {
    onSuccess: (data) => {
      dispatch(setAuth(true));
      dispatch(setUserInfo(data));       // loggedInUser에 저장
    },
    onError: () => {
      dispatch(setAuth(false));
      dispatch(setUserInfo(null));
    },
    ...queryOptions,
  });
}

// 로그아웃 — 헤더, 스토리지, Redux 한 번에 초기화
function useLogout(mutationOptions?) {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      removeHeader('Authorization');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch(setAuth(false));
      dispatch(setUserInfo(null));
    },
    ...mutationOptions,
  });
}
```

`useGetUserinfo`는 `useGetRefreshToken`이 성공한 후에만 실행되도록 `enabled` 조건을 걸었다. 토큰도 없는데 유저 정보를 먼저 조회하면 어차피 401이 난다.

```ts
function useAuth() {
  const refreshTokenQuery = useGetRefreshToken();
  const getUserinfoQuery = useGetUserinfo({
    enabled: refreshTokenQuery.isSuccess,  // 토큰 갱신 성공 후에만 실행
  });
  // ...
}
```

결과적으로 앱 로드 순서는 이렇게 된다.

```
앱 로드
  → useGetRefreshToken 실행 (저장된 refreshToken으로 토큰 갱신)
  → 성공하면 useGetUserinfo 실행 (유저 정보 조회)
  → 성공하면 Redux에 isAuthenticated: true, loggedInUser: {...} 반영
  → 컴포넌트에서 Redux selector로 로그인 상태 읽기
```

---

## 정리

| | Cognito + Amplify | 자체 JWT |
|---|---|---|
| 토큰 관리 | Amplify 내부 | localStorage + axios 헤더 |
| 갱신 | Amplify 자동 | React Query `refetchInterval` |
| 로그인 상태 | Amplify API 호출 | Redux store |
| 의존성 | aws-amplify 패키지 전반 | axios, react-query |

Cognito가 편리하긴 하지만, 백엔드 인증 방식이 바뀌면 프론트엔드 전체가 흔들린다. 인증 레이어를 직접 설계하면 복잡도는 올라가지만, 백엔드 변화에 대응하기 훨씬 쉬워진다.

---

## 참고

이 글에서 다루지 않은 부분도 있다. 동시에 여러 탭에서 401이 터질 때 토큰 갱신 요청이 중복으로 나가는 문제, 탭 간 토큰 동기화(`BroadcastChannel`), httpOnly 쿠키 기반 저장 전략 등은 실제 서비스에서 마주치는 엣지 케이스다.

이 주제를 더 깊이 다루는 글로 [현대적인 인증 프로세스 설계 — 롤링 세션과 엣지 케이스 대응](https://ramirami.tistory.com/227)이 잘 정리돼 있다. Access Token은 짧게, Refresh Token은 롤링 방식으로 갱신하는 구조와 Next.js 미들웨어를 활용한 일관된 세션 처리까지 커버한다.
