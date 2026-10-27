---
title: "JWT 구조와 jwt.io로 토큰 들여다보기"
description: "JWT가 어떻게 생겼는지, 각 클레임이 무슨 뜻인지, jwt.io로 디코딩·서명 검증하는 법과 주의할 점"
date: "2026-10-27"
tags: ["JWT", "인증", "jwt.io", "보안"]
draft: true
---

## 계기

회사 프로젝트의 인증 구조를 분석하다가 쿠키에 담긴 토큰을 직접 열어볼 일이 생겼다. 값이 `eyJ...`로 시작하면 JWT라는 건 알았는데, 막상 안에 뭐가 들었는지, 만료는 언제인지 보려니 도구가 필요했다. 그때 쓴 게 [jwt.io](https://jwt.io)다.

---

## JWT란

JWT(JSON Web Token)는 **JSON 데이터를 서명해서 문자열 하나로 만든 토큰**이다. 서버가 "이 사용자는 누구다"라는 정보를 담아 서명해서 주면, 클라이언트는 그걸 들고 다니다 요청할 때 보여준다. 서버는 서명만 확인하면 되니까, 원칙적으로는 로그인 상태를 따로 저장하지 않아도 된다(무상태, stateless).

---

## 구조 — 점(.)으로 나뉜 세 덩어리

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
└──────────── Header ────────────┘ └───────────────────────── Payload ─────────────────────────┘ └──────────── Signature ────────────┘
```

| 부분 | 내용 | 예시 (디코딩 후) |
| --- | --- | --- |
| Header | 토큰 타입과 서명 알고리즘 | `{ "alg": "HS256", "typ": "JWT" }` |
| Payload | 실제로 담는 정보(클레임) | `{ "sub": "1234567890", "name": "John Doe", "iat": 1516239022 }` |
| Signature | Header + Payload를 비밀키로 서명한 값 | 사람이 읽을 수 없는 바이트 |

Header와 Payload는 **Base64URL로 인코딩만 되어 있다.** `eyJ`가 항상 앞에 붙는 것도 `{"`를 Base64로 바꾸면 `eyJ`가 되기 때문이다.

{% callout type="warning" title="인코딩 ≠ 암호화" %}
Payload는 누구나 디코딩해서 읽을 수 있다. 비밀번호나 개인정보처럼 남이 보면 안 되는 값은 JWT에 넣으면 안 된다. 서명은 "내용이 바뀌지 않았다"를 보장할 뿐, 내용을 숨겨주지 않는다.
{% /callout %}

---

## 표준 클레임

Payload에 들어가는 키 중 이름이 미리 정해진 것들이다. 전부 선택이라 안 넣어도 되지만, 안 넣으면 그만큼 서버가 따로 챙겨야 한다.

| 클레임 | 이름 | 의미 |
| --- | --- | --- |
| `iss` | Issuer | 토큰을 발급한 주체 |
| `sub` | Subject | 토큰의 주인 (보통 사용자 ID) |
| `aud` | Audience | 토큰을 받을 대상 서비스 |
| `exp` | Expiration Time | 만료 시각 (Unix 초) |
| `nbf` | Not Before | 이 시각 전에는 무효 |
| `iat` | Issued At | 발급 시각 |
| `jti` | JWT ID | 토큰 고유 ID (재사용 방지 등에 사용) |

`exp`, `iat`는 밀리초가 아니라 **초 단위** Unix 시간이다. JS에서 비교할 땐 `Date.now() / 1000`과 비교해야 한다.

---

## 서명 알고리즘 — 대칭 vs 비대칭

| 방식 | 알고리즘 | 서명 | 검증 |
| --- | --- | --- | --- |
| 대칭 | `HS256`, `HS384`, `HS512` | 비밀키 하나 | 같은 비밀키 |
| 비대칭 | `RS256`, `ES256` 등 | 개인키 | 공개키 |

HS 계열은 서명하는 쪽과 검증하는 쪽이 같은 키를 가져야 한다. 그래서 키가 한 번 새면 누구나 유효한 토큰을 만들 수 있다. RS/ES 계열은 공개키로 검증만 할 수 있어서, 여러 서비스가 토큰을 검증해야 하는 구조에 더 맞다.

---

## jwt.io 사용법

[jwt.io](https://jwt.io)는 Auth0(현 Okta)에서 운영하는 JWT 디버거다.

{% steps %}
{% step title="토큰 붙여넣기" %}
왼쪽 Encoded 칸에 토큰을 붙여넣는다. Header·Payload·Signature가 색깔별로 구분돼서 보인다.
{% /step %}
{% step title="디코딩 결과 확인" %}
오른쪽 Decoded 칸에 Header와 Payload JSON이 바로 펼쳐진다. `exp`, `iat` 같은 시간 값에 마우스를 올리면 사람이 읽을 수 있는 날짜로 보여준다.
{% /step %}
{% step title="서명 검증" %}
Verify Signature 칸에 비밀키(HS 계열)나 공개키(RS/ES 계열)를 넣으면, 서명이 맞는지 "Signature Verified" / "Invalid Signature"로 알려준다.
{% /step %}
{% /steps %}

TODO: 화면 캡처 추가 (`/images/jwt/...`)

{% callout type="info" title="디코딩만 됐다고 유효한 토큰은 아니다" %}
Payload가 잘 보이는 건 Base64를 풀었기 때문일 뿐이다. 토큰이 진짜인지는 서명 검증을 통과해야 알 수 있고, 서버도 반드시 서명을 검증해야 한다. 서명 검증 없이 Payload만 읽어서 사용자를 믿는 코드는 위조 토큰에 그대로 뚫린다.
{% /callout %}

---

## 주의 — 운영 토큰은 붙여넣지 않기

jwt.io는 디코딩과 검증을 브라우저 안에서 처리한다고 안내하지만, 그래도 **운영 환경의 실제 토큰이나 서명 키는 외부 사이트에 붙여넣지 않는 게 원칙**이다. 특히 `exp`가 없는 토큰은 유출되면 오래 쓸 수 있어서 더 조심해야 한다.

내용만 보고 싶다면 로컬에서 디코딩하면 된다.

```js
// 브라우저 콘솔이나 Node에서 Payload만 확인
const token = '<토큰>'
const payload = JSON.parse(
  atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
)
console.log(payload)
```

Base64URL은 `+` 대신 `-`, `/` 대신 `_`를 쓰기 때문에 `atob`에 넣기 전에 바꿔줘야 한다.

---

## 실제로 열어보고 알게 된 것

회사 프로젝트의 쿠키 토큰을 디코딩해 보니 이랬다.

- `alg`는 `HS512`, Payload에는 `iss`와 `sub`(사용자 ID)만 있었다.
- `exp`와 `iat`가 없었다. 그래서 같은 계정으로 몇 번을 로그인해도 **매번 똑같은 토큰**이 나왔다.
- 토큰 자체는 만료되지 않지만, 로그아웃한 뒤 같은 토큰으로 요청하면 401이 왔다. 서버가 서명과 별개로 세션(로그인 명단)을 따로 확인하고 있었기 때문이다.

즉 JWT를 쓴다고 무조건 무상태 인증인 건 아니었다. 토큰은 "누구인지"만 알려주고, "지금 로그인 중인지"는 서버 세션이 정하는 혼합형 구조였다.

TODO: `exp`가 있는 일반적인 JWT 구조(Access Token + Refresh Token)와 비교해서 정리

---

## 정리

- JWT는 `Header.Payload.Signature` 세 부분이고, 앞의 둘은 **암호화가 아니라 인코딩**이다.
- 만료는 `exp`로 표현하고, 없으면 토큰 자체는 영원히 유효하다.
- jwt.io는 구조를 눈으로 확인하고 서명을 검증하기에 편하지만, 운영 토큰은 로컬에서 디코딩한다.
- 디코딩 성공 ≠ 유효한 토큰. 서명 검증이 핵심이다.

## 참고

- [jwt.io](https://jwt.io)
- [RFC 7519 — JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
