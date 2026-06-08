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

export type ExportTheme = 'dark' | 'light';

// ── Theme palettes ────────────────────────────────────────────────────────────

interface ThemePalette {
  pageBg:        string;
  accentStripe:  string;
  majorLabel:    string;
  dateText:      string;
  wordmark:      string; // "BLUECOPA" text beside the logo
  divider:       string;
  tblHdrBg:      string;
  tblHdrText:    string;
  tblRow1:       string;
  tblRow2:       string;
  tblBorder:     string;
  itemText:      string;
  ownerText:     string;
  barBg:         string;
  barBorder:     string;
  coverBg:       string;
  coverTitle:    string;
  coverSubtitle: string;
  contFooter:    string;
  confFooter:    string;
  barDateText:   string;
}

const DARK: ThemePalette = {
  pageBg:        '0F172A',
  accentStripe:  '8B5CF6',
  majorLabel:    '8B5CF6',
  dateText:      '94A3B8',
  wordmark:      'FFFFFF',
  divider:       '1E293B',
  tblHdrBg:      '1E293B',
  tblHdrText:    'CBD5E1',
  tblRow1:       '0B1120',
  tblRow2:       '1A2744',
  tblBorder:     '334155',
  itemText:      'E2E8F0',
  ownerText:     '94A3B8',
  barBg:         '1E293B',
  barBorder:     '334155',
  coverBg:       '0F172A',
  coverTitle:    'F1F5F9',
  coverSubtitle: '94A3B8',
  contFooter:    '8B5CF6',
  confFooter:    '334155',
  barDateText:   '64748B',
};

const LIGHT: ThemePalette = {
  pageBg:        'FFFFFF',
  accentStripe:  '7C3AED',
  majorLabel:    '6D28D9',
  dateText:      '475569',
  wordmark:      '2563EB',  // blue in light version as requested
  divider:       'CBD5E1',
  tblHdrBg:      'E2E8F0',
  tblHdrText:    '1E293B',
  tblRow1:       'FFFFFF',
  tblRow2:       'F1F5F9',
  tblBorder:     'CBD5E1',
  itemText:      '1E293B',
  ownerText:     '475569',
  barBg:         'F1F5F9',
  barBorder:     'CBD5E1',
  coverBg:       'F8FAFC',
  coverTitle:    '0F172A',
  coverSubtitle: '475569',
  contFooter:    '7C3AED',
  confFooter:    '94A3B8',
  barDateText:   '475569',
};

// ── Shared helpers ────────────────────────────────────────────────────────────

const START_DATE = new Date(2026, 2, 9);

function weekToDate(week: number): string {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + week * 7);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function weekToMonthYear(week: number): string {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + week * 7);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

// Returns the Bluecopa logo as a PNG data URL.
// Tries /bluecopa-logo.png first; falls back to a canvas-drawn approximation.
// In light theme the logo is composited onto a white canvas so the dark
// background is replaced with white.
async function createLogoDataUrl(theme: ExportTheme = 'dark'): Promise<string> {
  const path = theme === 'light' ? '/bluecopa-logo-light.png' : '/bluecopa-logo.png';
  try {
    const resp = await fetch(path);
    if (resp.ok) {
      const blob = await resp.blob();
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(drawLogoFallback(theme));
        reader.readAsDataURL(blob);
      });
    }
  } catch { /* fall through */ }
  return drawLogoFallback(theme);
}

