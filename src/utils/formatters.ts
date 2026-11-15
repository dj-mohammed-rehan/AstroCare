import type { TelemetryReading } from '../types';

export function formatTimeShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateOnly(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function computeMissionElapsedTime(startIso: string, now = new Date()): string {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return 'MET 14d 06h 42m';
  const diffMs = Math.max(0, now.getTime() - start.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  return `MET ${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportTelemetryCsv(readings: TelemetryReading[], filename = 'astrocare-telemetry.csv'): void {
  const headers = [
    'timestamp',
    'heartRate_bpm',
    'spo2_pct',
    'bodyTemperature_c',
    'respiratoryRate_bpm',
    'stressIndex_0_100',
    'sleepHours',
    'activityLevel',
  ];
  const rows = readings.map((r) =>
    [
      r.timestamp,
      r.heartRate,
      r.spo2,
      r.bodyTemperature,
      r.respiratoryRate,
      r.stressIndex,
      r.sleepHours,
      `"${r.activityLevel}"`,
    ].join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  downloadTextFile(filename, csv, 'text/csv;charset=utf-8;');
}

export async function resizeImageToDataUrl(file: File, maxSize = 192): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        let dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        if (dataUrl.length > 95000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.55);
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
