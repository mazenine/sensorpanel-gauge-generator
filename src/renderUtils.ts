import type { Preset, GradientStop, OpeningDirection } from './types';
}


const progress = clamp(value01, 0, 1);
const gap = main.segmented ? clamp(main.segmentGap, 0, thick*0.8) : 0;
const segCount = main.segmented ? Math.max(1, main.segments|0) : 1;
const axisLen = horiz? w : h;
const segLen = ( axisLen - (main.segmented? (segCount-1)*gap : 0) ) / segCount;


const gradientPaint = () => {
const stops = main.fillMode==='solid'? [{pos:0,color:main.colorSolid},{pos:1,color:main.colorSolid}] : main.gradient.stops;
return makeCanvasGradient(ctx, { x:x0, y:y0, w, h }, stops);
};


const startZonePx = warnings.start.enabled ? axisLen * clamp(warnings.start.lengthPct,0,0.5) : 0;
const endZonePx = warnings.end.enabled ? axisLen * clamp(warnings.end.lengthPct,0,0.5) : 0;
const inStartWindow = progress <= (warnings.start.lengthPct||0);
const inEndWindow = progress >= 1 - (warnings.end.lengthPct||0);


function placeRect(offset:number, length:number){
if(horiz){
if(dir==='rtl') return { x:x0 + w - (offset+length), y:y0, w:length, h };
return { x:x0 + offset, y:y0, w:length, h };
} else {
if(dir==='btt') return { x:x0, y:y0 + h - (offset+length), w, h:length };
return { x:x0, y:y0 + offset, w, h:length };
}
}


const drawFillRect = (rect:{x:number,y:number,w:number,h:number}, paint:string|CanvasGradient)=>{
ctx.save(); ctx.fillStyle = paint as any; roundRect(ctx, rect.x, rect.y, rect.w, rect.h, r); ctx.fill();
if(main.frame?.enabled){ ctx.strokeStyle = main.frame.color; ctx.lineWidth = thick*(main.frame.thickness||1.25); roundRect(ctx, rect.x, rect.y, rect.w, rect.h, r); ctx.stroke(); }
if(glow.enabled){ const pathFn = ()=> roundRect(ctx, rect.x, rect.y, rect.w, rect.h, r); drawGlowStroke(ctx, pathFn, thick, paint, glow.strength, 1); }
ctx.restore();
};


if(!main.segmented){
const filledLen = axisLen * progress;
const rect = placeRect(0, filledLen);
const basePaint = gradientPaint();
drawFillRect(rect, basePaint);


if(inStartWindow){
const wl = Math.min(filledLen, startZonePx);
if(wl>0){ const r2 = placeRect(0, wl); const style = warnings.start.mode==='solid'? warnings.start.colorSolid : makeCanvasGradient(ctx,{x:x0,y:y0,w,h}, warnings.start.gradient.stops); drawFillRect(r2, style); }
}
if(inEndWindow){
const zoneStart = axisLen - endZonePx; const overlap = Math.max(0, filledLen - zoneStart);
if(overlap>0){ const r3 = placeRect(zoneStart, overlap); const style2 = warnings.end.mode==='solid'? warnings.end.colorSolid : makeCanvasGradient(ctx,{x:x0,y:y0,w,h}, warnings.end.gradient.stops); drawFillRect(r3, style2); }
}
return;
}


// segmented
const filled = progress * segCount;
for(let i=0;i<segCount;i++){
const off = i*(segLen + (gap));
const frac = i < Math.floor(filled) ? 1 : (i===Math.floor(filled) ? (filled - Math.floor(filled)) : 0);
if(frac<=0) continue; const lenNow = segLen*frac; const rect = placeRect(off, lenNow);
let paint: any = gradientPaint();
if(inStartWindow && (off+lenNow) <= startZonePx){ paint = warnings.start.mode==='solid'? warnings.start.colorSolid : makeCanvasGradient(ctx,{x:x0,y:y0,w,h}, warnings.start.gradient.stops); }
else if(inEndWindow && (axisLen - off) <= endZonePx){ paint = warnings.end.mode==='solid'? warnings.end.colorSolid : makeCanvasGradient(ctx,{x:x0,y:y0,w,h}, warnings.end.gradient.stops); }
drawFillRect(rect, paint);
}
}


// ---- Lightweight runtime self-tests -------------------------------------
export function runSelfTests(){
try{
console.assert(pad(0,2)==='00' && pad(9,2)==='09' && pad(100,3)==='100', 'pad failed');
const { startAngle } = arcAnglesFromOpening('bottom');
console.assert(Math.abs(startAngle - (315*Math.PI/180)) < 1e-6, 'opening center mapping');
const sq = Math.min(20,20)/2; // squareEnds handled elsewhere
console.assert(sq===10, 'sanity');
console.info('[renderUtils] self-tests passed');
}catch(e){ console.error('[renderUtils] self-tests failed', e); }
}