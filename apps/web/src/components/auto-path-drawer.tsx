"use client";

import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
type Stroke = { color: string; points: Point[] };
const colors = ["#ef4444", "#2563eb", "#22c55e", "#111827"];
const width = 1380;
const height = 674;
const maxStrokes = 12;
const maxPointsPerStroke = 100;
const minPointDistance = 5;

function svgFor(strokes: Stroke[]) {
  const paths = strokes.filter((stroke) => stroke.points.length > 1).map((stroke) => `<path d="M ${stroke.points.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" L ")}" fill="none" stroke="${stroke.color}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
  return paths ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${paths}</svg>` : "";
}

export function AutoPathDrawer({ value, onChange }: { value: string; onChange: (svg: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState(colors[0]);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, width, height);
    context.lineCap = "round"; context.lineJoin = "round"; context.lineWidth = 7;
    strokes.forEach((stroke) => { if (stroke.points.length < 2) return; context.strokeStyle = stroke.color; context.beginPath(); stroke.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); });
    onChange(svgFor(strokes));
  }, [strokes, onChange]);

  function point(event: React.PointerEvent<HTMLCanvasElement>): Point { const rect = event.currentTarget.getBoundingClientRect(); return { x: ((event.clientX - rect.left) / rect.width) * width, y: ((event.clientY - rect.top) / rect.height) * height }; }
  function begin(event: React.PointerEvent<HTMLCanvasElement>) { if (strokes.length >= maxStrokes) return; drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); setStrokes((current) => [...current, { color, points: [point(event)] }]); }
  function move(event: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const next = point(event); setStrokes((current) => { const stroke = current.at(-1); const previous = stroke?.points.at(-1); if (!stroke || !previous || stroke.points.length >= maxPointsPerStroke || Math.hypot(next.x - previous.x, next.y - previous.y) < minPointDistance) return current; return [...current.slice(0, -1), { ...stroke, points: [...stroke.points, next] }]; }); }
  function end() { drawing.current = false; }

  return <div className="auto-path-drawer"><div className="auto-path-tools" aria-label="Drawing colors">{colors.map((item) => <button key={item} type="button" aria-label={`Use ${item} pen`} aria-pressed={color === item} className={color === item ? "active" : ""} style={{ "--pen": item } as React.CSSProperties} onClick={() => setColor(item)} />)}<button type="button" className="button secondary" onClick={() => setStrokes([])} disabled={!strokes.length}>Clear</button></div><canvas ref={canvasRef} width={width} height={height} className="auto-path-canvas" aria-label="Draw autonomous routes over the 2026 field" onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} /><p className="muted">Draw over the 2026 field with a color. Only the capped vector strokes are saved, not the field image ({value ? "ready" : "empty"}).</p></div>;
}
