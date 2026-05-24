'use client'

import { Highlight, themes } from 'prism-react-renderer'
import { useState } from 'react'
import { clsx } from 'clsx'

type CodeBlockProps = {
  language?: string
  content: string
  children?: React.ReactNode
}

export function CodeBlock({ language = 'text', content, children }: CodeBlockProps) {
  const code = content ?? (typeof children === 'string' ? children : '')
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2">
        <span className="text-xs text-slate-400">{language}</span>
        <button
          onClick={handleCopy}
          className="rounded px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          aria-label="코드 복사"
        >
          {copied ? '복사됨 ✓' : '복사'}
        </button>
      </div>

      <Highlight
        theme={themes.oneDark}
        code={code.trim()}
        language={language as Parameters<typeof Highlight>[0]['language']}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={clsx(className, 'overflow-x-auto p-4 text-sm leading-7')}
            style={style}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="mr-4 select-none text-slate-600 tabular-nums">
                  {String(i + 1).padStart(2, ' ')}
                </span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  )
}
