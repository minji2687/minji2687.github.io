---
title: "하네스 엔지니어링"
description: "Claude Code 하네스 엔지니어링이란 무엇인지, 그리고 핵심 도구들 — session-report, claude-md-management, serena, hookify"
date: "2026-06-13"
category: "AI"
tags: ["Claude Code", "Harness", "AI", "Engineering"]
featured: false
---

# 하네스 엔지니어링

짐코딩 유튜브([하네스 엔지니어링 영상](https://www.youtube.com/watch?v=6cr4PeilKJk))를 보고 뭔지 궁금해서 찾아보고 정리한 내용.

---

## 하네스 엔지니어링이란?

> **AI가 잘 일할 수 있는 환경을 만드는 것**

> **클로드 코드 = 하네스의 빈 틀**

Claude Code 자체는 틀만 제공한다. 그 틀 안에 무엇을 넣느냐가 하네스 엔지니어링이다.

- 어떤 **규칙**을 넣고
- 어떤 **제한**을 걸고
- 어떤 **검증**을 시킬지

이것을 설계하는 것이 하네스 엔지니어링.

> 이미 해왔던 것에 이름이 붙은 것

### 왜 중요한가

```
SAME MODEL
$9   망한 앱
$200 동작하는 앱

달라진 건 환경뿐
```

같은 모델을 써도 하네스 설계에 따라 결과가 완전히 달라진다.

---

## 하네스 설계 6가지 구성요소

| # | 구성요소 | 도구 |
|---|---|---|
| ① | 규칙 전달 | CLAUDE.md |
| ② | 위험 차단 | Permissions |
| ③ | 자동 검증 | Hooks |
| ④ | 테스트 도구 | MCP |
| ⑤ | AI 분리 | Subagent |
| ⑥ | 진화 원칙 | 메타 원칙 |

---

## ① 규칙 전달 — CLAUDE.md

Claude Code에서는 CLAUDE.md로 매 세션 규칙을 자동 전달한다.

**세션이 바뀌어도 규칙은 매번 전달된다** — 세션 A든 세션 B든 CLAUDE.md가 자동 로드되기 때문이다.

### 실수를 규칙으로 잡는 사이클

```
AI가 실수한다 → 문서에 규칙 추가 → 같은 실수 반복 안 됨
```

---

## ② 위험 차단 — Permissions

`allow` / `deny`로 도구 사용 범위를 설정한다.

```json
// .claude/settings.json
{
  "allow": [
    "Read", "Edit", "Write"
  ],
  "deny": [
    "Bash(rm -rf *)"
  ]
}
```

---

## ③ 자동 검증 — Hooks

> CLAUDE.md에 "테스트 꼭 돌려"라고 적어둘 수 있지만...  
> 그건 **맥락! 부탁**이에요.

부탁은 AI가 무시할 수 있다. Hooks는 무시할 수 없다.

**코드만 봐서는 알 수 없는 버그가 있다** — 런타임에만 드러나는 문제는 정적 분석으로 잡을 수 없다. 그래서 실제로 실행해서 검증해야 한다.

**Claude Code Hooks**: 도구 사용 전/후에 스크립트가 자동 실행된다.

---

## ④ 테스트 도구 — MCP

AI에게 브라우저, DB, 외부 시스템 같은 테스트 도구를 직접 쥐여주는 것.

Puppeteer MCP를 통해 Claude가 직접 브라우저를 열고 claude.ai 같은 실제 서비스를 테스트할 수 있다. **코드만으로는 드러나지 않는 버그**를 실제 실행 환경에서 발견할 수 있어서, MCP를 제공하자 에이전트 성능이 크게 향상됐다는 사례가 있다.

다만 MCP에도 한계는 있다 — 예를 들어 Puppeteer MCP는 브라우저 기본 알림 모달을 볼 수 없어서, 그에 의존하는 기능에서 버그가 발생하는 경향이 있다.

---

## ⑤ AI 분리 — Subagent

> **만드는 AI와 검증하는 AI의 분리**

같은 AI가 만들고 검증하면 같은 blind spot을 공유한다. 별도 Subagent가 검증을 맡아야 독립적인 시각이 생긴다.

### Planner + Evaluator 패턴

| | BEFORE | AFTER (Opus 4.6) |
|---|---|---|
| Sprint | ✓ | ~~제거~~ |
| Planner | ✓ | ✓ 유지 |
| Evaluator | ✓ | ✓ 유지 |

Planner(계획)와 Evaluator(검증)는 분리 유지. Opus 4.6 기준으로 Sprint는 제거.

---

## ⑥ 진화 원칙 — 메타 원칙

하네스 자체를 어떻게 발전시킬 것인가에 대한 원칙.

AI가 실수할 때마다 하네스를 개선하는 루프를 만드는 것이 핵심이다. ① 규칙 전달의 "실수→규칙 추가" 사이클이 대표적인 예. 하네스는 한 번 만들고 끝나는 게 아니라 계속 진화해야 한다.

- 실수 → 규칙/제한/검증 강화
- 잘 된 패턴 → 하네스에 반영해서 재사용
- 모델이 바뀌면 → 하네스도 맞게 조정 (Opus 4.6에서 Sprint 제거한 것처럼)

---

## 핵심 도구

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

파일 전체를 읽는 대신 필요한 심볼만 핀포인트로 가져오면 토큰을 **50배** 아낄 수 있다.

---

## 4. hookify — 재시도 사이클 차단

> Claude가 실패한 작업을 무한 재시도하는 루프를 훅으로 차단하는 도구

Claude Code는 작업 실패 시 자동으로 재시도를 반복할 수 있다. 잘못된 루프에 빠지면 토큰을 무제한 소비하면서도 결국 실패한다.

훅(hook) 레이어에서 재시도 사이클을 감지해 차단한다 — 무한 루프 진입 전에 끊어주는 **회로 차단기** 역할.

```
작업 실패
  → 재시도 감지 (hookify)
  → 사이클 차단
  → 사용자에게 상황 보고
```

---

## 그 외 주요 플러그인

### ralph-loop

반복 작업을 루프로 실행하는 에이전트.

```bash
/ralph-loop          # 루프 실행
/ralph-loop:cancel-ralph  # 루프 중단
```

### oh-my-claudecode

Claude Code 작업 품질을 높이는 도구 모음.

| 커맨드 | 설명 |
|---|---|
| `/oh-my-claudecode:analyze` | 현재 작업·코드 분석 |
| `/oh-my-claudecode:review` | 코드 리뷰 |
| `/oh-my-claudecode:deepsearch` | 심층 검색 |

---

## 토큰 아끼는 꿀팁

### `/clear` — 작업 간 초기화

AI는 매 메시지마다 **이전 대화를 전부 다시 읽는다**. 작업이 끝났거나 새 주제로 넘어갈 때 `/clear`로 컨텍스트를 초기화하면 그만큼 토큰이 절약된다.

### `/compact` — 컨텍스트 압축

```bash
/compact
/compact <요약 방향 지시>
```

대화 내용을 요약본으로 압축해 컨텍스트 크기를 줄인다. `/clear`처럼 싹 날리지 않고 흐름은 유지하면서 토큰을 아낄 때 유용하다.

### Extended Thinking 주의

Claude가 답변 전에 깊이 생각하는 기능으로 **기본 활성화**, 최대 31,999 토큰까지 사용한다. 간단한 수정 요청에도 **~30K** 소비될 수 있다.
