---
title: "CRA setupProxy.js — 개발 서버 프록시가 이런 구조인 이유와 웹소켓 함정"
description: "CRA 개발 서버에서만 쓰는 setupProxy.js의 역할, package.json proxy에서 바뀌어 온 이유, 다른 도구와의 비교, 그리고 ws: true 프록시가 모든 웹소켓 연결을 가로채 개발 서버가 꺼지던 문제까지 정리한다."
date: "2026-11-26"
tags: ["CRA", "Proxy", "WebSocket", "http-proxy-middleware", "Dev Server"]
---

> 초안. 개발 서버가 자꾸 꺼지고 "서버와의 연결이 해제되었습니다"가 뜨던 문제를 고치면서 `setupProxy.js`를 처음부터 다시 읽고 정리한 노트.

## 1. setupProxy.js가 하는 일

**로컬에서 `npm start` 할 때만 쓰는 "요청 전달 규칙"** 이다. 브라우저가 `localhost`로 보낸 요청을 주소 앞부분(`/api`, `/history` …)을 보고 알맞은 백엔드 포트로 대신 보내 준다.

{% flow title="개발 vs 상용" caption="같은 경로 규칙을 개발에서는 setupProxy.js가, 상용에서는 nginx가 맡는다." %}
{% box title="브라우저" desc="localhost:3000/api/..." /%}
{% box title="CRA 개발 서버 + setupProxy.js" desc="경로 보고 포트 결정 (개발 전용)" tone="blue" arrow="개발" /%}
{% box title="백엔드" desc=":8081 API · :8082 이력 · :8083 통계 …" tone="green" arrow="전달" /%}
{% /flow %}

왜 필요하냐면:

- 개발 서버는 **화면 파일(React)만** 갖고 있고, 데이터는 별도 백엔드 서버에 있다.
- 브라우저는 같은 출처 정책(CORS) 때문에 화면을 받은 주소가 아닌 서버로 마음대로 요청하기 어렵다.
- 그래서 브라우저는 그냥 `localhost`로 보내고, **개발 서버가 중간에서 대신 전달**한다. 이게 프록시.

{% callout type="warning" title="상용 빌드에는 들어가지 않는다" %}
`setupProxy.js`는 빌드 결과물에 포함되지 않는다. 고쳐도 상용에는 영향 없고, 상용은 nginx 설정이 같은 역할을 한다. 새 백엔드 경로가 생기면 **둘 다** 고쳐야 한다.
{% /callout %}

## 2. 왜 이런 구조가 됐나

### CRA에는 서버 코드가 없다

CRA는 **화면만 만드는 도구**라서 내가 손댈 서버 코드가 없다. 대신 개발 서버(webpack-dev-server)가 뜰 때 `src/setupProxy.js`라는 **정해진 이름의 파일**을 찾아서 Express `app`을 넘겨준다. 그래서 어디서도 import하지 않고, 파일 이름을 바꾸면 안 되고, 고친 뒤엔 **개발 서버를 재시작**해야 한다.

### package.json의 "proxy"에서 바뀌어 온 흐름

| 시기 | 방식 | 한계 / 특징 |
| --- | --- | --- |
| CRA 1.x | `package.json`의 `"proxy": "http://서버:포트"` | 한 줄이면 끝. **백엔드 한 곳**으로만 보낼 수 있음 |
| CRA 2.0 ~ | `src/setupProxy.js` | 경로별로 다른 서버, 웹소켓, 경로 바꾸기까지 자유롭게 |

경로마다 포트가 다른 프로젝트라면 한 줄짜리 `"proxy"`로는 안 되니까 `setupProxy.js`를 쓴다.

라이브러리(`http-proxy-middleware`) 함수 이름도 바뀌었다. 블로그 예제와 코드가 달라 보이는 이유.

```js
// 0.x — 옛날 블로그 글
const proxy = require('http-proxy-middleware');
app.use(proxy('/api', { target: 'http://...' }));

// 1.x 이후
const { createProxyMiddleware } = require('http-proxy-middleware');
app.use(createProxyMiddleware('/api', { target: 'http://...' }));
```

### 다른 도구에서는

| 도구 | 프록시 설정 위치 |
| --- | --- |
| CRA | `package.json`의 `"proxy"` 또는 `src/setupProxy.js` |
| Vite | `vite.config.ts`의 `server.proxy` |
| webpack 직접 설정 | `devServer.proxy` |
| Next.js | `next.config.js`의 `rewrites()` |

