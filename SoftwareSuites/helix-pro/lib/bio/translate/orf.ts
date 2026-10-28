import { GENETIC_CODES, type GeneticCodeId } from './codon-tables';

export interface ORF {
  strand: '+' | '-';
  frame: 1 | 2 | 3;
  start: number;
  end: number;
  lengthNt: number;
  lengthAa: number;
  protein: string;
}

function revComp(seq: string): string {
  const m: Record<string, string> = { A:'T', T:'A', G:'C', C:'G', N:'N' };
  let out = '';
  for (let i = seq.length - 1; i >= 0; i--) out += m[seq[i]] ?? 'N';
  return out;
}

export function findORFs(dna: string, minAa = 30, codeId: GeneticCodeId = 'standard'): ORF[] {
  const table = GENETIC_CODES[codeId].table as Record<string, string>;
  const s = dna.toUpperCase();
  const rc = revComp(s);
  const orfs: ORF[] = [];

  const scan = (str: string, strand: '+' | '-') => {
    for (let f = 0; f < 3; f++) {
      let prot = '';
      let start = -1;
      for (let i = f; i + 2 < str.length; i += 3) {
        const codon = str.substr(i, 3);
        const aa = codon.includes('N') ? 'X' : (table[codon] ?? 'X');
        if (aa === 'M' && start < 0) { start = i; prot = ''; }
        if (start >= 0) {
          prot += aa;
          if (aa === '*') {
            if (prot.length >= minAa) {
              const end = i + 3;
              orfs.push({
                strand, frame: (f + 1) as 1 | 2 | 3,
                start: strand === '+' ? start : str.length - end,
                end:   strand === '+' ? end   : str.length - start,
                lengthNt: end - start,
                lengthAa: prot.length - 1,
                protein: prot.slice(0, -1),
              });
            }
            start = -1; prot = '';
          }
        }
      }
    }
  };

  scan(s, '+');
  scan(rc, '-');
  orfs.sort((a, b) => b.lengthNt - a.lengthNt);
  return orfs;
}
