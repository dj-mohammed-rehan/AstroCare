import { useRef, useState } from 'react';
import { Download, FileCheck2, Printer, X } from 'lucide-react';
import type { GeneratedPdfReport } from '../utils/pdfReport';

interface PdfReportModalProps {
  report: GeneratedPdfReport | null;
  onClose: () => void;
}

export function PdfReportModal({ report, onClose }: PdfReportModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  if (!report) return null;

  const handleDownloadPdf = () => {
    const anchor = document.createElement('a');
    anchor.href = report.url;
    anchor.download = report.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handlePrintPdf = () => {
    setPrintNotice(null);
    const frameWin = iframeRef.current?.contentWindow;
    if (frameWin) {
      try {
        frameWin.focus();
        frameWin.print();
        return;
      } catch {
        // Fallback to window.print() if sandboxed PDF viewer blocks direct frame print
      }
    }
    setPrintNotice('Opening browser print dialog...');
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-report-modal-title"
    >
      <div className="astra-panel-solid w-full max-w-4xl h-[88vh] flex flex-col rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--astra-border)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#8AB9E8]/40 bg-[#8AB9E8]/15 text-[#B9DDF5]">
              <FileCheck2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3
                id="pdf-report-modal-title"
                className="font-display text-base font-semibold text-[var(--astra-text-primary)] truncate"
              >
                Mission Report PDF Generated
              </h3>
              <p className="text-xs text-[var(--astra-text-secondary)] font-mono-tabular truncate">
                {report.filename} · {report.pageCount} {report.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                {report.sizeKb} KB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close PDF preview"
            className="rounded-lg p-1.5 text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Embedded PDF Document Preview */}
        <div className="flex-1 bg-[#0A111B] p-3 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={report.url}
            title="AstroCare Mission Health Report PDF Preview"
            className="h-full w-full rounded-lg border border-[var(--astra-border)] bg-white"
          />
        </div>

        {/* Footer with Explicit Print PDF & Download PDF Options */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-[var(--astra-border)] bg-[var(--astra-bg-secondary)]">
          <div className="text-xs text-[var(--astra-text-secondary)]">
            {printNotice ?? 'Choose an option below to print or save the generated PDF report.'}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--astra-border)] px-3.5 py-2 text-xs font-medium text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] transition-colors whitespace-nowrap"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#8AB9E8]/45 bg-[#8AB9E8]/15 px-4 py-2 text-xs font-semibold text-[#B9DDF5] hover:bg-[#8AB9E8]/25 transition-colors whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Print PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#8AB9E8] px-4 py-2 text-xs font-semibold text-[#05070B] hover:bg-[#B9DDF5] transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
