---
title: "도메인 연결부터 WAS까지 — DNS, Cloudflare, Nginx, 포트, 공인/사설 IP 한 번에 정리"
description: "가비아·Cloudflare·Vercel의 역할 차이, DNS 레코드와 네임서버, Nginx(웹 서버/리버스 프록시)와 WAS의 구분, 포트와 localhost, 공인 IP와 사설 IP까지 요청 흐름 순서대로 정리한다."
date: "2026-11-04"
tags: ["DNS", "Nginx", "WAS", "Cloudflare", "Network", "Deployment"]
draft: true
---

> 초안. 도메인 연결 영상을 보다가 가비아·Cloudflare·DNS·CNAME·네임서버가 한꺼번에 나와서 헷갈렸고, 이어서 Nginx와 WAS, 포트, localhost까지 꼬리를 물어서 한 번에 정리한 노트.

## 전체 그림 먼저

요청은 **두 단계로 따로** 일어난다. 먼저 DNS에 IP를 물어보고(①②), 그 답을 받은 다음에야 실제 HTTP 요청이 출발한다(③~⑥).

{% flow title="1단계 · DNS 조회 — 주소만 알아낸다" direction="row" caption="DNS는 IP를 알려주고 끝난다. 이후 HTTP 요청은 DNS를 거치지 않는다." %}
{% box title="브라우저" desc="example.com 입력" /%}
{% box title="DNS (Cloudflare 네임서버)" desc="example.com → 104.x.x.x" tone="amber" arrow="① 질문 / ② IP 응답" both=true /%}
{% /flow %}

{% flow title="2단계 · HTTP 요청 — 실제 데이터가 오가는 길" caption="②에서 받은 IP로 요청이 출발한다. 응답은 같은 길을 거꾸로 돌아온다. 각 단계는 구성에 따라 생략할 수 있다." %}
{% box title="브라우저" desc="https://example.com" /%}
{% box title="Cloudflare Proxy" label="선택" desc="CDN · 보안 · 캐싱" tone="muted" arrow="③" /%}
{% box title="Nginx :443" desc="HTTPS 처리 · 정적 파일 · 요청 전달" tone="blue" arrow="④" /%}
{% box title="WAS :3000 / :8080" desc="Next.js, Spring Boot 등 애플리케이션 실행" tone="green" arrow="⑤" /%}
{% box title="Database" desc="데이터 저장 · 조회" arrow="⑥" /%}
{% /flow %}

{% callout type="warning" title="DNS는 요청을 중계하지 않는다" %}
DNS는 "어디로 가야 하는지"만 알려준다. 브라우저는 DNS로 IP를 알아낸 다음, 그 IP로 **직접** HTTP 요청을 보낸다. 그래서 `DNS → Nginx → WAS`는 개념 순서로는 맞지만, 실제로 HTTP 요청이 거쳐가는 건 Cloudflare Proxy(쓰는 경우)나 Nginx부터다.

Cloudflare를 주황 구름(Proxied)으로 쓰면 ②에서 돌려주는 IP가 **Cloudflare 엣지 서버의 IP**다. 그래서 ③의 요청이 Cloudflare로 먼저 가는 것이다. 회색 구름이면 ②에서 원본 서버 IP를 주고, ③은 Nginx로 바로 간다.
{% /callout %}

| 질문 | 담당 |
| --- | --- |
| 어디로 접속해야 하지? | DNS |
| 이 HTTP 요청을 어디로 보내거나 어떻게 응답하지? | Nginx |
| 요청받은 기능을 어떻게 실행하지? | WAS |

---

## 1. 도메인 쪽 — 가비아, Cloudflare, Vercel

세 서비스는 경쟁 관계가 아니라 **역할이 달라서 같이 쓸 수 있다.**

| 서비스 | 역할 | 예 |
| --- | --- | --- |
| 가비아 | 도메인 구매·등록·갱신 (등록 대행업체) | `example.com` 구매 |
| Cloudflare | DNS 관리 + CDN + 웹 보안 | `example.com`이 어느 서버로 가야 하는지 관리 |
| Vercel | Next.js 배포·호스팅 | 실제 웹페이지를 응답 |

가비아에서 도메인을 샀다고 가비아의 DNS나 호스팅을 꼭 써야 하는 건 아니다.

### DNS 레코드

DNS에는 여러 종류의 레코드가 있다. 자주 보는 건 이 정도.

