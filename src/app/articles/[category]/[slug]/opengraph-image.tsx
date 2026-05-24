import { ImageResponse } from 'next/og'
import { getArticle, getAllArticleParams } from '@/lib/articles'
import { siteConfig } from '@/lib/site'

export const dynamic = 'force-static'

export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export async function generateStaticParams() {
  return getAllArticleParams()
}

type Props = {
  params: Promise<{ category: string; slug: string }>
}

export default async function Image({ params }: Props) {
  const { category, slug } = await params
  const article = await getArticle(category, slug)

  const title = article?.title ?? siteConfig.title
  const description = article?.description ?? siteConfig.description
  const cat = article?.category ?? ''

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
              'radial-gradient(circle, rgba(201,132,138,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* 카테고리 뱃지 */}
        {cat && (
          <div
            style={{
              background: 'rgba(201,132,138,0.12)',
              color: '#c9848a',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '24px',
            }}
          >
            {cat}
          </div>
        )}

        {/* 제목 */}
        <div
          style={{
            fontSize: title.length > 30 ? '48px' : '60px',
            fontWeight: 700,
            color: '#1e293b',
            lineHeight: 1.2,
            marginBottom: '20px',
            maxWidth: '900px',
          }}
        >
          {title}
        </div>

        {/* 설명 */}
        <div
          style={{
            fontSize: '22px',
            color: '#64748b',
            lineHeight: 1.5,
            maxWidth: '800px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </div>

        {/* 하단 저자 정보 */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#334155',
            }}
          >
            {siteConfig.name}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '18px' }}>·</div>
          <div style={{ fontSize: '18px', color: '#94a3b8' }}>
            minji-dev-blog.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
