import type { Preset } from './types';


export const defaultPreset: Preset = {
theme: 'system',
mode: 'arc',
openingDirection: 'bottom',
states: 16,
canvas: { width: 512, height: 512, background: 'transparent' },
arc: { radius: 200, thickness: 24, roundCaps: true },
bar: { orientation: 'horizontal', direction: 'ltr', length: 420, thickness: 24, cornerRadius: 12, squareEnds: false },
base: { enabled: true, color: 'rgba(50,50,50,1)', opacity: 0.6, preset: 'dark', sameGeometryAsMain: true, thicknessScale: 1 },
main: {
fillMode: 'gradient3',
colorSolid: '#00C2FF',
gradient: { stops: [ { pos:0, color:'#00E0FF' }, { pos:0.5, color:'#00FF88' }, { pos:1, color:'#FFD400' } ] },
segmented: false,
segments: 16,
segmentGap: 2,
frame: { enabled: false, color: 'rgba(255,255,255,0.9)', thickness: 1.35 },
},
warnings: {
start: { enabled: false, lengthPct: 0.15, mode: 'solid', colorSolid: '#00E0FF', gradient: { stops: [ {pos:0, color:'#00E0FF'}, {pos:1, color:'#00B2FF'} ] } },
end: { enabled: true, lengthPct: 0.20, mode: 'solid', colorSolid: '#FF3B30', gradient: { stops: [ {pos:0, color:'#FFA500'}, {pos:1, color:'#FF3B30'} ] } },
},
glow: { enabled: true, strength: 18, thickness: 1.25 },
usability: { showGrid: false },
namePrefix: 'gauge',
presetName: 'Default 270°',
};