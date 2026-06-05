import { useState, useEffect, useMemo, useRef } from "react";
import type { MajorItemInfo } from "../api/major-items";
import { useAuth } from "@/contexts/AuthContext";
import Head from "next/head";
import Link from "next/link";
import type { MajorConfig, ItemInfo } from "../../utils/roadmap-export";

// ── Types ────────────────────────────────────────────────
type Theme = 'dark' | 'light';

interface ThemeColors {
  majorDev: string; majorQA: string; bg: string; surface: string;
  surfaceLight: string; textPrimary: string; textSecondary: string;
  textMuted: string; gridLine: string; accent: string;
  ghost: string; ghostStroke: string; [key: string]: string;
}

interface MajorReleaseConfig {
  name: string; devStart: number; devDur: number;
  qaStart: number; qaDur: number; stagingPointWeek?: number;
}

interface SectionConfig {
  type: string; y: number; label: string; sublabel: string; color: string;
}

interface MonthLabel { week: number; label: string; }

// ── Themes ───────────────────────────────────────────────
const darkTheme: ThemeColors = {
  majorDev: "#8B5CF6", majorQA: "#A78BFA", bg: "#0F172A", surface: "#1E293B",
  surfaceLight: "#334155", textPrimary: "#F1F5F9", textSecondary: "#94A3B8",
  textMuted: "#64748B", gridLine: "rgba(148, 163, 184, 0.08)", accent: "#38BDF8",
  ghost: "rgba(255, 255, 255, 0.08)", ghostStroke: "rgba(255, 255, 255, 0.22)",
};

const lightTheme: ThemeColors = {
  majorDev: "#7C3AED", majorQA: "#8B5CF6", bg: "#F8FAFC", surface: "#FFFFFF",
  surfaceLight: "#E2E8F0", textPrimary: "#0F172A", textSecondary: "#475569",
  textMuted: "#94A3B8", gridLine: "rgba(148, 163, 184, 0.15)", accent: "#0284C7",
  ghost: "rgba(0, 0, 0, 0.05)", ghostStroke: "rgba(0, 0, 0, 0.15)",
};

// ── Constants ────────────────────────────────────────────
const START_DATE = new Date(2026, 2, 9);
const MAY_8 = 10;
const MAJOR_DEV_SHIFT = MAY_8 - 8;
const MAJOR_QA_SHIFT = MAY_8 - 6;
const WEEKS = 78;
const LEFT = 340;       // wider sidebar for full item names
const RIGHT = 20;
const TOP = 44;
const HEADER_H = TOP + 20; // 64px — sticky months + weeks header height
const WW = 48;
const RH = 36;
const RH_ITEM = 46;     // taller rows for 2-line names
const BH = 18;

// ── Helpers ──────────────────────────────────────────────
const getWeekLabel = (i: number): string => {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + i * 7);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getMonthLabel = (i: number): string => {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + i * 7);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const statusColor = (status: string): string => {
  const s = status.toLowerCase();
  if (s === 'done' || s.includes('completed')) return '#22C55E';
  if (s.includes('blocked')) return '#EF4444';
  if (s.includes('testing') || s.includes('in qa')) return '#A78BFA';
  if (s.includes('design in progress')) return '#60A5FA';
  if (s.includes('discovery in progress')) return '#38BDF8';
  if (s.includes('in progress') || s === 'wip') return '#F59E0B';
  return '#94A3B8';
};

// ── Release Data ─────────────────────────────────────────
const buildMajorReleases = (): MajorReleaseConfig[] => {
  const rels: MajorReleaseConfig[] = [];
  rels.push({ name: "M1", devStart: 0, devDur: 4, qaStart: 6, qaDur: 4, stagingPointWeek: 10 });
  rels.push({ name: "M2", devStart: 6, devDur: 4, qaStart: 10, qaDur: 4 });
  for (let i = 2; i < 6; i++) {
    const ds = i * 4 + MAJOR_DEV_SHIFT;
    const qs = i * 4 + 2 + MAJOR_QA_SHIFT;
    rels.push({ name: `M${i + 1}`, devStart: ds, devDur: 4, qaStart: qs, qaDur: 4 });
  }
  const m6End = rels[5].devStart + rels[5].devDur;
  for (let k = 0; k < 12; k++) {
    const ds = m6End + k * 4;
    rels.push({ name: `M${7 + k}`, devStart: ds, devDur: 4, qaStart: ds + 4, qaDur: 4 });
  }
  return rels;
};

