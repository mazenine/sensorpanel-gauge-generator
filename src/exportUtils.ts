import JSZip from 'jszip';
import type { Preset } from './types';
import { buildCanvas, clamp, pad, drawArcGauge, drawBarGauge } from './renderUtils';


export function effectiveExportStates(preset:Preset){
if(preset.main.segmented){ return Math.max(1, (preset.main.segments|0) + (preset.base.enabled ? 1 : 0)); }
return clamp(preset.states|0, 2, 101);
}


const offscreen = document.createElement('canvas');


export async function renderStateBlob(preset:Preset, valueIndex:number, total:number){
const ctx = offscreen.getContext('2d')!;
const { width, height } = preset.canvas;
buildCanvas(ctx, width, height); ctx.clearRect(0,0,width,height);
const v01 = preset.main.segmented ? (valueIndex / Math.max(1,(preset.main.segments))) : (valueIndex / Math.max(1,(total-1)));
if(preset.mode==='arc') drawArcGauge(ctx, preset, v01); else drawBarGauge(ctx, preset, v01);
return await new Promise<Blob|null>(res=> offscreen.toBlob((b)=>res(b), 'image/png'));
}


export async function exportZip(preset:Preset){
const zip = new JSZip();
const count = effectiveExportStates(preset);
const zpad = count>=100?3:2;
for(let i=0;i<count;i++){
const blob = await renderStateBlob(preset, i, count);
if(blob) zip.file(`${preset.namePrefix}_${pad(i, zpad)}.png`, blob);
}
return await zip.generateAsync({ type:'blob' });
}