| 레코드 | 의미 | 예시 |
| --- | --- | --- |
| A | 도메인 → IPv4 주소 | `example.com → 203.0.113.10` |
| CNAME | 도메인 → 다른 도메인 이름 | `www.example.com → cname.vercel-dns.com` |
| TXT | 임의의 텍스트 (도메인 소유 인증 등) | `vercel-verification=...` |
| NS | 이 도메인의 DNS를 담당하는 네임서버 | `ns1.cloudflare.com` |

루트 도메인(`example.com`)에는 DNS 표준상 CNAME을 쓸 수 없다. Cloudflare는 **CNAME Flattening**으로 이걸 우회해서 루트에도 CNAME처럼 설정할 수 있게 해준다.

### 네임서버를 왜 바꾸나

네임서버(NS)는 **"이 도메인의 DNS 정보는 여기 물어봐"라고 지정된 공식 서버**다. 도메인을 사면 기본 네임서버는 등록업체(가비아) 것으로 되어 있다.

가비아에 Cloudflare 네임서버 2개를 등록하는 건 "이제 이 도메인의 DNS는 Cloudflare가 관리한다"고 선언하는 것이다. 그 뒤로는:

- A, CNAME, TXT 레코드를 **Cloudflare 대시보드에서** 관리한다 (가비아 DNS 설정은 더 이상 안 쓰임)
- 도메인 소유권과 갱신은 계속 **가비아에** 남는다

변경이 전 세계에 반영되기까지 몇 분~최대 48시간 걸릴 수 있다.

### 주황 구름 vs 회색 구름

Cloudflare DNS 레코드마다 프록시 여부를 고를 수 있다.

| 모드 | 흐름 | 의미 |
| --- | --- | --- |
| 주황 구름 (Proxied) | 사용자 → Cloudflare → 서버 | Cloudflare가 요청을 중계. CDN·보안·캐싱 적용 가능 |
| 회색 구름 (DNS Only) | 사용자 → 서버 | DNS 응답만 하고, 요청은 서버로 직접 감 |

Cloudflare가 단순 DNS 업체가 아니라 CDN과 리버스 프록시까지 하는 서비스라는 게 여기서 드러난다. ([CDN 노트](/notes/backend/cdn-basics) 참고)

### Next.js + Vercel에 도메인 연결하는 순서

{% steps %}
{% step title="가비아에서 도메인 구매" %}
`example.com`을 산다.
{% /step %}
{% step title="Cloudflare에 도메인 추가" %}
Cloudflare 대시보드에 `example.com`을 등록하면 네임서버 2개를 알려준다.
{% /step %}
{% step title="가비아에 Cloudflare 네임서버 등록" %}
가비아의 네임서버 설정을 Cloudflare가 준 주소로 바꾼다.
{% /step %}
{% step title="Vercel 도메인 등록 + DNS 레코드 추가" %}
Vercel에 커스텀 도메인을 등록하면 A / CNAME 레코드를 안내해준다. 그걸 Cloudflare DNS에 추가한다.
{% /step %}
{% step title="반영 대기" %}
DNS 반영과 HTTPS 인증서 발급이 끝나면 접속된다.
{% /step %}
{% /steps %}

{% callout type="info" title="Cloudflare는 필수가 아니다" %}
가비아 DNS에 Vercel이 안내한 레코드를 직접 넣어도 된다. 그리고 Cloudflare를 같이 쓸 때는 **회색 구름(DNS Only)이 무난한 기본값**이다. Vercel이 자체 CDN과 인증서를 처리하기 때문에, 주황 구름으로 두면 캐시가 이중으로 걸리거나 인증서 발급이 꼬일 수 있다.

다만 반드시 회색이어야 하는 건 아니다. Cloudflare의 WAF나 봇 차단 같은 기능이 꼭 필요하면 주황 구름으로 두고, SSL 모드(Full (strict))와 캐시 규칙을 맞춰서 쓰기도 한다.
{% /callout %}

---

## 2. 웹 서버(Nginx)와 WAS

### 용어 정리

- **웹 서버**: 역할의 이름. HTTP 요청을 받아서 정적 파일을 주거나 다른 서버로 넘긴다.
- **Nginx, Apache HTTP Server**: 웹 서버 역할을 하는 구체적인 소프트웨어.
- **WAS (Web Application Server)**: 애플리케이션 코드를 실행해서 동적 요청을 처리한다. Spring Boot(Tomcat), Node.js 서버 등.

"WAS 앞에 웹 서버가 있다"고 할 때, 그 웹 서버 자리에 들어가는 게 Nginx다. 웹 서버가 따로 있고 그 뒤에 Nginx가 또 있는 게 아니다.

