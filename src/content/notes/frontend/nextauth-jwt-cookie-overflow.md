---
title: "JWT 쿠키 4KB 초과 → iOS 세션 버그"
description: "NextAuth JWT payload가 너무 커서 iOS Chrome이 쿠키를 3개로 청킹했고, 세션이 끊겼다"
date: "2026-06-17"
tags: ["NextAuth", "JWT", "Cognito", "iOS", "버그"]
---

## 증상

실사용 중 iOS Chrome에서 종종 세션 에러가 났다. 개발 환경에서는 재현이 안 됐다.

---

## 원인

NextAuth JWT payload에 Cognito 토큰 3종과 AWS 임시 자격증명 4개 필드를 모두 담고 있었다.

```ts
// Cognito 토큰
token.accessToken = account.access_token;
token.idToken = account.id_token;
token.refreshToken = account.refresh_token;

// AWS 임시 자격증명
token.awsAccessKeyId = credentials.AccessKeyId;
token.awsSecretAccessKey = credentials.SecretAccessKey;
token.awsSessionToken = credentials.SessionToken;
token.awsIdentityId = credentials.IdentityId;
```

쿠키 크기가 4KB를 넘으면 iOS Chrome이 자동으로 쿠키를 여러 개로 쪼개는데, 실제로 쿠키가 3개로 청킹됐다. 이 청킹 과정이 가끔 에러를 내면서 세션이 깨졌다. 개발자 도구에서 쿠키 크기를 직접 재보고 나서야 원인을 특정할 수 있었다.

---

## 해결

두 번의 커밋에 걸쳐 줄였다.

**1단계** (`9ab729d`, 1월 22일) — JWT에서 AWS 임시 자격증명 제거 후 IAM Role로 전환

**2단계** (`f9e2c93`, 3월 12일) — JWT에서 `accessToken`, `idToken` 제거

---

**`src/lib/auth/auth.ts`** — JWT 타입에서 `accessToken`, `idToken` 제거

```ts
// before
interface JwtToken extends JWT {
  accessToken?: string;  // 제거
  idToken?: string;      // 제거 → getCredentials도 동작 불가
  refreshToken?: string;
  ...
}

// after
interface JwtToken extends JWT {
  refreshToken?: string; // 이것만 유지
  expiresAt?: number;
  role?: string;
  error?: string;
}
```

로그인 시 JWT 저장:

```ts
// before
token.accessToken = account.access_token;
token.idToken = account.id_token;
token.refreshToken = account.refresh_token;

// after
token.refreshToken = account.refresh_token;
```

토큰 갱신 시에도 `accessToken`, `idToken`은 받아도 JWT에 저장하지 않는다. 세션에도 노출하지 않는다.

코드베이스를 살펴보니 `accessToken`과 `idToken`을 클라이언트나 API에서 직접 쓰는 곳이 없었다.

**`src/lib/database/auth.ts`** — `getCredentials`, `getCognitoClient` 함수 삭제 (109줄)

기존에는 DynamoDB API 호출할 때마다 이 과정이 일어났다.

```
요청 → getCredentials(request)
  → 쿠키 JWT에서 awsAccessKeyId/secretAccessKey/sessionToken 꺼내기
  → 없으면 idToken으로 AWS Cognito Identity Pool에 새 자격증명 요청
  → 만료 5분 전이면 refreshToken으로 갱신 후 다시 자격증명 요청
  → credentials로 DynamoDB 클라이언트 생성
```

1단계에서 AWS 자격증명을 JWT에서 제거하고, 2단계에서 `idToken`까지 제거되면서 `getCredentials`가 동작할 수 없게 됐다. 서버에 IAM Role을 부여하는 방식으로 전환하면서 이 함수 전체를 삭제했다.

IAM Role 전환 후 모든 라우트 파일에서 호출 방식이 바뀌었다.

```ts
// before — 매 요청마다 쿠키에서 credentials 꺼내 DynamoDB 클라이언트 생성
const dynamoClient = await getDynamoDBClient(request);

// after — IAM Role로 바로 호출
const client = getDynamoDBClient();
```

---

## 결과

- 쿠키가 1개로 줄었고 청킹 에러가 사라졌다
- 덤으로 민감한 자격증명이 쿠키에 담기지 않게 됐다
