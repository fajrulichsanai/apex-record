'use client';

import type { CSSProperties } from 'react';
import { useTheme } from '@/lib/theme-context';

/**
 * Chart colours for Recharts/Leaflet, which take literal colours (SVG
 * presentation attributes can't read CSS variables), so they're resolved here
 * from the active theme.
 *
 * Categorical slots were validated (lightness band, chroma, CVD separation,
 * contrast) against the chart surface in each mode — keep the order fixed and
 * re-validate if you change a value. Colour follows the entity, not its rank:
 * the same metric keeps the same colour on every chart.
 */
const PALETTE = {
  light: {
    categorical: ['#3E8E36', '#1D5FAE', '#B7791F', '#6A4FC2', '#C2417A'],
    expense: '#C1381F',
    grid: '#E7E4DD',
    tick: '#8D8B7E',
    surface: '#FFFFFF',
    border: '#E7E4DD',
    text: '#17160F',
    textSub: '#55534A',
    cursor: 'rgba(23, 22, 15, 0.05)',
  },
  dark: {
    categorical: ['#4FA345', '#3D7FCC', '#B98009', '#8A6FD0', '#D0538A'],
    expense: '#E5573C',
    grid: '#38362F',
    tick: '#85826F',
    surface: '#2A2924',
    border: '#38362F',
    text: '#F3F1EA',
    textSub: '#B8B5A9',
    cursor: 'rgba(255, 255, 255, 0.05)',
  },
} as const;

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const p = PALETTE[resolvedTheme === 'dark' ? 'dark' : 'light'];
  const [c1, c2, c3, c4, c5] = p.categorical;

  const tooltipContentStyle: CSSProperties = {
    background: p.surface,
    border: `1px solid ${p.border}`,
    borderRadius: 12,
    boxShadow: '0 12px 28px -12px rgba(0, 0, 0, 0.35)',
    fontSize: 12.5,
    color: p.text,
  };

  return {
    ...p,
    /** Fixed entity → colour mapping shared by every finance chart. */
    series: {
      pendapatan: c1,
      feeDokter: c2,
      labaBersih: c3,
      pengeluaran: p.expense,
    },
    paymentMethod: {
      cash: c1,
      transfer: c2,
      insurance: c3,
      qris: c4,
      bpjs: c5,
    } as Record<string, string>,
    axisTick: { fontSize: 12, fill: p.tick },
    tooltip: {
      contentStyle: tooltipContentStyle,
      labelStyle: { color: p.text, fontWeight: 600, marginBottom: 4 },
      itemStyle: { color: p.textSub, padding: 0 },
      cursor: { fill: p.cursor },
    },
    legendStyle: { fontSize: 12.5, color: p.textSub },
    /** Recharts paints legend text in the series colour by default; keep
     *  text in ink and let the swatch carry the identity. */
    legendFormatter: (value: string) => <span style={{ color: p.textSub }}>{value}</span>,
  };
}
