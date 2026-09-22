import { describe, it, expect } from 'vitest';
import {
  compressCodeToHash,
  decompressCodeFromHash,
  extractCodeFromUrl,
  isHashSafeLength,
} from '../../../src/storage/url_share.ts';

describe('Zero-Backend URL Hash Sharing', () => {
  it('compresses and decompresses simple code round-trip', () => {
    const code = 'REPEAT 4 [ FD 100 RT 90 ]';
    const hash = compressCodeToHash(code);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);

    const recovered = decompressCodeFromHash(hash);
    expect(recovered).toBe(code);
  });

  it('compresses and decompresses multi-line code with procedures and unicode', () => {
    const code = `
; Educational Logo Program 🐢
TO TREE :SIZE
  IF :SIZE < 5 [ STOP ]
  FD :SIZE
  LT 30 TREE :SIZE * 0.7 RT 60
  TREE :SIZE * 0.7 LT 30
  BK :SIZE
END
CS
TREE 60
`;
    const hash = compressCodeToHash(code);
    const recovered = decompressCodeFromHash(hash);
    expect(recovered).toBe(code);
  });

  it('extracts and decompresses code from a full URL string', () => {
    const code = 'FD 100';
    const hash = compressCodeToHash(code);
    const fullUrl = `https://learninglogo.org/#code=${hash}`;

    const extracted = extractCodeFromUrl(fullUrl);
    expect(extracted).toBe(code);
  });

  it('checks URL hash length safety against 2000 character limit', () => {
    expect(isHashSafeLength('short_hash')).toBe(true);
    const massive = 'a'.repeat(2005);
    expect(isHashSafeLength(massive)).toBe(false);
  });

  it('handles invalid hash gracefully returning empty string', () => {
    const recovered = decompressCodeFromHash('invalid!!!base64===');
    expect(recovered).toBe('');
  });

  it('achieves real compression ratio on repetitive Logo code', () => {
    const repetitiveCode = 'REPEAT 36 [ FD 10 RT 10 ]\n'.repeat(20);
    const hash = compressCodeToHash(repetitiveCode);
    const recovered = decompressCodeFromHash(hash);

    expect(recovered).toBe(repetitiveCode);
    // Compressed hash length must be significantly smaller than uncompressed length
    expect(hash.length).toBeLessThan(repetitiveCode.length * 0.7);
  });
});
