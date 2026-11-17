import { ItemStatus } from '../interfaces/models';

/** Palettes validated with the dataviz validator (light vs #fcfcfb, dark vs dark surface). */
export const SERIES = {
  light: { lost: '#c8385a', found: '#1f9e89', reports: '#1f9e89', returns: '#3b6fd4' },
  dark: { lost: '#d4486a', found: '#26a892', reports: '#26a892', returns: '#4a7ee0' },
};
export const STATUS_COLORS: Record<'light' | 'dark', Record<ItemStatus, string>> = {
  light: { open: '#3b6fd4', claim_pending: '#a8730f', matched: '#8a4fd0', returned: '#1f9e89', closed: '#bb4a36' },
  dark: { open: '#4a7ee0', claim_pending: '#b07a12', matched: '#9460d8', returned: '#26a892', closed: '#c4553f' },
};

export function chartBase(dark: boolean) {
  const ink = dark ? '#93a6ae' : '#5d6f78';
  const grid = dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,61,56,0.07)';
  const surface = dark ? '#121d23' : '#ffffff';
  return {
    ink, grid, surface,
    options: {
      maintainAspectRatio: false,
      responsive: true,
      animation: { duration: 400 },
      plugins: {
        legend: { position: 'bottom' as const, labels: { color: ink, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 14, font: { family: 'Inter', size: 12 } } },
        tooltip: {
          backgroundColor: dark ? '#e6eef1' : '#16232a', titleColor: dark ? '#16232a' : '#ffffff', bodyColor: dark ? '#16232a' : '#ffffff',
          padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true, titleFont: { family: 'Inter', weight: 600 as const }, bodyFont: { family: 'Inter' },
        },
      },
      scales: {
        x: { ticks: { color: ink, font: { family: 'Inter', size: 11 } }, grid: { display: false }, border: { color: grid } },
        y: { beginAtZero: true, ticks: { color: ink, precision: 0, font: { family: 'Inter', size: 11 } }, grid: { color: grid }, border: { display: false } },
      },
    },
  };
}

export const periodLabel = (iso: string, unit: 'day' | 'week') =>
  (unit === 'week' ? 'Wk of ' : '') + new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
