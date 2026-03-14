/**
 * Trend API — historical metric data for sparkline charts.
 */

import api from "./api";

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface TrendResponse {
  metric: string;
  window_days: number;
  data_points: TrendDataPoint[];
}

export async function getTrendData(
  metric: string,
  window: number = 7
): Promise<TrendResponse> {
  const { data } = await api.get<TrendResponse>(
    `/trends/${metric}?window=${window}`
  );
  return data;
}
