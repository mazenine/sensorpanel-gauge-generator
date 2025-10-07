import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function LivePreviewCard({ preset, drawArcGauge, drawBarGauge, value01 = 0.75 }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showWarning, setShowWarning] = useState(false);

  const drawPreview = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !preset) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width: cw, height: ch } = container.getBoundingClientRect();
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    // --- estimate logical content size ---
    const arc = preset.arc ?? {};
    const bar = preset.bar ?? {};
    const glow = preset.glow ?? {};
    const base = preset.base ?? {};
    const mode = preset.mode ?? "arc";

    const radius = arc.radius ?? 200;
    const barLen = bar.length ?? 420;
    const barThick = bar.thickness ?? 24;
    const glowThick = glow.haloThickness ?? 0;
    const margin = base.margin ?? 0;
    const pad = 20; // padding to avoid edge clipping
    const hasRoundCaps = arc?.roundCaps ?? false;
    const capAllowance = hasRoundCaps ? (arc?.thickness ?? 0) / 2 : 0;

    // --- Compute required size with padding and round-cap allowance ---
    const reqW =
      mode === "arc"
        ? (radius + glowThick + margin + pad + capAllowance) * 2
        : bar.orientation === "vertical"
        ? barThick + margin * 2 + glowThick * 2 + pad
        : barLen + margin * 2 + glowThick * 2 + pad;

    const reqH =
      mode === "arc"
        ? (radius + glowThick + margin + pad + capAllowance) * 2
        : bar.orientation === "vertical"
        ? barLen + margin * 2 + glowThick * 2 + pad
        : barThick + margin * 2 + glowThick * 2 + pad;

    const s = Math.min(cw / reqW, ch / reqH, 1);
    setScale(s);
    setShowWarning(s < 0.999);

    // --- draw ---
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "rgb(20,20,20)";
    ctx.fillRect(0, 0, cw, ch);

    ctx.translate(cw / 2, ch / 2);
    ctx.scale(s, s);

    if (mode === "bar" && drawBarGauge) {
      const orientation = bar.orientation ?? "horizontal";
      if (orientation === "vertical") {
        ctx.rotate(-Math.PI / 2);
      }
      drawBarGauge(ctx, preset, value01);
    } else if (drawArcGauge) {
      drawArcGauge(ctx, preset, value01);
    }

    ctx.restore();
  };

  // re-render on preset/value change
  useEffect(() => {
    drawPreview();
  }, [preset, value01]);

  // resize observer
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const ro = new ResizeObserver(drawPreview);
    ro.observe(c);
    drawPreview();
    return () => ro.disconnect();
  }, [preset]);

  return (
    <Card className="flex-1 bg-neutral-900 border-neutral-800">
      <CardHeader className="py-3">
        <CardTitle className="text-base">Live Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="w-full h-[60vh] flex flex-col items-center justify-center relative"
        >
          <canvas
            ref={canvasRef}
            className="rounded-xl bg-transparent shadow max-w-full"
          />
          <div className="absolute bottom-2 w-full text-center h-4">
            {showWarning && (
              <span className="text-xs text-yellow-500 italic">
                Preview scaled to fit window ({Math.round(scale * 100)}%)
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
