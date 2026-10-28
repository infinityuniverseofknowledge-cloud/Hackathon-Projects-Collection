import { describe, it, expect } from 'vitest';
import { gotoh } from '@/lib/bio/align/gotoh';
import { smithWaterman } from '@/lib/bio/align/smith-waterman';

describe('Gotoh affine gap', () => {
  it('aligns identical sequences with max identity', () => {
    const r = gotoh('ACDEFGHIK', 'ACDEFGHIK');
    expect(r.identity).toBe(1);
    expect(r.gaps).toBe(0);
  });

  it('uses BLOSUM62 for C-C = 9', () => {
    const r = gotoh('C', 'C');
    expect(r.score).toBe(9);
  });

  it('affine gap costs more than linear extend', () => {
    const one = gotoh('AAAAA', 'AAAA', { gapOpen: -11, gapExtend: -1 });
    const two = gotoh('AAAAA', 'AAA',  { gapOpen: -11, gapExtend: -1 });
    expect(one.score).toBeGreaterThan(two.score);
  });

  it('produces equal-length alignment strings', () => {
    const r = gotoh('GATTACA', 'GCATGCU');
    expect(r.alignA.length).toBe(r.alignB.length);
  });
});

describe('Smith-Waterman local', () => {
  it('finds local match inside longer sequences', () => {
    const r = smithWaterman('XXXXXACDEFGHIKLMYYYYY', 'ZZZZZDEFGHIKLMZZZZZ');
    expect(r.score).toBeGreaterThan(0);
  });

  it('returns 0 for no meaningful match', () => {
    const r = smithWaterman('AAAAA', 'WWWWW');
    expect(r.score).toBe(0);
  });
});
