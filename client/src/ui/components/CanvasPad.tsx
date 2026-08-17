import React, { useEffect, useMemo, useRef, useState } from "react";
import { StrokeEvent, StrokePoint } from "../../types";

function getCanvasPos(evt: PointerEvent, canvas: HTMLCanvasElement, isUpsideDown = false): StrokePoint {
  const rect = canvas.getBoundingClientRect();
  const rawX = (evt.clientX - rect.left) * (canvas.width / rect.width);
  const rawY = (evt.clientY - rect.top) * (canvas.height / rect.height);
  return {
    x: isUpsideDown ? canvas.width - rawX : rawX,
    y: isUpsideDown ? canvas.height - rawY : rawY
  };
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16)
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

export function CanvasPad(props: {
  width?: number;
  height?: number;
  strokeWidth?: number;
  playerId: string;
  onChange?: () => void;
  onSubmit: (dataUrl: string, strokes: StrokeEvent[]) => void;
  allowedColor?: string;
  initialColor?: string;
  onColorChange?: (color: string) => void;
  initialDataUrl?: string;
  disabled?: boolean;
  submitText?: string;
  oneStrokeMode?: boolean;
  showShades?: boolean;
  endTime?: number;
  trick?: import("../../types").TrickType;
  inkLimit?: number;
}) {
  const width = props.width ?? 900;
  const height = props.height ?? 550;
  const isSizeLocked = props.trick === "large_brush" || props.trick === "tiny_brush";
  const strokeWidth = props.trick === "large_brush" ? 35 : props.trick === "tiny_brush" ? 3 : (props.strokeWidth ?? 10);

  const isOneStroke = Boolean(props.oneStrokeMode || props.trick === "one_stroke");
  const isBlind = props.trick === "blind";
  const isUpsideDown = props.trick === "upside_down";
  const isWobble = props.trick === "wobble";
  const isMirror = props.trick === "mirror";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [color, setColor] = useState(props.initialColor ?? "#111111");
  const [size, setSize] = useState(strokeWidth);
  const activeStrokeWidth = isSizeLocked ? strokeWidth : size;

  const effectiveInkLimit = props.trick === "ink_limit" ? 2000 : props.inkLimit;
  const maxInk = effectiveInkLimit ?? 0;
  const [inkRemaining, setInkRemaining] = useState<number>(maxInk);
  const inkRemainingRef = useRef<number>(maxInk);

  // Reset ink whenever it's a new turn / initialDataUrl changes / when unlocked
  useEffect(() => {
    if (effectiveInkLimit) {
      inkRemainingRef.current = effectiveInkLimit;
      setInkRemaining(effectiveInkLimit);
    }
  }, [effectiveInkLimit, props.initialDataUrl, props.disabled]);

  useEffect(() => {
    if (isSizeLocked) {
      setSize(strokeWidth);
    }
  }, [isSizeLocked, strokeWidth]);

  const strokesRef = useRef<StrokeEvent[]>([]);
  const currentPointsRef = useRef<StrokePoint[]>([]);
  const strokeMovedRef = useRef(false);
  const strokeStartRef = useRef<StrokePoint | null>(null);
  const hasSubmittedRef = useRef(false);

  // Keep live refs of all mutable properties so listeners NEVER need to re-bind
  const colorRef = useRef(color);
  colorRef.current = color;
  const activeStrokeWidthRef = useRef(activeStrokeWidth);
  activeStrokeWidthRef.current = activeStrokeWidth;
  const isOneStrokeRef = useRef(isOneStroke);
  isOneStrokeRef.current = isOneStroke;
  const isUpsideDownRef = useRef(isUpsideDown);
  isUpsideDownRef.current = isUpsideDown;
  const isWobbleRef = useRef(isWobble);
  isWobbleRef.current = isWobble;
  const isMirrorRef = useRef(isMirror);
  isMirrorRef.current = isMirror;
  const disabledRef = useRef(props.disabled);
  disabledRef.current = props.disabled;
  const playerIdRef = useRef(props.playerId);
  playerIdRef.current = props.playerId;
  const maxInkRef = useRef(maxInk);
  maxInkRef.current = maxInk;
  const onSubmitRef = useRef(props.onSubmit);
  onSubmitRef.current = props.onSubmit;
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;

  useEffect(() => {
    if (!props.disabled) {
      hasSubmittedRef.current = false;
    }
  }, [props.disabled]);

  // Auto-submit when timer expires
  useEffect(() => {
    if (!props.endTime || hasSubmittedRef.current) return;
    const check = setInterval(() => {
      const remaining = props.endTime! - Date.now();
      if (remaining <= 0 && !hasSubmittedRef.current) {
        hasSubmittedRef.current = true;
        clearInterval(check);
        const canvas = canvasRef.current;
        if (canvas) {
          const url = canvas.toDataURL("image/png");
          onSubmitRef.current(url, strokesRef.current);
        }
      }
    }, 500);
    return () => clearInterval(check);
  }, [props.endTime]);

  const colors = [
    "#000000", "#555555", "#aaaaaa", "#ffffff",
    "#ff0000", "#ff8800", "#ffff00", "#00ff00",
    "#00ffff", "#0000ff", "#8800ff", "#ff00ff",
    "#880000", "#884400", "#888800", "#008800",
    "#008888", "#000088", "#440088", "#880044"
  ];

  const getShades = (hex: string, shadesOnly = false) => {
    if (hex === "#FFFFFF" || hex === "#000000") return ["#000000", "#333333", "#666666", "#999999", "#CCCCCC", "#FFFFFF"];

    if (!shadesOnly) return [hex, "#FFFFFF"];

    const adjust = (color: string, amount: number) => {
      let r = parseInt(color.substring(1, 3), 16);
      let g = parseInt(color.substring(3, 5), 16);
      let b = parseInt(color.substring(5, 7), 16);
      r = Math.max(0, Math.min(255, r + amount));
      g = Math.max(0, Math.min(255, g + amount));
      b = Math.max(0, Math.min(255, b + amount));
      const rr = r.toString(16).padStart(2, "0");
      const gg = g.toString(16).padStart(2, "0");
      const bb = b.toString(16).padStart(2, "0");
      return `#${rr}${gg}${bb}`;
    };

    return [
      adjust(hex, 120), adjust(hex, 90), adjust(hex, 60), adjust(hex, 30),
      hex,
      adjust(hex, -30), adjust(hex, -60), adjust(hex, -90), adjust(hex, -120),
      "#FFFFFF"
    ];
  };

  const currentColors = useMemo(() => {
    return props.allowedColor ? getShades(props.allowedColor, props.showShades) : colors;
  }, [props.allowedColor, props.showShades]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear strokes log for a fresh turn
    strokesRef.current = [];
    hasSubmittedRef.current = false;

    if (props.initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
        strokeMovedRef.current = false;
        strokeStartRef.current = null;
      };
      img.src = props.initialDataUrl;
    } else {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      strokeMovedRef.current = false;
      strokeStartRef.current = null;
    }
  }, [props.initialDataUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drawing = false;

    const onDown = (evt: PointerEvent) => {
      if (disabledRef.current || (isOneStrokeRef.current && hasSubmittedRef.current)) return;
      drawing = true;
      strokeMovedRef.current = false;
      try {
        canvas.setPointerCapture(evt.pointerId);
      } catch {}
      let p = getCanvasPos(evt, canvas, isUpsideDownRef.current);
      if (isWobbleRef.current) {
        const jX = (Math.random() - 0.5) * 16;
        const jY = (Math.random() - 0.5) * 16;
        p = { x: Math.max(0, Math.min(canvas.width, p.x + jX)), y: Math.max(0, Math.min(canvas.height, p.y + jY)) };
      }
      strokeStartRef.current = p;
      currentPointsRef.current = [p];

      // Setup drawing styles for this stroke
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = colorRef.current;
      ctx.lineWidth = activeStrokeWidthRef.current;
    };

    const onMove = (evt: PointerEvent) => {
      if (!drawing || (isOneStrokeRef.current && hasSubmittedRef.current)) return;
      const rawPos = getCanvasPos(evt, canvas, isUpsideDownRef.current);
      let p = rawPos;
      if (isWobbleRef.current) {
        const angle = Date.now() / 35 + currentPointsRef.current.length * 0.5;
        const jX = Math.sin(angle) * 16 + (Math.random() - 0.5) * 10;
        const jY = Math.cos(angle) * 16 + (Math.random() - 0.5) * 10;
        p = { x: Math.max(0, Math.min(canvas.width, p.x + jX)), y: Math.max(0, Math.min(canvas.height, p.y + jY)) };
      }

      if (maxInkRef.current > 0) {
        const prev = currentPointsRef.current[currentPointsRef.current.length - 1];
        if (prev) {
          const segDist = Math.hypot(p.x - prev.x, p.y - prev.y);
          if (inkRemainingRef.current - segDist <= 0) {
            inkRemainingRef.current = 0;
            setInkRemaining(0);
            currentPointsRef.current.push(p);
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            if (isMirrorRef.current) {
              ctx.beginPath();
              ctx.moveTo(canvas.width - prev.x, prev.y);
              ctx.lineTo(canvas.width - p.x, p.y);
              ctx.stroke();
            }
            setHasDrawn(true);
            onChangeRef.current?.();
            onUp(evt);
            return;
          } else {
            inkRemainingRef.current -= segDist;
            setInkRemaining(inkRemainingRef.current);
          }
        }
      }

      const prev = currentPointsRef.current[currentPointsRef.current.length - 1];
      currentPointsRef.current.push(p);
      const st = strokeStartRef.current;
      if (st) {
        const dist = Math.hypot(p.x - st.x, p.y - st.y);
        if (dist > 2) strokeMovedRef.current = true;
      }

      if (prev) {
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if (isMirrorRef.current) {
          ctx.beginPath();
          ctx.moveTo(canvas.width - prev.x, prev.y);
          ctx.lineTo(canvas.width - p.x, p.y);
          ctx.stroke();
        }
      }

      setHasDrawn(true);
      onChangeRef.current?.();
    };

    const onUp = (evt: PointerEvent) => {
      if (!drawing) return;
      drawing = false;

      if (isOneStrokeRef.current && hasSubmittedRef.current) {
        return;
      }

      if (currentPointsRef.current.length > 0) {
        // If the pointer didn't move, it's a dot. We draw it now on release.
        if (!strokeMovedRef.current) {
          const p = currentPointsRef.current[0]!;
          ctx.beginPath();
          ctx.arc(p.x, p.y, activeStrokeWidthRef.current / 2, 0, Math.PI * 2);
          if (isMirrorRef.current) {
            ctx.arc(canvas.width - p.x, p.y, activeStrokeWidthRef.current / 2, 0, Math.PI * 2);
          }
          ctx.fillStyle = colorRef.current;
          ctx.fill();

          setHasDrawn(true);
          onChangeRef.current?.();
        }

        const newStroke: StrokeEvent = {
          id: Math.random().toString(36).substr(2, 9),
          playerId: playerIdRef.current,
          points: [...currentPointsRef.current],
          brushSize: activeStrokeWidthRef.current,
          color: hexToRgb(colorRef.current),
          opacity: 1,
          timestamp: Date.now()
        };
        strokesRef.current.push(newStroke);

        if (isMirrorRef.current) {
          strokesRef.current.push({
            id: Math.random().toString(36).substr(2, 9),
            playerId: playerIdRef.current,
            points: currentPointsRef.current.map(pt => ({ x: canvas.width - pt.x, y: pt.y })),
            brushSize: activeStrokeWidthRef.current,
            color: hexToRgb(colorRef.current),
            opacity: 1,
            timestamp: Date.now()
          });
        }

        if (isOneStrokeRef.current && canvasRef.current) {
          hasSubmittedRef.current = true;
          const url = canvasRef.current.toDataURL("image/png");
          onSubmitRef.current(url, strokesRef.current);
        }
      }

      strokeStartRef.current = null;
      currentPointsRef.current = [];
      try {
        canvas.releasePointerCapture(evt.pointerId);
      } catch { }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setHasDrawn(false);
    strokeMovedRef.current = false;
    strokeStartRef.current = null;
    strokesRef.current = [];
    hasSubmittedRef.current = false;
    props.onChange?.();
  };

  const toDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  };

  return (
    <div>
      {maxInk > 0 && !props.disabled && (
        <div
          style={{
            marginBottom: "12px",
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "12px",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)"
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>🖋️ Ink Gauge:</span>
            <span style={{ color: inkRemaining < maxInk * 0.25 ? "#ef4444" : inkRemaining < maxInk * 0.5 ? "#f59e0b" : "#10b981" }}>
              {Math.round((inkRemaining / maxInk) * 100)}%
            </span>
          </div>
          <div style={{ flex: 1, height: "8px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "999px", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(100, (inkRemaining / maxInk) * 100))}%`,
                height: "100%",
                background: inkRemaining < maxInk * 0.25 ? "#ef4444" : inkRemaining < maxInk * 0.5 ? "#f59e0b" : "#10b981",
                transition: "width 0.08s ease, background 0.2s ease"
              }}
            />
          </div>
        </div>
      )}

      <div className="canvasWrap" style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="canvas"
          style={{
            ...(isBlind ? { opacity: 0.05, filter: "blur(20px)" } : {})
          }}
        />
        {isBlind && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            background: "rgba(0,0,0,0.45)",
            color: "#fff",
            fontFamily: "Outfit, sans-serif",
            fontWeight: 800,
            fontSize: "1.5rem"
          }}>
            🙈 Blind Drawing Active! Strokes are hidden!
          </div>
        )}
      </div>

      {!props.disabled && (
        <>
          <div className="canvas-tools">
            <div className="color-picker">
              {currentColors.map((c) => (
                <button
                  key={c}
                  className={`color-btn ${color === c ? "active" : ""} ${c === "#FFFFFF" ? "white-btn" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setColor(c);
                    props.onColorChange?.(c);
                  }}
                  title={c === "#FFFFFF" ? "Eraser" : "Color"}
                />
              ))}
            </div>
            <div className="size-picker" style={{ opacity: isSizeLocked ? 0.8 : 1, display: "flex", alignItems: "center", gap: "6px" }}>
              <label>{isSizeLocked ? "🔒 Size:" : "Size:"}</label>
              <input
                type="range"
                min="2"
                max="40"
                value={isSizeLocked ? strokeWidth : size}
                disabled={isSizeLocked}
                onChange={(e) => !isSizeLocked && setSize(Number(e.target.value))}
                title={isSizeLocked ? "Brush size is locked for this trick" : "Adjust brush size"}
              />
              {isSizeLocked && (
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f59e0b", whiteSpace: "nowrap" }}>
                  {props.trick === "large_brush" ? "35px (Mega)" : "3px (Needle)"}
                </span>
              )}
            </div>
          </div>

          <div className="row space" style={{ marginTop: "16px" }}>
            <button className="btn" onClick={clear}>
              Clear
            </button>

            <div className="muted">
              {hasDrawn ? "Nice." : "Draw your line!"}
            </div>

            <button
              className="btn primary"
              onClick={() => {
                if (props.oneStrokeMode && hasSubmittedRef.current) return;
                if (props.oneStrokeMode) hasSubmittedRef.current = true;
                props.onSubmit(toDataUrl(), strokesRef.current);
              }}
              disabled={!hasDrawn || (props.oneStrokeMode && hasSubmittedRef.current)}
            >
              {props.submitText || "Submit drawing"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}