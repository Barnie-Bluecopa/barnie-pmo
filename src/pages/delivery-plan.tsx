import { useState } from "react";
import Head from "next/head";

// ── Type Definitions ─────────────────────────────────────
interface ReleaseConfig {
  name: string;
  devStart: number | null;
  devDur: number | null;
  qaStart: number | null;
  qaDur: number | null;
  label?: string;
  isQALegacy?: boolean;
  isCombined?: boolean;
  releasePointWeek?: number;
}

interface MajorReleaseConfig {
  name: string;
  devStart: number;
  devDur: number;
  qaStart: number;
  qaDur: number;
}

interface HotPatchConfig {
  name: string;
  devStart: number;
  devDur: number;
  qaStart: number;
  qaDur: number;
}

interface SectionConfig {
  type: string;
  y: number;
  label: string;
  sublabel: string;
  color: string;
}

interface OverlapZone {
  start: number;
  end: number;
}

interface MonthLabel {
  week: number;
  label: string;
}

type ActiveTiers = {
  hot: boolean;
  dot: boolean;
  major: boolean;
};

// ── Theme Types ──────────────────────────────────────────
type Theme = 'dark' | 'light';

interface ThemeColors {
  hotPatch: string;
  hotPatchQA: string;
  dotDev: string;
  dotQA: string;
  majorDev: string;
  majorQA: string;
  qaGeneric: string;
  bg: string;
  surface: string;
  surfaceLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  gridLine: string;
  accent: string;
  overlap: string;
  overlapBorder: string;
  ghost: string;
  ghostStroke: string;
  [key: string]: string;
}

// ── Theme Definitions ────────────────────────────────────
const darkTheme: ThemeColors = {
  hotPatch: "#FF6B4A",
  hotPatchQA: "#FF8F75",
  dotDev: "#10B981",
  dotQA: "#34D399",
  majorDev: "#8B5CF6",
  majorQA: "#A78BFA",
  qaGeneric: "#F59E0B",
  bg: "#0F172A",
  surface: "#1E293B",
  surfaceLight: "#334155",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  gridLine: "rgba(148, 163, 184, 0.08)",
  accent: "#38BDF8",
  overlap: "rgba(239, 68, 68, 0.15)",
  overlapBorder: "rgba(239, 68, 68, 0.4)",
  ghost: "rgba(255, 255, 255, 0.08)",
  ghostStroke: "rgba(255, 255, 255, 0.22)",
};

const lightTheme: ThemeColors = {
  hotPatch: "#EF4444",
  hotPatchQA: "#F87171",
  dotDev: "#059669",
  dotQA: "#10B981",
  majorDev: "#7C3AED",
  majorQA: "#8B5CF6",
  qaGeneric: "#D97706",
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceLight: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  gridLine: "rgba(148, 163, 184, 0.15)",
  accent: "#0284C7",
  overlap: "rgba(239, 68, 68, 0.1)",
  overlapBorder: "rgba(239, 68, 68, 0.3)",
  ghost: "rgba(0, 0, 0, 0.05)",
  ghostStroke: "rgba(0, 0, 0, 0.15)",
};

// ── Timeline Constants ─────────────────────────────────────
const START_DATE = new Date(2026, 2, 9);
const MAY_8 = 9;
const DOT_SHIFT = MAY_8 - 6;
const MAJOR_DEV_SHIFT = MAY_8 - 8;
const MAJOR_QA_SHIFT = MAY_8 - 6;

const HOT_PATCH_WEEKS = 43;
const WEEKS = 44;

const LEFT = 150;
const RIGHT = 20;
const TOP = 60;
const WW = 48;
const RH = 46;
const BH = 24;
const GAP = 14;

// ── Helper Functions ───────────────────────────────────────
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

