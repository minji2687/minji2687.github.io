---
title: "하네스 엔지니어링: 오늘의 4가지 무기"
description: "Claude Code 하네스 엔지니어링 핵심 도구 4가지 — session-report, claude-md-management, serena, hookify"
date: "2026-06-10"
tags: ["Claude Code", "Harness", "AI", "Engineering"]
---

## 오늘의 4가지 무기

| 도구 | 한 줄 요약 |
|---|---|
| **session-report** | 어디서 새는지 측정 |
| **claude-md-management** | 매 요청 세금 깎기 |
| **serena** | 코드 검색 의미 기반으로 |
| **hookify** | 재시도 사이클 차단 |

---

## 1. session-report — 어디서 새는지 측정

> 카드 명세서는 카페·주유소·배달앱 항목별로 얼마 썼는지 보여주잖아요?  
> 똑같이 **프로젝트별·스킬별·프롬프트별 토큰을 한 화면에** 보여줍니다.

### 개념

Claude Code 세션에서 토큰이 어디에 얼마나 쓰였는지 추적하는 플러그인.  
카드 명세서처럼 "항목별 지출"을 한눈에 볼 수 있게 해준다.

### 설치 및 실행

```bash
# 플러그인 설치
/plugin    → feature-dev 설치 후 /reload-plugins 로 적용

# 리포트 실행
/session-report:session-report
# 또는
/session-report
```

`/reload-plugins` 후 로드 결과 예시:
```
Reloaded: 13 plugins · 12 skills · 11 agents · 12 hooks · 3 plugin MCP servers
1 error during load. Run /doctor for details.
```

### 출력 내용

**most expensive prompts** 섹션에서 프롬프트별 비중(%)과 API 호출 횟수를 표시한다.

| 항목 | 예시 |
|---|---|
| 가장 비싼 프롬프트 | `4.1% — "A를 하고 벌별 에이전트로 스크립트, 슬라이드 모두 잘 수정되었는지 검토해!"` |
| API 호출 수 | `94 api calls` |
| 캐시 히트 정보 | `cache-read 46.8M · out 70.6k` |
| 세션 ID | `session: 0bc5e3d8-d184-4b4f-904b-f3f3a7e3dac3` |

### 핵심 가치

- 어떤 프롬프트·스킬이 토큰을 많이 잡아먹는지 **가시화**
- 비용 최적화 포인트를 찾는 데 직접적으로 활용 가능

---

## 2. claude-md-management — 매 요청 세금 깎기

> CLAUDE.md 다이어트 도구

### 먼저 알아야 할 것: CLAUDE.md란?

> **CLAUDE.md는 모든 요청에 자동으로 따라붙는다.**

프로젝트 루트에 두는 "AI한테 주는 메모장". Claude Code는 매 요청마다 이 파일을 자동으로 컨텍스트에 포함시킨다. 즉 파일이 커질수록 매 요청마다 지불하는 토큰(세금)이 늘어난다.

### 핵심 개념

CLAUDE.md가 비대해지면 → 매 요청 토큰 낭비 → `claude-md-management`로 군살을 정리.

### 실행

```bash
/claude-md-management:revise-claude-md
```

### 동작 방식

세션을 돌아보며 CLAUDE.md에 **실제로 추가할 가치가 있는 학습 내용**만 선별한다. 판단 기준:

- 코드베이스 파일을 실제로 읽거나 수정했는가?
- 코딩 패턴·테스트 접근·환경 quirk·gotcha가 발생했는가?
- 단순 하네스 명령 실행(분석기 구동 등)은 학습 거리로 보지 않는다.

### 업데이트를 권하지 않는 경우

출력 예시:
```
이 세션을 돌아보면 CLAUDE.md에 추가할 만한 학습 거리가 거의 없습니다.

Step 2: 추출 가능한 학습 — 없음.
- 코드베이스 파일을 단 1개도 읽거나 수정하지 않음
- bash 명령은 모두 하네스 실행이지 프로젝트 명령 아님
- 코딩 패턴·테스트 접근·환경 quirk·gotcha 어느 것도 발생 안 함
```

### CLAUDE.md 관리 규칙 (예시)

| 규칙 | 내용 |
|---|---|
| 파일 크기 | `CLAUDE.md`, `.claude/rules/*.md` 는 100줄 이하 유지 |
| 금지 항목 | "임시 작업 상태" 저장 금지 |
| 원칙 | 요청받지 않은 기능은 추가하지 마라 (Karpathy §2) |

---

## 3. serena — 코드 검색 의미 기반으로

> 한 마디로: **클로드한테 IDE를 붙여주는 도구**

### GREP vs SERENA

| | GREP | SERENA |
|---|---|---|
| 방식 | 글자만 | 의미만 |
| 동작 | `login` 들어간 **모든 줄**을 다 잡아옴 | 그 함수가 진짜 **정의된 곳·호출되는 곳만** |

