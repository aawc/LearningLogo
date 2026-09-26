import { describe, it, expect } from 'vitest';
import { highlightLogoCode } from '../../../src/editor/highlighter.ts';

describe('Syntax Highlighter & Bracket Matcher', () => {
  it('highlights keywords, commands, numbers, and brackets', () => {
    const code = 'REPEAT 4 [ FD 100 RT 90 ]';
    const { html, unmatchedBrackets } = highlightLogoCode(code);

    expect(unmatchedBrackets.length).toBe(0);
    expect(html).toContain('hl-keyword');
    expect(html).toContain('hl-number');
    expect(html).toContain('hl-command');
    expect(html).toContain('hl-bracket-matched');
  });

  it('highlights variable lookups and word literals', () => {
    const code = 'MAKE "SIZE :LENGTH';
    const { html } = highlightLogoCode(code);

    expect(html).toContain('hl-word');
    expect(html).toContain('&quot;SIZE');
    expect(html).toContain('hl-var');
    expect(html).toContain(':LENGTH');
  });

  it('highlights comments correctly', () => {
    const code = '; this is a comment\nFD 50';
    const { html } = highlightLogoCode(code);

    expect(html).toContain('hl-comment');
    expect(html).toContain('; this is a comment');
  });

  it('safely escapes HTML characters preventing XSS', () => {
    const code = 'IF :X < 10 AND :Y > 5';
    const { html } = highlightLogoCode(code);

    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
    expect(html).not.toContain('< 10');
  });

  it('detects and styles unmatched brackets with hl-bracket-unmatched', () => {
    const code = 'REPEAT 4 [ FD 50';
    const { html, unmatchedBrackets } = highlightLogoCode(code);

    expect(unmatchedBrackets.length).toBe(1);
    expect(html).toContain('hl-bracket-unmatched');
  });

  it('detects and styles unmatched closing brackets with hl-bracket-unmatched', () => {
    const code = 'FD 50 ]';
    const { html, unmatchedBrackets } = highlightLogoCode(code);

    expect(unmatchedBrackets.length).toBe(1);
    expect(html).toContain('class="hl-bracket-unmatched">]</span>');
  });

  it('preserves empty lines and line parity with raw source', () => {
    const code = 'FD 100\n\nRT 90\n';
    const { html } = highlightLogoCode(code);

    const rawLineCount = code.split('\n').length;
    const htmlLineCount = html.split('\n').length;
    expect(htmlLineCount).toBe(rawLineCount);
  });

  it('highlights all built-in drawing commands including STAMPOVAL, STAMPRECT, DOT, and FILL as commands', () => {
    const code = 'SETPC "RED\nSTAMPOVAL 50 20\nSTAMPRECT 40 30\nDOT [10 10]\nFILL';
    const { html } = highlightLogoCode(code);

    expect(html).toContain('<span class="hl-command">STAMPOVAL</span>');
    expect(html).toContain('<span class="hl-command">STAMPRECT</span>');
    expect(html).toContain('<span class="hl-command">DOT</span>');
    expect(html).toContain('<span class="hl-command">FILL</span>');
  });

  it('highlights predicate and boolean commands with question marks as commands', () => {
    const code = 'IF EQUAL? :X 10 [ ST ]\nIF SHOWN? [ PENDOWN? ]';
    const { html } = highlightLogoCode(code);

    expect(html).toContain('<span class="hl-command">EQUAL?</span>');
    expect(html).toContain('<span class="hl-command">SHOWN?</span>');
    expect(html).toContain('<span class="hl-command">PENDOWN?</span>');
  });
});
