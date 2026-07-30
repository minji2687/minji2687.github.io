---
title: "Claude Code 규칙 파일(.claude/rules) 관리하는 법"
description: "CLAUDE.md 하나에 규칙을 다 몰아넣는 대신 .claude/rules/ 아래 파일을 나눠 관리하는 법. paths frontmatter 유무에 따라 상시 로드되는지, 조건부로 로드되는지가 갈린다."
date: "2026-07-29"
tags: ["Claude Code", "AI Tools"]
draft: true
---

CLAUDE.md 하나에 프로젝트 규칙을 다 적으면 파일이 금방 비대해진다. Claude Code는 `.claude/rules/` 아래에 규칙을 주제별로 쪼개서 관리하는 기능을 공식으로 지원하는데, 이때 파일마다 **언제 로드되는지**가 다르다는 걸 몰랐다가 실제 예시로 확인해봤다.

## 예시 폴더 구조

```
.claude/
  CLAUDE.md
  rules/
    style_rule.md
    style_path_rule.md
```

## style_rule.md — 조건 없이 항상 로드

```markdown
# css 파일 규칙

## 컨벤션
- 들여쓰기: 4칸
- 문법: kebab-case 사용
- css 파일은 해당 파일 이름으로 style 폴더 안에 생성
- 스타일은 외부스타일로 적용

ex) flex01.html이라면 style/flex01.css 파일로 생성

## 절대 하지 말아야 하는 것
- 프롬프트에서 제공한 스타일 외에 다른 스타일은 적용시키지 않기
```

frontmatter가 없다. 이런 파일은 **세션을 시작하는 순간 CLAUDE.md와 같은 시점에** 컨텍스트로 들어간다. CSS 파일을 만지든 안 만지든 항상 켜져 있는 규칙인 셈이다.

## style_path_rule.md — 조건부로 로드

```markdown
---
paths:
    - "style/**/*.css"
---

- 코드 설명 주석을 모두 달아줘
```

frontmatter에 `paths`가 있다. 이 조건이 붙은 파일은 세션 시작 시엔 로드되지 않고, **`style/` 폴더 안의 `.css` 파일을 Claude가 실제로 열거나 건드릴 때만** 그 시점에 로드된다. 평소엔 컨텍스트를 차지하지 않다가 필요할 때만 끼어드는 규칙.

### paths 패턴 비교

같은 "css 파일"을 노리는 것 같아도 패턴에 따라 매칭 범위가 다르다.

```yaml
paths:
  - "style/*.css"      # style/ 바로 아래 있는 .css만 (하위 폴더 X)
  - "style/**/*.css"   # style/ 아래 몇 단계든 하위 폴더 포함 전부
  - "*.css"             # 프로젝트 어디든 상관없이 .css 확장자면 전부
```

- `style/*.css` → `style/flex01.css`는 매칭되지만 `style/layout/flex01.css`는 매칭 안 됨
- `style/**/*.css` → `style/` 아래라면 몇 단계 하위든 다 매칭 (`style/layout/flex01.css`도 포함)
- `*.css` → 폴더 위치 상관없이 확장자만 보고 전부 매칭 (`style/` 밖에 있는 css도 포함)

즉 규칙을 "style 폴더 안으로만" 한정하고 싶으면 `style/**/*.css`가 맞고, "프로젝트 전체 css 컨벤션"이면 `*.css`처럼 폴더 제한 없이 걸어야 한다.

## 정리하면

| 파일 | paths 유무 | 로드 시점 |
|---|---|---|
| `CLAUDE.md` | - | 세션 시작 시 항상 |
| `style_rule.md` | 없음 | 세션 시작 시 항상 |
| `style_path_rule.md` | `style/**/*.css` | 해당 경로 파일을 건드릴 때만 |

즉 이 세 파일이 한꺼번에 읽히는 게 아니라, **"상시 규칙" 두 개 + "조건부 규칙" 한 개**로 나뉘어 동작한다. 규칙이 많아질수록 자주 쓰는 공통 규칙은 `paths` 없이, 특정 폴더·확장자에만 해당하는 규칙은 `paths`를 걸어서 컨텍스트를 아끼는 식으로 나누면 좋을 것 같다.

## 우선순위 (참고)

여러 레벨의 CLAUDE.md/rules가 동시에 존재할 때는 아래 순서로 좁혀진다.

1. 조직 관리 정책 CLAUDE.md (org-wide)
2. `~/.claude/CLAUDE.md` (사용자 레벨, 모든 프로젝트 공통)
3. 프로젝트 루트 `CLAUDE.md` / `.claude/CLAUDE.md`
4. `CLAUDE.local.md` (개인 전용, git 제외)

`.claude/rules/`도 마찬가지로 유저 레벨(`~/.claude/rules/`)이 프로젝트 레벨보다 먼저 로드된다.

출처: [Claude Code Memory 공식 문서](https://code.claude.com/docs/en/memory.md)

## 커스텀 슬래시 커맨드 (`.claude/commands/`)

규칙 파일과 별개로 `.claude/commands/` 아래에 마크다운 파일을 만들면 나만의 슬래시 커맨드를 만들 수 있다.

```
.claude/
  commands/
    css/
      box.md
      position.md
    refactor.md
    refactor02.md
```

### 파일명이 곧 커맨드명

`refactor.md`를 만들면 `/refactor`로 호출된다. 확장자만 빼고 파일명 그대로가 커맨드 이름이 되는 것.

### 하위 폴더는 네임스페이스

폴더로 묶으면 `폴더명:파일명` 형태로 호출된다.

- `commands/css/box.md` → `/css:box`
- `commands/css/position.md` → `/css:position`

같은 성격의 커맨드를 `css/`, `refactor/`처럼 폴더로 묶어두면 커맨드 목록에서도 구분이 되고 이름 충돌도 피할 수 있다.

### 인자 받는 두 가지 방식

**`$ARGUMENTS`** — 커맨드 뒤에 입력한 내용을 통째로 하나의 문자열로 받는다.

```markdown
$ARGUMENTS 입력된 코드의 리팩토링으로 오류를 해결하고
기존 코드 대비 개선된 점을 2줄로 요약해서 주석으로 처리하세요
```

`/refactor 이 함수` → `$ARGUMENTS`에 "이 함수"가 그대로 들어감.

**`$1`, `$2`, `$3`...** — 공백 기준으로 인자를 쪼개서 위치별로 따로 받는다.

```markdown
$1파일에 $2x$3 box를 $4개 만들어줘
```

`/css:box index.html 100 50 3` → `$1=index.html`, `$2=100`, `$3=50`, `$4=3`

한 문장으로 뭉쳐서 써도 되는 요청이면 `$ARGUMENTS`, 값 하나하나를 코드에서 다루듯 정확히 지정하고 싶으면 `$1 $2 $3...`을 쓰면 된다.

`$ARGUMENTS`와 `$1`, `$2`, `$3`은 함수 인자처럼 내가 이름을 짓는 게 아니라 Claude Code가 미리 정해둔 고정 문법이다. `$args`, `$width`처럼 임의로 이름을 바꿔서 쓸 수 없고, 반드시 이 이름 그대로 써야 인식된다.
