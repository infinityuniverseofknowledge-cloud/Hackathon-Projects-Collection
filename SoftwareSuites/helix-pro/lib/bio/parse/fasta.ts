export interface FastaRecord {
  id: string;
  description: string;
  sequence: string;
}

export function parseFASTA(text: string): FastaRecord[] {
  const lines = text.split(/\r?\n/);
  const records: FastaRecord[] = [];
  let cur: FastaRecord | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('>')) {
      if (cur) records.push(cur);
      const parts = line.slice(1).split(/\s+/);
      cur = { id: parts[0] ?? '', description: parts.slice(1).join(' '), sequence: '' };
    } else if (cur && line) {
      cur.sequence += line;
    }
  }
  if (cur) records.push(cur);
  records.forEach((r) => { r.sequence = r.sequence.toUpperCase(); });
  return records;
}
