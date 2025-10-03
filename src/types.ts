export type Theme = 'light' | 'dark' | 'system';


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


export interface Warnings { start: WarningSide; end: WarningSide; }


export interface CanvasOptions { width: number; height: number; background: string; }


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
glow: { enabled: boolean; strength: number; thickness: number };
usability: { showGrid: boolean };
namePrefix: string;
presetName: string;
}