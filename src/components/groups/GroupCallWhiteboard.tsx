"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

import type { GroupActorType } from "@/lib/groups/auth";

import { useT } from "../i18n/LocaleProvider";

const COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#ca8a04"] as const;
const MAX_POINTS = 80;

type Point = { x: number; y: number };
type Stroke = {
  id: string;
  senderName: string;
  color: (typeof COLORS)[number];
  width: number;
  erase: boolean;
  points: Point[];
};

function renderBoard(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, bounds.width, bounds.height);

  for (const stroke of strokes) {
    const [first, ...rest] = stroke.points;
    if (!first) continue;
    context.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
    context.strokeStyle = stroke.color;
    context.fillStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (rest.length === 0) {
      context.beginPath();
      context.arc(first.x * bounds.width, first.y * bounds.height, stroke.width / 2, 0, Math.PI * 2);
      context.fill();
      continue;
    }
    context.beginPath();
    context.moveTo(first.x * bounds.width, first.y * bounds.height);
    for (const point of rest) context.lineTo(point.x * bounds.width, point.y * bounds.height);
    context.stroke();
  }
  context.globalCompositeOperation = "source-over";
}

export function GroupCallWhiteboard({
  actorType,
  groupId,
  callId,
  connectionId,
}: {
  actorType: GroupActorType;
  groupId: string;
  callId: string;
  connectionId: string;
}) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointsRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const strokesRef = useRef<Stroke[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState<(typeof COLORS)[number]>(COLORS[0]);
  const [eraser, setEraser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endpoint = `/api/grupos/${groupId}/llamadas/${callId}/pizarra`;

  const refresh = useCallback(async () => {
    const params = new URLSearchParams({ connectionId });
    const response = await fetch(`${endpoint}?${params}`, {
      headers: { "x-aranos-actor": actorType },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();
    const nextStrokes = Array.isArray(data.events) ? data.events as Stroke[] : [];
    const unchanged = nextStrokes.length === strokesRef.current.length &&
      nextStrokes.every((stroke, index) => stroke.id === strokesRef.current[index]?.id);
    if (unchanged) return;
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
  }, [actorType, connectionId, endpoint]);

  useEffect(() => {
    let active = true;
    let running = false;
    const poll = async () => {
      if (running) return;
      running = true;
      try {
        if (active) await refresh();
      } catch {
        if (active) setError("groups.errors.boardConnectionFailed");
      } finally {
        running = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1800);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => renderBoard(canvas, strokesRef.current));
    observer.observe(canvas);
    renderBoard(canvas, strokes);
    return () => observer.disconnect();
  }, [strokes]);

  function getPoint(event: PointerEvent<HTMLCanvasElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  }

  function drawSegment(from: Point, to: Point) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const bounds = canvas.getBoundingClientRect();
    context.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = eraser ? 14 : 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (from.x === to.x && from.y === to.y) {
      context.beginPath();
      context.arc(from.x * bounds.width, from.y * bounds.height, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
      context.globalCompositeOperation = "source-over";
      return;
    }
    context.beginPath();
    context.moveTo(from.x * bounds.width, from.y * bounds.height);
    context.lineTo(to.x * bounds.width, to.y * bounds.height);
    context.stroke();
    context.globalCompositeOperation = "source-over";
  }

  function startStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    drawingRef.current = true;
    activePointsRef.current = [point];
    drawSegment(point, point);
  }

  function continueStroke(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const point = getPoint(event);
    const points = activePointsRef.current;
    const previous = points[points.length - 1];
    if (previous) drawSegment(previous, point);
    if (points.length < MAX_POINTS) points.push(point);
  }

  async function finishStroke() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const points = activePointsRef.current;
    activePointsRef.current = [];
    if (points.length === 0) return;
    const sampledPoints = points.length > MAX_POINTS
      ? Array.from({ length: MAX_POINTS }, (_, index) => points[Math.round(index * (points.length - 1) / (MAX_POINTS - 1))])
      : points;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-aranos-actor": actorType },
      body: JSON.stringify({
        action: "stroke",
        connectionId,
        color,
        width: eraser ? 14 : 4,
        erase: eraser,
        points: sampledPoints,
      }),
    }).catch(() => null);
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}));
      setError(data.error ?? "groups.errors.boardConnectionFailed");
      return;
    }
    setError(null);
    await refresh().catch(() => setError("groups.errors.boardConnectionFailed"));
  }

  async function clearBoard() {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-aranos-actor": actorType },
      body: JSON.stringify({ action: "clear", connectionId }),
    }).catch(() => null);
    if (!response?.ok) {
      const data = await response?.json().catch(() => ({}));
      setError(data.error ?? "groups.errors.boardConnectionFailed");
      return;
    }
    strokesRef.current = [];
    setStrokes([]);
    setError(null);
  }

  return (
    <div className="w-full border-t border-line pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-[16px] font-bold">{t("groups.whiteboardTitle")}</h4>
          <p className="text-[12px] text-ink-soft">{t("groups.whiteboardDescription")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {COLORS.map((value, index) => (
            <button
              key={value}
              type="button"
              aria-label={t("groups.whiteboardColor", { number: index + 1 })}
              aria-pressed={!eraser && color === value}
              onClick={() => { setColor(value); setEraser(false); }}
              className={`h-8 w-8 rounded-full border-2 ${!eraser && color === value ? "border-ink" : "border-line"}`}
              style={{ backgroundColor: value }}
            />
          ))}
          <button type="button" onClick={() => setEraser((value) => !value)} aria-pressed={eraser} className="btn-outline btn-sm">
            {t("groups.whiteboardEraser")}
          </button>
          <button type="button" onClick={() => void clearBoard()} className="btn-outline btn-sm">
            {t("groups.whiteboardClear")}
          </button>
        </div>
      </div>
      {error ? <p role="alert" className="mb-2 text-[12px] text-danger">{t(error as never)}</p> : null}
      <canvas
        ref={canvasRef}
        aria-label={t("groups.whiteboardTitle")}
        onPointerDown={startStroke}
        onPointerMove={continueStroke}
        onPointerUp={() => void finishStroke()}
        onPointerCancel={() => void finishStroke()}
        className="block aspect-[4/3] w-full touch-none border-2 border-line bg-white"
      />
    </div>
  );
}