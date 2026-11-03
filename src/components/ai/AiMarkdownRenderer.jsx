import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Isolated Markdown Renderer component for AI Assistant responses.
 * Uses 16px body text, 1.7 line height, 14-15px code blocks, and clear heading hierarchy.
 */
export default function AiMarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div className="markdown-ai-body text-[16px] leading-[1.7] text-[#F8FAFC]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml={true}
        components={{
          // Safe Links
          a: ({ node, children, href, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#38BDF8] underline hover:text-sky-300 font-medium underline-offset-2 break-all"
              {...props}
            >
              {children}
            </a>
          ),
          // Paragraphs (16px, 1.7 line-height)
          p: ({ node, children }) => (
            <p className="text-[16px] leading-[1.7] mb-3 last:mb-0 break-words">{children}</p>
          ),
          // Headings
          h1: ({ node, children }) => (
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#38BDF8] mt-4 mb-2 border-b border-[#334155] pb-1.5">
              {children}
            </h1>
          ),
          h2: ({ node, children }) => (
            <h2 className="text-lg sm:text-xl font-bold text-[#38BDF8] mt-3.5 mb-1.5">
              {children}
            </h2>
          ),
          h3: ({ node, children }) => (
            <h3 className="text-base sm:text-lg font-bold text-[#38BDF8] mt-3 mb-1">
              {children}
            </h3>
          ),
          // Lists
          ul: ({ node, children }) => (
            <ul className="list-disc list-inside space-y-1.5 my-2.5 text-[16px] leading-[1.7] pl-1">
              {children}
            </ul>
          ),
          ol: ({ node, children }) => (
            <ol className="list-decimal list-inside space-y-1.5 my-2.5 text-[16px] leading-[1.7] pl-1">
              {children}
            </ol>
          ),
          li: ({ node, children }) => (
            <li className="leading-[1.7]">{children}</li>
          ),
          // Blockquotes
          blockquote: ({ node, children }) => (
            <blockquote className="border-l-4 border-[#38BDF8] pl-3.5 py-1.5 my-3 bg-[#0F172A]/60 text-[#CBD5E1] text-[15px] sm:text-[16px] leading-[1.7] italic rounded-r-xl">
              {children}
            </blockquote>
          ),
          // Code Blocks & Inline Code (14-15px)
          code: ({ node, inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code
                  className="bg-[#0F172A] text-[#38BDF8] px-1.5 py-0.5 rounded-md text-[14px] font-mono border border-[#334155]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="my-3 rounded-2xl overflow-hidden border border-[#334155] bg-[#0F172A]">
                <pre className="p-3.5 text-[14px] sm:text-[15px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                  <code>{children}</code>
                </pre>
              </div>
            );
          },
          // Tables
          table: ({ node, children }) => (
            <div className="overflow-x-auto my-3 rounded-2xl border border-[#334155]">
              <table className="min-w-full text-sm sm:text-base text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ node, children }) => (
            <thead className="bg-[#0F172A] text-[#38BDF8] border-b border-[#334155]">
              {children}
            </thead>
          ),
          th: ({ node, children }) => (
            <th className="p-2.5 border border-[#334155] font-bold">{children}</th>
          ),
          td: ({ node, children }) => (
            <td className="p-2.5 border border-[#334155] text-[#F8FAFC]">{children}</td>
          ),
          // Horizontal Rule
          hr: () => <hr className="border-[#334155] my-4" />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
