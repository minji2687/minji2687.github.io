import { ImageResponse } from 'next/og'
import { siteConfig } from '@/lib/site'

export const dynamic = 'force-static'
export const alt = siteConfig.title
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#faf8f5',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 배경 장식 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '400px',
            height: '400px',
            background:
              'radial-gradient(circle, rgba(201,132,138,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* 카테고리/태그 영역 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              background: 'rgba(201,132,138,0.12)',
              color: '#c9848a',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Frontend Developer
          </div>
        </div>

        {/* 이름 */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 700,
            color: '#1e293b',
            lineHeight: 1.1,
            marginBottom: '16px',
          }}
        >
          Minji Jo
        </div>

        {/* 설명 */}
        <div
          style={{
            fontSize: '24px',
            color: '#64748b',
            lineHeight: 1.5,
            maxWidth: '700px',
          }}
        >
          {siteConfig.description}
        </div>

        {/* 하단 URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '80px',
            fontSize: '18px',
            color: '#94a3b8',
          }}
        >
          minji-dev-blog.vercel.app
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