| 구분 | Nginx | WAS |
| --- | --- | --- |
| 핵심 역할 | 웹 요청 처리·전달 | 애플리케이션 로직 실행 |
| 정적 파일 | 주 역할 | 가능하지만 주 역할 아님 |
| API 요청 | WAS로 전달 | 실제 처리 |
| 리버스 프록시 | 대표 역할 | 보통 아님 |

### 요청별로 누가 처리하나

Nginx가 정적 파일을 직접 주도록 설정했을 때의 예시.

| 요청 | Nginx | WAS |
| --- | --- | --- |
| `/index.html`, `/style.css`, `/main.js` | 파일 직접 반환 | 관여 안 함 |
| `/api/users` | WAS로 전달 | DB 조회 후 JSON 반환 |
| `/api/login` | WAS로 전달 | 로그인 로직 실행 |

{% callout type="warning" title="'웹 서버 = 정적, WAS = 동적'으로 외우면 틀린다" %}
Nginx도 WAS도 둘 다 HTTP 요청을 받을 수 있다. 웹 서버는 **HTTP 처리·정적 파일·요청 전달에 특화**되어 있고, WAS는 **애플리케이션 실행에 초점**이 있다고 이해하는 게 정확하다. 둘이 꼭 같이 있어야 하는 것도 아니다.
{% /callout %}

### React SPA vs Next.js

- **React SPA (정적 빌드)**: `브라우저 → Nginx → HTML/CSS/JS`. Nginx만으로 충분하고, API가 필요할 때만 별도 WAS를 둔다.
- **Next.js (SSR)**: `브라우저 → Nginx → Next.js 서버(Node.js)`. Next.js 서버가 요청마다 HTML을 만들고 Route Handler도 처리하니까 **WAS 역할도 겸한다.**

---

## 3. 리버스 프록시 — Node.js도 서버인데 왜 Nginx를 앞에 두나

`npm run start`만 해도 Next.js는 3000번 포트에서 혼자 잘 돈다. 그런데 운영 환경에서는 이런 요구가 생긴다.

- HTTPS 인증서 관리
- 서버 여러 대에 트래픽 분산
- 프론트 서버와 API 서버를 한 도메인 아래 구분
- 정적 파일을 효율적으로 제공
- 애플리케이션 서버를 외부에 직접 노출하지 않기

이걸 Nginx가 **리버스 프록시**로 맡는다. 리버스 프록시는 클라이언트 대신 내부 서버에 요청을 보내고, 받은 응답을 다시 클라이언트에게 돌려주는 중간 서버다. 브라우저는 뒤에 어떤 서버가 있는지 몰라도 된다.