const buildOrigMajorReleases = (): MajorReleaseConfig[] => {
  const r: MajorReleaseConfig[] = [];
  r.push({ name: "M1 (orig)", devStart: 0, devDur: 4, qaStart: 4, qaDur: 4 });
  r.push({ name: "M2 (orig)", devStart: 4, devDur: 4, qaStart: 6, qaDur: 4 });
  for (let i = 2; i < 19; i++) {
    r.push({ name: `M${i + 1} (orig)`, devStart: i * 4, devDur: 4, qaStart: i * 4 + 2, qaDur: 4 });
  }
  return r;
};

// ── SVG Components ────────────────────────────────────────
const Bar = ({ x, width, y, height, color, label }: {
  x: number; width: number; y: number; height: number; color: string; label: string;
}) => (
  <g transform={`translate(${x}, ${y})`}>
    <rect x={0} y={0} width={Math.max(width, 2)} height={height} rx={5} ry={5}
      fill={color} style={{ filter: `drop-shadow(0 1px 3px ${color}44)` }} />
    {width > 28 && (
      <text x={width / 2} y={height / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill="#FFF" fontSize={9} fontWeight="600" fontFamily="'DM Sans', sans-serif"
        style={{ pointerEvents: "none" }}>{label}</text>
    )}
  </g>
);

const GhostBar = ({ x, width, y, height, color, label }: {
  x: number; width: number; y: number; height: number; color: string; label?: string;
}) => (
  <g transform={`translate(${x}, ${y})`} opacity={0.35}>
    <rect x={0} y={0} width={Math.max(width, 2)} height={height} rx={5} ry={5}
      fill={color} opacity={0.15} stroke={color} strokeWidth={1.2}
      strokeDasharray="4 3" strokeOpacity={0.45} />
    {label && width > 32 && (
      <text x={width / 2} y={height / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={8} fontWeight="500" fontFamily="'DM Sans', sans-serif"
        opacity={0.8} style={{ pointerEvents: "none" }}>{label}</text>
    )}
  </g>
);

const ReleasePoint = ({ x, y, label, color }: { x: number; y: number; label: string; color?: string }) => {
  const fill = color || "#38BDF8";
  return (
    <g transform={`translate(${x}, ${y})`}>
      <polygon points="0,-10 10,0 0,10 -10,0" fill={fill} opacity={0.15} />
      <polygon points="0,-7 7,0 0,7 -7,0" fill={fill} />
      <text x={0} y={12} textAnchor="middle" fill={fill} fontSize={7.5} fontWeight="600"
        fontFamily="'DM Sans', sans-serif">{label}</text>
    </g>
  );
};

const GhostReleasePoint = ({ x, y, label, color }: { x: number; y: number; label?: string; color?: string }) => {
  const fill = color || "#38BDF8";
  return (
    <g transform={`translate(${x}, ${y})`} opacity={0.25}>
      <polygon points="0,-5 5,0 0,5 -5,0" fill="none" stroke={fill} strokeWidth={1.2} strokeDasharray="2 2" />
      {label && (
        <text x={0} y={12} textAnchor="middle" fill={fill} fontSize={7} fontWeight="500"
          fontFamily="'DM Sans', sans-serif" opacity={0.7}>{label}</text>
      )}
    </g>
  );
};

// ── Main Component ────────────────────────────────────────
export default function CoreProductRoadmap() {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState<Theme>('dark');
  const [majorItems, setMajorItems] = useState<Record<string, MajorItemInfo[]>>({});
  const [downloading, setDownloading] = useState<null | 'pdf' | 'ppt'>(null);

  // refs for header/body/fake-scrollbar horizontal scroll sync
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const fakeScrollRef = useRef<HTMLDivElement>(null);

  // called when the body SVG area scrolls — mirrors to header + fake scrollbar
  const syncFromBody = () => {
    const sl = bodyScrollRef.current?.scrollLeft ?? 0;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = sl;
    if (fakeScrollRef.current) fakeScrollRef.current.scrollLeft = sl;
  };

  // called when the sticky fake scrollbar is dragged — mirrors to body + header
  const syncFromFake = () => {
    const sl = fakeScrollRef.current?.scrollLeft ?? 0;
    if (bodyScrollRef.current) bodyScrollRef.current.scrollLeft = sl;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = sl;
  };

  const handleDownloadPDF = async () => {
    setDownloading('pdf');
    try {
      const { downloadPDF } = await import('../../utils/roadmap-export');
      // Cast to compatible types — MajorItemInfo is a superset of ItemInfo
      downloadPDF(majorReleases as MajorConfig[], majorItems as Record<string, ItemInfo[]>);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPPT = async () => {
    setDownloading('ppt');
    try {
      const { downloadPPT } = await import('../../utils/roadmap-export');
      await downloadPPT(majorReleases as MajorConfig[], majorItems as Record<string, ItemInfo[]>);
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    const load = () =>
      fetch('/api/major-items').then(r => r.json())
        .then(d => { if (d.items) setMajorItems(d.items); }).catch(() => {});
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  const COLORS = theme === 'dark' ? darkTheme : lightTheme;
  const toggleTheme = () => setTheme(p => p === 'dark' ? 'light' : 'dark');
  const majorReleases = useMemo(() => buildMajorReleases(), []);
  const origMajorReleases = useMemo(() => buildOrigMajorReleases(), []);

  const wX = (w: number) => w * WW;
  const timelineWidth = WEEKS * WW + RIGHT;

  // ── Section rows (y positions include TOP offset for SVG coordinate space) ──
  let cy = TOP + 32;
  const sec: SectionConfig[] = [];
  const addSec = (type: string, label: string, sublabel: string, color: string) => {
    sec.push({ type, y: cy, label, sublabel, color });
    cy += RH;
  };
  addSec("major-dev", "Major (Dev)", "4-Week Blocks", COLORS.majorDev);
  addSec("major-qa", "Major (QA)", "4-Week Blocks", COLORS.majorQA);
  cy += 4;
  addSec("major-qa-staging", "Major(QA→Staging)", "", COLORS.majorQA);
  addSec("major-rel", "Major Release Points", "", COLORS.majorQA);
  const separatorY = cy + 8;
  cy = separatorY + 28;

  // ── Item sections ────────────────────────────────────────
  interface ItemSection {
    majorName: string; major: MajorReleaseConfig;
    items: MajorItemInfo[]; headerY: number; itemYs: number[];
  }
  const itemSections: ItemSection[] = [];
  majorReleases.forEach(major => {
    const items = majorItems[major.name] ?? [];
    if (items.length === 0) return;
    const headerY = cy;
    cy += RH;
    const itemYs: number[] = [];
    items.forEach(() => { itemYs.push(cy); cy += RH_ITEM; });
    cy += 6;
    itemSections.push({ majorName: major.name, major, items, headerY, itemYs });
  });

  const chartHeight = cy + 40;
  const bodyHeight = chartHeight - HEADER_H; // body SVG height (header is separate)
  const fr = (t: string) => sec.find(s => s.type === t);

  // ── Month labels ─────────────────────────────────────────
  const months: MonthLabel[] = [];
  let pm = "";
  for (let w = 0; w < WEEKS; w++) {
    const m = getMonthLabel(w);
    if (m !== pm) { months.push({ week: w, label: m }); pm = m; }
  }

  const majorDevGhosts = origMajorReleases.filter(m => m.devStart >= 4);
  const majorQaGhosts = origMajorReleases.filter(m => m.qaStart >= 2);
  const majorRelGhosts = origMajorReleases.filter(m => m.qaStart >= 2);

  const navLinkStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 8,
    border: `1.5px solid ${COLORS.surfaceLight}`,
    background: COLORS.surface, color: COLORS.textSecondary,
    fontWeight: 600, fontSize: 12, textDecoration: 'none',
    display: 'flex', alignItems: 'center', gap: 6,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap' as const, ...extra,
  });

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`.cpr-body-scroll::-webkit-scrollbar{display:none}.cpr-body-scroll{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      </Head>

      {/* Top-left nav */}
      <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 1000, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link href="/delivery-plan" style={navLinkStyle()}>← Delivery Plan</Link>
        <a href="https://docs.google.com/spreadsheets/d/1qrAjggZbtNMZkMMmo7GEuhmz9ch2HhwVdc1Ftpi0GfE/edit?usp=drive_link"
          target="_blank" rel="noopener noreferrer" style={navLinkStyle()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" fill="#34A853" opacity="0.15" />
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#34A853" strokeWidth="1.5" />
            <line x1="3" y1="9" x2="21" y2="9" stroke="#34A853" strokeWidth="1.2" />
            <line x1="3" y1="15" x2="21" y2="15" stroke="#34A853" strokeWidth="1.2" />
            <line x1="9" y1="3" x2="9" y2="21" stroke="#34A853" strokeWidth="1.2" />
            <line x1="15" y1="3" x2="15" y2="21" stroke="#34A853" strokeWidth="1.2" />
          </svg>
          <span style={{ color: COLORS.textPrimary }}>Platform Roadmap Features</span>
        </a>
      </div>

      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{
        position: 'fixed', top: 20, right: 20, zIndex: 1000,
        padding: '8px 16px', borderRadius: 8,
        border: `1.5px solid ${COLORS.surfaceLight}`,
        background: COLORS.surface, color: COLORS.textPrimary,
        fontWeight: 600, fontSize: 12, cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        {theme === 'dark'
          ? <><span style={{ fontSize: 16 }}>☀️</span><span>Light</span></>
          : <><span style={{ fontSize: 16 }}>🌙</span><span>Dark</span></>}
      </button>

      {/* User info */}
      {user && (
        <div style={{
          position: 'fixed', top: 20, right: 130, zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 10,
          background: COLORS.surface, border: `1.5px solid ${COLORS.surfaceLight}`,
          borderRadius: 8, padding: '6px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontFamily: "'DM Sans', sans-serif",
        }}>
          {user.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" width={22} height={22} style={{ borderRadius: '50%' }} />
          )}
          <span style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.displayName ?? user.email}
          </span>
          <button onClick={signOut} style={{
            background: 'none', border: `1px solid ${COLORS.surfaceLight}`,
            borderRadius: 6, padding: '2px 8px',
            color: COLORS.textMuted, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>Sign out</button>
        </div>
      )}

      <div style={{ background: COLORS.bg, minHeight: "100vh", padding: "12px 12px", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: 2340, margin: "0 auto" }}>

          {/* Page header */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <h1 style={{ color: COLORS.textPrimary, fontWeight: 700, margin: 0, fontSize: 28, letterSpacing: "-0.02em" }}>
              Core Product Roadmap
            </h1>
            <p style={{ color: COLORS.textSecondary, fontSize: 14, margin: '6px 0 0' }}>
              Major Release schedule with work items — March 2026 to August 2027
            </p>
          </div>

          {/* Legend + Download buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              {[{ color: COLORS.majorDev, label: "Major (Dev)" }, { color: COLORS.majorQA, label: "Major (QA)" }].map(it => (
                <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 12, height: 10, borderRadius: 3, background: it.color }} />
                  <span style={{ color: COLORS.textSecondary, fontSize: 11 }}>{it.label}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 14, height: 10, borderRadius: 3, background: COLORS.ghost, border: `1.2px dashed ${COLORS.ghostStroke}` }} />
                <span style={{ color: COLORS.textSecondary, fontSize: 11 }}>Original Position</span>
              </div>
            </div>

            {/* Download buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              {/* PDF */}
              <button
                onClick={handleDownloadPDF}
                disabled={downloading !== null}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 16px', borderRadius: 8,
                  border: `1.5px solid ${COLORS.surfaceLight}`,
                  background: downloading === 'pdf' ? COLORS.surfaceLight : COLORS.surface,
                  color: downloading === 'pdf' ? COLORS.textMuted : COLORS.textPrimary,
                  fontWeight: 600, fontSize: 12, cursor: downloading !== null ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease',
                  opacity: downloading !== null && downloading !== 'pdf' ? 0.5 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/>
                </svg>
                {downloading === 'pdf' ? 'Generating…' : 'Download PDF'}
              </button>

              {/* PPT */}
              <button
                onClick={handleDownloadPPT}
                disabled={downloading !== null}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 16px', borderRadius: 8,
                  border: `1.5px solid ${COLORS.surfaceLight}`,
                  background: downloading === 'ppt' ? COLORS.surfaceLight : COLORS.surface,
                  color: downloading === 'ppt' ? COLORS.textMuted : COLORS.textPrimary,
                  fontWeight: 600, fontSize: 12, cursor: downloading !== null ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease',
                  opacity: downloading !== null && downloading !== 'ppt' ? 0.5 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <path d="M8 21h8M12 17v4"/>
                  <path d="M9 9h1.5a1.5 1.5 0 0 1 0 3H9v-3zm0 3v2"/>
                </svg>
                {downloading === 'ppt' ? 'Generating…' : 'Download PPT'}
              </button>
            </div>
          </div>

          {/*
           * Chart container:
           * - direction: rtl  →  browser puts vertical scrollbar on the LEFT
           * - maxHeight + overflowY: auto  →  chart scrolls vertically within this box
           * - overflowX: hidden  →  horizontal scroll is handled by the inner body div only
           */}
          <div style={{
            direction: 'rtl',
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            borderRadius: 12,
            border: `1px solid ${COLORS.surfaceLight}`,
            background: COLORS.surface,
          }}>
            {/* Restore LTR for all content */}
            <div style={{ direction: 'ltr' }}>

              {/*
               * Sticky header row: months + week dates
               * position: sticky; top: 0 keeps this visible while scrolling vertically
               */}
              <div style={{
                position: 'sticky', top: 0, zIndex: 20,
                display: 'flex', background: COLORS.surface,
                borderBottom: `1px solid ${COLORS.surfaceLight}`,
              }}>
                {/* Frozen corner */}
                <div style={{
                  width: LEFT, flexShrink: 0, height: HEADER_H,
                  display: 'flex', alignItems: 'center', paddingLeft: 12,
                  borderRight: `1px solid ${COLORS.surfaceLight}`,
                  background: COLORS.surface,
                }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif" }}>
                    STREAM / ITEM
                  </span>
                </div>

                {/* Header SVG — synced horizontally with body scroll */}
                <div ref={headerScrollRef} style={{ flex: 1, overflow: 'hidden', height: HEADER_H, background: COLORS.surface }}>
                  <svg width={timelineWidth} height={HEADER_H} style={{ display: 'block' }}>
                    {/* Vertical grid lines */}
                    {Array.from({ length: WEEKS }, (_, w) => (
                      <line key={`hg-${w}`} x1={wX(w)} y1={0} x2={wX(w)} y2={HEADER_H} stroke={COLORS.gridLine} />
                    ))}
                    {/* Month bands */}
                    {months.map((m, i) => {
                      const end = months[i + 1] ? months[i + 1].week : WEEKS;
                      const mx = wX(m.week), mw = (end - m.week) * WW;
                      return (
                        <g key={`mo-${i}`}>
                          <rect x={mx} y={TOP - 26} width={mw} height={22} rx={4} fill={COLORS.surfaceLight} opacity={0.5} />
                          <text x={mx + mw / 2} y={TOP - 12} textAnchor="middle" fill={COLORS.textSecondary} fontSize={9.5} fontWeight="600" fontFamily="'DM Sans', sans-serif">{m.label}</text>
                        </g>
                      );
                    })}
                    {/* Week date labels */}
                    {Array.from({ length: WEEKS }, (_, w) => (
                      <text key={`wl-${w}`} x={wX(w) + WW / 2} y={TOP + 4} textAnchor="middle" fill={COLORS.textMuted} fontSize={7.5} fontFamily="'JetBrains Mono', monospace">{getWeekLabel(w)}</text>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Body row: sidebar labels + scrollable chart SVG */}
              <div style={{ display: 'flex' }}>

                {/* Sidebar — section labels and item names */}
                <div style={{
                  width: LEFT, flexShrink: 0,
                  background: COLORS.surface,
                  borderRight: `1px solid ${COLORS.surfaceLight}`,
                  position: 'relative',
                  height: bodyHeight,
                }}>
                  {/* Section labels — positions shifted up by HEADER_H since we removed the header SVG */}
                  {sec.map((s, i) => (
                    <div key={`sl-${i}`} style={{ position: 'absolute', top: s.y - HEADER_H, left: 0, right: 0, height: RH }}>
                      <div style={{ position: 'absolute', left: 6, top: 8, width: 3, height: RH - 16, borderRadius: 1.5, background: s.color, opacity: 0.6 }} />
                      <div style={{ position: 'absolute', left: 16, top: s.sublabel ? RH / 2 - 5 : RH / 2 - 4, color: COLORS.textPrimary, fontSize: 10, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{s.label}</div>
                      {s.sublabel && <div style={{ position: 'absolute', left: 16, top: RH / 2 + 9, color: COLORS.textMuted, fontSize: 8 }}>{s.sublabel}</div>}
                    </div>
                  ))}

                  {/* Items section heading */}
                  <div style={{ position: 'absolute', top: separatorY + 6 - HEADER_H, left: 8, color: COLORS.textMuted, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif" }}>
                    WORK ITEMS BY MAJOR
                  </div>

                  {/* Major headers + item rows */}
                  {itemSections.map(({ majorName, items, headerY, itemYs }, si) => (
                    <div key={`sbl-${si}`}>
                      <div style={{ position: 'absolute', top: headerY - HEADER_H, left: 0, right: 0, height: RH, background: `${COLORS.majorDev}18`, display: 'flex', alignItems: 'center', paddingLeft: 10, gap: 8 }}>
                        <span style={{ color: COLORS.majorDev, fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{majorName}</span>
                        <span style={{ color: COLORS.textMuted, fontSize: 10, fontFamily: "'DM Sans', sans-serif" }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                      </div>
                      {items.map((item, ii) => (
                        <div key={`ibl-${si}-${ii}`} style={{ position: 'absolute', top: itemYs[ii] - HEADER_H, left: 0, right: 0, height: RH_ITEM, borderBottom: `1px solid ${COLORS.surfaceLight}22` }}>
                          <div style={{ position: 'absolute', left: 6, top: 8, width: 3, height: RH_ITEM - 16, borderRadius: 1.5, background: statusColor(item.status ?? '') }} />
                          {/* Item name — no truncation, wraps to 2 lines if needed */}
                          <div style={{
                            position: 'absolute', left: 16, right: 6, top: 4,
                            color: COLORS.textPrimary, fontSize: 9.5, fontWeight: 500,
                            whiteSpace: 'normal', wordBreak: 'break-word',
                            lineHeight: 1.35, overflow: 'hidden',
                            maxHeight: RH_ITEM - 18,
                            fontFamily: "'DM Sans', sans-serif",
                          }}>
                            {item.name}
                          </div>
                          {item.primaryOwner && (
                            <div style={{ position: 'absolute', left: 16, right: 6, bottom: 3, color: COLORS.accent, fontSize: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}>
                              {item.primaryOwner}{item.secondaryOwner ? ` · ${item.secondaryOwner}` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Body SVG — horizontal scroll; native scrollbar hidden (fake one is sticky-bottom) */}
                <div ref={bodyScrollRef} className="cpr-body-scroll" style={{ flex: 1, overflowX: 'auto' }} onScroll={syncFromBody}>
                  {/*
                   * viewBox starts at y=HEADER_H so all chart content uses the same
                   * original y-coordinates as before — no need to recalculate positions.
                   */}
                  <svg
                    viewBox={`0 ${HEADER_H} ${timelineWidth} ${bodyHeight}`}
                    width={timelineWidth}
                    height={bodyHeight}
                    style={{ display: 'block' }}
                  >
                    {/* Vertical grid lines (body portion only) */}
                    {Array.from({ length: WEEKS }, (_, w) => (
                      <line key={`g-${w}`} x1={wX(w)} y1={HEADER_H} x2={wX(w)} y2={chartHeight} stroke={COLORS.gridLine} />
                    ))}

                    {/* Section row backgrounds */}
                    {sec.map((s, i) => (
                      <rect key={`sb-${i}`} x={0} y={s.y} width={timelineWidth} height={RH} fill={i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent"} />
                    ))}

                    {/* Items/streams separator line */}
                    <line x1={0} y1={separatorY} x2={timelineWidth} y2={separatorY} stroke={COLORS.surfaceLight} strokeWidth={1.5} />

                    {/* Ghost Dev bars (original baseline) */}
                    {fr("major-dev") && majorDevGhosts.map((m, i) => (
                      <GhostBar key={`gmd-${i}`} x={wX(m.devStart)} width={m.devDur * WW - 3} y={fr("major-dev")!.y + (RH - BH) / 2} height={BH} color={COLORS.majorDev} label={m.name} />
                    ))}

                    {/* Ghost QA bars (original baseline) */}
                    {fr("major-qa") && majorQaGhosts.map((m, i) => (
                      <GhostBar key={`gmq-${i}`} x={wX(m.qaStart)} width={m.qaDur * WW - 3} y={fr("major-qa")!.y + (RH - BH) / 2} height={BH} color={COLORS.majorQA} label={`QA ${m.name}`} />
                    ))}

                    {/* Major Dev bars */}
                    {fr("major-dev") && majorReleases.map((m, i) => {
                      if (m.devStart >= WEEKS) return null;
                      const vd = Math.min(m.devDur, WEEKS - m.devStart);
                      return <Bar key={`md-${i}`} x={wX(m.devStart)} width={vd * WW - 3} y={fr("major-dev")!.y + (RH - BH) / 2} height={BH} color={COLORS.majorDev} label={m.name} />;
                    })}

                    {/* Major QA bars */}
                    {fr("major-qa") && majorReleases.map((m, i) => {
                      if (m.qaStart >= WEEKS) return null;
                      const vq = Math.min(m.qaDur, WEEKS - m.qaStart);
                      return <Bar key={`mq-${i}`} x={wX(m.qaStart)} width={vq * WW - 3} y={fr("major-qa")!.y + (RH - BH) / 2} height={BH} color={COLORS.majorQA} label={`QA ${m.name}`} />;
                    })}

                    {/* Major QA→Staging release points */}
                    {fr("major-qa-staging") && majorReleases.map((m, i) => {
                      const sw = m.stagingPointWeek ?? (m.qaStart + 3);
                      if (sw > WEEKS) return null;
                      return <ReleasePoint key={`mqs-${i}`} x={wX(sw) - 2} y={fr("major-qa-staging")!.y + RH / 2} label={`Stg ${m.name}`} color={COLORS.majorQA} />;
                    })}

                    {/* Previous-plan ghost staging points */}
                    {fr("major-qa-staging") && majorReleases.map((m, i) => {
                      const psw = (m.stagingPointWeek ?? (m.qaStart + 3)) - 1;
                      if (psw < 0 || psw > WEEKS) return null;
                      return <GhostReleasePoint key={`pmqs-${i}`} x={wX(psw) - 2} y={fr("major-qa-staging")!.y + RH / 2} label={`Stg ${m.name}`} color={COLORS.majorQA} />;
                    })}

                    {/* Major Release Points */}
                    {fr("major-rel") && majorReleases.map((m, i) => {
                      const rw = m.qaStart + m.qaDur;
                      if (rw > WEEKS) return null;
                      return <ReleasePoint key={`mrp-${i}`} x={wX(rw) - 2} y={fr("major-rel")!.y + RH / 2} label={m.name} color={COLORS.majorQA} />;
                    })}

                    {/* Original-plan ghost release points */}
                    {fr("major-rel") && majorRelGhosts.map((m, i) => {
                      const rw = m.qaStart + m.qaDur;
                      if (rw > WEEKS) return null;
                      return <GhostReleasePoint key={`gmrp-${i}`} x={wX(rw) - 2} y={fr("major-rel")!.y + RH / 2} label={m.name} color={COLORS.majorQA} />;
                    })}

                    {/* Previous-plan ghost release points */}
                    {fr("major-rel") && majorReleases.map((m, i) => {
                      const prw = m.qaStart + m.qaDur - 1;
                      if (prw < 0 || prw > WEEKS) return null;
                      return <GhostReleasePoint key={`pmrp-${i}`} x={wX(prw) - 2} y={fr("major-rel")!.y + RH / 2} label={m.name} color={COLORS.majorQA} />;
                    })}

                    {/* Work item rows */}
                    {itemSections.map(({ majorName, major, items, headerY, itemYs }, si) => {
                      const barX = wX(major.devStart);
                      const barEnd = Math.min((major.qaStart + major.qaDur) * WW, timelineWidth);
                      const barW = barEnd - barX - 4;
                      return (
                        <g key={`isvg-${si}`}>
                          {/* Major group header row */}
                          <rect x={0} y={headerY} width={timelineWidth} height={RH} fill={`${COLORS.majorDev}0C`} />
                          <text x={barX + Math.max(barW, 0) / 2} y={headerY + RH / 2 + 1}
                            textAnchor="middle" dominantBaseline="middle"
                            fill={COLORS.majorDev} fontSize={11} fontWeight="700" fontFamily="'DM Sans', sans-serif">
                            ◆ {majorName}
                          </text>
                          {/* Per-item status bar */}
                          {items.map((item, ii) => {
                            const iy = itemYs[ii];
                            const sc = statusColor(item.status ?? '');
                            const clampedW = Math.max(barW, 4);
                            return (
                              <g key={`irow-${si}-${ii}`}>
                                <rect x={0} y={iy} width={timelineWidth} height={RH_ITEM} fill={ii % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent"} />
                                <rect x={barX} y={iy + (RH_ITEM - 14) / 2} width={clampedW} height={14} rx={3} fill={sc} opacity={0.18} />
                                <rect x={barX} y={iy + (RH_ITEM - 14) / 2} width={clampedW} height={14} rx={3} fill="none" stroke={sc} strokeWidth={1} opacity={0.4} />
                                {item.status && clampedW > 60 && (
                                  <text x={barX + clampedW / 2} y={iy + RH_ITEM / 2 + 0.5}
                                    textAnchor="middle" dominantBaseline="middle"
                                    fill={sc} fontSize={8} fontWeight="600" fontFamily="'DM Sans', sans-serif">
                                    {item.status.length > 26 ? item.status.slice(0, 26) + '…' : item.status}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/*
               * Sticky fake horizontal scrollbar — position: sticky; bottom: 0 keeps it
               * pinned to the bottom of the visible chart area regardless of vertical scroll.
               * It mirrors bodyScrollRef scroll position bidirectionally via syncFromFake.
               */}
              <div style={{ position: 'sticky', bottom: 0, zIndex: 15, display: 'flex', background: COLORS.surface, borderTop: `1px solid ${COLORS.surfaceLight}` }}>
                <div style={{ width: LEFT, flexShrink: 0 }} />
                <div
                  ref={fakeScrollRef}
                  style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', height: 14 }}
                  onScroll={syncFromFake}
                >
                  <div style={{ width: timelineWidth, height: 1 }} />
                </div>
              </div>
            </div>
          </div>

          <p style={{ textAlign: "center", color: COLORS.textMuted, fontSize: 10.5, marginTop: 20, fontFamily: "'DM Sans', sans-serif" }}>
            Core Product Roadmap · Bluecopa · March 2026 – August 2027 · Ghost outlines = original planned positions
          </p>
        </div>
      </div>
    </>
  );
}
