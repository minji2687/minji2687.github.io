---
title: "Claude Code 서브에이전트로 역할 나눠서 작업시키기"
description: "간단한 게시판을 만들어보면서 분석/DB/백엔드/프론트 역할을 서브에이전트 4개로 나눠본 기록. 서브에이전트 정의 방법과, 순서를 지키게 하려면 커스텀 커맨드로 명시적으로 체이닝해야 한다는 것."
date: "2026-08-20"
tags: ["Claude Code", "AI Tools"]
draft: false
---

간단한 비회원 게시판(Express + Prisma)을 만들어보면서, 요구사항 분석부터 DB 설계, 백엔드, 프론트까지 서브에이전트 4개로 역할을 나눠봤다. 게시판 자체는 CRUD만 있는 가벼운 연습용이고, 목적은 서브에이전트를 실제로 어떻게 정의하고 엮는지 감을 잡는 것이었다.

## 서브에이전트 = `.claude/agents/*.md` 파일 하나

`.claude/agents/` 아래에 마크다운 파일을 하나 만들면 그게 서브에이전트 하나가 된다. frontmatter로 이런 걸 지정할 수 있다.

```yaml
---
name: test_db_agent
description: 요구사항을 분석하여 Prisma ORM으로 DB스키마 설계
model: inherit
reasoning_effort: low
---
```

- `name`: 이 이름으로 `@test_db_agent`처럼 호출
- `description`: 언제 이 에이전트를 써야 하는지 — 메인 세션이 자동으로 위임할지 판단할 때도 이 설명을 참고한다
- `model`: `inherit`이면 상위 세션과 같은 모델을 쓰고, `claude-haiku-4-5-20251001`처럼 특정 모델을 못박을 수도 있다
- `reasoning_effort`: 낮게 잡아서 속도/비용을 아낄 수 있다
- `tools`: 이 에이전트가 쓸 수 있는 도구를 목록으로 제한할 수 있다 (안 쓰면 전체 허용)

## 실제로 나눠본 4개 에이전트

| 에이전트 | 역할 | model | tools 제한 |
|---|---|---|---|
| `test_analysis_agent` | 요구사항 → 3줄 명세(`requirements.md`) 작성 | inherit | Read/Write/Edit/Glob/Grep |
| `test_db_agent` | Prisma 스키마 설계 | inherit | 없음 |
| `test_back_agent` | Express CRUD 라우터 구현 | inherit | 없음 |
| `test_front_agent` | 테스트용 HTML/CSS/JS 화면 제작 | **claude-haiku-4-5-20251001** | 없음 |

눈에 띄는 건 두 가지였다.

첫째, `test_analysis_agent`만 `tools`를 명시적으로 좁혀놨다는 것. 분석 에이전트는 요구사항 읽고 마크다운 하나 쓰는 게 전부라 Read/Write/Edit/Glob/Grep 정도로만 제한해도 충분하고, 괜히 넓혀둘 이유가 없다.

둘째, `test_front_agent`만 `model`을 `claude-haiku-4-5-20251001`로 못박아뒀다는 것. 나머지는 다 `inherit`인데 이건 딱히 의도하고 지정한 건 아니라서, 굳이 모델을 고정하고 싶을 땐 `model` 필드로 이렇게 지정할 수 있다는 정도로만 봐두면 될 것 같다.

## `tools` 필드에 쓸 수 있는 것들

`test_analysis_agent`가 쓴 Read/Write/Edit/Glob/Grep 말고도 지정할 수 있는 도구가 더 있다. 자주 쓸 법한 것 위주로 카테고리별로 정리하면:

- **파일/코드**: `Read`, `Write`, `Edit`, `NotebookEdit`(Jupyter 노트북), `LSP`(정의로 이동·참조 찾기 같은 코드 인텔리전스)
- **검색**: `Glob`(패턴으로 파일 찾기), `Grep`(파일 내용 검색)
- **실행**: `Bash`/`PowerShell`(쉘 명령), `Monitor`(백그라운드 명령 실행하며 출력 스트리밍)
- **웹**: `WebFetch`(URL 하나 가져와서 프롬프트로 추출), `WebSearch`
- **에이전트/오케스트레이션**: `Agent`(다른 서브에이전트 실행), `SendMessage`/`ListAgents`(다른 세션·에이전트와 통신), `TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate`(작업 목록 관리), `Skill`
- **기타**: `AskUserQuestion`, `Artifact`, `EnterPlanMode`/`ExitPlanMode`, `EnterWorktree`/`ExitWorktree`, `CronCreate`/`CronList`/`CronDelete`

