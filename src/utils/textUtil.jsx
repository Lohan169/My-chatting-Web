import React from 'react';

/**
 * Trims trailing punctuation and handles unbalanced closing parentheses.
 * E.g.
 * - "https://google.com)." -> url: "https://google.com", suffix: ")."
 * - "(https://google.com)" -> url: "https://google.com", suffix: ")"
 * - "https://en.wikipedia.org/wiki/React_(software)" -> url: "https://en.wikipedia.org/wiki/React_(software)", suffix: ""
 */
function cleanUrlAndSuffix(rawUrl) {
  let url = rawUrl;
  let suffix = '';

  const trailingPunctuationRegex = /[.,;:!?\"'>]+$/;

  // Trim trailing punctuation
  const match = url.match(trailingPunctuationRegex);
  if (match) {
    suffix = match[0] + suffix;
    url = url.substring(0, url.length - match[0].length);
  }

  // Handle parens: if URL ends with ')' check if opening '(' is inside URL
  while (url.endsWith(')')) {
    const openParenCount = (url.match(/\(/g) || []).length;
    const closeParenCount = (url.match(/\)/g) || []).length;

    if (closeParenCount > openParenCount) {
      suffix = ')' + suffix;
      url = url.slice(0, -1);
    } else {
      break; // Balanced parens (like Wikipedia URL)
    }
  }

  // Re-check trailing punctuation after paren stripping
  const secondMatch = url.match(trailingPunctuationRegex);
  if (secondMatch) {
    suffix = secondMatch[0] + suffix;
    url = url.substring(0, url.length - secondMatch[0].length);
  }

  return { url, suffix };
}

/**
 * Parses raw text and returns React JSX nodes with safe, clickable hyperlinks.
 *
 * @param {string} text - Raw message text.
 * @param {boolean} isSentByMe - Whether the message was sent by the current user.
 * @param {string} theme - 'default' or 'dark'.
 * @returns {React.ReactNode} Formatted React JSX nodes.
 */
export function renderMessageText(text, isSentByMe = false, theme = 'default') {
  if (!text) return null;

  const rawUrlRegex = /(https?:\/\/[^\s]+)/ig;
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const parts = [];
    let lastIndex = 0;
    let match;

    rawUrlRegex.lastIndex = 0;

    while ((match = rawUrlRegex.exec(line)) !== null) {
      const matchIndex = match.index;
      const rawMatch = match[0];

      if (matchIndex > lastIndex) {
        parts.push(line.substring(lastIndex, matchIndex));
      }

      const { url, suffix } = cleanUrlAndSuffix(rawMatch);

      const lowerUrl = url.toLowerCase();
      const isSafe = lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://');

      if (isSafe && url.length > 8) {
        let linkStyle = 'text-[#5865F2] underline hover:text-[#4752C4] font-medium underline-offset-2 break-all';
        if (isSentByMe) {
          linkStyle = 'text-sky-200 underline hover:text-white font-medium underline-offset-2 break-all';
        } else if (theme === 'dark') {
          linkStyle = 'text-[#38BDF8] underline hover:text-sky-300 font-medium underline-offset-2 break-all';
        }

        parts.push(
          <a
            key={`link-${lineIdx}-${matchIndex}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={linkStyle}
          >
            {url}
          </a>
        );
      } else {
        parts.push(url);
      }

      if (suffix) {
        parts.push(suffix);
      }

      lastIndex = matchIndex + rawMatch.length;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    return (
      <React.Fragment key={`line-${lineIdx}`}>
        {parts}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}
