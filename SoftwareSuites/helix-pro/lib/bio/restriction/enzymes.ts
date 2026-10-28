export interface RestrictionEnzyme {
  name: string;
  site: string;
  cutOffset: number;
  type: '5-overhang' | '3-overhang' | 'blunt';
}

export const ENZYMES: RestrictionEnzyme[] = [
  { name:'EcoRI',   site:'GAATTC',   cutOffset:1, type:'5-overhang' },
  { name:'BamHI',   site:'GGATCC',   cutOffset:1, type:'5-overhang' },
  { name:'HindIII', site:'AAGCTT',   cutOffset:1, type:'5-overhang' },
  { name:'NdeI',    site:'CATATG',   cutOffset:2, type:'5-overhang' },
  { name:'NheI',    site:'GCTAGC',   cutOffset:1, type:'5-overhang' },
  { name:'XhoI',    site:'CTCGAG',   cutOffset:1, type:'5-overhang' },
  { name:'SalI',    site:'GTCGAC',   cutOffset:1, type:'5-overhang' },
  { name:'KpnI',    site:'GGTACC',   cutOffset:5, type:'3-overhang' },
  { name:'SacI',    site:'GAGCTC',   cutOffset:5, type:'3-overhang' },
  { name:'PstI',    site:'CTGCAG',   cutOffset:5, type:'3-overhang' },
  { name:'SphI',    site:'GCATGC',   cutOffset:5, type:'3-overhang' },
  { name:'ApaI',    site:'GGGCCC',   cutOffset:5, type:'3-overhang' },
  { name:'NotI',    site:'GCGGCCGC', cutOffset:2, type:'5-overhang' },
  { name:'EcoRV',   site:'GATATC',   cutOffset:3, type:'blunt' },
  { name:'SmaI',    site:'CCCGGG',   cutOffset:3, type:'blunt' },
  { name:'PvuII',   site:'CAGCTG',   cutOffset:3, type:'blunt' },
  { name:'HaeIII',  site:'GGCC',     cutOffset:2, type:'blunt' },
  { name:'AluI',    site:'AGCT',     cutOffset:2, type:'blunt' },
  { name:'TaqI',    site:'TCGA',     cutOffset:1, type:'5-overhang' },
  { name:'MboI',    site:'GATC',     cutOffset:0, type:'5-overhang' },
  { name:'Sau3AI',  site:'GATC',     cutOffset:0, type:'5-overhang' },
  { name:'BglII',   site:'AGATCT',   cutOffset:1, type:'5-overhang' },
  { name:'ClaI',    site:'ATCGAT',   cutOffset:2, type:'5-overhang' },
  { name:'DraI',    site:'TTTAAA',   cutOffset:3, type:'blunt' },
  { name:'ScaI',    site:'AGTACT',   cutOffset:3, type:'blunt' },
  { name:'StuI',    site:'AGGCCT',   cutOffset:3, type:'blunt' },
  { name:'XbaI',    site:'TCTAGA',   cutOffset:1, type:'5-overhang' },
  { name:'SpeI',    site:'ACTAGT',   cutOffset:1, type:'5-overhang' },
  { name:'MluI',    site:'ACGCGT',   cutOffset:1, type:'5-overhang' },
  { name:'AflII',   site:'CTTAAG',   cutOffset:1, type:'5-overhang' },
];

export interface CutSite {
  enzyme: string;
  pos: number;
  strand: '+' | '-';
  site: string;
}

function revComp(seq: string): string {
  const m: Record<string, string> = { A:'T', T:'A', G:'C', C:'G', N:'N' };
  let out = '';
  for (let i = seq.length - 1; i >= 0; i--) out += m[seq[i]] ?? 'N';
  return out;
}

export function findCutSites(dna: string): CutSite[] {
  const s = dna.toUpperCase();
  const rc = revComp(s);
  const out: CutSite[] = [];
  for (const e of ENZYMES) {
    if (/[^ATGC]/.test(e.site)) continue;
    let idx = s.indexOf(e.site);
    while (idx >= 0) {
      out.push({ enzyme: e.name, pos: idx, strand: '+', site: e.site });
      idx = s.indexOf(e.site, idx + 1);
    }
    const rcsite = revComp(e.site);
    if (rcsite !== e.site) {
      let j = rc.indexOf(e.site);
      while (j >= 0) {
        out.push({ enzyme: e.name, pos: s.length - j - e.site.length, strand: '-', site: e.site });
        j = rc.indexOf(e.site, j + 1);
      }
    }
  }
  out.sort((a, b) => a.pos - b.pos);
  return out;
}