하는 일은 전부 같다. Next.js에서 헷갈리는 `middleware.ts`는 요청을 **검사**(로그인 체크, 리다이렉트, 헤더 변경)하는 용도라 다르고, 그대로 **전달**하는 건 `rewrites()` 쪽이다. 차이는 `setupProxy.js`는 개발 전용, `rewrites()`는 상용에서도 동작한다는 것. CRA는 2025년에 공식 deprecated 됐으니 새 프로젝트에서는 주로 Vite `server.proxy`를 보게 된다.

## 3. 정리한 코드

```js
const { createProxyMiddleware } = require('http-proxy-middleware');

const target = (port) => `http://${process.env.REACT_APP_API}:${port}`;

const createProxy = (context, port, options = {}) =>
  createProxyMiddleware(
    (pathname) => pathname === context || pathname.startsWith(`${context}/`), // 경로 단위로 매칭
    {
      target: target(port),
      pathRewrite: { [`^${context}/`]: '' }, // 보낼 때 앞 경로는 떼고
      changeOrigin: true,
      ...options,
    }
  );

module.exports = function (app) {
  app.use(createProxy('/api', 8081, {
    ws: true, // 웹소켓은 /api/ws 하나뿐이라 여기에만
    onProxyReqWs: (proxyReq, req, socket) => {
      socket.on('error', (err) => console.warn('[setupProxy] websocket 끊김', err.code));
    },
  }));
  app.use(createProxy('/history', 8082));
  app.use(createProxy('/stat', 8083));
};
```

| 브라우저가 보낸 주소 | 처리하는 프록시 | 실제로 가는 곳 |
| --- | --- | --- |
| `localhost:3000/api/v1/alarm/list` | `/api` | `백엔드:8081/v1/alarm/list` |
| `localhost:3000/history/search` | `/history` | `백엔드:8082/search` |
| `localhost:3000/historyManagement` | 없음 | 개발 서버가 화면(index.html)을 줌 |

- `pathRewrite`: 앞의 `/history/`를 떼고 보낸다.
- `changeOrigin`: Host 헤더를 target으로 바꿔서, 백엔드가 "localhost에서 온 요청"이라고 거절하지 않게 한다.
- 어느 서버에 붙을지는 `.env.development.local`의 `REACT_APP_API`로 바꾼다 (바꾸면 재시작).

`createProxy`는 라이브러리 함수가 아니라 우리 쪽 헬퍼다. 새 포트가 생기면 `app.use(createProxy('/새경로', 포트))` 한 줄 추가.

## 4. 웹소켓: 개발 서버가 꺼지던 이유

### 웹소켓 연결은 "다른 통로"로 들어온다

웹소켓은 처음엔 일반 HTTP 요청처럼 시작했다가 **upgrade** 요청으로 바뀐다. Node 서버는 이걸 일반 요청과 다른 이벤트(`server.on('upgrade')`)로 받는다. 그래서 `app.use('/api', ...)`의 **경로 구분을 거치지 않는다.**

### 왜 "첫 일반 요청 이후"에만 웹소켓을 받나

웹소켓 자체의 규칙이 아니라 **CRA 개발 서버 구조 때문**이다.

1. `upgrade` 이벤트를 받으려면 **서버 객체**에 직접 등록해야 한다.
2. 그런데 CRA는 `setupProxy.js`에 서버 객체는 안 주고 `app`만 준다.
3. 그래서 라이브러리는 **첫 일반 요청에서 `req.socket.server`를 꺼내서** 그때 upgrade 리스너를 등록한다.

```js
// http-proxy-middleware 내부 주석
// use initial request to access the server object to subscribe to http upgrade event
```

평소엔 로그인 등으로 `/api` 일반 요청이 먼저 가니까 웹소켓이 바로 되는 것처럼 보였을 뿐이다.

| 환경 | 웹소켓 받는 시점 |
| --- | --- |
| nginx (상용) | 처음부터 |
| Vite 개발 서버 | 처음부터 (서버 객체를 직접 가짐) |
| **CRA + setupProxy.js** | **해당 프록시에 일반 요청이 한 번 온 뒤부터** |

### 문제 1. 엉뚱한 프록시가 같은 연결을 받았다

예전 코드는 모든 프록시에 `ws: true`가 붙어 있고 경로는 `app.use`에만 있었다.

```js
app.use('/api',     createProxyMiddleware({ target: ':8081', ws: true }));
app.use('/history', createProxyMiddleware({ target: ':8082', ws: true }));
```

`ws: true`인데 프록시 자체에 경로 조건이 없으면 **모든 upgrade 요청**을 받는다. 이력 화면에 한 번 들어가면 `/history` 프록시도 등록을 마치고, 그때부터 `/api/ws` 연결을 **두 프록시가 동시에** 처리했다.

{% flow title="한 연결에 두 응답이 섞임" caption="엉뚱한 서버의 404가 같은 소켓에 써지면서 브라우저가 연결을 버린다." %}
{% box title="브라우저 /api/ws 연결 요청" /%}
{% box title="/api 프록시 → :8081" desc="101 Switching Protocols ✅" tone="green" arrow="①" /%}
{% box title="/history 프록시 → :8082" desc="404 Not Found ❌ — 같은 소켓에 씀" tone="amber" arrow="②" /%}
{% box title="연결 끊김" desc="화면: '서버와의 연결이 해제되었습니다'" tone="blue" arrow="③" /%}
{% /flow %}

### 문제 2. 끊김 에러를 받는 코드가 없었다

Node는 `error` 이벤트를 아무도 안 받으면 **프로세스 전체를 종료**한다. 끊김 에러 핸들러는 연결이 성공한 뒤에만 붙어서, 연결 도중에 끊기면(`ECONNRESET`) 받을 곳이 없었다.

```txt
throw er; // Unhandled 'error' event ... ECONNRESET   ← 개발 서버 종료
```

| | 원인 | 결과 |
| --- | --- | --- |
| 문제 1 | 프록시 2개가 같은 연결을 받음 | 끊김이 **자주** 생김 |
| 문제 2 | 끊김 에러 핸들러 없음 | 끊기면 **개발 서버 종료** |

### 해결

- **경로 조건을 프록시에 직접** 넣었다 → upgrade 통로에서도 경로를 확인한다.
- `onProxyReqWs`에서 **소켓 `error`를 받아 경고 로그만** 남긴다 → 끊겨도 서버는 계속 동작.
- `ws: true`는 실제로 웹소켓을 쓰는 `/api`에만 남겼다.

## 5. 함정: 경로를 문자열로 주면 앞글자만 비교한다

`createProxyMiddleware('/history', …)`처럼 문자열로 주면 **prefix 비교**라서 화면 주소까지 잡아버린다.

| 주소 | 문자열 `'/history'` | 함수 (경로 단위) |
| --- | --- | --- |
| `/history/search` | 잡음 ✅ | 잡음 ✅ |
| `/historyManagement` (화면 라우트) | **잡음 ❌** → 화면 대신 백엔드로 감 | 안 잡음 ✅ |
| `/api2/...` | `'/api'`가 잡음 ❌ | 안 잡음 ✅ |

그래서 "정확히 같거나 뒤에 `/`가 붙은 것만" 잡도록 함수로 조건을 준다.

## 6. 웹소켓 확인하는 법

- **DevTools Network → WS 필터 → `/api/ws` → Messages**: 서버가 주기적으로 보내는 메시지가 쌓이면 정상. DevTools는 **열린 뒤 생긴 연결만** 보여주니 열고 나서 새로고침.
- **콘솔에서 테스트 연결 직접 만들기** (STOMP 서버 기준). 앱 연결과 별개라 닫아도 화면엔 영향 없다.

```js
const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`);
ws.onopen = () => ws.send('CONNECT\naccept-version:1.2\nheart-beat:0,0\n\n\0');
ws.onmessage = (e) => {
  const first = e.data.split('\n')[0];
  console.log('받음:', first);
  if (first === 'CONNECTED') ws.send('SUBSCRIBE\nid:test-1\ndestination:/topic/ping\n\n\0');
};
ws.onclose = (e) => console.log('닫힘', e.code);
// 그만: ws.close()
```

- 터미널에 `[HPM] Error occurred while proxying ... ECONNREFUSED`가 뜨면 해당 포트 **백엔드가 꺼진 것**이지 프론트 문제가 아니다.

{% callout type="success" title="배운 점" %}
- 개발 서버 프록시는 개발 전용. 상용 경로 규칙(nginx)은 따로 있다.
- 웹소켓 upgrade는 `app.use` 경로 구분을 안 탄다. `ws: true`면 경로 조건을 프록시에 직접 줄 것.
- Node에서 처리 안 된 `error` 이벤트는 프로세스를 죽인다. 소켓에는 항상 error 핸들러.
- 경로 매칭은 문자열 prefix가 아니라 경로 단위로.
{% /callout %}