grep은 문자열 매칭이라 노이즈가 많다. serena는 AST 기반으로 심볼의 **의미** 단위로 탐색한다 — IDE의 "Go to Definition / Find References"와 동일한 방식.

### 가장 임팩트 큰 케이스: 토큰 비교

| 방법 | 비용 |
|---|---|
| READ 도구 — 1,000줄 파일 통째로 읽기 | **약 1만 토큰** |
| SERENA `find_symbol` — 그 함수 하나만 | **약 200토큰** |

> 이 차이가 누적되면 어마어마합니다.

파일 전체를 읽는 대신 필요한 심볼만 핀포인트로 가져오면 토큰을 **50배** 아낄 수 있다.

### 실제 사용 예시

```bash
use serena mcp
```

`GoogleLoginButton`이 어디서 쓰이는지 Serena 심볼 도구로 분석한 결과:

| 위치 | 종류 | 내용 |
|---|---|---|
| `src/features/auth/index.ts:0` | re-export | `export { GoogleLoginButton } from './components/google-login-button'` |
| `src/app/login/page.tsx:4` | import | `from '@/features/auth/components/google-login-button'` — barrel 미경유 |
| `src/app/login/page.tsx:32` | JSX 사용 | `<GoogleLoginButton next={next} />` (LoginContent 함수 내부) |

파일을 열지 않고도 **심볼이 정의된 곳 + 참조된 곳**을 한 번에 파악. rg(grep) 결과와 동일한 위치를 훨씬 적은 토큰으로 얻는다.

### 설치

플러그인 마켓플레이스(`/plugins` → Discover)에서는 검색되지 않는다 — 별도 방식으로 설치.

---

## 4. hookify — 재시도 사이클 차단

> Claude가 실패한 작업을 무한 재시도하는 루프를 훅으로 차단하는 도구

### 문제 상황

Claude Code는 작업 실패 시 자동으로 재시도를 반복할 수 있다. 잘못된 루프에 빠지면 토큰을 무제한 소비하면서도 결국 실패한다.

### 동작 방식

훅(hook) 레이어에서 재시도 사이클을 감지해 차단한다. 무한 루프 진입 전에 끊어주는 **회로 차단기** 역할.

```
작업 실패
  → 재시도 감지 (hookify)
  → 사이클 차단
  → 사용자에게 상황 보고
```

### 핵심 가치

- 토큰 무한 소비 방지
- 디버깅 없이 빠져나올 수 없는 루프 예방

---

## 그 외 주요 플러그인

session-report 출력 기준으로 확인된 플러그인·스킬 목록.

### ralph-loop

반복 작업을 루프로 실행하는 에이전트. 특정 작업을 지속적으로 돌리거나 조건이 충족될 때까지 반복할 때 사용.

```bash
/ralph-loop          # 루프 실행
/ralph-loop:cancel-ralph  # 루프 중단
```

### oh-my-claudecode

Claude Code 작업 품질을 높이는 도구 모음. 3가지 서브 커맨드를 포함한다.

| 커맨드 | 설명 |
|---|---|
| `/oh-my-claudecode:analyze` | 현재 작업·코드 분석 |
| `/oh-my-claudecode:review` | 코드 리뷰 |
| `/oh-my-claudecode:deepsearch` | 심층 검색 |

### code-review

코드 리뷰 스킬. `oh-my-claudecode:review`와 별개로 독립 실행 가능.

```bash
/code-review
/code-review:code-review
```

### deepsearch

단순 grep·read를 넘어 더 넓은 범위를 탐색하는 검색 스킬.

```bash
/deepsearch
/oh-my-claudecode:deepsearch
```

---

---

## 토큰 아끼는 꿀팁

### `/clear` — 작업 간 초기화

AI는 매 메시지마다 **이전 대화를 전부 다시 읽는다**. 작업이 끝났거나 새 주제로 넘어갈 때 `/clear`로 컨텍스트를 초기화하면 그만큼 토큰이 절약된다.

### `/compact` — 컨텍스트 압축

```bash
/compact
/compact <요약 방향 지시>   # 선택적으로 요약 방식 지정 가능
```

대화 내용을 요약본으로 압축해 컨텍스트 크기를 줄인다. `/clear`처럼 싹 날리지 않고 흐름은 유지하면서 토큰을 아낄 때 유용하다.

### Extended Thinking 주의

> 눈에 보이지 않는데 토큰을 꽤 잡아먹는 기능

Claude가 답변 전에 깊이 생각하는 기능으로 **기본 활성화**, 최대 31,999 토큰까지 사용한다. Thinking 토큰은 출력 토큰으로 과금되며, 간단한 수정 요청에도 **~30K** 소비될 수 있다.

---

## 메모 (TODO)

- [x] session-report 내용 추가
- [x] claude-md-management 내용 추가
- [x] serena 내용 추가
- [x] hookify 내용 추가
- [x] 그 외 플러그인(ralph-loop, oh-my-claudecode, deepsearch) 추가
