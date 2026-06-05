/**
 * Client-side export utilities for the Core Product Roadmap page.
 * Generates branded PPT and PDF files with one slide/page per Major.
 * Both functions must only be called in the browser (dynamic import from page).
 */

import pptxgen from 'pptxgenjs';
import { jsPDF } from 'jspdf';

// ── Shared types ─────────────────────────────────────────────────────────────

export interface MajorConfig {
  name: string;
  devStart: number;
  devDur: number;
  qaStart: number;
  qaDur: number;
  stagingPointWeek?: number;
}

export interface ItemInfo {
  name: string;
  primaryOwner?: string;
  secondaryOwner?: string;
  status?: string;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const START_DATE = new Date(2026, 2, 9);

function weekToDate(week: number): string {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + week * 7);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusHex(status = ''): string {
  const s = status.toLowerCase();
  if (s === 'done' || s.includes('completed')) return '22C55E';
  if (s.includes('blocked')) return 'EF4444';
  if (s.includes('testing') || s.includes('in qa')) return 'A78BFA';
  if (s.includes('design in progress')) return '60A5FA';
  if (s.includes('discovery in progress')) return '38BDF8';
  if (s.includes('in progress') || s === 'wip') return 'F59E0B';
  return '64748B';
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── PPT Export ────────────────────────────────────────────────────────────────
//
// Layout: 16:9 widescreen (13.33" × 7.5")
// Slide 1: Title / cover
// Slides 2+: One per Major — timeline bar + items table

export async function downloadPPT(
  majorReleases: MajorConfig[],
  majorItems: Record<string, ItemInfo[]>
): Promise<void> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Bluecopa';
  pptx.subject = 'Core Product Roadmap';

  // ── Cover slide ─────────────────────────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: '0F172A' };
  // Accent stripe across middle
  cover.addShape('rect', { x: 0, y: 3.45, w: 13.33, h: 0.06, fill: { color: '8B5CF6' }, line: { color: '8B5CF6', width: 0 } });
  // Company name
  cover.addText('BLUECOPA', {
    x: 0.5, y: 0.9, w: 12.33, h: 0.8,
    fontSize: 20, bold: true, charSpacing: 10,
    color: '8B5CF6', fontFace: 'Calibri', align: 'center',
  });
  // Title
  cover.addText('Product Roadmap', {
    x: 0.5, y: 1.7, w: 12.33, h: 1.65,
    fontSize: 54, bold: true,
    color: 'F1F5F9', fontFace: 'Calibri', align: 'center',
  });
  // Date range
  cover.addText('March 2026 – August 2027', {
    x: 0.5, y: 3.6, w: 12.33, h: 0.6,
    fontSize: 20, color: '94A3B8', fontFace: 'Calibri', align: 'center',
  });
  // Generated date
  cover.addText(`Generated on ${todayLabel()}`, {
    x: 0.5, y: 7.05, w: 12.33, h: 0.3,
    fontSize: 10, color: '475569', fontFace: 'Calibri', align: 'center',
  });

  // ── Per-Major slides ────────────────────────────────────────────────────────
  for (const major of majorReleases) {
    const items = majorItems[major.name] ?? [];
    const span = major.qaStart + major.qaDur - major.devStart;
    const devFrac = major.devDur / span;
    const gapFrac = Math.max(0, (major.qaStart - major.devStart - major.devDur) / span);
    const qaFrac = major.qaDur / span;

    const slide = pptx.addSlide();
    slide.background = { color: '0F172A' };

    // Left accent stripe
    slide.addShape('rect', {
      x: 0, y: 0, w: 0.1, h: 7.5,
      fill: { color: '8B5CF6' }, line: { color: '8B5CF6', width: 0 },
    });

    // Major label
    slide.addText(major.name, {
      x: 0.25, y: 0.18, w: 5, h: 0.95,
      fontSize: 40, bold: true, color: '8B5CF6', fontFace: 'Calibri',
    });

    // Date range + week count
    slide.addText(
      `${weekToDate(major.devStart)}  →  ${weekToDate(major.qaStart + major.qaDur)}  ·  ${span} weeks`,
      { x: 0.25, y: 1.1, w: 12.83, h: 0.38, fontSize: 13, color: '94A3B8', fontFace: 'Calibri' }
    );

    // ── Timeline bar ─────────────────────────────────────────────────────────
    const BX = 0.25, BY = 1.62, BW = 12.83, BH = 0.44;

    // Track background
    slide.addShape('rect', {
      x: BX, y: BY, w: BW, h: BH,
      fill: { color: '1E293B' }, line: { color: '334155', width: 0.75 },
    });

    // Dev segment
    const devW = BW * devFrac;
    slide.addShape('rect', {
      x: BX, y: BY, w: Math.max(devW, 0.01), h: BH,
      fill: { color: '7C3AED' }, line: { color: '7C3AED', width: 0 },
    });
    if (devW > 0.35) {
      slide.addText('DEV', {
        x: BX + 0.08, y: BY + 0.09, w: devW - 0.16, h: 0.27,
        fontSize: 9, bold: true, color: 'FFFFFF', fontFace: 'Calibri',
      });
    }

    // QA segment
    const qaX = BX + BW * (devFrac + gapFrac);
    const qaW = BW * qaFrac;
    slide.addShape('rect', {
      x: qaX, y: BY, w: Math.max(qaW, 0.01), h: BH,
      fill: { color: 'A78BFA' }, line: { color: 'A78BFA', width: 0 },
    });
    if (qaW > 0.25) {
      slide.addText('QA', {
        x: qaX + 0.08, y: BY + 0.09, w: qaW - 0.16, h: 0.27,
        fontSize: 9, bold: true, color: 'FFFFFF', fontFace: 'Calibri',
      });
    }

    // Date labels below bar
    slide.addText(weekToDate(major.devStart), {
      x: BX, y: BY + BH + 0.05, w: 2.2, h: 0.22, fontSize: 9, color: '64748B', fontFace: 'Calibri',
    });
    slide.addText(weekToDate(major.qaStart + major.qaDur), {
      x: BX + BW - 2.2, y: BY + BH + 0.05, w: 2.2, h: 0.22,
      fontSize: 9, color: '64748B', fontFace: 'Calibri', align: 'right',
    });

    // ── Items table ───────────────────────────────────────────────────────────
    const TABLE_Y = 2.56;
    const ROW_H = 0.36;
    const MAX_ROWS = Math.floor((7.38 - TABLE_Y) / ROW_H) - 1; // -1 for header row

    if (items.length === 0) {
      slide.addText('No items assigned to this Major yet.', {
        x: 0.25, y: TABLE_Y + 0.4, w: 12.83, h: 0.5,
        fontSize: 13, color: '475569', fontFace: 'Calibri', align: 'center',
      });
    } else {
      const visible = items.slice(0, MAX_ROWS);

      // Build table rows: header + data rows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[][] = [
        // Header
        [
          { text: 'Item Name', options: { bold: true, color: 'CBD5E1', fill: { color: '1E293B' }, fontSize: 10, fontFace: 'Calibri', valign: 'middle' } },
          { text: 'Status',    options: { bold: true, color: 'CBD5E1', fill: { color: '1E293B' }, fontSize: 10, fontFace: 'Calibri', valign: 'middle', align: 'center' } },
          { text: 'Owner',     options: { bold: true, color: 'CBD5E1', fill: { color: '1E293B' }, fontSize: 10, fontFace: 'Calibri', valign: 'middle' } },
        ],
        // Data rows
        ...visible.map((item, i) => {
          const rowFill = i % 2 === 0 ? '0B1120' : '1A2744';
          const sc = statusHex(item.status);
          const owner = [item.primaryOwner, item.secondaryOwner].filter(Boolean).join(' · ');
          return [
            { text: item.name,        options: { color: 'E2E8F0', fill: { color: rowFill }, fontSize: 10,   fontFace: 'Calibri', valign: 'middle' } },
            { text: item.status ?? '—', options: { color: sc,       fill: { color: rowFill }, fontSize: 9.5,  fontFace: 'Calibri', valign: 'middle', align: 'center', bold: true } },
            { text: owner,            options: { color: '94A3B8', fill: { color: rowFill }, fontSize: 9.5,  fontFace: 'Calibri', valign: 'middle' } },
          ];
        }),
      ];

      slide.addTable(rows, {
        x: BX, y: TABLE_Y,
        w: BW,
        colW: [8.1, 2.5, 2.23],
        rowH: ROW_H,
        border: { type: 'solid', color: '334155', pt: 0.5 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      if (items.length > MAX_ROWS) {
        slide.addText(`+ ${items.length - MAX_ROWS} more items not shown`, {
          x: BX, y: TABLE_Y + (visible.length + 1) * ROW_H + 0.1,
          w: BW, h: 0.28, fontSize: 10, color: '475569', fontFace: 'Calibri', align: 'center',
        });
      }
    }

    // Footer
    slide.addText('Bluecopa · Confidential', {
      x: 0.25, y: 7.3, w: 12.83, h: 0.2,
      fontSize: 8, color: '334155', fontFace: 'Calibri', align: 'center',
    });
  }

  await pptx.writeFile({ fileName: 'Bluecopa-Product-Roadmap.pptx' });
}

// ── PDF Export ────────────────────────────────────────────────────────────────
//
// Layout: A4 Landscape (297mm × 210mm)
// Page 1: Cover
// Pages 2+: One per Major — timeline bar + items table

export function downloadPDF(
  majorReleases: MajorConfig[],
  majorItems: Record<string, ItemInfo[]>
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210, M = 12;

  // Convenience setters
  const fill  = (hex: string) => { const [r, g, b] = hexToRgb(hex); doc.setFillColor(r, g, b); };
  const stroke = (hex: string) => { const [r, g, b] = hexToRgb(hex); doc.setDrawColor(r, g, b); };
  const color = (hex: string) => { const [r, g, b] = hexToRgb(hex); doc.setTextColor(r, g, b); };

  // ── Cover page ──────────────────────────────────────────────────────────────
  fill('0F172A'); doc.rect(0, 0, W, H, 'F');
  fill('8B5CF6'); doc.rect(0, H / 2 - 1.2, W, 2.4, 'F');

  color('8B5CF6');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('BLUECOPA', W / 2, H / 2 - 22, { align: 'center', charSpace: 4 });

  color('F1F5F9');
  doc.setFontSize(36);
  doc.text('Product Roadmap', W / 2, H / 2 + 14, { align: 'center' });

  color('94A3B8');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13);
  doc.text('March 2026 – August 2027', W / 2, H / 2 + 27, { align: 'center' });

  color('475569');
  doc.setFontSize(8);
  doc.text(`Generated on ${todayLabel()}`, W / 2, H - 8, { align: 'center' });

  // ── Per-Major pages ─────────────────────────────────────────────────────────
  for (const major of majorReleases) {
    doc.addPage();
    const items = majorItems[major.name] ?? [];
    const span = major.qaStart + major.qaDur - major.devStart;
    const devFrac = major.devDur / span;
    const gapFrac = Math.max(0, (major.qaStart - major.devStart - major.devDur) / span);
    const qaFrac = major.qaDur / span;

    // Page background
    fill('0F172A'); doc.rect(0, 0, W, H, 'F');
    // Left accent stripe
    fill('8B5CF6'); doc.rect(0, 0, 2.5, H, 'F');

    // Major label
    color('8B5CF6');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(30);
    doc.text(major.name, M + 2, 18);

    // Date range + week count
    color('94A3B8');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(
      `${weekToDate(major.devStart)}  →  ${weekToDate(major.qaStart + major.qaDur)}  ·  ${span} weeks`,
      M + 2, 27
    );

    // ── Timeline bar ──────────────────────────────────────────────────────────
    const BX = M + 2, BY = 33, BW = W - M * 2 - 2, BH = 7;

    // Track
    fill('1E293B'); stroke('334155');
    doc.setLineWidth(0.3);
    doc.roundedRect(BX, BY, BW, BH, 1.5, 1.5, 'FD');

    // Dev segment
    const devW = BW * devFrac;
    fill('7C3AED');
    doc.roundedRect(BX, BY, Math.max(devW, 0.5), BH, 1.5, 1.5, 'F');
    if (devW > 8) {
      color('FFFFFF');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
      doc.text('DEV', BX + 3, BY + 4.8);
    }

    // QA segment
    const qaX = BX + BW * (devFrac + gapFrac);
    const qaW = BW * qaFrac;
    fill('A78BFA');
    doc.roundedRect(qaX, BY, Math.max(qaW, 0.5), BH, 1.5, 1.5, 'F');
    if (qaW > 6) {
      color('FFFFFF');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
      doc.text('QA', qaX + 3, BY + 4.8);
    }

    // Date labels below bar
    color('64748B');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(weekToDate(major.devStart), BX, BY + BH + 4.5);
    doc.text(weekToDate(major.qaStart + major.qaDur), BX + BW, BY + BH + 4.5, { align: 'right' });

    // ── Items table ───────────────────────────────────────────────────────────
    const TABLE_Y = 54;
    const HDR_H = 8;
    const ROW_H = 7.5;
    const MAX_ROWS = Math.floor((H - TABLE_Y - 8) / ROW_H) - 1;

    // Column x positions
    const CX_NAME   = BX;
    const CX_STATUS = BX + 155;
    const CX_OWNER  = BX + 210;
    const TW        = BW; // total table width

    if (items.length === 0) {
      color('475569'); doc.setFontSize(11);
      doc.text('No items assigned to this Major yet.', W / 2, TABLE_Y + 12, { align: 'center' });
    } else {
      const visible = items.slice(0, MAX_ROWS);

      // Header row
      fill('1E293B');
      doc.rect(CX_NAME, TABLE_Y, TW, HDR_H, 'F');
      color('CBD5E1');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.text('Item Name', CX_NAME + 3,   TABLE_Y + 5.5);
      doc.text('Status',    CX_STATUS + 3, TABLE_Y + 5.5);
      doc.text('Owner',     CX_OWNER + 3,  TABLE_Y + 5.5);

      // Data rows
      visible.forEach((item, i) => {
        const ry = TABLE_Y + HDR_H + i * ROW_H;
        const isBg = i % 2 === 0;

        // Row background
        fill(isBg ? '0F172A' : '1A2744');
        doc.rect(CX_NAME, ry, TW, ROW_H, 'F');

        // Row border (bottom only)
        stroke('334155');
        doc.setLineWidth(0.2);
        doc.rect(CX_NAME, ry, TW, ROW_H, 'D');

        // Item name
        color('E2E8F0');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        const maxChars = 75;
        const displayName = item.name.length > maxChars ? item.name.slice(0, maxChars) + '…' : item.name;
        doc.text(displayName, CX_NAME + 3, ry + 5);

        // Status pill background (blended with row bg)
        const sc = statusHex(item.status);
        const [sr, sg, sb] = hexToRgb(sc);
        const [bgr, bgg, bgb] = isBg ? [15, 23, 42] : [26, 39, 68];
        doc.setFillColor(
          Math.round(sr * 0.28 + bgr * 0.72),
          Math.round(sg * 0.28 + bgg * 0.72),
          Math.round(sb * 0.28 + bgb * 0.72)
        );
        doc.roundedRect(CX_STATUS + 1, ry + 1.5, 50, 4.5, 1, 1, 'F');

        // Status text
        doc.setTextColor(sr, sg, sb);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
        doc.text(item.status ?? '—', CX_STATUS + 26, ry + 5, { align: 'center' });

        // Owner
        color('94A3B8');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        const owner = [item.primaryOwner, item.secondaryOwner].filter(Boolean).join(' · ');
        doc.text(owner, CX_OWNER + 3, ry + 5);
      });

      if (items.length > MAX_ROWS) {
        color('64748B'); doc.setFontSize(8.5);
        doc.text(
          `+ ${items.length - MAX_ROWS} more items not shown`,
          W / 2,
          TABLE_Y + HDR_H + visible.length * ROW_H + 5,
          { align: 'center' }
        );
      }
    }

    // Footer
    color('334155');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text('Bluecopa · Confidential', W / 2, H - 5, { align: 'center' });
  }

  doc.save('Bluecopa-Product-Roadmap.pdf');
}