// ── Original Data (Ghost Rendering) ───────────────────────────────
// Original timeline (no delays) for ghost rendering
const origDotReleases: ReleaseConfig[] = [
  // QA Spr 16 original: spans Mar 9 (week 0) to Mar 22 (week 1), release point at Mar 22 (week 2)
  { name: "QA Spr 16 (orig)", devStart: null, devDur: null, qaStart: 0, qaDur: 2, label: "v1.16", isQALegacy: true },
  // Spr 17 original: dev starts Mar 23 (week 2), QA Mar 23 (week 2) ends Apr 5 (week 3)
  { name: "Spr 17 (orig)", devStart: 2, devDur: 2, qaStart: 2, qaDur: 2, label: "v1.17" },
  // Spr 18 original: dev starts Apr 6 (week 4), QA Apr 6 (week 4) ends Apr 19 (week 5)
  { name: "Spr 18 (orig)", devStart: 4, devDur: 2, qaStart: 4, qaDur: 2, label: "v1.18" },
  // Spr 19 original: dev starts Apr 6 (week 4), ends Apr 13 (week 5)
  { name: "Spr 19 (orig)", devStart: 4, devDur: 2, qaStart: 6, qaDur: 2, label: "v1.19" },
  // Spr 20-36 original: 2-week cadence
  ...Array.from({ length: 17 }, (_, i): ReleaseConfig => {
    const sp = 20 + i;
    return { name: `Spr ${sp} (orig)`, devStart: (6 + i * 2), devDur: 2, qaStart: (8 + i * 2), qaDur: 2, label: `v1.${sp}` };
  }),
];

const buildOrigMajorReleases = (): MajorReleaseConfig[] => {
  const releases: MajorReleaseConfig[] = [];
  // Original M1: Dev weeks 0-4, QA weeks 4-7 (Apr 6 - May 3)
  releases.push({ name: "M1 (orig)", devStart: 0, devDur: 4, qaStart: 4, qaDur: 4 });
  // Original M2: Dev weeks 4-8 (Apr 6 - May 4), QA weeks 6-10
  releases.push({ name: "M2 (orig)", devStart: 4, devDur: 4, qaStart: 6, qaDur: 4 });
  for (let i = 2; i < 9; i++) {
    const n = i + 1;
    const devStart = i * 4;
    releases.push({ name: `M${n} (orig)`, devStart, devDur: 4, qaStart: devStart + 2, qaDur: 4 });
  }
  return releases;
};
const origMajorReleases: MajorReleaseConfig[] = buildOrigMajorReleases();

// ── Revised Data ──────────────────────────────────────────
const dotReleases: ReleaseConfig[] = [
  // QA Spr 16: Spans Mar 9 (week 0) to Mar 22 (week 1), release point at Apr 19 (week 6)
  { name: "QA Spr 16", devStart: null, devDur: null, qaStart: 0, qaDur: 2, label: "v1.16", isQALegacy: true, releasePointWeek: 6 },
  // Spr 17 Dev: Mar 9 (week 0) to Mar 22 (week 1)
  { name: "Spr 17", devStart: 0, devDur: 2, qaStart: null, qaDur: null, label: "v1.17" },
  // Spr 18 Dev: Mar 23 (week 2) to Apr 5 (week 3)
  { name: "Spr 18", devStart: 2, devDur: 2, qaStart: null, qaDur: null, label: "v1.18" },
  // Spr 19 Dev: Starts Apr 20 (week 6), ends May 10 (week 8)
  { name: "Spr 19", devStart: 6, devDur: 3, qaStart: 9, qaDur: 2, label: "v1.19" },
  // QA Spr 17+18 combined: Starts Apr 20 (week 6), ends May 10 (week 8)
  { name: "QA Spr 17+18", devStart: null, devDur: null, qaStart: 6, qaDur: 3, label: "v1.17+18", isCombined: true },
  // Spr 20+ (unchanged, start from week 9 = May 11 onwards)
  ...Array.from({ length: 17 }, (_, i): ReleaseConfig => {
    const sp = 20 + i;
    return {
      name: `Spr ${sp}`,
      devStart: (6 + i * 2) + DOT_SHIFT,
      devDur: 2,
      qaStart: (8 + i * 2) + DOT_SHIFT,
      qaDur: 2,
      label: `v1.${sp}`,
    };
  }),
];

