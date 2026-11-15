import { jsPDF } from 'jspdf';
import type {
  HealthAlert,
  JournalEntry,
  SafeAstronautProfile,
  TelemetryReading,
  TimeRangeFilter,
} from '../types';

export interface MissionReportAnalytics {
  sampleCount: number;
  avgHr: number;
  avgSpo2: number;
  avgTemp: number;
  avgResp: number;
  avgStress: number;
  avgSleep: number;
  coveragePct: number;
  statusDistribution: { name: string; count: number; color: string }[];
  windowAlerts: HealthAlert[];
}

export interface GeneratedPdfReport {
  blob: Blob;
  url: string;
  filename: string;
  pageCount: number;
  sizeKb: number;
}

export function generateMissionReportPdf(params: {
  user: SafeAstronautProfile | null;
  range: TimeRangeFilter;
  analytics: MissionReportAnalytics;
  windowReadings: TelemetryReading[];
  journalEntries: JournalEntry[];
}): GeneratedPdfReport {
  const { user, range, analytics, windowReadings, journalEntries } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 18;
    }
  };

  // Top Header Band
  doc.setFillColor(10, 17, 27);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setDrawColor(138, 185, 232);
  doc.setLineWidth(0.5);
  doc.line(0, 34, pageWidth, 34);

  doc.setTextColor(138, 185, 232);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ASTROCARE · MISSION BIOMEDICAL OPERATIONS', margin, 12);

  // Powered by NASA badge + vector NASA Meatball on right side of header
  const badgeCenterX = pageWidth - margin - 26;
  const badgeCenterY = 17;
  doc.setFillColor(11, 61, 145);
  doc.circle(badgeCenterX, badgeCenterY, 5.2, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.ellipse(badgeCenterX, badgeCenterY, 6.2, 2.2, 'S');
  doc.setDrawColor(252, 61, 33);
  doc.setLineWidth(0.75);
  doc.line(badgeCenterX - 3.6, badgeCenterY + 2.4, badgeCenterX, badgeCenterY - 3.6);
  doc.line(badgeCenterX, badgeCenterY - 3.6, badgeCenterX + 3.8, badgeCenterY + 2.2);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('NASA', badgeCenterX, badgeCenterY + 1.3, { align: 'center' });

  doc.setTextColor(165, 179, 195);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Powered by', badgeCenterX + 7.5, 15.5);
  doc.setTextColor(244, 247, 250);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('NASA', badgeCenterX + 7.5, 19.8);

  doc.setTextColor(244, 247, 250);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('AstroCare Mission Health Report', margin, 21);

  doc.setTextColor(165, 179, 195);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC   |   Window: ${range.toUpperCase()} (${analytics.sampleCount} simulated samples)`,
    margin,
    28.5
  );

  y = 43;

  // Crew & Mission Profile Box
  doc.setFillColor(245, 248, 252);
  doc.setDrawColor(210, 222, 235);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CREW & MISSION IDENTIFICATION', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const astronautLine = `Astronaut: ${user?.fullName ?? 'Crew Member'} (${user?.callsign ?? 'CREW-01'})   |   Role: ${user?.role ?? 'Mission Specialist'}`;
  const bioLine = `Age: ${user?.age ?? 'N/A'}   |   Blood Group: ${user?.bloodGroup ?? 'N/A'}   |   Height: ${user?.heightCm ?? 'N/A'} cm   |   Weight: ${user?.weightKg ?? 'N/A'} kg`;
  const missionLine = `Mission: ${user?.missionName ?? 'ARTEMIS-IV'}   |   Spacecraft: ${user?.spacecraft ?? 'Orion-MPCV'}`;

  doc.text(astronautLine, margin + 4, y + 13.5);
  doc.text(bioLine, margin + 4, y + 19);
  doc.text(missionLine, margin + 4, y + 24.5);

  y += 36;

  // Section: Calculated Physiological Averages
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Calculated Physiological Summary (Simulated Telemetry)', margin, y);
  y += 5;

  const kpis = [
    { label: 'Average Heart Rate', value: `${analytics.avgHr.toFixed(1)} BPM` },
    { label: 'Average SpO2', value: `${analytics.avgSpo2.toFixed(1)} %` },
    { label: 'Average Body Temp', value: `${analytics.avgTemp.toFixed(2)} °C` },
    { label: 'Average Respiratory', value: `${analytics.avgResp.toFixed(1)} /min` },
    { label: 'Average Stress Index', value: `${analytics.avgStress.toFixed(1)} /100` },
    { label: 'Average Sleep', value: `${analytics.avgSleep.toFixed(1)} hrs` },
    { label: 'Window Alerts', value: `${analytics.windowAlerts.length}` },
    { label: 'Monitoring Coverage', value: `${analytics.coveragePct}%` },
  ];

  const colW = (contentWidth - 6) / 2;
  kpis.forEach((kpi, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const boxX = margin + col * (colW + 6);
    const boxY = y + row * 12;

    doc.setFillColor(250, 252, 255);
    doc.setDrawColor(218, 228, 238);
    doc.roundedRect(boxX, boxY, colW, 10, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.label, boxX + 3.5, boxY + 6.4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, boxX + colW - 3.5, boxY + 6.5, { align: 'right' });
  });

  y += Math.ceil(kpis.length / 2) * 12 + 8;

  // Section: Health Status Distribution
  ensureSpace(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Health Status Distribution', margin, y);
  y += 6;

  const totalDist = Math.max(
    1,
    analytics.statusDistribution.reduce((acc, d) => acc + d.count, 0)
  );
  const barColors: Record<string, [number, number, number]> = {
    Normal: [74, 175, 125],
    Warning: [217, 155, 58],
    Critical: [214, 92, 102],
  };

  analytics.statusDistribution.forEach((item) => {
    const pct = Math.round((item.count / totalDist) * 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`${item.name}: ${item.count} samples (${pct}%)`, margin, y + 4);

    const trackX = margin + 55;
    const trackW = contentWidth - 55;
    doc.setFillColor(235, 240, 246);
    doc.roundedRect(trackX, y + 0.5, trackW, 4.2, 1, 1, 'F');

    const rgb = barColors[item.name] ?? [100, 140, 200];
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    if (pct > 0) {
      doc.roundedRect(trackX, y + 0.5, Math.max(2, (trackW * pct) / 100), 4.2, 1, 1, 'F');
    }
    y += 8.5;
  });

  y += 5;

  // Section: Recent Simulated Telemetry Samples
  ensureSpace(45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Recent Telemetry Samples (Latest 8 Readings)', margin, y);
  y += 5;

  const recentSamples = [...windowReadings].reverse().slice(0, 8);
  const headers = ['Time (Local)', 'HR', 'SpO2', 'Temp', 'Resp', 'Stress', 'Sleep', 'Activity'];
  const colPositions = [
    margin + 2,
    margin + 36,
    margin + 52,
    margin + 69,
    margin + 88,
    margin + 106,
    margin + 125,
    margin + 144,
  ];

  doc.setFillColor(236, 242, 248);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  headers.forEach((h, i) => doc.text(h, colPositions[i], y + 4.8));
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  recentSamples.forEach((r, idx) => {
    ensureSpace(8);
    if (idx % 2 === 1) {
      doc.setFillColor(249, 251, 253);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
    }
    const timeStr = new Date(r.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    doc.setTextColor(51, 65, 85);
    doc.text(timeStr, colPositions[0], y + 4.5);
    doc.text(`${r.heartRate}`, colPositions[1], y + 4.5);
    doc.text(`${r.spo2.toFixed(1)}%`, colPositions[2], y + 4.5);
    doc.text(`${r.bodyTemperature.toFixed(1)}C`, colPositions[3], y + 4.5);
    doc.text(`${r.respiratoryRate}`, colPositions[4], y + 4.5);
    doc.text(`${r.stressIndex}`, colPositions[5], y + 4.5);
    doc.text(`${r.sleepHours.toFixed(1)}h`, colPositions[6], y + 4.5);
    doc.text(r.activityLevel.slice(0, 14), colPositions[7], y + 4.5);
    y += 6.5;
  });

  y += 7;

  // Section: Alerts & Journal Summary
  ensureSpace(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Alerts & Crew Journal Highlights', margin, y);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  if (analytics.windowAlerts.length === 0) {
    doc.text('• No threshold alerts triggered during this evaluation window.', margin + 2, y);
    y += 6;
  } else {
    analytics.windowAlerts.slice(0, 5).forEach((alert) => {
      ensureSpace(10);
      const line = `• [${alert.severity.toUpperCase()}] ${alert.title} — ${alert.metricLabel}: ${alert.valueDisplay}`;
      doc.text(line.slice(0, 105), margin + 2, y);
      y += 5.5;
    });
  }

  if (journalEntries.length > 0) {
    y += 2;
    journalEntries.slice(0, 3).forEach((entry) => {
      ensureSpace(12);
      const summary = `• Journal (${entry.entryDate}, ${entry.moodStatus}, Sleep ${entry.sleepQuality}/5): ${entry.observations}`;
      const wrapped = doc.splitTextToSize(summary, contentWidth - 4);
      doc.text(wrapped, margin + 2, y);
      y += wrapped.length * 4.5 + 1.5;
    });
  }

  // Footers across all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(215, 224, 234);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'DISCLAIMER: Simulated telemetry demonstration only. Not clinical or live NASA spacecraft medical data.',
      margin,
      pageHeight - 9
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }

  const filename = `astrocare-mission-report-${range}-${new Date().toISOString().slice(0, 10)}.pdf`;
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    filename,
    pageCount,
    sizeKb: Math.max(1, Math.round(blob.size / 1024)),
  };
}