```nginx
server {
    listen 80;
    server_name example.com;

    # API 요청 → Spring Boot
    location /api/ {
        proxy_pass http://localhost:8080;
    }

    # 나머지 → Next.js
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

라우팅 구조만 보여주는 최소 예시다. 실제로 쓰려면 원래 요청 정보를 WAS에 넘겨주는 프록시 헤더를 꼭 추가한다. 이게 없으면 WAS 입장에서는 모든 요청이 Nginx(`127.0.0.1`)에서 온 것처럼 보인다.

```nginx
location / {
    proxy_pass http://localhost:3000;

    proxy_set_header Host              $host;                       # 원래 요청한 도메인
    proxy_set_header X-Real-IP         $remote_addr;                # 실제 사용자 IP
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;  # 거쳐온 IP 목록
    proxy_set_header X-Forwarded-Proto $scheme;                     # http인지 https인지
}
```

| 요청 | 전달 대상 |
| --- | --- |
| `example.com/`, `example.com/dashboard` | Next.js :3000 |
| `example.com/api/users`, `example.com/api/login` | Spring Boot :8080 |

여기에 HTTPS 인증서, 타임아웃, WebSocket 업그레이드 헤더 같은 설정이 더 붙는다.

### Nginx를 쓰는 이유 4가지

1. **HTTPS 처리**: Nginx에서 TLS를 끝내고(종료), 내부 WAS에는 HTTP로 넘길 수 있다.
2. **로드 밸런싱**: WAS가 3대면 요청을 나눠준다. 라운드 로빈이면 1,000개 요청이 약 334 / 333 / 333개로 나뉜다.
3. **정적 파일 처리**: 이미지, JS, CSS 요청이 WAS까지 갈 필요가 없다.
4. **내부 서버 보호**: WAS를 외부에 공개하지 않고 Nginx를 통해서만 접근하게 만든다. (Nginx가 모든 보안 문제를 해결해주는 건 아니다.)

### Cloudflare도 리버스 프록시인데?

맞다. 둘 다 프록시지만 위치와 목적이 다르다.

| | Cloudflare | Nginx |
| --- | --- | --- |
| 위치 | 전 세계 엣지 네트워크 | 보통 서비스 서버 바로 앞 |
| 주요 역할 | CDN, DDoS 방어, WAF, DNS | 요청 라우팅, 프록시, 로드 밸런싱 |
| 설치 | 필요 없음 (SaaS) | 직접 설치·관리 |

어느 쪽도 필수가 아니다. Vercel, AWS ALB, API Gateway 같은 관리형 인프라가 Nginx 자리를 대신하기도 한다. Vercel에 배포하면 Nginx를 직접 만질 일이 없는 것도 이 때문이다.

---

## 4. IP, 포트, localhost

- **IP 주소**: 어느 컴퓨터로 갈 것인가 → 건물 주소
- **포트**: 그 컴퓨터의 어떤 프로그램이 받을 것인가 → 건물 안 호실 번호
- **localhost (127.0.0.1)**: 지금 이 코드가 실행되고 있는 컴퓨터 자신

| 포트 | 주로 쓰는 곳 |
| --- | --- |
| 80 | HTTP 기본 |
| 443 | HTTPS 기본 |
| 3000 | Next.js 등 Node 서버 |
| 8080 | Spring Boot, Tomcat |
| 5432 | PostgreSQL |
| 3306 | MySQL |

{% grid title="192.168.0.10" desc="서버 컴퓨터 한 대 — IP는 하나, 프로그램마다 포트가 다르다" %}
{% box title="Nginx" badge="포트 80" desc="HTTP 요청 처리" tone="blue" /%}
{% box title="Nginx (HTTPS)" badge="포트 443" desc="암호화된 요청 처리" tone="blue" /%}
{% box title="Next.js (Node.js)" badge="포트 3000" desc="애플리케이션 실행" tone="green" /%}
{% box title="Spring Boot" badge="포트 8080" desc="API 서버 실행" tone="green" /%}
{% /grid %}

포트 번호는 관례일 뿐 고정 규칙은 아니다. `https://example.com`에 포트를 안 쓰는 건 HTTPS 기본 포트인 443이 생략된 것이다.

### 같은 컴퓨터에 둘 때

EC2 한 대에 Nginx와 Next.js를 같이 올린 경우. Nginx는 자기 컴퓨터의 3000번 포트로 넘기면 된다.

{% flow caption="Nginx와 Next.js가 같은 컴퓨터에 있으니 127.0.0.1(자기 자신)로 넘긴다." %}
{% box title="브라우저" desc="https://example.com" /%}
{% box label="EC2 한 대 · 공인 IP 203.0.113.10" title="Nginx :443" desc="HTTPS 수신" tone="blue" /%}
{% box label="같은 EC2" title="Next.js :3000" desc="SSR · Route Handler" tone="green" arrow="http://127.0.0.1:3000" /%}
{% /flow %}

```nginx
server {
    listen 443 ssl;
    server_name example.com;
    # 인증서 설정 생략

    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

### 다른 컴퓨터로 나눌 때

Nginx는 서버 A, Spring Boot는 서버 B(`10.0.1.20`)에 있으면 `localhost:8080`으로는 안 된다. localhost는 서버 A 자신이니까. 서버 B의 IP를 적어야 한다.

{% flow %}
{% box title="브라우저" desc="https://example.com" /%}
{% box label="서버 A" title="Nginx :443" desc="공인 IP: 203.0.113.10" tone="blue" /%}
{% box label="서버 B" title="Spring Boot :8080" desc="사설 IP: 10.0.1.20" tone="green" arrow="사설 네트워크 통신" /%}
{% box title="Database" desc="별도 DB 서버 또는 관리형 DB" /%}
{% /flow %}

```nginx
location /api/ {
    proxy_pass http://10.0.1.20:8080;
}
```

| | 같은 컴퓨터 | 분리 |
| --- | --- | --- |
| 구축 | 간단 | 상대적으로 복잡 |
| 비용 | 적게 시작 | 서버 추가 비용 |
| 자원 | CPU·메모리 공유 | 분리 |
| 확장 | 제약 있음 | WAS만 따로 늘릴 수 있음 |
| 장애 | 한 대 죽으면 전부 영향 | 장애 범위가 나뉨 |
| 통신 | localhost | 서버 간 네트워크 |

무조건 분리가 좋은 건 아니다. 트래픽, 비용, 운영 규모 보고 정한다.

{% callout type="warning" title="localhost는 '코드가 실행되는 곳' 기준이다" %}
Next.js에서 특히 헷갈린다. 기준은 컴포넌트 종류가 아니라 **그 코드가 지금 어디서 실행되느냐**다.

- **Server Component / Route Handler**: 항상 Node 서버에서 실행 → `localhost`는 **서버 컴퓨터**
- **Client Component**: 이름과 달리 서버에서도 실행된다. 첫 요청 때 서버가 HTML을 미리 그리면서(SSR) 컴포넌트 본문을 한 번 실행하고, 브라우저에서 hydration된 뒤 다시 실행된다.
  - `useEffect`, 이벤트 핸들러 안의 `fetch('http://localhost:8080')` → 브라우저에서만 실행 → **사용자 컴퓨터**의 8080
  - 컴포넌트 본문에서 바로 실행되는 코드 → 첫 렌더링 때는 **서버**, 이후엔 **브라우저**

로컬에서는 서버도 브라우저도 내 맥북이라 잘 되다가, 배포하면 깨지는 이유가 이거다.
{% /callout %}

---

## 5. 공인 IP와 사설 IP

| | 공인 IP | 사설 IP |
| --- | --- | --- |
| 라우팅 | 인터넷에서 라우팅되는 주소 | 인터넷에서는 라우팅되지 않는 주소 |
| 유일성 | 전 세계에서 하나 | 다른 네트워크끼리는 겹쳐도 됨 |
| 대역 | 사설 대역 제외 나머지 | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` |
| 예시 | `203.0.113.10` | `10.0.1.20`, 집 공유기의 `192.168.0.5` |