function drawLogoFallback(theme: ExportTheme = 'dark'): string {
  try {
    const S = 256;
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = theme === 'light' ? '#FFFFFF' : '#081525';
    ctx.beginPath();
    const r = 40;
    ctx.moveTo(r, 0); ctx.lineTo(S - r, 0); ctx.quadraticCurveTo(S, 0, S, r);
    ctx.lineTo(S, S - r); ctx.quadraticCurveTo(S, S, S - r, S);
    ctx.lineTo(r, S); ctx.quadraticCurveTo(0, S, 0, S - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(S * 0.46, S * 0.54, S * 0.40, 0, Math.PI * 2); ctx.fillStyle = '#1535A8'; ctx.fill();
    ctx.beginPath(); ctx.arc(S * 0.61, S * 0.37, S * 0.20, 0, Math.PI * 2); ctx.fillStyle = '#081525'; ctx.fill();
    ctx.beginPath(); ctx.arc(S * 0.65, S * 0.32, S * 0.09, 0, Math.PI * 2); ctx.fillStyle = '#5BA8F5'; ctx.fill();
    ctx.beginPath(); ctx.arc(S * 0.46, S * 0.57, S * 0.24, 0, Math.PI * 2); ctx.fillStyle = '#4B9CF0'; ctx.fill();
    ctx.beginPath(); ctx.arc(S * 0.46, S * 0.57, S * 0.11, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    return canvas.toDataURL('image/png');
  } catch { return ''; }
}

// ── PPT Export ────────────────────────────────────────────────────────────────

export async function downloadPPT(
  majorReleases: MajorConfig[],
  majorItems: Record<string, ItemInfo[]>,
  theme: ExportTheme = 'dark'
): Promise<void> {
  const P = theme === 'light' ? LIGHT : DARK;
  const activeMajors = majorReleases.filter(m => (majorItems[m.name]?.length ?? 0) > 0);
  const logoDataUrl = await createLogoDataUrl(theme);

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
      fontSize: 13, bold: true, color: P.wordmark, fontFace: 'Calibri', valign: 'middle',
    });
  }

  // ── Cover slide ──────────────────────────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: P.coverBg };
  cover.addShape('rect', { x: 0, y: 3.45, w: 13.33, h: 0.06, fill: { color: '8B5CF6' }, line: { color: '8B5CF6', width: 0 } });
  addLogoHeader(cover);
  cover.addText('Product Roadmap', {
    x: 0.5, y: 1.55, w: 12.33, h: 1.65, fontSize: 54, bold: true,
    color: P.coverTitle, fontFace: 'Calibri', align: 'center',
  });
  cover.addText(coverRange, {
    x: 0.5, y: 3.6, w: 12.33, h: 0.6, fontSize: 20,
    color: P.coverSubtitle, fontFace: 'Calibri', align: 'center',
  });
  cover.addText(`Generated on ${todayLabel()}`, {
    x: 0.5, y: 7.05, w: 12.33, h: 0.3, fontSize: 10,
    color: P.confFooter, fontFace: 'Calibri', align: 'center',
  });

  // ── Per-Major slides ─────────────────────────────────────────────────────────
  const BX = 0.25, BW = 12.83, BH_BAR = 0.44;
  const ROW_H = 0.36;
  const FOOTER_Y = 7.30;

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
      slide.background = { color: P.pageBg };

      // Left accent stripe
      slide.addShape('rect', { x: 0, y: 0, w: 0.1, h: 7.5, fill: { color: P.accentStripe }, line: { color: P.accentStripe, width: 0 } });

      addLogoHeader(slide);

      // Thin divider under header
      slide.addShape('rect', { x: 0.18, y: 0.58, w: 13.0, h: 0.025, fill: { color: P.divider }, line: { color: P.divider, width: 0 } });

      // Major name
      slide.addText(isCont ? `${major.name}  (Cont'd)` : major.name, {
        x: BX, y: 0.68, w: 8, h: 0.85, fontSize: 36, bold: true, color: P.majorLabel, fontFace: 'Calibri',
      });

      let tableY: number;

      if (!isCont) {
        slide.addText(
          `${weekToDate(major.devStart)} - ${weekToDate(major.qaStart + major.qaDur)}  ·  ${span} weeks`,
          { x: BX, y: 1.54, w: BW, h: 0.38, fontSize: 13, color: P.dateText, fontFace: 'Calibri' }
        );

        const BY = 2.04;
        slide.addShape('rect', { x: BX, y: BY, w: BW, h: BH_BAR, fill: { color: P.barBg }, line: { color: P.barBorder, width: 0.75 } });

        const devW = BW * devFrac;
        slide.addShape('rect', { x: BX, y: BY, w: Math.max(devW, 0.01), h: BH_BAR, fill: { color: '7C3AED' }, line: { color: '7C3AED', width: 0 } });
        if (devW > 0.35) slide.addText('DEV', { x: BX + 0.08, y: BY + 0.09, w: devW - 0.16, h: 0.27, fontSize: 9, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });

        const qaX = BX + BW * (devFrac + gapFrac);
        const qaW = BW * qaFrac;
        slide.addShape('rect', { x: qaX, y: BY, w: Math.max(qaW, 0.01), h: BH_BAR, fill: { color: 'A78BFA' }, line: { color: 'A78BFA', width: 0 } });
        if (qaW > 0.25) slide.addText('QA', { x: qaX + 0.08, y: BY + 0.09, w: qaW - 0.16, h: 0.27, fontSize: 9, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });

        slide.addText(weekToDate(major.devStart), { x: BX, y: BY + BH_BAR + 0.05, w: 2.2, h: 0.22, fontSize: 9, color: P.barDateText, fontFace: 'Calibri' });
        slide.addText(weekToDate(major.qaStart + major.qaDur), { x: BX + BW - 2.2, y: BY + BH_BAR + 0.05, w: 2.2, h: 0.22, fontSize: 9, color: P.barDateText, fontFace: 'Calibri', align: 'right' });

        tableY = 2.96;
      } else {
        tableY = 1.62;
      }

      const maxRows = Math.floor((FOOTER_Y - tableY) / ROW_H) - 1;
      const visible = items.slice(itemOffset, itemOffset + maxRows);
      itemOffset += visible.length;
      const hasMore = itemOffset < items.length;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[][] = [
        [
          { text: 'Item Name', options: { bold: true, color: P.tblHdrText, fill: { color: P.tblHdrBg }, fontSize: 10, fontFace: 'Calibri', valign: 'middle' } },
          { text: 'Status',    options: { bold: true, color: P.tblHdrText, fill: { color: P.tblHdrBg }, fontSize: 10, fontFace: 'Calibri', valign: 'middle', align: 'center' } },
          { text: 'Owner',     options: { bold: true, color: P.tblHdrText, fill: { color: P.tblHdrBg }, fontSize: 10, fontFace: 'Calibri', valign: 'middle' } },
        ],
        ...visible.map((item, i) => {
          const rowFill = i % 2 === 0 ? P.tblRow1 : P.tblRow2;
          const sc = statusHex(item.status);
          const owner = [item.primaryOwner, item.secondaryOwner].filter(Boolean).join(' · ');
          return [
            { text: item.name,          options: { color: P.itemText,  fill: { color: rowFill }, fontSize: 10,  fontFace: 'Calibri', valign: 'middle' } },
            { text: item.status ?? '—', options: { color: sc,          fill: { color: rowFill }, fontSize: 9.5, fontFace: 'Calibri', valign: 'middle', align: 'center', bold: true } },
            { text: owner,              options: { color: P.ownerText, fill: { color: rowFill }, fontSize: 9.5, fontFace: 'Calibri', valign: 'middle' } },
          ];
        }),
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slide.addTable(rows, { x: BX, y: tableY, w: BW, colW: [8.1, 2.5, 2.23], rowH: ROW_H, border: { type: 'solid', color: P.tblBorder, pt: 0.5 } } as any);

      if (hasMore) {
        slide.addText('Continued...', { x: BX, y: FOOTER_Y, w: BW, h: 0.22, fontSize: 9, italic: true, color: P.contFooter, fontFace: 'Calibri', align: 'center' });
      } else {
        slide.addText('Bluecopa · Confidential', { x: BX, y: FOOTER_Y, w: BW, h: 0.22, fontSize: 8, color: P.confFooter, fontFace: 'Calibri', align: 'center' });
      }

      isCont = hasMore;
    }
  }

  const suffix = theme === 'light' ? '-Light' : '-Dark';
  await pptx.writeFile({ fileName: `Bluecopa-Product-Roadmap${suffix}.pptx` });
}

