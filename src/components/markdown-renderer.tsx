"use client"

import React, { useState, ReactNode } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  code: string
  language?: string
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="relative group my-2">
      <div className="absolute right-2 top-2 z-10">
        <button
          onClick={handleCopy}
          className={cn(
            "p-2 rounded-md transition-all",
            "bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900",
            "opacity-0 group-hover:opacity-100 focus:opacity-100"
          )}
          title={copied ? "Скопировано!" : "Копировать код"}
          aria-label={copied ? "Скопировано!" : "Копировать код"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
      {language && (
        <div className="absolute left-3 top-0 -translate-y-1/2 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
          {language}
        </div>
      )}
      <pre className="bg-gray-100 text-black rounded-lg p-4 overflow-x-auto">
        <code className="text-sm font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  )
}

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Parse inline markdown (bold, inline code)
  const parseInlineMarkdown = (text: string): ReactNode[] => {
    // First handle inline code, then bold
    const parts: ReactNode[] = []
    let remaining = text
    let keyIndex = 0

    // Pattern for inline code `code`
    const inlineCodePattern = /`([^`]+)`/g
    let lastIndex = 0
    let match

    while ((match = inlineCodePattern.exec(text)) !== null) {
      // Text before the match
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index)
        parts.push(...parseBold(beforeText, keyIndex))
        keyIndex += 10
      }
      // Inline code
      parts.push(
        <code
          key={`inline-code-${keyIndex++}`}
          className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
        >
          {match[1]}
        </code>
      )
      lastIndex = match.index + match[0].length
    }

    // Remaining text after last match
    if (lastIndex < text.length) {
      parts.push(...parseBold(text.slice(lastIndex), keyIndex))
    }

    // If no inline code was found, just parse bold
    if (parts.length === 0) {
      return parseBold(text, 0)
    }

    return parts
  }

  // Parse italic text _text_ (not inside words)
  const parseItalic = (text: string, startKey: number): ReactNode[] => {
    // Match _text_ but not inside words (e.g., variable_name should not be affected)
    // Pattern: underscore at start/after space, then content, then underscore before end/space
    const parts: ReactNode[] = []
    // Regex to match _text_ patterns (italic) - but not file_names or variable_names
    const italicPattern = /(^|[\s(])_([^_\s][^_]*[^_\s]|[^_\s])_([\s,.)!?:]|$)/g

    let lastIndex = 0
    let match

    while ((match = italicPattern.exec(text)) !== null) {
      // Text before the match (including any preceding char that's not underscore)
      if (match.index + match[1].length > lastIndex) {
        parts.push(text.slice(lastIndex, match.index + match[1].length))
      }
      // Italic text
      parts.push(
        <em key={`italic-${startKey}-${match.index}`}>{match[2]}</em>
      )
      // Update lastIndex to include trailing char
      lastIndex = match.index + match[0].length - match[3].length
    }

    // Remaining text after last match
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : [text]
  }

  // Parse bold text **text**
  const parseBold = (text: string, startKey: number): ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    const result: ReactNode[] = []

    parts.forEach((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        result.push(<strong key={`bold-${startKey}-${idx}`}>{part.slice(2, -2)}</strong>)
      } else if (part) {
        // Parse italic within non-bold parts
        result.push(...parseItalic(part, startKey + idx * 100))
      }
    })

    return result
  }

  // Render checkbox component
  const renderCheckbox = (checked: boolean, text: string, key: string) => (
    <li key={key} className="flex items-start gap-2 mb-1 list-none">
      <span
        className={cn(
          "flex-shrink-0 w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center",
          checked
            ? "bg-green-500 border-green-500 text-white"
            : "border-gray-300 bg-white"
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
      <span className={checked ? "text-gray-500 line-through" : ""}>
        {parseInlineMarkdown(text)}
      </span>
    </li>
  )

  // Parse the content with code blocks support
  const renderContent = (): ReactNode[] => {
    const elements: ReactNode[] = []
    const lines = content.split("\n")
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      // Check for code block start ```
      if (line.trim().startsWith("```")) {
        const language = line.trim().slice(3).trim() || undefined
        const codeLines: string[] = []
        i++

        // Collect code lines until closing ```
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeLines.push(lines[i])
          i++
        }

        elements.push(
          <CodeBlock
            key={`code-${i}`}
            code={codeLines.join("\n")}
            language={language}
          />
        )
        i++ // Skip closing ```
        continue
      }

      // Horizontal rule ---
      if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
        elements.push(
          <hr key={`hr-${i}`} className="my-3 border-t border-gray-300" />
        )
        i++
        continue
      }

      // Headers
      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl font-bold mt-4 mb-2">
            {parseInlineMarkdown(line.slice(2))}
          </h1>
        )
        i++
        continue
      }

      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-xl font-semibold mt-3 mb-1.5">
            {parseInlineMarkdown(line.slice(3))}
          </h2>
        )
        i++
        continue
      }

      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-lg font-medium mt-2 mb-1">
            {parseInlineMarkdown(line.slice(4))}
          </h3>
        )
        i++
        continue
      }

      // Unordered list with checkboxes - collect all items into <ul>
      // Handle blank lines between items (common in AI-generated markdown)
      if (line.startsWith("- ")) {
        const listItems: ReactNode[] = []
        const startIdx = i

        while (i < lines.length) {
          // Check if current line is an unordered list item
          if (lines[i].startsWith("- ")) {
            const itemLine = lines[i]
            const itemContent = itemLine.slice(2)

            // Check for checkbox syntax - [ ] or [x]
            if (itemContent.startsWith("[ ] ")) {
              listItems.push(renderCheckbox(false, itemContent.slice(4), `checkbox-${i}`))
            } else if (itemContent.startsWith("[x] ") || itemContent.startsWith("[X] ")) {
              listItems.push(renderCheckbox(true, itemContent.slice(4), `checkbox-${i}`))
            } else if (itemContent === "[]" || itemContent.startsWith("[] ")) {
              // Handle [] without space as unchecked checkbox
              const text = itemContent === "[]" ? "" : itemContent.slice(3)
              listItems.push(renderCheckbox(false, text, `checkbox-${i}`))
            } else {
              listItems.push(
                <li key={`li-${i}`} className="mb-1">
                  {parseInlineMarkdown(itemContent)}
                </li>
              )
            }
            i++
          }
          // Skip blank lines if the next non-blank line is also an unordered list item
          else if (lines[i].trim() === "") {
            // Look ahead to find next non-blank line
            let lookAhead = i + 1
            while (lookAhead < lines.length && lines[lookAhead].trim() === "") {
              lookAhead++
            }
            // If next non-blank line is an unordered list item, skip the blank lines
            if (lookAhead < lines.length && lines[lookAhead].startsWith("- ")) {
              i = lookAhead
            } else {
              // Not followed by an unordered list item, end the list
              break
            }
          } else {
            // Non-blank, non-list-item line - end the list
            break
          }
        }

        elements.push(
          <ul key={`ul-${startIdx}`} className="ml-6 my-1" style={{ listStyleType: 'disc' }}>
            {listItems}
          </ul>
        )
        continue
      }

      // Ordered list - collect all items into <ol>
      // Handle blank lines between numbered items (common in AI-generated markdown)
      if (/^\d+\. /.test(line)) {
        const listItems: ReactNode[] = []
        const startIdx = i
        let firstNumber: number | null = null

        while (i < lines.length) {
          // Check if current line is a numbered item
          const numMatch = lines[i].match(/^(\d+)\. /)
          if (numMatch) {
            const itemNumber = parseInt(numMatch[1], 10)
            if (firstNumber === null) {
              firstNumber = itemNumber
            }
            const itemLine = lines[i]
            const itemContent = itemLine.slice(itemLine.indexOf(" ") + 1)
            listItems.push(
              <li key={`oli-${i}`} className="mb-1" value={itemNumber}>
                {parseInlineMarkdown(itemContent)}
              </li>
            )
            i++
          }
          // Skip blank lines if the next non-blank line is also a numbered item
          else if (lines[i].trim() === "") {
            // Look ahead to find next non-blank line
            let lookAhead = i + 1
            while (lookAhead < lines.length && lines[lookAhead].trim() === "") {
              lookAhead++
            }
            // If next non-blank line is a numbered item, skip the blank lines
            if (lookAhead < lines.length && /^\d+\. /.test(lines[lookAhead])) {
              i = lookAhead
            } else {
              // Not followed by a numbered item, end the list
              break
            }
          } else {
            // Non-blank, non-numbered line - end the list
            break
          }
        }

        elements.push(
          <ol key={`ol-${startIdx}`} className="ml-6 my-1" style={{ listStyleType: 'decimal' }} start={firstNumber ?? 1}>
            {listItems}
          </ol>
        )
        continue
      }

      // Empty line - collapse consecutive blank lines into a single spacer
      if (line.trim() === "") {
        // Skip all consecutive blank lines
        while (i < lines.length && lines[i].trim() === "") {
          i++
        }
        elements.push(<div key={`spacer-${i}`} className="h-2" />)
        continue
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${i}`} className="mb-1">
          {parseInlineMarkdown(line)}
        </p>
      )
      i++
    }

    return elements
  }

  return <div className={cn("prose prose-gray max-w-none", className)}>{renderContent()}</div>
}
