export interface ReleaseConfig {
  name: string;
  devStart: number | null;
  devDur: number | null;
  qaStart: number | null;
  qaDur: number | null;
  label?: string;
  isQALegacy?: boolean;
  isCombined?: boolean;
}

export interface MajorReleaseConfig {
  name: string;
  devStart: number;
  devDur: number;
  qaStart: number;
  qaDur: number;
}

export interface HotPatchConfig {
  name: string;
  devStart: number;
  devDur: number;
  qaStart: number;
  qaDur: number;
}

export interface SectionConfig {
  type: string;
  y: number;
  label: string;
  sublabel: string;
  color: string;
}

export interface OverlapZone {
  start: number;
  end: number;
}

export interface MonthLabel {
  week: number;
  label: string;
}

export type ActiveTiers = {
  hot: boolean;
  dot: boolean;
  major: boolean;
};
