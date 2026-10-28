/**
 * Exponential smoothing and Holt-Winters forecasting.
 * Reference: Winters, "Forecasting Sales by Exponentially Weighted
 * Moving Averages", Management Science 6(3), 1960.
 */

export interface HWResult {
  level: number;
  trend: number;
  seasonal: number[];
  forecast: number[];
  alpha: number;
  beta: number;
  gamma: number;
  mape: number;   // Mean Absolute Percentage Error
}

export function holtWinters(
  data: number[],
  seasonLength: number,
  horizon: number,
  opts: { alpha?: number; beta?: number; gamma?: number } = {}
): HWResult {
  const alpha = opts.alpha ?? 0.3;
  const beta = opts.beta ?? 0.1;
  const gamma = opts.gamma ?? 0.1;

  if (data.length < 2 * seasonLength) {
    // Not enough data for seasonal; fallback to simple exponential
    return simpleExp(data, horizon, alpha);
  }

  // Initialize
  let level = data.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;
  const seasonal: number[] = [];
  const firstCycle = data.slice(0, seasonLength);
  const avg = firstCycle.reduce((a, b) => a + b, 0) / seasonLength;
  for (let i = 0; i < seasonLength; i++) {
    seasonal.push(firstCycle[i] - avg);
  }

  let trend = 0;
  const errors: number[] = [];

  for (let t = 0; t < data.length; t++) {
    const s = seasonal[t % seasonLength];
    const F = level + trend + s;
    const err = data[t] - F;
    if (t >= seasonLength) errors.push(Math.abs(err / (data[t] || 1)));

    const newLevel = alpha * (data[t] - s) + (1 - alpha) * (level + trend);
    const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
    const newSeasonal = gamma * (data[t] - newLevel) + (1 - gamma) * s;
    level = newLevel;
    trend = newTrend;
    seasonal[t % seasonLength] = newSeasonal;
  }

  const forecast: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    const s = seasonal[(data.length + h - 1) % seasonLength];
    forecast.push(level + h * trend + s);
  }

  const mape = errors.length ? (errors.reduce((a, b) => a + b, 0) / errors.length) * 100 : 0;

  return { level, trend, seasonal, forecast, alpha, beta, gamma, mape };
}

function simpleExp(data: number[], horizon: number, alpha: number): HWResult {
  let level = data[0];
  for (let i = 1; i < data.length; i++) {
    level = alpha * data[i] + (1 - alpha) * level;
  }
  const forecast = Array(horizon).fill(level);
  return { level, trend: 0, seasonal: [], forecast, alpha, beta: 0, gamma: 0, mape: 0 };
}

/** Simple moving average */
export function movingAverage(data: number[], window: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) { out.push(NaN); continue; }
    let sum = 0;
    for (let k = 0; k < window; k++) sum += data[i - k];
    out.push(sum / window);
  }
  return out;
}
