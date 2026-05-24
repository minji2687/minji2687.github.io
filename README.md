# Minji Jo — Developer Blog

Next.js, Markdoc, Tailwind CSS 기반의 기술 문서형 개인 개발 블로그.

## Stack

- **Next.js 15** + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Markdoc** — 기술 문서형 글 작성
- **next-themes** — 다크모드
- **Prism React Renderer** — 코드 하이라이팅
- **FlexSearch** — 클라이언트 사이드 검색

## 개발 시작

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
npm run start
```

## GitHub Pages 배포

```bash
GITHUB_PAGES=true npm run build
```

## 배포

- Vercel: `vercel deploy`
- GitHub Pages: `GITHUB_PAGES=true npm run build` 후 `out/` 폴더 배포