MCP 서버에 연결된 도구도 이름으로 지정할 수 있다.

```yaml
tools: Read, Bash, mcp__github, mcp__slack__send_message
```

- `mcp__서버명` → 그 서버의 모든 도구 허용
- `mcp__서버명__도구명` → 특정 도구 하나만 허용

그리고 `tools` 필드를 아예 안 쓰면 — `test_db_agent`, `test_back_agent`, `test_front_agent`가 그랬듯 — 메인 세션이 쓸 수 있는 도구를 전부(연결된 MCP 도구 포함) 상속받는다. 그래서 `test_analysis_agent`처럼 목록을 좁혀둔 게 "이 에이전트는 딱 이것만 하게 하겠다"는 실질적인 제한으로 작동하는 것이고, 나머지 셋은 사실상 제한이 없는 상태였던 셈이다.

(출처: [Claude Code Tools Reference](https://code.claude.com/docs/en/tools-reference.md), [Subagents 문서](https://code.claude.com/docs/en/sub-agents.md))

## 순서는 저절로 안 지켜진다 — 커스텀 커맨드로 강제

서브에이전트는 기본적으로 독립된 컨텍스트를 가진다. 그냥 "분석하고 DB 짜고 백엔드 만들고 프론트 만들어줘"라고만 하면 메인 세션이 순서를 지켜서 위임해줄지, 위임 결과를 다음 단계에 제대로 넘겨줄지 보장이 안 된다. 그래서 `.claude/commands/pipeline.md`로 순서를 명시적으로 박아뒀다.

```markdown
---
description: 입력받은 작업을 정해진 서브에이전트 순서로 처리한다.
argument-hint: [작업 내용]
---

작업내용: $ARGUMENTS

다음 작업을 아래 서브에이전트들에게 **반드시 이 순서대로** 위임해서 작업을 처리하세요.
각 단계가 끝나면 그 결과(요약)을 다음 서브에이전트에게 컨텍스트로 전달하세요.
중간 단계를 건너뛰거나 순서를 바꾸지 마세요.

1. **@test_analysis_agent** 서브에이전트: 요구사항과 관련된 코드/자료를 받아서 처리
2. **@test_db_agent** 서브에이전트: 1번 결과를 바탕으로 스키마 설계
3. **@test_back_agent** 서브에이전트: 2번 결과를 바탕으로 백엔드 CRUD 구현
4. **@test_front_agent** 서브에이전트: 3번 결과를 바탕으로 화면 구현

모든 단계가 끝나면 전체 과정을 한 번에 요약해서 사용자에게 보고하세요.
```

`/pipeline 비회원 게시판 만들어줘`처럼 호출하면 `$ARGUMENTS`에 그 문장이 들어가고, 위 순서대로 각 에이전트가 실행된다. 핵심은 "반드시 이 순서대로", "결과를 다음 에이전트에게 컨텍스트로 전달"이라고 프롬프트에 못박아둔 부분이다 — 이걸 안 쓰면 서브에이전트 4개가 있다는 사실만으로는 순서나 컨텍스트 전달이 보장되지 않는다.

## 정리

- 서브에이전트 하나 = `.claude/agents/` 아래 마크다운 파일 하나, frontmatter로 이름/모델/도구/reasoning_effort 지정
- `tools`를 좁히면 그 에이전트가 역할 밖의 일을 못 하게 막을 수 있다
- 무거운 작업엔 기본 모델을, 가벼운 작업엔 `model`을 낮춰서 비용/속도를 조절할 수 있다 (여기선 프론트 에이전트만 haiku)
- 서브에이전트를 여러 개 만들어도 실행 순서와 컨텍스트 전달은 자동이 아니다 — 커스텀 커맨드(`.claude/commands/`)에 순서와 "결과를 다음 단계로 넘겨라"를 명시적으로 적어야 파이프라인처럼 동작한다
