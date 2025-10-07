import type { Preset } from './types';

export const defaultPreset: Preset = {
  theme: 'system',
  mode: 'arc',
  openingDirection: 'bottom',
  states: 16, // ✅ default free-state count for continuous mode
  canvas: { width: 512, height: 512, background: 'transparent' },
  arc: { radius: 200, thickness: 24, roundCaps: true },
  bar: {
    orientation: 'horizontal',
    direction: 'ltr',
    length: 420,
    thickness: 24,
    cornerRadius: 12,
    squareEnds: false
  },
  base: {
    enabled: true,
    color: 'rgba(50,50,50,1)',
    opacity: 0.6,
    preset: 'dark',
    sameGeometryAsMain: true,
    thicknessScale: 1
  },
  main: {
    fillMode: 'gradient3',
    colorSolid: '#00C2FF',
    gradient: {
      stops: [
        { pos: 0, color: '#00E0FF' },
        { pos: 0.5, color: '#00FF88' },
        { pos: 1, color: '#FFD400' }
      ]
    },
    segmented: false,
    segments: 30, // ✅ neutral default so segmented mode works but doesn’t limit continuous
    segmentGap: 2,
      frame: {
    enabled: false,
    color: "#ffffff",
    thickness: 1,
  },
  },
  warnings: {
    start: {
      enabled: false,
      lengthPct: 0.15,
      mode: 'solid',
      colorSolid: '#00E0FF',
      gradient: {
        stops: [
          { pos: 0, color: '#00E0FF' },
          { pos: 1, color: '#00B2FF' }
        ]
      }
    },
    end: {
      enabled: true,
      lengthPct: 0.2,
      mode: 'solid',
      colorSolid: '#FF3B30',
      gradient: {
        stops: [
          { pos: 0, color: '#FFA500' },
          { pos: 1, color: '#FF3B30' }
        ]
      }
    }
  },

// -----------------------------------------------------------------------------
// Glow options
// Supports three modes:
//  • "soft"   — diffuse halo glow (inner/outer control)
//  • "ring"   — crisp additive rings (custom passes + thickness)
//  • "legacy" — classic double-ring look
//
// Extra option:
//  • perSegment — when segmented + round caps off, glow can appear per segment
// -----------------------------------------------------------------------------
glow: {
  enabled: true,
  mode: "soft",               // "soft" | "ring" | "legacy"
  perSegment: false,          // if true, glow is drawn around each segment
  strength: 12,               // overall glow brightness (0–60)
  thickness: 1.25,            // base glow thickness multiplier

  // Soft halo parameters
  haloInner: false,           // enable subtle inner fade
  haloOuter: true,            // enable outer halo (default visible)
  haloThickness: 1.25,        // thickness multiplier for soft mode

  // Ring mode parameters
  ringPasses: 3,              // number of ring repetitions
  ringThickness: 1.25,        // ring line thickness multiplier

  // Legacy mode parameters
  legacyOuterThickness: 2,    // outer ring spacing
},

usability: {
  showGrid: false,
},
namePrefix: "gauge",
presetName: "Default",

  
};
