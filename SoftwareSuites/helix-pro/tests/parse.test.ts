import { describe, it, expect } from 'vitest';
import { parseFASTA } from '@/lib/bio/parse/fasta';
import { parseFASTQ } from '@/lib/bio/parse/fastq';
import { parsePDB } from '@/lib/bio/parse/pdb';

describe('parseFASTA', () => {
  it('parses a single record', () => {
    const r = parseFASTA('>seq1 desc\nACGT\nACGT\n');
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('seq1');
    expect(r[0].sequence).toBe('ACGTACGT');
  });
  it('parses multiple records', () => {
    const r = parseFASTA('>a\nACGT\n>b\nTTTT\n');
    expect(r).toHaveLength(2);
    expect(r[1].id).toBe('b');
  });
});

describe('parseFASTQ', () => {
  it('parses 1 record with Phred+33 quality', () => {
    const r = parseFASTQ('@read1\nACGT\n+\nIIII\n');
    expect(r).toHaveLength(1);
    expect(r[0].qscores).toEqual([40, 40, 40, 40]);
  });
});

describe('parsePDB', () => {
  it('parses ATOM lines', () => {
    const text = 'ATOM      1  N   ALA A   1      11.104   6.134  -6.504  1.00 20.00           N\n';
    const r = parsePDB(text);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('N');
    expect(r[0].resName).toBe('ALA');
    expect(r[0].x).toBeCloseTo(11.104);
  });
});
