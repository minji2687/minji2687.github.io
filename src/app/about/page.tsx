import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'

export const metadata: Metadata = {
  title: 'About',
  description: 'Minji Jo — Frontend Developer 소개',
}

type WorkItem = {
  period: string
  company: string
  companyDesc?: string
  team: string
  level: string
  bullets: string[]
}

const workHistory: WorkItem[] = [
  {
    period: '2023.07 – 2026.04',
    company: '긴트',
    companyDesc: '농기계 자율주행 회사',
    team: '비지니스 플랫폼팀',
    level: '주임',
    bullets: [
      '농기계 자율주행 서비스의 실시간 모니터링 웹/운영 어드민/원격 제어 앱 프론트엔드 개발 및 유지보수',
      'Next.js, React, TypeScript, React Native 기반으로 웹·모바일 서비스 구축 및 운영',
      'MQTT, WebSocket, AWS IoT Core 기반 실시간 데이터 연동 및 장비 상태 모니터링 화면 개발',
      'MapLibre 기반 위치·주행 경로 시각화, 운영 KPI 대시보드 및 관리자 기능 구현',
      'React Native 전기트랙터 원격 제어 앱 개발: 제어 UI, CAN 데이터 파싱, 상태 관리, 자동 재연결 로직 구현',
      'Zustand/Redux/React Query 기반 상태관리 및 데이터 흐름 개선, 레거시 리팩토링 수행',
      '다국어(i18n), 공통 컴포넌트, 반응형 UI, QR/바코드 스캔 기능 적용으로 운영 효율 향상',
    ],
  },
  {
    period: '2022.05 – 2023.05',
    company: '서울옥션',
    companyDesc: '미술품을 경매하는 회사',
    team: '웹서비스개발팀',
    level: '선임',
    bullets: [
      '미술품 경매 플랫폼의 통합 어드민 및 홈페이지 리뉴얼 프론트엔드 개발 참여',
      'Next.js/React/Redux/React Query 기반으로 고객 관리, 콘텐츠 운영, 검색/필터, 등록·수정 화면 구현',
      '고객 상세/거래내역/문의응답/상태변경 등 운영형 백오피스 기능 개발',
      '페이지 간 검색 조건 유지, 권한별 기능 제어, Drag & Drop 정렬 등 운영 효율을 높이는 UI/기능 구현',
      '홈페이지 공통 이미지 뷰어 모듈화 및 전시 메뉴 데이터 연동으로 유지보수성 개선',
    ],
  },
  {
    period: '2019.02 – 2020.05',
    company: '미스터블루',
    team: '솔루션 개발팀',
    level: '연구원',
    bullets: [
      '웹툰/만화 플랫폼의 웹·모바일 뷰어와 사내 운영 서비스 프론트엔드 개발',
      'React, TypeScript, MobX 기반으로 회차 리스트, 북마크, 뷰어 설정, 하단 메뉴 등 핵심 인터랙션 UI 구현',
      '백오피스용 만화 미리보기 뷰어와 인증서비스 고도화 프로젝트에서 폼 UI/Validation, 상태관리, 재사용 컴포넌트 개발',
      'jQuery 기반 만화 뷰어, Python 라이브러리 기반 프론트 영역을 React로 전환하며 구조 개선 및 유지보수성 향상',
      '앱 배포 관리 서비스에서는 로그인, 파일 업로드, 배포 상태 변경, 프리릴리즈 기능 등 운영형 기능 개발 수행',
    ],
  },
]

export default function AboutPage() {
  return (
    <Container className="py-16">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          About
        </h1>

        <div className="mt-8 space-y-6 text-base leading-8 text-[var(--muted)]">
          <p>안녕하세요, 5년차 프론트엔드 개발자 조민지입니다.</p>
          <p>
            최근 3년간 농기계 자율주행 플랫폼에서 MQTT/WebSocket/AWS IoT Core
            기반 실시간 데이터를 다루며, 하드웨어 단말기의 데이터가 사용자
            화면까지 안정적으로 전달·표현되는 구조를 만들어왔습니다. Next.js
            웹 서비스와 React Native 앱을 함께 다루고, MapLibre 기반 위치 데이터
            시각화와 다국어(i18n) 운영형 서비스도 구축했습니다.
          </p>
          <p>
            복잡한 데이터 흐름을 신뢰할 수 있는 화면 경험으로 연결하는 일에
            관심이 많고, 통신 지연이나 상태 불일치처럼 운영 환경에서 발생하는
            문제를 차분히 들여다보는 과정을 좋아합니다.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {[
            { label: 'Work', value: 'GINT' },
            { label: 'Role', value: 'Frontend Developer' },
            { label: 'Location', value: 'Seoul, Korea' },
            {
              label: 'GitHub',
              value: 'github.com/minji2687',
              href: 'https://github.com/minji2687',
            },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                {item.label}
              </p>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-base text-[var(--accent)] hover:underline"
                >
                  {item.value}
                </a>
              ) : (
                <p className="mt-1 text-base text-[var(--foreground)]">
                  {item.value}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Work Experience
            </h2>
            <span className="text-sm text-[var(--accent)]">총 5년</span>
          </div>

          <ul className="mt-8 space-y-10">
            {workHistory.map((item) => (
              <li key={item.company} className="flex flex-col gap-1 sm:flex-row sm:gap-8">
                <div className="shrink-0 sm:w-40">
                  <p className="text-sm tabular-nums text-[var(--muted)]">
                    {item.period}
                  </p>
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">
                      {item.company}
                    </h3>
                    {item.companyDesc && (
                      <span className="text-sm text-[var(--muted)]">
                        {item.companyDesc}
                      </span>
                    )}
                    <span className="text-sm text-[var(--muted)]">
                      {item.team}
                    </span>
                    <span className="text-xs text-[var(--accent)]">
                      {item.level}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {item.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex gap-2 text-sm leading-relaxed text-[var(--muted)]"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)] opacity-50" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  )
}