const buildRevisedMajorReleases = (): MajorReleaseConfig[] => {
  const rels: MajorReleaseConfig[] = [];
  // M1: Dev weeks 0-4, QA starts Apr 20 (week 6) ends May 10 (week 8) - delayed
  rels.push({ name: "M1", devStart: 0, devDur: 4, qaStart: 6, qaDur: 3 });
  // M2: Dev starts Apr 20 (week 6), ends May 10 (week 8) - delayed
  rels.push({ name: "M2", devStart: 6, devDur: 3, qaStart: 9, qaDur: 4 });
  for (let i = 2; i < 6; i++) {
    const n = i + 1;
    const origDevStart = i * 4;
    const ds = origDevStart + MAJOR_DEV_SHIFT;
    const qs = origDevStart + 2 + MAJOR_QA_SHIFT;
    rels.push({ name: `M${n}`, devStart: ds, devDur: 4, qaStart: qs, qaDur: 4 });
  }
  const m6DevEnd = rels[5].devStart + rels[5].devDur;
  for (let k = 0; k < 5; k++) {
    const n = 7 + k;
    const ds = m6DevEnd + k * 4;
    rels.push({ name: `M${n}`, devStart: ds, devDur: 4, qaStart: ds + 4, qaDur: 4 });
  }
  return rels;
};
const majorReleases: MajorReleaseConfig[] = buildRevisedMajorReleases();

const releases = {
  hotPatches: Array.from({ length: HOT_PATCH_WEEKS }, (_, i): HotPatchConfig => ({
    name: `W${i + 1}`,
    devStart: i + 0.1,
    devDur: 0.8,
    qaStart: i + 0.1,
    qaDur: 0.8,
  })),
  dotReleases,
  majorReleases,
};

// ── Component Props Types ──────────────────────────────────
interface BarProps {
  x: number;
  width: number;
  y: number;
  height: number;
  color: string;
  label: string;
  sublabel?: string;
  radius?: number;
  opacity?: number;
  dashed?: boolean;
}

interface GhostBarProps {
  x: number;
  width: number;
  y: number;
  height: number;
  color: string;
  label?: string;
}

interface OverlapZoneProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Reusable Components ───────────────────────────────────
const Bar = ({ x, width, y, height, color, label, sublabel, radius = 5, opacity = 1, dashed }: BarProps) => (
  <g transform={`translate(${x}, ${y})`}>
    <rect
      x={0} y={0}
      width={Math.max(width, 2)} height={height}
      rx={radius} ry={radius}
      fill={color} opacity={opacity}
      stroke={dashed ? "rgba(255,255,255,0.35)" : "none"}
      strokeWidth={dashed ? 1.5 : 0}
      strokeDasharray={dashed ? "5 3" : "none"}
      style={{ filter: `drop-shadow(0 1px 3px ${color}44)` }}
    />
    {width > 28 && (
      <text
        x={width / 2} y={height / 2 + (sublabel ? -4 : 1)}
        textAnchor="middle" dominantBaseline="middle"
        fill="#FFF" fontSize={10} fontWeight="600" fontFamily="'DM Sans', sans-serif"
        style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
    )}
    {sublabel && width > 60 && (
      <text
        x={width / 2} y={height / 2 + 10}
        textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,0.65)" fontSize={8.5} fontFamily="'DM Sans', sans-serif"
        style={{ pointerEvents: "none" }}
      >
        {sublabel}
      </text>
    )}
  </g>
);

