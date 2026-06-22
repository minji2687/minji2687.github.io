---
title: GitBook → 4개 매뉴얼 사이트 자동 동기화 파이프라인
description: GitBook으로 작성하는 농기계 사용자/서비스/OEM 매뉴얼 콘텐츠를 Next.js + Markdoc 기반 4개 독립 사이트로 자동 변환·배포하는 문서 파이프라인. npm workspaces 모노레포 구성과 Bitbucket Pipelines 자동 동기화까지 단독 개발.
date: "2026-01"
tags:
  - Next.js
  - TypeScript
  - Markdoc
  - GitBook
  - Node.js
  - Bitbucket Pipelines
status: active
featured: false
---

## 배경

긴트의 자율주행 농기계 매뉴얼(사용설명서, 서비스/설치 매뉴얼)은 GitBook으로 작성된다. 그런데 이 콘텐츠를 보여줘야 하는 곳이 하나가 아니었다. 자사 사용자용(usermanual), 설치기사용(servicemanual), 구보다 OEM 브랜드용(kubodamanual, FKK)에 더해 PVSS 매뉴얼(pvssmanual)까지 4개 사이트가 각자 한국어/일본어로 존재했다. 콘텐츠가 바뀔 때마다 4곳에 손으로 옮기는 건 금방 한계에 부딪혔다.

Tailwind Plus의 "Syntax" 문서 템플릿(Next.js + Markdoc)을 기반으로 4개 앱을 npm workspaces 모노레포로 구성하고, GitBook 원본을 각 앱이 쓰는 Markdoc 문법으로 변환해 자동으로 밀어넣는 파이프라인을 혼자 설계·구현했다.

---

## 구조

npm workspaces 모노레포로 `apps/`, `packages/`, `scripts/` 세 영역으로 나뉜다.

