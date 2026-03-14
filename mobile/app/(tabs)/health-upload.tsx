import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircularScore } from '@/components/health/CircularScore';
import { HealthMetricCard } from '@/components/health/HealthMetricCard';
import { HealthExportUploadResponse, uploadHealthExportZip } from '@/services/healthExportApi';
import { useHealthStore } from '@/stores/healthStore';

const C = {
    bg: '#0A0A0A',
    card: '#141414',
    border: '#1E1E1E',
    text: '#F5F5F5',
    body: '#C8D1CC',
    muted: '#93A19A',
    accent: '#00E676',
    danger: '#FF6B6B',
} as const;

function formatMetric(value: number, unit: string): string {
    return `${value.toFixed(2)} ${unit}`;
}

export default function HealthUploadScreen() {
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [result, setResult] = useState<HealthExportUploadResponse | null>(null);
    const setHealthData = useHealthStore((state) => state.setHealthData);

    const metricCards = useMemo(() => {
        if (!result) {
            return [];
        }

        const m = result.parsed_metrics;
        return [
            {
                key: 'heart-rate',
                title: 'Heart Rate',
                totalLabel: 'Total',
                totalValue: formatMetric(m.heart_rate.total, m.heart_rate.unit),
                averageLabel: 'Average',
                averageValue: formatMetric(m.heart_rate.average, m.heart_rate.unit),
                samples: m.heart_rate.sample_count,
            },
            {
                key: 'steps',
                title: 'Step Count',
                totalLabel: 'Total Steps',
                totalValue: formatMetric(m.step_count.total, m.step_count.unit),
                averageLabel: 'Average',
                averageValue: formatMetric(m.step_count.average, m.step_count.unit),
                samples: m.step_count.sample_count,
            },
            {
                key: 'sleep',
                title: 'Sleep Analysis',
                totalLabel: 'Total Sleep',
                totalValue: formatMetric(m.sleep_analysis.total, m.sleep_analysis.unit),
                averageLabel: 'Average / night',
                averageValue: formatMetric(m.sleep_analysis.average, m.sleep_analysis.unit),
                samples: m.sleep_analysis.sample_count,
            },
            {
                key: 'calories',
                title: 'Calories Burned',
                totalLabel: 'Total',
                totalValue: formatMetric(m.active_energy_burned.total, m.active_energy_burned.unit),
                averageLabel: 'Average',
                averageValue: formatMetric(m.active_energy_burned.average, m.active_energy_burned.unit),
                samples: m.active_energy_burned.sample_count,
            },
            {
                key: 'hrv',
                title: 'HRV (SDNN)',
                totalLabel: 'Total',
                totalValue: formatMetric(m.hrv_sdnn.total, m.hrv_sdnn.unit),
                averageLabel: 'Average',
                averageValue: formatMetric(m.hrv_sdnn.average, m.hrv_sdnn.unit),
                samples: m.hrv_sdnn.sample_count,
            },
        ];
    }, [result]);

    async function handlePickAndUpload() {
        setErrorMessage(null);

        // Ask user to pick an Apple Health export ZIP file.
        const picked = await DocumentPicker.getDocumentAsync({
            type: 'application/zip',
            multiple: false,
            copyToCacheDirectory: true,
        });

        if (picked.canceled) {
            return;
        }

        const selectedFile = picked.assets[0];
        if (!selectedFile?.uri || !selectedFile?.name) {
            setErrorMessage('Could not read the selected file. Please try another ZIP export.');
            return;
        }

        try {
            setProcessing(true);
            const uploadResponse = await uploadHealthExportZip(selectedFile.uri, selectedFile.name);
            setResult(uploadResponse);
            setHealthData(uploadResponse); // Save to global store
        } catch (error: any) {
            const serverMessage = error?.response?.data?.detail;
            setErrorMessage(serverMessage || 'Upload failed. Please verify this is a valid Apple Health export ZIP.');
        } finally {
            setProcessing(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerBlock}>
                    <Text style={styles.title}>Health Export Upload</Text>
                    <Text style={styles.subtitle}>Upload Apple Health export.zip and compute your physical state.</Text>
                </View>

                <Pressable style={styles.uploadButton} onPress={handlePickAndUpload} disabled={processing}>
                    <Text style={styles.uploadButtonText}>Upload Health Export</Text>
                </Pressable>

                {processing ? (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator color={C.accent} size="small" />
                        <Text style={styles.loadingText}>Processing export.xml and calculating score...</Text>
                    </View>
                ) : null}

                {errorMessage ? (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                {result ? (
                    <>
                        <View style={styles.scoreCard}>
                            <CircularScore score={result.physical_state.score} />
                            <Text style={styles.statusLabel}>{result.physical_state.status}</Text>
                        </View>

                        <View style={styles.cardsColumn}>
                            {metricCards.map((metric) => (
                                <HealthMetricCard
                                    key={metric.key}
                                    title={metric.title}
                                    totalLabel={metric.totalLabel}
                                    totalValue={metric.totalValue}
                                    averageLabel={metric.averageLabel}
                                    averageValue={metric.averageValue}
                                    samples={metric.samples}
                                />
                            ))}
                        </View>
                    </>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: C.bg,
    },
    content: {
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 28,
        gap: 14,
    },
    headerBlock: {
        gap: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: C.text,
    },
    subtitle: {
        fontSize: 14,
        color: C.body,
        lineHeight: 20,
    },
    uploadButton: {
        backgroundColor: C.accent,
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
    },
    uploadButtonText: {
        color: '#05361D',
        fontSize: 14,
        fontWeight: '800',
    },
    loadingCard: {
        backgroundColor: C.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        color: C.body,
        fontSize: 13,
        fontWeight: '500',
    },
    errorCard: {
        backgroundColor: '#211313',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#4A1F1F',
        padding: 14,
    },
    errorText: {
        color: C.danger,
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    scoreCard: {
        backgroundColor: C.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.border,
        paddingVertical: 18,
        paddingHorizontal: 14,
        alignItems: 'center',
        gap: 8,
    },
    statusLabel: {
        color: C.accent,
        fontSize: 16,
        fontWeight: '700',
    },
    cardsColumn: {
        gap: 10,
    },
});