const GhostBar = ({ x, width, y, height, color, label }: GhostBarProps) => (
  <g transform={`translate(${x}, ${y})`} opacity={0.35}>
    <rect
      x={0} y={0}
      width={Math.max(width, 2)} height={height}
      rx={5} ry={5}
      fill={color} opacity={0.15}
      stroke={color} strokeWidth={1.2} strokeDasharray="4 3" strokeOpacity={0.45}
    />
    {label && width > 32 && (
      <text
        x={width / 2} y={height / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={8} fontWeight="500" fontFamily="'DM Sans', sans-serif"
        opacity={0.8} style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
    )}
  </g>
);

const OverlapZone = ({ x, y, width, height }: OverlapZoneProps) => (
  <rect x={x} y={y} width={width} height={height} rx={4}
    fill="rgba(239, 68, 68, 0.15)" stroke="rgba(239, 68, 68, 0.4)" strokeWidth={1} strokeDasharray="6 3" />
);

const ReleasePoint = ({ x, y, label, color }: { x: number; y: number; label: string; color?: string }) => {
  const fill = color || "#38BDF8";
  return (
    <g transform={`translate(${x}, ${y})`}>
      <polygon points="0,-7 7,0 0,7 -7,0" fill={fill} />
      <text x={0} y={14} textAnchor="middle" fill={fill} fontSize={8.5} fontWeight="600"
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

const Legend = ({ theme }: { theme: ThemeColors }) => {
  const items = [
    { color: theme.hotPatch, label: "Hot Patch (Dev)" },
    { color: theme.hotPatchQA, label: "Hot Patch (QA)" },
    { color: theme.dotDev, label: "Dot Release (Dev)" },
    { color: theme.dotQA, label: "Dot Release (QA)" },
    { color: theme.majorDev, label: "Major (Dev)" },
    { color: theme.majorQA, label: "Major (QA)" },
    { color: theme.overlapBorder, label: "QA Overlap", shape: "zone" as const },
    { color: "#FFFFFF", label: "Original Position", shape: "ghost" as const },
  ];

  return (
    <div className="flex gap-4 justify-center flex-wrap p-3">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5">
          {it.shape === "zone" ? (
            <div className="w-4 h-3 rounded" style={{ background: theme.overlap, border: `1.5px dashed ${theme.overlapBorder}` }} />
          ) : it.shape === "ghost" ? (
            <div className="w-4 h-3 rounded" style={{ background: theme.ghost, border: `1.2px dashed ${theme.ghostStroke}` }} />
          ) : (
            <div className="w-3.5 h-3 rounded" style={{ background: it.color }} />
          )}
          <span style={{ color: theme.textSecondary, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
};

// ── Theme Toggle Component ────────────────────────────────
const ThemeToggle = ({ theme, toggleTheme }: { theme: Theme; toggleTheme: () => void }) => (
  <button
    onClick={toggleTheme}
    style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 1000,
      padding: "8px 16px",
      borderRadius: 8,
      border: `1.5px solid ${theme === 'dark' ? darkTheme.surfaceLight : lightTheme.surfaceLight}`,
      background: theme === 'dark' ? darkTheme.surface : lightTheme.surface,
      color: theme === 'dark' ? darkTheme.textPrimary : lightTheme.textPrimary,
      fontWeight: 600,
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      alignItems: "center",
      gap: 8,
      transition: "all 0.2s ease",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    }}
  >
    {theme === 'dark' ? (
      <>
        <span style={{ fontSize: 16 }}>☀️</span>
        <span>Light</span>
      </>
    ) : (
      <>
        <span style={{ fontSize: 16 }}>🌙</span>
        <span>Dark</span>
      </>
    )}
  </button>
);

// ── Main Component ─────────────────────────────────────────
export default function DeliveryPlan() {
  const [active, setActive] = useState<ActiveTiers>({ hot: true, dot: true, major: true });
  const [theme, setTheme] = useState<Theme>('dark');

  const COLORS = theme === 'dark' ? darkTheme : lightTheme;

  const toggle = (key: keyof ActiveTiers) => setActive((prev: ActiveTiers) => {
    const next = { ...prev, [key]: !prev[key] };
    if (!next.hot && !next.dot && !next.major) return prev;
    return next;
  });

  const setAll = () => setActive({ hot: true, dot: true, major: true });
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const timelineWidth = WEEKS * WW + RIGHT;
  const wX = (w: number) => w * WW;

  const show = active;
  const allActive = show.hot && show.dot && show.major;
  const multiActive = [show.hot, show.dot, show.major].filter(Boolean).length >= 2;

  let cy = TOP + 32;
  const sec: SectionConfig[] = [];
  const add = (type: string, label: string, sublabel: string, color: string) => {
    sec.push({ type, y: cy, label, sublabel, color });
    cy += RH;
  };

  if (show.hot) add("hot-dev", "Hot Patch (Dev)", "Weekly", COLORS.hotPatch);
  if (show.dot) add("dot-dev", "Dot Release (Dev)", "Fortnightly", COLORS.dotDev);
  if (show.major) add("major-dev", "Major (Dev)", "4-Week Blocks", COLORS.majorDev);
  if (show.hot || show.dot || show.major) cy += GAP;
  const separatorY = cy - GAP / 2;

  if (show.hot) add("hot-qa", "Hot Patch (QA)", "Weekly", COLORS.hotPatchQA);
  if (show.dot) add("dot-qa", "Dot Release (QA)", "Dev − 1", COLORS.dotQA);
  if (show.major) add("major-qa", "Major (QA)", "4-Week Blocks", COLORS.majorQA);
  if (show.dot) { cy += 4; add("dot-rel", "Dot Release Points", "", COLORS.accent); }
  if (show.major) { if (!show.dot) cy += 4; add("major-rel", "Major Release Points", "", COLORS.majorQA); }

  const chartHeight = cy + 40;
  const fr = (t: string) => sec.find(s => s.type === t);

  const months: MonthLabel[] = [];
  let pm = "";
  for (let w = 0; w < WEEKS; w++) {
    const m = getMonthLabel(w);
    if (m !== pm) {
      months.push({ week: w, label: m });
      pm = m;
    }
  }

  const overlapZones: OverlapZone[] = [];
  if (show.hot && show.dot && fr("hot-qa") && fr("dot-qa")) {
    const allDotQA = releases.dotReleases.filter(d => d.qaStart !== null);
    releases.hotPatches.forEach((hp) => {
      allDotQA.forEach((dq) => {
        const oStart = Math.max(hp.qaStart!, dq.qaStart!);
        const oEnd = Math.min(hp.qaStart! + hp.qaDur!, dq.qaStart! + dq.qaDur!);
        if (oEnd > oStart) overlapZones.push({ start: oStart, end: oEnd });
      });
    });
  }

  const dotDevGhosts = origDotReleases.filter(d => d.devStart !== null && d.devStart >= 4);
  const dotQaGhosts = origDotReleases.filter(d => d.qaStart !== null && d.qaStart >= 2 && !d.isQALegacy);
  const dotRelGhosts = origDotReleases.filter(d => d.qaStart !== null && d.label);
  const majorDevGhosts = origMajorReleases.filter(m => m.devStart >= 4);
  const majorQaGhosts = origMajorReleases.filter(m => m.qaStart >= 2);
  const majorRelGhosts = origMajorReleases.filter(m => m.qaStart >= 2);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      <div style={{ background: COLORS.bg, minHeight: "100vh", padding: "24px 12px", fontFamily: "'DM Sans', sans-serif" }} className="responsive-container">
        <div style={{ maxWidth: 2340, margin: "0 auto" }} className="w-full px-2 md:px-4">
          <div className="text-center mb-4 md:mb-6">
            <h1 style={{ color: COLORS.textPrimary, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }} className="text-xl md:text-3xl">
              Three-Tier Release Plan / Resource Overlap View
            </h1>
            <p style={{ color: COLORS.textSecondary, marginTop: 6 }} className="text-sm md:text-base">
              Dev and QA teams grouped to visualize concurrent workload across Hot Patches, Dot Releases & Major Releases
            </p>
            <p style={{ color: "#F59E0B", marginTop: 4, fontWeight: 600 }} className="text-xs md:text-sm">
              Revised: Spr 19 Dev, M2 Dev, QA Spr 17+18, QA M1 ends W8 (May 10) — downstream items shifted accordingly
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-3 flex-wrap">
            <button onClick={setAll} style={{
              borderRadius: 8, border: allActive ? "none" : `1.5px solid ${COLORS.surfaceLight}`,
              background: allActive ? COLORS.accent : COLORS.surface,
              color: allActive ? COLORS.bg : COLORS.textSecondary,
              fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s ease",
              boxShadow: allActive ? `0 3px 10px ${COLORS.accent}44` : "none",
            }} className="text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2">
              All Tiers
            </button>
            {[
              { id: "hot" as const, label: "Hot Patches", color: COLORS.hotPatch },
              { id: "dot" as const, label: "Dot Releases", color: COLORS.dotDev },
              { id: "major" as const, label: "Major Releases", color: COLORS.majorDev },
            ].map((tab) => {
              const on = show[tab.id];
              return (
                <button key={tab.id} onClick={() => toggle(tab.id)} style={{
                  borderRadius: 8,
                  border: on ? `1.5px solid ${tab.color}` : `1.5px solid ${COLORS.surfaceLight}`,
                  background: on ? `${tab.color}22` : COLORS.surface,
                  color: on ? tab.color : COLORS.textMuted,
                  fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s ease",
                  boxShadow: on ? `0 2px 8px ${tab.color}33` : "none",
                }} className="text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2">
                  {tab.label}
                </button>
              );
            })}
          </div>

          <Legend theme={COLORS} />

          <div className="rounded-xl shadow-lg" style={{ background: COLORS.surface, border: `1px solid ${COLORS.surfaceLight}`, display: 'flex', overflow: 'hidden' }}>
            {/* Left sticky sidebar */}
            <div style={{ width: LEFT, flexShrink: 0, background: COLORS.surface, borderRight: `1px solid ${COLORS.surfaceLight}`, height: chartHeight, position: 'relative', zIndex: 10 }}>
              {sec.map((s, i) => (
                <div key={`sidebar-${i}`} style={{ position: 'absolute', top: s.y, left: 0, right: 0, height: RH }}>
                  <div style={{ position: 'absolute', left: 6, top: 8, width: 3, height: RH-16, borderRadius: 1.5, background: s.color, opacity: 0.6 }} />
                  <div style={{ position: 'absolute', left: 16, top: RH/2 - (s.sublabel ? 5 : 0), color: COLORS.textPrimary, fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{s.label}</div>
                  {s.sublabel && <div style={{ position: 'absolute', left: 16, top: RH/2 + 9, color: COLORS.textMuted, fontSize: 9, fontFamily: "'DM Sans', sans-serif" }}>{s.sublabel}</div>}
                </div>
              ))}
            </div>
            {/* Right scrollable timeline */}
            <div style={{ flex: 1, overflowX: 'auto' }}>
            <svg
              width="100%"
              height={chartHeight}
              viewBox={`0 0 ${timelineWidth} ${chartHeight}`}
              style={{ display: "block", minWidth: timelineWidth }}
            >
              {/* Grid */}
              {Array.from({ length: WEEKS }, (_, w) => (
                <line key={`g-${w}`} x1={wX(w)} y1={TOP} x2={wX(w)} y2={chartHeight - 10} stroke={COLORS.gridLine} />
              ))}

              {/* Month headers */}
              {months.map((m, i) => {
                const end = months[i + 1] ? months[i + 1].week : WEEKS;
                const x = wX(m.week), w = (end - m.week) * WW;
                return (
                  <g key={`mo-${i}`}>
                    <rect x={x} y={TOP - 26} width={w} height={22} rx={4} fill={COLORS.surfaceLight} opacity={0.5} />
                    <text x={x + w / 2} y={TOP - 12} textAnchor="middle" fill={COLORS.textSecondary} fontSize={10.5} fontWeight="600" fontFamily="'DM Sans', sans-serif">{m.label}</text>
                  </g>
                );
              })}

              {/* Week labels */}
              {Array.from({ length: WEEKS }, (_, w) => (
                <text key={`wl-${w}`} x={wX(w) + WW / 2} y={TOP + 4} textAnchor="middle" fill={COLORS.textMuted} fontSize={8} fontFamily="'JetBrains Mono', monospace">{getWeekLabel(w)}</text>
              ))}

              {/* Team separator */}
              {multiActive && (
                <g>
                  <line x1={8} y1={separatorY} x2={timelineWidth - 8} y2={separatorY} stroke={COLORS.surfaceLight} strokeWidth={1.5} />
                  <rect x={10} y={separatorY - 10} width={66} height={20} rx={4} fill={COLORS.surface} />
                  <text x={43} y={separatorY + 1} textAnchor="middle" fill={COLORS.textMuted} fontSize={9} fontWeight="700" fontFamily="'DM Sans', sans-serif">DEV ↔ QA</text>
                </g>
              )}

              {/* Section rows */}
              {sec.map((s, i) => (
                <g key={`s-${i}`}>
                  <rect x={0} y={s.y} width={timelineWidth} height={RH} fill={i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent"} />
                </g>
              ))}

              {/* Overlap zones */}
              {show.hot && show.dot && overlapZones.map((oz, i) => {
                const hqr = fr("hot-qa"), dqr = fr("dot-qa");
                if (!hqr || !dqr) return null;
                const topY = Math.min(hqr.y, dqr.y);
                const bottomY = Math.max(hqr.y, dqr.y) + RH;
                return <OverlapZone key={`oz-${i}`} x={wX(oz.start) - 2} y={topY} width={(oz.end - oz.start) * WW + 4} height={bottomY - topY} />;
              })}

              {/* Ghost Bars */}
              {show.dot && fr("dot-dev") && dotDevGhosts.map((d, i) => (
                <GhostBar key={`gdd-${i}`} x={wX(d.devStart!)} width={d.devDur! * WW - 3}
                  y={fr("dot-dev")!.y + (RH - BH) / 2} height={BH} color={COLORS.dotDev} label={d.name} />
              ))}

              {show.dot && fr("dot-qa") && dotQaGhosts.map((d, i) => (
                <GhostBar key={`gdq-${i}`} x={wX(d.qaStart!)} width={d.qaDur! * WW - 3}
                  y={fr("dot-qa")!.y + (RH - BH) / 2} height={BH} color={COLORS.dotQA} label={`QA ${d.name}`} />
              ))}

              {show.major && fr("major-dev") && majorDevGhosts.map((m, i) => (
                <GhostBar key={`gmd-${i}`} x={wX(m.devStart)} width={m.devDur * WW - 3}
                  y={fr("major-dev")!.y + (RH - BH) / 2} height={BH} color={COLORS.majorDev} label={m.name} />
              ))}

              {show.major && fr("major-qa") && majorQaGhosts.map((m, i) => (
                <GhostBar key={`gmq-${i}`} x={wX(m.qaStart)} width={m.qaDur * WW - 3}
                  y={fr("major-qa")!.y + (RH - BH) / 2} height={BH} color={COLORS.majorQA} label={`QA ${m.name}`} />
              ))}

              {/* Active Bars */}
              {show.hot && fr("hot-dev") && releases.hotPatches.map((hp, i) => (
                <Bar key={`hd-${i}`} x={wX(hp.devStart)} width={hp.devDur * WW} y={fr("hot-dev")!.y + (RH - BH) / 2} height={BH}
                  color={COLORS.hotPatch} label={hp.name} />
              ))}

              {show.hot && fr("hot-qa") && releases.hotPatches.map((hp, i) => (
                <Bar key={`hq-${i}`} x={wX(hp.qaStart)} width={hp.qaDur * WW} y={fr("hot-qa")!.y + (RH - BH) / 2} height={BH}
                  color={COLORS.hotPatchQA} label={hp.name} />
              ))}

              {show.dot && fr("dot-dev") && releases.dotReleases.filter(d => d.devStart !== null).map((d, i) => (
                <Bar key={`dd-${i}`} x={wX(d.devStart!)} width={d.devDur! * WW - 3} y={fr("dot-dev")!.y + (RH - BH) / 2} height={BH}
                  color={COLORS.dotDev} label={d.name} />
              ))}

              {show.dot && fr("dot-qa") && releases.dotReleases.filter(d => d.qaStart !== null).map((d, i) => (
                <Bar key={`dq-${i}`} x={wX(d.qaStart!)} width={d.qaDur! * WW - 3} y={fr("dot-qa")!.y + (RH - BH) / 2} height={BH}
                  color={d.isQALegacy ? "#6EE7B7" : d.isCombined ? "#2DD4BF" : COLORS.dotQA}
                  label={d.isQALegacy ? d.name : d.isCombined ? d.name : `QA ${d.name}`}
                  opacity={d.isQALegacy ? 0.85 : 1} dashed={d.isQALegacy} />
              ))}

              {/* Release Points */}
              {show.dot && fr("dot-rel") && releases.dotReleases.filter(d => d.qaStart !== null && d.label).map((d, i) => {
                const relWeek = d.releasePointWeek ?? (d.qaStart! + d.qaDur!);
                if (relWeek > WEEKS) return null;
                return <ReleasePoint key={`rp-${i}`} x={wX(relWeek) - 2} y={fr("dot-rel")!.y + RH / 2} label={d.label!} />;
              })}

              {show.dot && fr("dot-rel") && dotRelGhosts.map((d, i) => {
                const relWeek = d.releasePointWeek ?? (d.qaStart! + d.qaDur!);
                if (relWeek > WEEKS) return null;
                return <GhostReleasePoint key={`grp-${i}`} x={wX(relWeek) - 2} y={fr("dot-rel")!.y + RH / 2} label={d.label} />;
              })}

              {/* Major Releases */}
              {show.major && fr("major-dev") && releases.majorReleases.map((m, i) => {
                if (m.devStart >= WEEKS) return null;
                const visibleDur = Math.min(m.devDur, WEEKS - m.devStart);
                return (
                  <Bar key={`md-${i}`} x={wX(m.devStart)} width={visibleDur * WW - 3} y={fr("major-dev")!.y + (RH - BH) / 2} height={BH}
                    color={COLORS.majorDev} label={m.name} />
                );
              })}

              {show.major && fr("major-qa") && releases.majorReleases.map((m, i) => {
                if (m.qaStart >= WEEKS) return null;
                const visibleDur = Math.min(m.qaDur, WEEKS - m.qaStart);
                return (
                  <Bar key={`mq-${i}`} x={wX(m.qaStart)} width={visibleDur * WW - 3} y={fr("major-qa")!.y + (RH - BH) / 2} height={BH}
                    color={COLORS.majorQA} label={`QA ${m.name}`} />
                );
              })}

              {show.major && fr("major-rel") && releases.majorReleases.map((m, i) => {
                const relWeek = m.qaStart + m.qaDur;
                if (relWeek > WEEKS) return null;
                return <ReleasePoint key={`mrp-${i}`} x={wX(relWeek) - 2} y={fr("major-rel")!.y + RH / 2} label={m.name} color={COLORS.majorQA} />;
              })}

              {show.major && fr("major-rel") && majorRelGhosts.map((m, i) => {
                const relWeek = m.qaStart + m.qaDur;
                if (relWeek > WEEKS) return null;
                return <GhostReleasePoint key={`gmrp-${i}`} x={wX(relWeek) - 2} y={fr("major-rel")!.y + RH / 2} label={m.name} color={COLORS.majorQA} />;
              })}
            </svg>
            </div>
          </div>

          <p style={{ textAlign: "center", color: COLORS.textMuted, fontSize: 10.5, marginTop: 20, fontFamily: "'DM Sans', sans-serif" }} className="text-xs md:text-sm">
            Sprint Planning · Revised April 28, 2026 · Bluecopa · March 2026 – December 2026 · Ghost outlines = original planned positions
          </p>
        </div>
      </div>
    </>
  );
}
