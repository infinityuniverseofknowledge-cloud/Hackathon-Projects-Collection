import { describe, it, expect } from 'vitest';
import { santaLuciaTm, gcContent } from '@/lib/bio/primers/santalucia';

describe('SantaLucia Tm', () => {
  it('returns a plausible Tm for a 20mer', () => {
    const tm = santaLuciaTm('GACGTACGTACGTACGTAC');
    expect(tm).toBeGreaterThan(40);
    expect(tm).toBeLessThan(80);
  });
  it('higher GC content gives higher Tm', () => {
    const at = santaLuciaTm('ATATATATATATATATATAT');
    const gc = santaLuciaTm('GCGCGCGCGCGCGCGCGCGC');
    expect(gc).toBeGreaterThan(at);
  });
  it('handles short sequences', () => {
    expect(santaLuciaTm('A')).toBe(0);
    expect(santaLuciaTm('AC')).toBeGreaterThan(0);
  });
});

describe('GC content', () => {
  it('0 for all-AT', () => { expect(gcContent('ATATAT')).toBe(0); });
  it('1 for all-GC', () => { expect(gcContent('GCGCGC')).toBe(1); });
  it('0.5 for balanced', () => { expect(gcContent('ATGC')).toBe(0.5); });
});