// ── PDF Export ────────────────────────────────────────────────────────────────

export async function downloadPDF(
  majorReleases: MajorConfig[],
  majorItems: Record<string, ItemInfo[]>,
  theme: ExportTheme = 'dark'
): Promise<void> {
  const P = theme === 'light' ? LIGHT : DARK;
  const activeMajors = majorReleases.filter(m => (majorItems[m.name]?.length ?? 0) > 0);
  const logoDataUrl = await createLogoDataUrl(theme);

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
    if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', LOGO_X, LOGO_Y, LOGO_SZ, LOGO_SZ);
    color(P.wordmark);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('BLUECOPA', LOGO_X + LOGO_SZ + 2.5, LOGO_Y + LOGO_SZ * 0.67);
  }

  // ── Cover page ──────────────────────────────────────────────────────────────
  fill(P.coverBg); doc.rect(0, 0, W, H, 'F');
  fill('8B5CF6'); doc.rect(0, H / 2 - 1.2, W, 2.4, 'F');
  addLogoHeader();

  color('8B5CF6');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('B L U E C O P A', W / 2, H / 2 - 22, { align: 'center' });

  color(P.coverTitle);
  doc.setFontSize(36);
  doc.text('Product Roadmap', W / 2, H / 2 + 14, { align: 'center' });

  color(P.coverSubtitle);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13);
  doc.text(coverRange, W / 2, H / 2 + 27, { align: 'center' });

  color(P.confFooter);
  doc.setFontSize(8);
  doc.text(`Generated on ${todayLabel()}`, W / 2, H - 8, { align: 'center' });

  // ── Per-Major pages ───────────────────────────────────────────────────────────
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

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const allRowData: RowData[] = items.map(item => {
      const lines = doc.splitTextToSize(item.name, MAX_NAME_W) as string[];
      const rowH = Math.max(9, lines.length * LINE_H + V_PAD);
      return { item, lines, rowH };
    });

    let rowOffset = 0;
    let isCont = false;

    while (rowOffset < allRowData.length) {
      doc.addPage();

      fill(P.pageBg); doc.rect(0, 0, W, H, 'F');
      fill(P.accentStripe); doc.rect(0, 0, 2.5, H, 'F');

      addLogoHeader();

      color(P.majorLabel);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(30);
      doc.text(isCont ? `${major.name}  (Cont'd)` : major.name, BX, 22);

      let tableY: number;

      if (!isCont) {
        color(P.dateText);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        doc.text(
          `${weekToDate(major.devStart)} - ${weekToDate(major.qaStart + major.qaDur)}  ·  ${span} weeks`,
          BX, 31
        );

        const BY = 37, BH = 7;
        fill(P.barBg); stroke(P.barBorder); doc.setLineWidth(0.3);
        doc.roundedRect(BX, BY, BW, BH, 1.5, 1.5, 'FD');

        const devW = BW * devFrac;
        fill('7C3AED'); doc.roundedRect(BX, BY, Math.max(devW, 0.5), BH, 1.5, 1.5, 'F');
        if (devW > 8) { color('FFFFFF'); doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.text('DEV', BX + 3, BY + 4.8); }

        const qaX = BX + BW * (devFrac + gapFrac);
        const qaW = BW * qaFrac;
        fill('A78BFA'); doc.roundedRect(qaX, BY, Math.max(qaW, 0.5), BH, 1.5, 1.5, 'F');
        if (qaW > 6) { color('FFFFFF'); doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.text('QA', qaX + 3, BY + 4.8); }

        color(P.barDateText);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.text(weekToDate(major.devStart), BX, BY + BH + 4.5);
        doc.text(weekToDate(major.qaStart + major.qaDur), BX + BW, BY + BH + 4.5, { align: 'right' });

        tableY = 58;
      } else {
        tableY = 28;
      }

      const visibleRows: RowData[] = [];
      let usedH = 0;
      for (let i = rowOffset; i < allRowData.length; i++) {
        const row = allRowData[i];
        if (tableY + HDR_H + usedH + row.rowH > PAGE_BOTTOM) break;
        visibleRows.push(row);
        usedH += row.rowH;
      }
      if (visibleRows.length === 0 && rowOffset < allRowData.length) {
        visibleRows.push(allRowData[rowOffset]);
      }

      rowOffset += visibleRows.length;
      const hasMore = rowOffset < allRowData.length;

      // Table header
      fill(P.tblHdrBg); doc.rect(CX_NAME, tableY, TW, HDR_H, 'F');
      color(P.tblHdrText);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.text('Item Name', CX_NAME + 3,   tableY + 5.5);
      doc.text('Status',    CX_STATUS + 3, tableY + 5.5);
      doc.text('Owner',     CX_OWNER + 3,  tableY + 5.5);

      // Data rows
      let curY = tableY + HDR_H;
      visibleRows.forEach((row, i) => {
        const { item, lines, rowH } = row;
        const isBg = i % 2 === 0;

        fill(isBg ? P.tblRow1 : P.tblRow2);
        doc.rect(CX_NAME, curY, TW, rowH, 'F');
        stroke(P.tblBorder); doc.setLineWidth(0.2);
        doc.rect(CX_NAME, curY, TW, rowH, 'D');

        color(P.itemText);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.text(lines, CX_NAME + 3, curY + 5);

        const midY = curY + rowH / 2;
        const sc = statusHex(item.status);
        const [sr, sg, sb] = hexToRgb(sc);
        const [bgr, bgg, bgb] = hexToRgb(isBg ? P.tblRow1 : P.tblRow2);
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

        color(P.ownerText);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        const owner = [item.primaryOwner, item.secondaryOwner].filter(Boolean).join(' · ');
        doc.text(owner, CX_OWNER + 3, midY + 1.6);

        curY += rowH;
      });

      if (hasMore) {
        color(P.contFooter);
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
        doc.text('Continued...', W / 2, H - 5, { align: 'center' });
      } else {
        color(P.confFooter);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.text('Bluecopa · Confidential', W / 2, H - 5, { align: 'center' });
      }

      isCont = hasMore;
    }
  }

  const suffix = theme === 'light' ? '-Light' : '-Dark';
  doc.save(`Bluecopa-Product-Roadmap${suffix}.pdf`);
}
