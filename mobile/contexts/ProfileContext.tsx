import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { useAuthStore } from "@/stores/authStore";
import {
    getProfile,
    saveProfile,
    type ProfilePayload,
    type ProfileResponse,
} from "@/services/profileApi";
import {
    submitManualCheckin,
    type ManualCheckinPayload,
    type ManualCheckinResponse,
} from "@/services/checkinApi";

interface ProfileContextValue {
    profile: ProfileResponse | null;
    isLoading: boolean;
    isSaving: boolean;
    todayCheckinSubmitted: boolean;
    lastCheckin: ManualCheckinResponse | null;
    profileCompletion: number;
    loadProfile: () => Promise<void>;
    updateProfile: (payload: ProfilePayload) => Promise<ProfileResponse>;
    submitTodayCheckin: (payload: ManualCheckinPayload) => Promise<ManualCheckinResponse>;
    setHasAppleWatch: (enabled: boolean) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

function calculateProfileCompletion(profile: ProfileResponse | null): number {
    if (!profile) return 0;

    // We measure completion against the key editable profile fields.
    const requiredFields = [
        profile.name,
        profile.weight,
        profile.height,
        profile.age,
        profile.gender,
        profile.activity_level,
        profile.goal,
    ];

    const completed = requiredFields.filter(
        (value) => value !== null && value !== undefined && `${value}`.trim() !== ""
    ).length;

    return Math.round((completed / requiredFields.length) * 100);
}

function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((state) => state.user);

    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [todayCheckinSubmitted, setTodayCheckinSubmitted] = useState(false);
    const [lastCheckin, setLastCheckin] = useState<ManualCheckinResponse | null>(null);

    const loadProfile = useCallback(async () => {
        if (!user?.id) {
            setProfile(null);
            return;
        }

        setIsLoading(true);
        try {
            // Step 1: pull stored profile from backend.
            const fetched = await getProfile(user.id);

            // Step 2: provide a sensible default profile when none exists yet.
            if (!fetched) {
                setProfile({
                    user_id: user.id,
                    name: null,
                    email: user.email,
                    has_apple_watch: true,
                });
            } else {
                setProfile({ ...fetched, email: fetched.email ?? user.email });
            }
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, user?.email]);

    const updateProfile = useCallback(
        async (payload: ProfilePayload) => {
            setIsSaving(true);
            try {
                // Step 3: upsert profile in backend and keep local state in sync.
                const saved = await saveProfile(payload);
                setProfile(saved);
                return saved;
            } finally {
                setIsSaving(false);
            }
        },
        []
    );

    const submitTodayCheckin = useCallback(async (payload: ManualCheckinPayload) => {
        // Step 4: send today's manual data and persist local completion status.
        const response = await submitManualCheckin(payload);
        setLastCheckin(response);
        setTodayCheckinSubmitted(response.date === todayIsoDate());
        return response;
    }, []);

    const setHasAppleWatch = useCallback(
        async (enabled: boolean) => {
            // Step 5: update only the mode flag while preserving existing profile values.
            await updateProfile({
                name: profile?.name,
                email: profile?.email ?? user?.email,
                weight: profile?.weight,
                height: profile?.height,
                age: profile?.age,
                gender: profile?.gender,
                activity_level: profile?.activity_level,
                goal: profile?.goal,
                has_apple_watch: enabled,
            });
        },
        [profile, updateProfile, user?.email]
    );

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    const profileCompletion = useMemo(() => calculateProfileCompletion(profile), [profile]);

    const value = useMemo<ProfileContextValue>(
        () => ({
            profile,
            isLoading,
            isSaving,
            todayCheckinSubmitted,
            lastCheckin,
            profileCompletion,
            loadProfile,
            updateProfile,
            submitTodayCheckin,
            setHasAppleWatch,
        }),
        [
            profile,
            isLoading,
            isSaving,
            todayCheckinSubmitted,
            lastCheckin,
            profileCompletion,
            loadProfile,
            updateProfile,
            submitTodayCheckin,
            setHasAppleWatch,
        ]
    );

    return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileContext(): ProfileContextValue {
    const ctx = useContext(ProfileContext);
    if (!ctx) {
        throw new Error("useProfileContext must be used within a ProfileProvider");
    }
    return ctx;
}
