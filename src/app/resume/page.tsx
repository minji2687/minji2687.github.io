import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'

export const metadata: Metadata = {
  title: 'Resume',
  description: '이력서 / CV',
}

export default function ResumePage() {
  return (
    <Container className="py-12">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Resume
        </h1>

        <section className="mt-10">
          <h2 className="mb-4 border-b border-[var(--border-color)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            Experience
          </h2>

          <div className="space-y-6">
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-[var(--foreground)]">
                    GINT
                  </p>
                  <p className="text-sm text-[var(--accent)]">Frontend Developer</p>
                </div>
                <span className="shrink-0 text-sm text-[var(--muted)]">2022 — 현재</span>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--muted)]">
                <li>• Next.js + Markdoc 기반 사용자 매뉴얼 시스템 구축</li>
                <li>• React Native 현장 관리 앱 개발 (iOS / Android)</li>
                <li>• GeoServer WMS/WFS 연동 지도 서비스 개발</li>
                <li>• AWS Cognito / S3 / CloudFront 인프라 연동</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 border-b border-[var(--border-color)] pb-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            Skills
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { label: 'Frontend', value: 'Next.js, React, TypeScript, Tailwind CSS' },
              { label: 'Mobile', value: 'React Native (iOS / Android)' },
              { label: 'GIS', value: 'GeoServer, WMS, WFS, OpenLayers' },
              { label: 'Cloud', value: 'AWS (S3, CloudFront, Cognito, Pinpoint)' },
              { label: 'CMS / Docs', value: 'Markdoc, MDX' },
              { label: 'Tools', value: 'Git, GitHub, Vercel, Figma' },
            ].map((skill) => (
              <div key={skill.label}>
                <p className="text-sm font-semibold text-[var(--foreground)]">{skill.label}</p>
                <p className="mt-0.5 text-sm text-[var(--muted)]">{skill.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Container>
  )
}
