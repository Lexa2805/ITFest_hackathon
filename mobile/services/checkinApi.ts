import api from "./api";

export interface ManualCheckinPayload {
    date?: string;
    heart_rate: number;
    sleep_hours: number;
    steps: number;
    calories?: number;
    mood: number;
    stress_level: number;
}

export interface DownstreamCall {
    endpoint: string;
    success: boolean;
    status_code: number | null;
    detail: string | null;
}

export interface ManualCheckinResponse {
    id: string;
    user_id: string;
    date: string;
    heart_rate: number;
    sleep_hours: number;
    steps: number;
    calories?: number | null;
    mood: number;
    stress_level: number;
    physical_state_score: number;
    created_at?: string;
    downstream_calls: DownstreamCall[];
}

export async function submitManualCheckin(
    payload: ManualCheckinPayload
): Promise<ManualCheckinResponse> {
    const { data } = await api.post<ManualCheckinResponse>("/manual-health-data", payload);
    return data;
}
