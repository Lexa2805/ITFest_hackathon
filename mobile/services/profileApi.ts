import api from "./api";

export type ActivityLevel =
    | "sedentary"
    | "lightly active"
    | "moderately active"
    | "very active";

export type HealthGoal =
    | "lose weight"
    | "maintain"
    | "build muscle"
    | "improve endurance";

export type Gender =
    | "male"
    | "female"
    | "non-binary"
    | "prefer not to say"
    | "other";

export interface ProfilePayload {
    name?: string | null;
    email?: string | null;
    weight?: number | null;
    height?: number | null;
    age?: number | null;
    gender?: Gender | null;
    activity_level?: ActivityLevel | null;
    goal?: HealthGoal | null;
    has_apple_watch: boolean;
}

export interface ProfileResponse {
    user_id: string;
    name?: string | null;
    email?: string | null;
    weight?: number | null;
    height?: number | null;
    age?: number | null;
    gender?: Gender | null;
    activity_level?: ActivityLevel | null;
    goal?: HealthGoal | null;
    has_apple_watch: boolean;
    created_at?: string;
    updated_at?: string;
}

export async function saveProfile(payload: ProfilePayload): Promise<ProfileResponse> {
    const { data } = await api.post<ProfileResponse>("/profile", payload);
    return data;
}

export async function getProfile(userId: string): Promise<ProfileResponse | null> {
    try {
        const { data } = await api.get<ProfileResponse>(`/profile/${userId}`);
        return data;
    } catch (error: any) {
        if (error?.response?.status === 404) {
            return null;
        }
        throw error;
    }
}
