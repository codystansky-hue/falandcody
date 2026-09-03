'use client'

import { useState } from 'react'

/** A command you are meant to paste somewhere else, with one-tap copy. */
export default function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard is blocked in some contexts; the text is selectable anyway.
    }
  }

  return (
    <div className="card flex items-start gap-3 p-3">
      <code className="mono text-xs sm:text-sm flex-1 overflow-x-auto whitespace-pre break-words">
        {text}
      </code>
      <button type="button" onClick={copy} className="btn btn-quiet shrink-0 py-1.5 px-3 text-xs">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
