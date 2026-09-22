function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const KEYWORDS = new Set([
  'REPEAT',
  'IF',
  'IFELSE',
  'TO',
  'END',
  'STOP',
  'OUTPUT',
  'OP',
  'MAKE',
]);

const COMMANDS = new Set([
  'FD',
  'FORWARD',
  'BK',
  'BACK',
  'RT',
  'RIGHT',
  'LT',
  'LEFT',
  'CS',
  'CLEARSCREEN',
  'HOME',
  'PU',
  'PENUP',
  'PD',
  'PENDOWN',
  'HT',
  'HIDETURTLE',
  'ST',
  'SHOWTURTLE',
  'SETPC',
  'SETPENCOLOR',
  'SETPW',
  'SETPENWIDTH',
  'SETXY',
  'PRINT',
  'PR',
  'SUM',
  'DIFFERENCE',
  'PRODUCT',
  'QUOTIENT',
  'REMAINDER',
  'RANDOM',
  'SQRT',
  'ROUND',
  'FIRST',
  'LAST',
  'BUTFIRST',
  'BF',
  'BUTLAST',
  'BL',
  'COUNT',
  'WORD',
  'LIST',
]);

export interface HighlightResult {
  html: string;
  unmatchedBrackets: number[];
}

interface RawToken {
  type: 'keyword' | 'command' | 'number' | 'word' | 'var' | 'comment' | 'bracket_open' | 'bracket_close' | 'text';
  text: string;
}

export function highlightLogoCode(source: string): HighlightResult {
  // First pass: line-by-line token parsing to retain newlines exactly
  const lines = source.split('\n');
  const bracketStack: { lineIdx: number; tokenIdx: number }[] = [];
  const unmatchedIndices: number[] = [];
  const unmatchedCoords = new Set<string>();

  const processedLines: RawToken[][] = [];

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l] ?? '';
    const lineTokens: RawToken[] = [];
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      // Comment
      if (char === ';') {
        lineTokens.push({ type: 'comment', text: line.slice(i) });
        i = line.length;
        break;
      }

      // Brackets
      if (char === '[') {
        const tokenIdx = lineTokens.length;
        bracketStack.push({ lineIdx: l, tokenIdx });
        lineTokens.push({ type: 'bracket_open', text: '[' });
        i++;
        continue;
      }

      if (char === ']') {
        const tokenIdx = lineTokens.length;
        if (bracketStack.length > 0) {
          bracketStack.pop();
          lineTokens.push({ type: 'bracket_close', text: ']' });
        } else {
          // Unmatched close bracket
          unmatchedCoords.add(`${l}:${tokenIdx}`);
          unmatchedIndices.push(tokenIdx);
          lineTokens.push({ type: 'bracket_close', text: ']' });
        }
        i++;
        continue;
      }

      // Variable lookup: :NAME
      if (char === ':') {
        const match = /^:[a-zA-Z0-9_?]*/.exec(line.slice(i));
        if (match && match[0].length > 1) {
          lineTokens.push({ type: 'var', text: match[0] });
          i += match[0].length;
          continue;
        }
      }

      // Word literal: "NAME
      if (char === '"') {
        const match = /^"[a-zA-Z0-9_?]*/.exec(line.slice(i));
        if (match && match[0].length > 1) {
          lineTokens.push({ type: 'word', text: match[0] });
          i += match[0].length;
          continue;
        }
      }

      // Number
      if (char !== undefined && char >= '0' && char <= '9') {
        const match = /^[0-9]+(\.[0-9]+)?/.exec(line.slice(i));
        if (match) {
          lineTokens.push({ type: 'number', text: match[0] });
          i += match[0].length;
          continue;
        }
      }

      // Word/Identifier
      if (char !== undefined && /[a-zA-Z_?]/.test(char)) {
        const match = /^[a-zA-Z_?][a-zA-Z0-9_?]*/.exec(line.slice(i));
        if (match) {
          const raw = match[0];
          const upper = raw.toUpperCase();
          if (KEYWORDS.has(upper)) {
            lineTokens.push({ type: 'keyword', text: raw });
          } else if (COMMANDS.has(upper)) {
            lineTokens.push({ type: 'command', text: raw });
          } else {
            lineTokens.push({ type: 'text', text: raw });
          }
          i += raw.length;
          continue;
        }
      }

      // Whitespace or operators/other text
      const nextSpecial = line.slice(i).search(/[;\[\]:\"0-9a-zA-Z_?]/);
      if (nextSpecial === -1) {
        lineTokens.push({ type: 'text', text: line.slice(i) });
        break;
      } else if (nextSpecial > 0) {
        lineTokens.push({ type: 'text', text: line.slice(i, i + nextSpecial) });
        i += nextSpecial;
      } else {
        lineTokens.push({ type: 'text', text: char ?? '' });
        i++;
      }
    }

    processedLines.push(lineTokens);
  }

  // Any remaining open brackets on stack are unmatched
  for (const item of bracketStack) {
    unmatchedCoords.add(`${item.lineIdx}:${item.tokenIdx}`);
    unmatchedIndices.push(item.tokenIdx);
  }

  // Render HTML
  const renderedLines = processedLines.map((lineTokens, l) => {
    return lineTokens
      .map((tok, tIdx) => {
        const escaped = escapeHtml(tok.text);
        switch (tok.type) {
          case 'keyword':
            return `<span class="hl-keyword">${escaped}</span>`;
          case 'command':
            return `<span class="hl-command">${escaped}</span>`;
          case 'number':
            return `<span class="hl-number">${escaped}</span>`;
          case 'word':
            return `<span class="hl-word">${escaped}</span>`;
          case 'var':
            return `<span class="hl-var">${escaped}</span>`;
          case 'comment':
            return `<span class="hl-comment">${escaped}</span>`;
          case 'bracket_open':
          case 'bracket_close': {
            const isUnmatched = unmatchedCoords.has(`${l}:${tIdx}`);
            const cls = isUnmatched ? 'hl-bracket-unmatched' : 'hl-bracket-matched';
            return `<span class="${cls}">${escaped}</span>`;
          }
          default:
            return escaped;
        }
      })
      .join('');
  });

  return {
    html: renderedLines.join('\n'),
    unmatchedBrackets: unmatchedIndices,
  };
}
