/**
 * Streak API — consecutive-day activity streaks.
 */

import api from "./api";

export interface StreakInfo {
  activity_type: string;
  current_streak: number;
  last_active_date: string | null;
}

export interface StreakResponse {
  checkin: StreakInfo;
  meal_logged: StreakInfo;
  calorie_goal: StreakInfo;
}

export async function getStreaks(): Promise<StreakResponse> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = await api.get<StreakResponse>("/streaks", {
    headers: { "X-Timezone": timezone },
  });
  return data;
}
