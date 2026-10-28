export interface FastqRecord {
  id: string;
  sequence: string;
  qualities: string;
  qscores: number[];
}

export function parseFASTQ(text: string): FastqRecord[] {
  const lines = text.split(/\r?\n/);
  const out: FastqRecord[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].startsWith('@')) { i++; continue; }
    const id = lines[i].slice(1).split(/\s+/)[0];
    const seq = (lines[i + 1] ?? '').trim();
    const qual = (lines[i + 3] ?? '').trim();
    const qscores = Array.from(qual).map((c) => c.charCodeAt(0) - 33);
    out.push({ id, sequence: seq.toUpperCase(), qualities: qual, qscores });
    i += 4;
  }
  return out;
}
