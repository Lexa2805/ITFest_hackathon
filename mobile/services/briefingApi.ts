/**
 * Briefing API — daily AI-generated briefing.
 */

import api from "./api";

export interface BriefingResponse {
  narrative: string;
  source: "gpt" | "fallback";
  generated_at: string;
  date: string;
}

export async function getTodayBriefing(): Promise<BriefingResponse> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = await api.get<BriefingResponse>("/briefing/today", {
    headers: { "X-Timezone": timezone },
  });
  return data;
}
