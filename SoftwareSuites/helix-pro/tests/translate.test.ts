import { describe, it, expect } from 'vitest';
import { findORFs } from '@/lib/bio/translate/orf';
import { GENETIC_CODES } from '@/lib/bio/translate/codon-tables';

describe('Genetic code tables', () => {
  it('ATG = M in standard', () => {
    expect((GENETIC_CODES.standard.table as Record<string, string>)['ATG']).toBe('M');
  });
  it('TAA = * in standard', () => {
    expect((GENETIC_CODES.standard.table as Record<string, string>)['TAA']).toBe('*');
  });
  it('TGA = W in vertebrate mito', () => {
    expect((GENETIC_CODES.vertebrate_mito.table as Record<string, string>)['TGA']).toBe('W');
  });
});

describe('ORF finder', () => {
  it('finds a simple ORF', () => {
    const seq = 'ATG' + 'AAA'.repeat(15) + 'TAA';
    const orfs = findORFs(seq, 10);
    expect(orfs.length).toBeGreaterThan(0);
    expect(orfs[0].protein).toContain('M');
  });
});
