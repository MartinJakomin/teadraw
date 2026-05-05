import React, { useEffect, useMemo, useRef, useState } from "react";

function getCanvasPos(evt: PointerEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (canvas.width / rect.width),
    y: (evt.clientY - rect.top) * (canvas.height / rect.height)
  };
}

export function CanvasPad(props: {
  width?: number;
  height?: number;
  strokeWidth?: number;
  onChange?: () => void;
  onSubmit: (dataUrl: string) => void;
  allowedColor?: string;
  initialColor?: string;
  onColorChange?: (color: string) => void;
  initialDataUrl?: string;
  disabled?: boolean;
  submitText?: string;
  oneStrokeMode?: boolean;
  showShades?: boolean;
}) {
  const width = props.width ?? 900;
  const height = props.height ?? 550;
  const strokeWidth = props.strokeWidth ?? 10;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [color, setColor] = useState(props.initialColor ?? "#111111");
  const [size, setSize] = useState(strokeWidth);

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
    
    if (props.initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHasDrawn(false);
      };
      img.src = props.initialDataUrl;
    } else {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  }, [props.initialDataUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drawing = false;

    const onDown = (evt: PointerEvent) => {
      if (props.disabled) return;
      drawing = true;
      canvas.setPointerCapture(evt.pointerId);
      const p = getCanvasPos(evt, canvas);
      
      // Setup drawing styles for this stroke
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };

    const onMove = (evt: PointerEvent) => {
      if (!drawing) return;
      const p = getCanvasPos(evt, canvas);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      setHasDrawn(true);
      props.onChange?.();
    };

    const onUp = (evt: PointerEvent) => {
      if (drawing && props.oneStrokeMode && canvasRef.current) {
        // Auto submit after one stroke
        const url = canvasRef.current.toDataURL("image/png");
        props.onSubmit(url);
      }
      drawing = false;
      try {
        canvas.releasePointerCapture(evt.pointerId);
      } catch {}
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [color, size, props.onChange, props.disabled, props.oneStrokeMode, props.onSubmit]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setHasDrawn(false);
    props.onChange?.();
  };

  const toDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  };

  return (
    <div>
      <div className="canvasWrap">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="canvas"
        />
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
            <div className="size-picker">
              <label>Size:</label>
              <input 
                type="range" 
                min="2" 
                max="40" 
                value={size} 
                onChange={(e) => setSize(Number(e.target.value))} 
              />
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
              onClick={() => props.onSubmit(toDataUrl())}
              disabled={!hasDrawn}
            >
              {props.submitText || "Submit drawing"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}