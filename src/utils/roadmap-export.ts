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

function weekToMonthYear(week: number): string {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + week * 7);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Returns the Bluecopa logo as a PNG data URL.
// Tries /bluecopa-logo.png first (drop the exact file there for a pixel-perfect result).
// Falls back to a canvas-drawn approximation of the mark.
async function createLogoDataUrl(): Promise<string> {
  try {
    const resp = await fetch('/bluecopa-logo.png');
    if (resp.ok) {
      const blob = await resp.blob();
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(drawLogoFallback());
        reader.readAsDataURL(blob);
      });
    }
  } catch { /* fall through */ }
  return drawLogoFallback();
}

function drawLogoFallback(): string {
  try {
    const S = 256;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. Rounded-square background (very dark navy)
    ctx.fillStyle = '#081525';
    ctx.beginPath();
    const r = 40;
    ctx.moveTo(r, 0); ctx.lineTo(S - r, 0);
    ctx.quadraticCurveTo(S, 0, S, r);
    ctx.lineTo(S, S - r); ctx.quadraticCurveTo(S, S, S - r, S);
    ctx.lineTo(r, S); ctx.quadraticCurveTo(0, S, 0, S - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // 2. Large dark-blue circle (the outer "C" arc body)
    ctx.beginPath();
    ctx.arc(S * 0.46, S * 0.54, S * 0.40, 0, Math.PI * 2);
    ctx.fillStyle = '#1535A8';
    ctx.fill();

    // 3. Background-coloured cutout upper-right — opens the "C"
    ctx.beginPath();
    ctx.arc(S * 0.61, S * 0.37, S * 0.20, 0, Math.PI * 2);
    ctx.fillStyle = '#081525';
    ctx.fill();

    // 4. Small light-blue circle top-right (the "upper lobe" of the mark)
    ctx.beginPath();
    ctx.arc(S * 0.65, S * 0.32, S * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = '#5BA8F5';
    ctx.fill();

    // 5. Medium blue inner circle
    ctx.beginPath();
    ctx.arc(S * 0.46, S * 0.57, S * 0.24, 0, Math.PI * 2);
    ctx.fillStyle = '#4B9CF0';
    ctx.fill();

    // 6. White centre dot
    ctx.beginPath();
    ctx.arc(S * 0.46, S * 0.57, S * 0.11, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    return canvas.toDataURL('image/png');
  } catch { return ''; }
}

// ── PPT Export ────────────────────────────────────────────────────────────────
//
// Layout: 16:9 widescreen (13.33" × 7.5")
// Slide 1: Cover
// Slides 2+: One or more per Major (continuation slides when items overflow)
// Every slide: Bluecopa logo mark + "BLUECOPA" wordmark at top-left

export async function downloadPPT(
  majorReleases: MajorConfig[],
  majorItems: Record<string, ItemInfo[]>
): Promise<void> {
  const activeMajors = majorReleases.filter(m => (majorItems[m.name]?.length ?? 0) > 0);
  const logoDataUrl = await createLogoDataUrl();

  // Compute actual date range from the active majors
  const startWeek = Math.min(...activeMajors.map(m => m.devStart));
  const endWeek   = Math.max(...activeMajors.map(m => m.qaStart + m.qaDur));
  const coverRange = `${weekToMonthYear(startWeek)} - ${weekToMonthYear(endWeek)}`;

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Bluecopa';
  pptx.subject = 'Core Product Roadmap';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function addLogoHeader(slide: any) {
    if (logoDataUrl) {
      slide.addImage({ data: logoDataUrl, x: 0.18, y: 0.09, w: 0.42, h: 0.42 });
    }
    slide.addText('BLUECOPA', {
      x: 0.65, y: 0.09, w: 2.8, h: 0.42,
      fontSize: 13, bold: true, color: 'FFFFFF', fontFace: 'Calibri', valign: 'middle',
    });
  }

  // ── Cover slide ──────────────────────────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: '0F172A' };
  cover.addShape('rect', { x: 0, y: 3.45, w: 13.33, h: 0.06, fill: { color: '8B5CF6' }, line: { color: '8B5CF6', width: 0 } });
  addLogoHeader(cover);
  cover.addText('Product Roadmap', {
    x: 0.5, y: 1.55, w: 12.33, h: 1.65, fontSize: 54, bold: true,
    color: 'F1F5F9', fontFace: 'Calibri', align: 'center',
  });
  cover.addText(coverRange, {
    x: 0.5, y: 3.6, w: 12.33, h: 0.6, fontSize: 20,
    color: '94A3B8', fontFace: 'Calibri', align: 'center',
  });
  cover.addText(`Generated on ${todayLabel()}`, {
    x: 0.5, y: 7.05, w: 12.33, h: 0.3, fontSize: 10,
    color: '475569', fontFace: 'Calibri', align: 'center',
  });

  // ── Per-Major slides (with continuation) ─────────────────────────────────────
  const BX = 0.25, BW = 12.83, BH_BAR = 0.44;
  const ROW_H = 0.36;
  const FOOTER_Y = 7.30; // reserved for footer/continued line
  const SLIDE_H  = 7.38;

  for (const major of activeMajors) {
    const items = majorItems[major.name]!;
    const span    = major.qaStart + major.qaDur - major.devStart;
    const devFrac = major.devDur / span;
    const gapFrac = Math.max(0, (major.qaStart - major.devStart - major.devDur) / span);
    const qaFrac  = major.qaDur / span;

    let itemOffset = 0;
    let isCont = false;

    while (itemOffset < items.length) {
      const slide = pptx.addSlide();
      slide.background = { color: '0F172A' };

      // Accent stripe
      slide.addShape('rect', { x: 0, y: 0, w: 0.1, h: 7.5, fill: { color: '8B5CF6' }, line: { color: '8B5CF6', width: 0 } });

      // Logo header + thin divider
      addLogoHeader(slide);
      slide.addShape('rect', { x: 0.18, y: 0.58, w: 13.0, h: 0.025, fill: { color: '1E293B' }, line: { color: '1E293B', width: 0 } });

      // Major name
      slide.addText(isCont ? `${major.name}  (Cont'd)` : major.name, {
        x: 0.25, y: 0.68, w: 8, h: 0.85,
        fontSize: 36, bold: true, color: '8B5CF6', fontFace: 'Calibri',
      });

      let tableY: number;

      if (!isCont) {
        // Date range
        slide.addText(
          `${weekToDate(major.devStart)} - ${weekToDate(major.qaStart + major.qaDur)}  ·  ${span} weeks`,
          { x: BX, y: 1.54, w: BW, h: 0.38, fontSize: 13, color: '94A3B8', fontFace: 'Calibri' }
        );

        // Timeline bar
        const BY = 2.04;
        slide.addShape('rect', { x: BX, y: BY, w: BW, h: BH_BAR, fill: { color: '1E293B' }, line: { color: '334155', width: 0.75 } });
        const devW = BW * devFrac;
        slide.addShape('rect', { x: BX, y: BY, w: Math.max(devW, 0.01), h: BH_BAR, fill: { color: '7C3AED' }, line: { color: '7C3AED', width: 0 } });
        if (devW > 0.35) slide.addText('DEV', { x: BX + 0.08, y: BY + 0.09, w: devW - 0.16, h: 0.27, fontSize: 9, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });
        const qaX = BX + BW * (devFrac + gapFrac);
        const qaW = BW * qaFrac;
        slide.addShape('rect', { x: qaX, y: BY, w: Math.max(qaW, 0.01), h: BH_BAR, fill: { color: 'A78BFA' }, line: { color: 'A78BFA', width: 0 } });
        if (qaW > 0.25) slide.addText('QA', { x: qaX + 0.08, y: BY + 0.09, w: qaW - 0.16, h: 0.27, fontSize: 9, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });
        slide.addText(weekToDate(major.devStart), { x: BX, y: BY + BH_BAR + 0.05, w: 2.2, h: 0.22, fontSize: 9, color: '64748B', fontFace: 'Calibri' });
        slide.addText(weekToDate(major.qaStart + major.qaDur), { x: BX + BW - 2.2, y: BY + BH_BAR + 0.05, w: 2.2, h: 0.22, fontSize: 9, color: '64748B', fontFace: 'Calibri', align: 'right' });

        tableY = 2.96;
      } else {
        tableY = 1.62;
      }

      // Compute how many rows fit above the footer line
      const maxRows = Math.floor((FOOTER_Y - tableY) / ROW_H) - 1;
      const visible = items.slice(itemOffset, itemOffset + maxRows);
      itemOffset += visible.length;
      const hasMore = itemOffset < items.length;

      // Build and add table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[][] = [
        [
          { text: 'Item Name', options: { bold: true, color: 'CBD5E1', fill: { color: '1E293B' }, fontSize: 10, fontFace: 'Calibri', valign: 'middle' } },
          { text: 'Status',    options: { bold: true, color: 'CBD5E1', fill: { color: '1E293B' }, fontSize: 10, fontFace: 'Calibri', valign: 'middle', align: 'center' } },
          { text: 'Owner',     options: { bold: true, color: 'CBD5E1', fill: { color: '1E293B' }, fontSize: 10, fontFace: 'Calibri', valign: 'middle' } },
        ],
        ...visible.map((item, i) => {
          const rowFill = i % 2 === 0 ? '0B1120' : '1A2744';
          const sc = statusHex(item.status);
          const owner = [item.primaryOwner, item.secondaryOwner].filter(Boolean).join(' · ');
          return [
            { text: item.name,          options: { color: 'E2E8F0', fill: { color: rowFill }, fontSize: 10,  fontFace: 'Calibri', valign: 'middle' } },
            { text: item.status ?? '—', options: { color: sc,       fill: { color: rowFill }, fontSize: 9.5, fontFace: 'Calibri', valign: 'middle', align: 'center', bold: true } },
            { text: [item.primaryOwner, item.secondaryOwner].filter(Boolean).join(' · '), options: { color: '94A3B8', fill: { color: rowFill }, fontSize: 9.5, fontFace: 'Calibri', valign: 'middle' } },
          ];
          void owner; // suppress unused warning
        }),
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slide.addTable(rows, { x: BX, y: tableY, w: BW, colW: [8.1, 2.5, 2.23], rowH: ROW_H, border: { type: 'solid', color: '334155', pt: 0.5 } } as any);

      // Footer
      if (hasMore) {
        slide.addText('Continued...', {
          x: BX, y: FOOTER_Y, w: BW, h: 0.22,
          fontSize: 9, italic: true, color: '8B5CF6', fontFace: 'Calibri', align: 'center',
        });
      } else {
        slide.addText('Bluecopa · Confidential', {
          x: BX, y: FOOTER_Y, w: BW, h: 0.22,
          fontSize: 8, color: '334155', fontFace: 'Calibri', align: 'center',
        });
      }

      isCont = hasMore;
    }
  }

  await pptx.writeFile({ fileName: 'Bluecopa-Product-Roadmap.pptx' });
}

// ── PDF Export ────────────────────────────────────────────────────────────────
//
// Layout: A4 Landscape (297mm × 210mm)
// Page 1: Cover
// Pages 2+: One or more per Major (continuation pages when items overflow)
// Every page: Bluecopa logo mark + "BLUECOPA" wordmark at top-left

export async function downloadPDF(
  majorReleases: MajorConfig[],
  majorItems: Record<string, ItemInfo[]>
): Promise<void> {
  const activeMajors = majorReleases.filter(m => (majorItems[m.name]?.length ?? 0) > 0);
  const logoDataUrl = await createLogoDataUrl();

  const startWeek = Math.min(...activeMajors.map(m => m.devStart));
  const endWeek   = Math.max(...activeMajors.map(m => m.qaStart + m.qaDur));
  const coverRange = `${weekToMonthYear(startWeek)} - ${weekToMonthYear(endWeek)}`;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210, M = 12;

  const fill  = (hex: string) => { const [r, g, b] = hexToRgb(hex); doc.setFillColor(r, g, b); };
  const stroke = (hex: string) => { const [r, g, b] = hexToRgb(hex); doc.setDrawColor(r, g, b); };
  const color = (hex: string) => { const [r, g, b] = hexToRgb(hex); doc.setTextColor(r, g, b); };

  function addLogoHeader() {
    const LOGO_X = 5, LOGO_Y = 3.5, LOGO_SZ = 9;
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', LOGO_X, LOGO_Y, LOGO_SZ, LOGO_SZ);
    }
    color('FFFFFF');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BLUECOPA', LOGO_X + LOGO_SZ + 2.5, LOGO_Y + LOGO_SZ * 0.67);
  }

  // ── Cover page ──────────────────────────────────────────────────────────────
  fill('0F172A'); doc.rect(0, 0, W, H, 'F');
  fill('8B5CF6'); doc.rect(0, H / 2 - 1.2, W, 2.4, 'F');
  addLogoHeader();

  color('8B5CF6');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('B L U E C O P A', W / 2, H / 2 - 22, { align: 'center' });

  color('F1F5F9');
  doc.setFontSize(36);
  doc.text('Product Roadmap', W / 2, H / 2 + 14, { align: 'center' });

  color('94A3B8');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13);
  doc.text(coverRange, W / 2, H / 2 + 27, { align: 'center' });

  color('475569');
  doc.setFontSize(8);
  doc.text(`Generated on ${todayLabel()}`, W / 2, H - 8, { align: 'center' });

  // ── Per-Major pages (with continuation) ──────────────────────────────────────
  const BX   = M + 2;
  const BW   = W - M * 2 - 2;
  const HDR_H = 8;
  const CX_NAME   = BX;
  const CX_STATUS = BX + 155;
  const CX_OWNER  = BX + 212;
  const TW        = BW;
  const PAGE_BOTTOM = H - 14;

  const LINE_H = 4.8;
  const V_PAD  = 5;
  const MAX_NAME_W = CX_STATUS - CX_NAME - 8;

  interface RowData { item: ItemInfo; lines: string[]; rowH: number; }

  for (const major of activeMajors) {
    const items = majorItems[major.name]!;
    const span    = major.qaStart + major.qaDur - major.devStart;
    const devFrac = major.devDur / span;
    const gapFrac = Math.max(0, (major.qaStart - major.devStart - major.devDur) / span);
    const qaFrac  = major.qaDur / span;

    // Pre-compute row data (needs font to be set for correct metrics)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const allRowData: RowData[] = items.map(item => {
      const lines = doc.splitTextToSize(item.name, MAX_NAME_W) as string[];
      const rowH = Math.max(9, lines.length * LINE_H + V_PAD);
      return { item, lines, rowH };
    });

    let rowOffset = 0;
    let isCont = false;

    while (rowOffset < allRowData.length) {
      doc.addPage();

      // Background + accent stripe
      fill('0F172A'); doc.rect(0, 0, W, H, 'F');
      fill('8B5CF6'); doc.rect(0, 0, 2.5, H, 'F');

      addLogoHeader();

      // Major name
      color('8B5CF6');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(30);
      doc.text(isCont ? `${major.name}  (Cont'd)` : major.name, BX, 22);

      let tableY: number;

      if (!isCont) {
        // Date range
        color('94A3B8');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        doc.text(
          `${weekToDate(major.devStart)} - ${weekToDate(major.qaStart + major.qaDur)}  ·  ${span} weeks`,
          BX, 31
        );

        // Timeline bar
        const BY = 37, BH = 7;
        fill('1E293B'); stroke('334155');
        doc.setLineWidth(0.3);
        doc.roundedRect(BX, BY, BW, BH, 1.5, 1.5, 'FD');

        const devW = BW * devFrac;
        fill('7C3AED');
        doc.roundedRect(BX, BY, Math.max(devW, 0.5), BH, 1.5, 1.5, 'F');
        if (devW > 8) { color('FFFFFF'); doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.text('DEV', BX + 3, BY + 4.8); }

        const qaX = BX + BW * (devFrac + gapFrac);
        const qaW = BW * qaFrac;
        fill('A78BFA');
        doc.roundedRect(qaX, BY, Math.max(qaW, 0.5), BH, 1.5, 1.5, 'F');
        if (qaW > 6) { color('FFFFFF'); doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.text('QA', qaX + 3, BY + 4.8); }

        color('64748B');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.text(weekToDate(major.devStart), BX, BY + BH + 4.5);
        doc.text(weekToDate(major.qaStart + major.qaDur), BX + BW, BY + BH + 4.5, { align: 'right' });

        tableY = 58;
      } else {
        tableY = 28;
      }

      // Collect rows that fit on this page
      const visibleRows: RowData[] = [];
      let usedH = 0;
      for (let i = rowOffset; i < allRowData.length; i++) {
        const row = allRowData[i];
        if (tableY + HDR_H + usedH + row.rowH > PAGE_BOTTOM) break;
        visibleRows.push(row);
        usedH += row.rowH;
      }

      // Safety: if nothing fit (single very-tall row), force-include one row
      if (visibleRows.length === 0 && rowOffset < allRowData.length) {
        visibleRows.push(allRowData[rowOffset]);
      }

      rowOffset += visibleRows.length;
      const hasMore = rowOffset < allRowData.length;

      // Table header
      fill('1E293B');
      doc.rect(CX_NAME, tableY, TW, HDR_H, 'F');
      color('CBD5E1');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.text('Item Name', CX_NAME + 3,   tableY + 5.5);
      doc.text('Status',    CX_STATUS + 3, tableY + 5.5);
      doc.text('Owner',     CX_OWNER + 3,  tableY + 5.5);

      // Data rows
      let curY = tableY + HDR_H;
      visibleRows.forEach((row, i) => {
        const { item, lines, rowH } = row;
        const isBg = i % 2 === 0;

        fill(isBg ? '0F172A' : '1A2744');
        doc.rect(CX_NAME, curY, TW, rowH, 'F');
        stroke('334155'); doc.setLineWidth(0.2);
        doc.rect(CX_NAME, curY, TW, rowH, 'D');

        color('E2E8F0');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.text(lines, CX_NAME + 3, curY + 5);

        const midY = curY + rowH / 2;
        const sc = statusHex(item.status);
        const [sr, sg, sb] = hexToRgb(sc);
        const [bgr, bgg, bgb] = isBg ? [15, 23, 42] : [26, 39, 68];
        doc.setFillColor(
          Math.round(sr * 0.28 + bgr * 0.72),
          Math.round(sg * 0.28 + bgg * 0.72),
          Math.round(sb * 0.28 + bgb * 0.72)
        );
        const pillH = 4.5;
        doc.roundedRect(CX_STATUS + 1, midY - pillH / 2, 52, pillH, 1, 1, 'F');
        doc.setTextColor(sr, sg, sb);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
        doc.text(item.status ?? '—', CX_STATUS + 27, midY + 1.6, { align: 'center' });

        color('94A3B8');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        const owner = [item.primaryOwner, item.secondaryOwner].filter(Boolean).join(' · ');
        doc.text(owner, CX_OWNER + 3, midY + 1.6);

        curY += rowH;
      });

      // Footer
      if (hasMore) {
        color('8B5CF6');
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
        doc.text('Continued...', W / 2, H - 5, { align: 'center' });
      } else {
        color('334155');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.text('Bluecopa · Confidential', W / 2, H - 5, { align: 'center' });
      }

      isCont = hasMore;
    }
  }

  doc.save('Bluecopa-Product-Roadmap.pdf');
}
