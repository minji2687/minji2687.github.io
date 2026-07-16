import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'
export const size = {
  width: 46,
  height: 46,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#818cf8',
          borderRadius: '11px',
          color: '#fff',
          fontSize: 30,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        M
      </div>
    ),
    { ...size },
  )
}
