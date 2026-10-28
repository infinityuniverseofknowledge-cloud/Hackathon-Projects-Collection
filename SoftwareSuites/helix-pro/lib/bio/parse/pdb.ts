export interface PDBAtom {
  serial: number;
  name: string;
  resName: string;
  chainID: string;
  resSeq: number;
  x: number; y: number; z: number;
  element: string;
}

export function parsePDB(text: string): PDBAtom[] {
  const out: PDBAtom[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('ATOM') && !line.startsWith('HETATM')) continue;
    const num = (s: string) => parseFloat(s.trim());
    out.push({
      serial:   parseInt(line.slice(6, 11).trim(), 10),
      name:     line.slice(12, 16).trim(),
      resName:  line.slice(17, 20).trim(),
      chainID:  line.slice(21, 22).trim() || '_',
      resSeq:   parseInt(line.slice(22, 26).trim(), 10),
      x: num(line.slice(30, 38)),
      y: num(line.slice(38, 46)),
      z: num(line.slice(46, 54)),
      element:  line.slice(76, 78).trim(),
    });
  }
  return out;
}
