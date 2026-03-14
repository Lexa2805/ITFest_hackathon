import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const C = {
  accent: '#00E676',
  muted: '#93A19A',
  title: '#F5F5F5',
} as const;

type DataPoint = { date: string; value: number };

type Props = {
  dataPoints: DataPoint[];
  label?: string;
  width?: number;
  height?: number;
};

export function TrendSparkline({
  dataPoints,
  label,
  width = 140,
  height = 40,
}: Props) {
  if (dataPoints.length < 2) {
    return (
      <View style={styles.container}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.insufficient}>Insufficient data</Text>
      </View>
    );
  }

  const values = dataPoints.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Svg width={width} height={height}>
        <Path d={d} stroke={C.accent} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
  },
  insufficient: {
    fontSize: 12,
    fontWeight: '500',
    color: C.muted,
    fontStyle: 'italic',
  },
});
