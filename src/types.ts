export type Theme = 'light' | 'dark' | 'system';

// -----------------------------------------------------------------------------
// Core visual elements

export type BarOrientation = 'horizontal' | 'vertical';
export type BarDirection = 'ltr' | 'rtl' | 'ttb' | 'btt';
export type OpeningDirection = 'top' | 'right' | 'bottom' | 'left';

export interface GradientStop {
  pos: number;
  color: string;
}

export interface ArcOptions {
  radius: number;
  thickness: number;
  roundCaps: boolean;
}

// -----------------------------------------------------------------------------
// Gauge components

export interface BarOptions {
  orientation: BarOrientation;
  direction: BarDirection; // left→right, right→left, top→bottom, bottom→top
  length: number;
  thickness: number;
  cornerRadius: number;
  squareEnds: boolean; // force square corners
}

export interface BaseStroke {
  enabled: boolean;
  color: string;
  opacity: number; // 0..1
  preset: 'light' | 'dark';
  sameGeometryAsMain: boolean; // use same track geometry as main
  thicknessScale: number; // scales base track thickness
}

export interface FrameOptions {
  enabled: boolean;
  color: string;
  thickness: number; // × main thickness
}

export interface MainStroke {
  fillMode: 'solid' | 'gradient2' | 'gradient3';
  colorSolid: string;
  gradient: { stops: GradientStop[] };
  segmented: boolean;
  segments: number; // 1..100
  segmentGap: number; // px gap between segments
  frame: FrameOptions;
}

export interface WarningSide {
  enabled: boolean;
  lengthPct: number; // 0..0.5 of total arc/bar
  mode: 'solid' | 'gradient2';
  colorSolid: string;
  gradient: { stops: GradientStop[] };
}

export interface Warnings {
  start: WarningSide;
  end: WarningSide;
}

export interface CanvasOptions {
  width: number;
  height: number;
  background: string;
}

// -----------------------------------------------------------------------------
// Glow configuration

export interface GlowSettings {
  enabled: boolean;
  mode?: 'soft' | 'ring' | 'legacy';
  perSegment?: boolean; // if true, applies glow per individual segment
  strength: number;
  thickness?: number;

  // Soft halo
  haloInner?: boolean;
  haloOuter?: boolean;
  haloThickness?: number;

  // Ring glow
  ringPasses?: number;
  ringThickness?: number;

  // Legacy double-ring glow
  legacyOuterThickness?: number;
}

// -----------------------------------------------------------------------------
// Global preset definition

export interface Preset {
  theme: Theme;
  mode: 'arc' | 'bar';
  openingDirection: OpeningDirection; // center of the 90° gap
  states: number; // for smooth mode export

  canvas: CanvasOptions;
  arc: ArcOptions;
  bar: BarOptions;
  base: BaseStroke;
  main: MainStroke;
  warnings: Warnings;
  glow: GlowSettings; // ✅ now uses the full interface
  usability: { showGrid: boolean };

  namePrefix: string;
  presetName: string;
}