**apps/** — 독립된 Next.js 사이트 4개

| 앱 | 역할 | 언어 |
|---|---|---|
| `usermanual` | 일반 사용자용 사용설명서 | kr / jp |
| `servicemanual` | 설치기사·서비스용 매뉴얼 | kr / jp |
| `kubodamanual` | 구보다(FKK) OEM 브랜드용 매뉴얼 | kr / jp |
| `pvssmanual` | PVSS 매뉴얼 | draft(단일 라우트) |

각 앱은 Tailwind Plus "Syntax" 템플릿 기반의 독립 Next.js 프로젝트(App Router)이고, 문서 콘텐츠는 `src/app/ion/{lang}/.../page.md` 형태로 디렉터리째 페이지가 된다. 루트 `package.json`에서 `npm run dev:user`, `npm run build:kubota`처럼 워크스페이스별 스크립트를 모아 실행한다.

**packages/ui** — 4개 앱이 공통으로 쓰는 Markdoc 컴포넌트(`Hint`, `Accordion`, `CardLink` 등)와 내비게이션 로직(`getHiddenPaths` 등)을 `@repo/ui`로 모아, 모든 앱이 `file:../../packages/ui`로 동일하게 참조하도록 정리했다. (브랜드별로 달라야 하는 kubodamanual의 LanguageSelector 같은 건 의도적으로 빼고 앱 로컬에 둔다.)

**scripts/docs-sync** — 콘텐츠 동기화 엔진. `config/{app}.js`(앱별 GitBook 소스·언어셋·후처리 스크립트 정의) → `sync-docs.js`(클론 → 언어별 처리 → 후처리 → 정리, 5단계 메인 스크립트) → `convert-*.js`(GitBook 문법을 Markdoc 문법으로 바꾸는 변환기들) → `process-all.js`(변환기들을 파일 단위로 병렬 처리) 순으로 구성되며, `merge-local-manuals-to-kuboda.js`가 kubodamanual 전용 추가 병합 단계를 맡는다.

전체 흐름은 한 문장으로: **GitBook(원본) → GitHub 미러 클론 → 디렉터리/문법 변환(Markdoc) → 각 앱의 `src/app` 아래 배치 → (kubodamanual만) 로컬 콘텐츠 추가 병합.**

---

## 이슈트래킹

### 1. GitBook 문법 → Markdoc 변환

GitBook 마크다운에는 `{% hint %}`, `{% columns %}`, `{% content-ref %}` 같은 GitBook 전용 블록 문법이 들어있다. Syntax 템플릿은 Markdoc 기반이라 태그 문법 자체가 다르고, GitBook이 쓰는 닫는 태그 표기(`{% endhint %}`)도 Markdoc 표기(`{% /hint %}`)와 다르다.

`sync-docs.js`가 GitHub에 미러링된 GitBook 콘텐츠를 클론(캐시가 있으면 `git pull --ff-only`로 재사용)한 뒤, 언어별로 디렉터리 구조를 변환(`README.md` → `page.md`, 불필요한 래퍼 디렉터리 평탄화)하고, 표·이미지 경로·앵커 태그·content-ref 카드링크 등을 처리하는 변환 스크립트 8~9개를 순서대로 돌린다.

그중 `{% hint %}` 변환은 디버깅하면서 알게 된 케이스였다. 내용에 줄바꿈이 없는 인라인 hint는 Markdoc이 `<p>` 태그로 감싸버리는데, hint 컴포넌트는 내부적으로 `<div>`를 렌더링해서 `<p>` 안에 `<div>`가 들어가는 하이드레이션 에러가 났다. 인라인 hint를 감지해 강제로 줄바꿈을 넣어 블록 형태로 바꾸는 스크립트를 따로 만들었다.

```js
const HINT_BLOCK_RE = /\{%\s*hint\s*([^%]*)%\}([\s\S]*?)\{\%\s*\/\s*hint\s*%\}/g;

function convertHintBlocks(content) {
  return content.replace(HINT_BLOCK_RE, (match, attrs, inner) => {
    const trimmed = inner.trimEnd();
    if (trimmed.startsWith('\n') || trimmed === '') return match;
    const attrsStr = attrs.trim() ? ` ${attrs.trim()}` : '';
    return `{% hint${attrsStr} %}\n${inner}{% /hint %}`;
  });
}
```

---

### 2. GitBook 태그가 화면까지 그려지는 흐름

위에서 본 `{% hint %}`처럼 GitBook 원본에 그대로 있던 태그도 있지만, `{% accordion %}`/`{% accordion-group %}`처럼 GitBook 소스에는 없던 걸 `convert-page-tables.js`가 GitBook의 페이지 링크 테이블 구조를 보고 새로 합성해내는 태그도 있다. 어느 쪽이든 이 태그가 실제 화면으로 그려지는 건 Markdoc 자신이 하는 일이 아니다.

`next.config.mjs`에서 `@markdoc/next.js` 플러그인이 `.md`를 Next.js 페이지로 다루게 해주는데, 내부 흐름은 이렇다.

```js
import withMarkdoc from '@markdoc/next.js'
export default withMarkdoc({ schemaPath: './src/markdoc' })(nextConfig)
```

1. Markdoc이 `page.md`를 파싱해 AST를 만든다.
2. `{% hint %}` 같은 태그를 만나면 `schemaPath`가 가리키는 `markdoc/tags.js`의 매핑을 보고 `Hint` React 컴포넌트 호출로 바꾼다.
3. 그 React 엘리먼트 트리를 Next.js가 일반 페이지처럼 렌더링한다(`output: 'export'`라 빌드 시점에 정적 HTML로 떨어진다).

즉 "태그 → HTML"이 아니라 "태그 → React 컴포넌트 → React가 그리는 HTML"이고, 그 중간 매핑 테이블이 `packages/ui/src/markdoc/tags.js`다. 4개 앱이 같은 변환 파이프라인이 뱉는 같은 태그 문법을 쓰는 이상, 이 매핑과 컴포넌트도 4개 앱에서 동일해야 한다 — 그래서 `packages/ui`로 공유했다.

---

### 3. 같은 파이프라인, 다른 설정

4개 앱은 변환 로직 자체는 공유하지만 GitBook 소스 저장소 경로, 언어셋, 후처리 스크립트 목록이 앱마다 다르다. `config/{app}.js` 파일에 이 차이를 정의해두고 `sync-docs.js`가 인자로 받은 앱 이름으로 해당 설정을 불러와 실행한다.

pvssmanual은 다국어가 아니라 `draft`라는 단일 라우트만 쓰는데, 이것도 `LANGUAGES: ['draft']`로 선언만 바꿔서 같은 언어별 처리 루프를 그대로 재사용하도록 만들었다. 새 사이트가 추가되더라도 설정 파일 하나만 추가하면 되는 구조다.

---

### 4. OEM 브랜드(kubodamanual) 로컬 병합

kubodamanual은 구보다(FKK) OEM용 자체 GitBook 소스가 있지만, 설치 절차나 사용법 같은 일부 페이지는 usermanual·servicemanual 콘텐츠를 그대로 재사용해야 했다. GitBook 동기화 이후에 `merge-local-manuals-to-kuboda.js`를 한 번 더 돌려서 로컬 앱의 특정 페이지 디렉터리만 rsync로 kubodamanual에 덮어쓴다.

언어별로 경로가 갈리는 경우(JP는 `initial-setup`이 `customer-guidance`로 매핑)나, 특정 하위 페이지만 제외하고 복사해야 하는 경우, 구보다에서는 노출하면 안 되는 페이지를 강제로 `hidden: true` 처리하면서 부모 페이지의 카드링크까지 같이 제거하는 경우까지 설정 파일(`kuboda-source-copy.js`) 하나에 케이스별로 정리했다.

asset 동기화에서는 mtime 비교가 신뢰할 수 없다는 문제도 겪었다. CI에서 `git checkout`을 새로 하면 파일의 mtime이 초기화되는데, rsync는 기본적으로 mtime+size로 변경 여부를 판단하기 때문에 실제로는 바뀌지 않은 이미지까지 매번 다시 복사되거나, 반대로 바뀐 파일이 스킵되는 일이 있었다. assets 동기화에는 `--checksum` 플래그를 추가해 파일 내용 기준으로 비교하도록 고쳤다.

---

### 5. Bitbucket Pipelines로 자동 반영

GitBook 콘텐츠가 바뀔 때마다 수동으로 동기화 스크립트를 돌리는 것도 결국 사람이 잊어버리는 지점이 된다. Bitbucket Pipelines 커스텀 파이프라인에서 `npm run sync:user`, `npm run sync:service`를 실행한 뒤, 변경된 파일이 있으면 자동으로 커밋·푸시하도록 구성했다.

```yaml
script:
  - npm ci
  - npm run sync:user
  - npm run sync:service
  - git config user.name "Bitbucket Pipelines"
  - git config user.email "pipelines@bitbucket.org"
  - git add apps/usermanual/src/app/ion apps/usermanual/public/assets apps/servicemanual/src/app/ion apps/servicemanual/public/assets
  - 'git diff --cached --quiet || (git commit -m "chore(docs): auto-sync from gitbook [skip ci]" && git push origin main)'
```

커밋 메시지에 `[skip ci]`를 넣어 이 커밋이 다시 파이프라인을 트리거하는 무한 루프를 막았고, 변경분이 없으면(`git diff --cached --quiet`) 커밋 자체를 생성하지 않도록 했다. 문서 변경이 코드 배포처럼 별도 검토 없이도 안전하게 자동 반영되는 경로를 만든 셈이다.
