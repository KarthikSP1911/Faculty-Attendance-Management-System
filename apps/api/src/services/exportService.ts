import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { toCsv } from './reportRules';

export type ExportFormat = 'json' | 'csv' | 'pdf';

/** Renders a simple landscape table. Long tables continue on new pages with the header repeated. */
export function renderPdf(title: string, headers: string[], rows: unknown[][]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const colW = width / Math.max(headers.length, 1);
    const drawRow = (cells: unknown[], bold: boolean) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        drawRow(headers, true);
      }
      const y = doc.y;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
      cells.forEach((c, i) => doc.text(String(c ?? ''), left + i * colW, y, { width: colW - 4, height: 12, ellipsis: true, lineBreak: false }));
      doc.y = y + 14;
    };

    doc.font('Helvetica-Bold').fontSize(14).text(title, left, doc.y);
    doc.font('Helvetica').fontSize(8).text('Faculty Attendance Management System (demo, synthetic data)');
    doc.moveDown();
    drawRow(headers, true);
    rows.forEach((r) => drawRow(r, false));
    doc.end();
  });
}

/** Sends JSON, CSV or PDF for the same table (REQ-RPT-03). */
export async function sendTable(
  res: Response,
  format: ExportFormat,
  opts: { filename: string; title: string; headers: string[]; rows: unknown[][]; json: unknown },
): Promise<void> {
  if (format === 'csv') {
    res.type('text/csv').setHeader('Content-Disposition', `attachment; filename="${opts.filename}.csv"`);
    res.send(toCsv(opts.headers, opts.rows));
  } else if (format === 'pdf') {
    const pdf = await renderPdf(opts.title, opts.headers, opts.rows);
    res.type('application/pdf').setHeader('Content-Disposition', `attachment; filename="${opts.filename}.pdf"`);
    res.send(pdf);
  } else {
    res.json({ success: true, data: opts.json, error: null });
  }
}
