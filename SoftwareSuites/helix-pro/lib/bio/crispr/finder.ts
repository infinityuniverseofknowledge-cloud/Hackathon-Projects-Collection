import { doench2014 } from './doench2014';
import { cfdScore } from './cfd';

export interface Guide {
  seq: string;
  pam: string;
  strand: '+' | '-';
  pos: number;
  gc: number;
  onTarget: number;
}

export interface OffTarget {
  seq: string;
  pam: string;
  strand: '+' | '-';
  pos: number;
  mismatches: number;
  cfd: number;
}

function revComp(seq: string): string {
  const m: Record<string, string> = { A:'T', T:'A', G:'C', C:'G', N:'N' };
  let out = '';
  for (let i = seq.length - 1; i >= 0; i--) out += m[seq[i].toUpperCase()] ?? 'N';
  return out;
}

export function findGuides(dna: string, pamPattern = 'NGG'): Guide[] {
  const s = dna.toUpperCase();
  const re = new RegExp(pamPattern.replace(/N/g, '[ATGC]'));
  const guides: Guide[] = [];

  const scan = (str: string, strand: '+' | '-') => {
    for (let i = 0; i + 23 <= str.length; i++) {
      const pam = str.substr(i + 20, 3);
      if (!re.test(pam)) continue;
      const g = str.substr(i, 20);
      let gc = 0;
      for (const c of g) if (c === 'G' || c === 'C') gc++;
      guides.push({
        seq: g, pam, strand,
        pos: strand === '+' ? i : dna.length - i - 23,
        gc: gc / 20,
        onTarget: doench2014(g, pam),
      });
    }
  };

  scan(s, '+');
  scan(revComp(s), '-');
  guides.sort((x, y) => y.onTarget - x.onTarget);
  return guides;
}

export function findOffTargets(guide: string, sequence: string, maxMismatch = 3): OffTarget[] {
  const s = sequence.toUpperCase();
  const rc = revComp(s);
  const hits: OffTarget[] = [];

  const scan = (str: string, strand: '+' | '-') => {
    for (let i = 0; i + guide.length + 3 <= str.length; i++) {
      const win = str.substr(i, guide.length);
      const pam = str.substr(i + guide.length, 3);
      if (!/^[ATGC]GG$/.test(pam)) continue;
      let mm = 0;
      for (let k = 0; k < guide.length; k++) if (win[k] !== guide[k]) mm++;
      if (mm <= maxMismatch) {
        hits.push({
          seq: win, pam, strand, mismatches: mm,
          pos: strand === '+' ? i : sequence.length - i - guide.length - 3,
          cfd: cfdScore(guide, win),
        });
      }
    }
  };

  scan(s, '+');
  scan(rc, '-');
  hits.sort((a, b) => b.cfd - a.cfd);
  return hits;
}
