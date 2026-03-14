import api from './api';

export interface HealthMetricSummary {
    sample_count: number;
    total: number;
    average: number;
    unit: string;
}

export interface ParsedHealthMetrics {
    heart_rate: HealthMetricSummary;
    step_count: HealthMetricSummary;
    sleep_analysis: HealthMetricSummary;
    active_energy_burned: HealthMetricSummary;
    hrv_sdnn: HealthMetricSummary;
}

export interface PhysicalStateResult {
    score: number;
    status: string;
    factors: Record<string, number>;
}

export interface AgentTriggerResult {
    endpoint: string;
    success: boolean;
    status_code: number | null;
    detail: string | null;
}

export interface HealthExportUploadResponse {
    parsed_metrics: ParsedHealthMetrics;
    physical_state: PhysicalStateResult;
    downstream_calls: AgentTriggerResult[];
}

export async function uploadHealthExportZip(fileUri: string, fileName: string): Promise<HealthExportUploadResponse> {
    const createFormData = () => {
        const formData = new FormData();

        // Expo document picker gives us a file URI. For React Native multipart uploads,
        // axios expects a file-like object with uri/name/type fields.
        formData.append('file', {
            uri: fileUri,
            name: fileName,
            type: 'application/zip',
        } as any);
        return formData;
    };

    try {
        const { data } = await api.post<HealthExportUploadResponse>('/upload-health-export', createFormData(), {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 120_000,
        });
        return data;
    } catch (error: any) {
        if (error?.response?.status !== 404) {
            throw error;
        }

        // Compatibility fallback for deployments that expose /api-prefixed paths.
        const { data } = await api.post<HealthExportUploadResponse>('/api/upload-health-export', createFormData(), {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            timeout: 120_000,
        });
        return data;
    }
}

export async function getHealthData(): Promise<HealthExportUploadResponse | null> {
    try {
        const { data } = await api.get<HealthExportUploadResponse>('/health-data');
        return data;
    } catch (error: any) {
        if (error?.response?.status === 404) {
            return null;
        }

        // Compatibility fallback for deployments that expose /api-prefixed paths.
        try {
            const { data } = await api.get<HealthExportUploadResponse>('/api/health-data');
            return data;
        } catch (fallbackError: any) {
            if (fallbackError?.response?.status === 404) {
                return null;
            }
            throw fallbackError;
        }
    }
}
