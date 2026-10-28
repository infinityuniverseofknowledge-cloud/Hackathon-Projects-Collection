/**
 * Solar PV power model (simplified PVWatts).
 * Reference: NREL PVWatts v8.
 */

export interface SolarPanel {
  ratedPower_kW: number;
  systemLosses: number;   // e.g. 0.14 for 14% losses
  tempCoeff: number;      // %/°C, e.g. -0.004
  noct: number;           // Nominal Operating Cell Temperature, °C
}

export interface SolarConditions {
  ghi: number;            // Global horizontal irradiance, W/m²
  ambientTemp: number;    // °C
  windSpeed: number;      // m/s
  hour: number;           // hour of day (for solar position)
}

export function solarPower(panel: SolarPanel, cond: SolarConditions): number {
  // Cell temperature (NOCT model)
  const cellTemp = cond.ambientTemp + (cond.noct - 20) / 800 * cond.ghi;

  // Temperature derate
  const tempDerate = 1 + panel.tempCoeff * (cellTemp - 25);

  // Irradiance ratio
  const irradianceRatio = cond.ghi / 1000;

  // DC power
  const dcPower = panel.ratedPower_kW * irradianceRatio * tempDerate;

  // AC power (after losses)
  const acPower = dcPower * (1 - panel.systemLosses);

  return Math.max(0, acPower);
}

/**
 * Solar position (simplified).
 * Returns elevation and azimuth for a given day and hour.
 */
export function solarPosition(
  dayOfYear: number,
  hour: number,
  latitude: number
): { elevation: number; azimuth: number } {
  // Solar declination
  const decl = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
  const declRad = (decl * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;

  // Hour angle (solar noon = 0)
  const hourAngle = ((hour - 12) * 15 * Math.PI) / 180;

  // Solar elevation
  const sinElev = Math.sin(latRad) * Math.sin(declRad) +
                  Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle);
  const elevation = (Math.asin(sinElev) * 180) / Math.PI;

  // Solar azimuth
  const cosAz = (Math.sin(declRad) - Math.sin(latRad) * sinElev) /
                (Math.cos(latRad) * Math.cos(Math.asin(sinElev)));
  let azimuth = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;
  if (hourAngle > 0) azimuth = 360 - azimuth;

  return { elevation, azimuth };
}

/** Clear sky irradiance (simplified) */
export function clearSkyGHI(elevation: number, dayOfYear: number): number {
  if (elevation <= 0) return 0;
  const elevRad = (elevation * Math.PI) / 180;
  // Extraterrestrial irradiance (adjust for Earth-Sun distance)
  const E0 = 1367 * (1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365));
  // Air mass
  const airMass = 1 / Math.sin(elevRad);
  // Atmospheric attenuation (simple)
  const transmittance = 0.7 * Math.pow(0.678, Math.pow(airMass, 0.5));
  return E0 * Math.sin(elevRad) * transmittance;
}