`203.0.113.0/24`는 실제 서버 주소가 아니라 **문서 작성용으로 예약된 대역**이라 예시로 쓰기 좋다.

{% callout type="info" title="'공인 = 누구나 접근', '사설 = 내부만'은 아니다" %}
- **공인 IP**는 인터넷에서 *찾아갈 수 있는* 주소일 뿐이다. 실제로 접속되는지는 방화벽, Security Group, 라우팅 정책에 따라 달라진다. 공인 IP가 있어도 443 말고는 다 막혀 있는 게 보통이다.
- **사설 IP**도 VPN, VPC 피어링, 네트워크 간 라우팅을 설정하면 다른 사설망에서 접근할 수 있다. 회사 VPN에 붙으면 사내 서버의 `10.x.x.x`에 접속되는 게 이 경우다.
{% /callout %}

집 공유기가 딱 이 구조다. 공유기가 공인 IP 하나를 받고, 맥북과 폰에는 `192.168.x.x`를 나눠준다. 밖에서 맥북의 사설 IP로 바로 들어올 수는 없다.

### 그래서 서버를 이렇게 배치한다

{% flow caption="밖에서 들어올 수 있는 건 Nginx의 443 포트뿐이다. WAS와 DB는 사설 IP만 있다." %}
{% box title="인터넷" desc="사용자 브라우저" tone="muted" /%}
{% box label="Public 영역" title="Nginx" desc="공인 IP · 443만 열어둠" tone="blue" /%}
{% box label="Private 영역" title="WAS" desc="10.0.1.20:8080" tone="green" arrow="사설 네트워크" /%}
{% box label="Private 영역" title="DB" desc="10.0.2.30:5432" tone="green" /%}
{% /flow %}

- **Nginx만 공인 IP**를 갖고 외부 요청을 받는다.
- **WAS·DB는 사설 IP만** 있어서 인터넷에서 직접 닿을 수 없다 → 공격받을 수 있는 지점이 줄어든다.
- Nginx 서버는 공인 IP와 사설 IP를 둘 다 갖고 있어서, 밖에서 받고 안으로 넘길 수 있다. 위에서 `proxy_pass http://10.0.1.20:8080`이 되는 이유.
- AWS에서는 **Public Subnet / Private Subnet**, **Security Group**(어떤 IP·포트를 허용할지)으로 이 구조를 만든다.

---

## 한 장 요약

| 계층 | 대표 기술 | 하는 일 |
| --- | --- | --- |
| 도메인 등록 | 가비아 | 주소 구매·관리 |
| DNS | Cloudflare DNS | 도메인 → IP 조회 |
| 네임서버 | `ns1.cloudflare.com` 등 | 도메인의 공식 DNS 정보를 갖고 있는 서버 |
| CDN / 엣지 프록시 | Cloudflare | 캐싱, 보안, 요청 중계 (선택) |
| 웹 서버 / 리버스 프록시 | Nginx | 정적 파일, 요청 전달, 로드 밸런싱 |
| WAS | Spring Boot, Node.js(Next.js) | API, SSR, 비즈니스 로직 |
| DB | MySQL, PostgreSQL | 데이터 저장·조회 |
