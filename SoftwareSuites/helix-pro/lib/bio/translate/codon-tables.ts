/**
 * NCBI genetic code tables.
 * https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi
 */
function buildTable(entries: string): Record<string, string> {
  const bases = ['T','C','A','G'];
  const t: Record<string, string> = {};
  for (let i = 0; i < 64; i++) {
    const b1 = bases[(i >> 4) & 3];
    const b2 = bases[(i >> 2) & 3];
    const b3 = bases[i & 3];
    t[b1 + b2 + b3] = entries[i];
  }
  return t;
}

export const GENETIC_CODES = {
  standard: {
    id: 1, name: 'Standard',
    table: buildTable('FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG'),
  },
  vertebrate_mito: {
    id: 2, name: 'Vertebrate Mitochondrial',
    table: buildTable('FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSS**VVVVAAAADDEEGGGG'),
  },
  yeast_mito: {
    id: 3, name: 'Yeast Mitochondrial',
    table: buildTable('FFLLSSSSYY**CCWWTTTTPPPPHHQQRRRRIIMMTTTTNNKKSSRRVVVVAAAADDEEGGGG'),
  },
  mold_mito: {
    id: 4, name: 'Mold/Protozoan Mitochondrial',
    table: buildTable('FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG'),
  },
  invertebrate_mito: {
    id: 5, name: 'Invertebrate Mitochondrial',
    table: buildTable('FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSSSVVVVAAAADDEEGGGG'),
  },
  ciliate: {
    id: 6, name: 'Ciliate/Nuclear',
    table: buildTable('FFLLSSSSYYQQCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG'),
  },
} as const;

export type GeneticCodeId = keyof typeof GENETIC_CODES;

export const THREE_LETTER: Record<string, string> = {
  A:'Ala', R:'Arg', N:'Asn', D:'Asp', C:'Cys', Q:'Gln', E:'Glu', G:'Gly',
  H:'His', I:'Ile', L:'Leu', K:'Lys', M:'Met', F:'Phe', P:'Pro', S:'Ser',
  T:'Thr', W:'Trp', Y:'Tyr', V:'Val', '*':'Stop', X:'Xaa',
};
