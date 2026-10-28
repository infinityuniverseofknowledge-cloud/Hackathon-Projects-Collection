export type Vec3 = [number, number, number];

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** IUPAC-convention dihedral angle. Returns degrees in (-180, 180]. */
export function calcDihedral(p1: Vec3, p2: Vec3, p3: Vec3, p4: Vec3): number {
  const b1: Vec3 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const b2: Vec3 = [p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]];
  const b3: Vec3 = [p4[0] - p3[0], p4[1] - p3[1], p4[2] - p3[2]];
  const n1 = cross(b1, b2);
  const n2 = cross(b2, b3);
  const m1 = cross(n1, b2);
  const x = dot(n1, n2);
  const y = dot(m1, n2);
  return (Math.atan2(y, x) * 180) / Math.PI;
}
