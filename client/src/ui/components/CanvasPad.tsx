import React, { useEffect, useMemo, useRef, useState } from "react";
import { StrokeEvent, StrokePoint } from "../../types";

function getCanvasPos(
  evt: PointerEvent,
  canvas: HTMLCanvasElement,
  isUpsideDown = false,
  isSpinning = false,
  spinStartTime = 0
): StrokePoint {
  const rect = canvas.getBoundingClientRect();
  let rawX = (evt.clientX - rect.left) * (canvas.width / rect.width);
  let rawY = (evt.clientY - rect.top) * (canvas.height / rect.height);

  if (isSpinning && spinStartTime > 0) {
    const elapsed = (Date.now() - spinStartTime) % 14000;
    const angle = (elapsed / 14000) * 2 * Math.PI;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const dx = rawX - cx;
    const dy = rawY - cy;
    // Un-rotate by -angle
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    rawX = cx + dx * cos - dy * sin;
    rawY = cy + dx * sin + dy * cos;
  }

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
  const isRandomBrush = props.trick === "random_brush";
  const isPixelArt = props.trick === "pixel_art";
  const isBubbles = props.trick === "bubbles";
  const isSizeLocked = props.trick === "large_brush" || isRandomBrush || isPixelArt;
  const strokeWidth = props.trick === "large_brush" ? 35 : (props.strokeWidth ?? 10);

  const isOneStroke = Boolean(props.oneStrokeMode || props.trick === "one_stroke");
  const isBlind = props.trick === "blind";
  const isUpsideDown = props.trick === "upside_down";
  const isWobble = props.trick === "wobble";
  const isMirror = props.trick === "mirror";
  const isZoom = props.trick === "zoom_lens";
  const isRubberband = props.trick === "rubberband";
  const isInputDelay = props.trick === "input_delay";
  const isSpinning = props.trick === "spinning";
  const isGlitch = props.trick === "glitch";
  const isGravityDrip = props.trick === "gravity_drip";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [color, setColor] = useState(props.initialColor ?? "#111111");
  const [size, setSize] = useState(strokeWidth);
  const activeStrokeWidth = isSizeLocked ? strokeWidth : size;

  const effectiveInkLimit = props.trick === "ink_limit" ? 2000 : props.inkLimit;
  const maxInk = effectiveInkLimit ?? 0;
  const [inkRemaining, setInkRemaining] = useState<number>(maxInk);
  const inkRemainingRef = useRef<number>(maxInk);

  // Zoom lens origin tracking
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  // Spinning canvas reference timestamp
  const spinStartTimeRef = useRef(Date.now());

  // Reset ink whenever it's a new turn
  useEffect(() => {
    if (effectiveInkLimit) {
      inkRemainingRef.current = effectiveInkLimit;
      setInkRemaining(effectiveInkLimit);
    }
  }, [effectiveInkLimit, props.initialDataUrl, props.disabled]);

  useEffect(() => {
    if (isSizeLocked && !isRandomBrush) {
      setSize(strokeWidth);
    }
  }, [isSizeLocked, isRandomBrush, strokeWidth]);

  const strokesRef = useRef<StrokeEvent[]>([]);
  const currentPointsRef = useRef<StrokePoint[]>([]);
  const strokeMovedRef = useRef(false);
  const strokeStartRef = useRef<StrokePoint | null>(null);
  const hasSubmittedRef = useRef(false);
  const currentDynamicSizeRef = useRef<number>(14);
  const pointsSinceSizeShiftRef = useRef<number>(0);

  // Rubberband spring physics state
  const springPosRef = useRef<StrokePoint>({ x: width / 2, y: height / 2 });
  const springVelRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const targetPointerRef = useRef<StrokePoint | null>(null);
  const isSpringDrawingRef = useRef(false);
  const [rubberbandDisplay, setRubberbandDisplay] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Delayed events queue for 1s Input Lag
  const delayedQueueRef = useRef<Array<{
    time: number;
    type: "down" | "move" | "up";
    p: StrokePoint;
    color: string;
    size: number;
  }>>([]);

  // Keep live refs
  const colorRef = useRef(color);
  colorRef.current = color;
  const activeStrokeWidthRef = useRef(activeStrokeWidth);
  activeStrokeWidthRef.current = activeStrokeWidth;
  const isRandomBrushRef = useRef(isRandomBrush);
  isRandomBrushRef.current = isRandomBrush;
  const isOneStrokeRef = useRef(isOneStroke);
  isOneStrokeRef.current = isOneStroke;
  const isUpsideDownRef = useRef(isUpsideDown);
  isUpsideDownRef.current = isUpsideDown;
  const isWobbleRef = useRef(isWobble);
  isWobbleRef.current = isWobble;
  const isMirrorRef = useRef(isMirror);
  isMirrorRef.current = isMirror;
  const isSpinningRef = useRef(isSpinning);
  isSpinningRef.current = isSpinning;
  const isGlitchRef = useRef(isGlitch);
  isGlitchRef.current = isGlitch;
  const isGravityDripRef = useRef(isGravityDrip);
  isGravityDripRef.current = isGravityDrip;
  const isPixelArtRef = useRef(isPixelArt);
  isPixelArtRef.current = isPixelArt;
  const isBubblesRef = useRef(isBubbles);
  isBubblesRef.current = isBubbles;
  const isRubberbandRef = useRef(isRubberband);
  isRubberbandRef.current = isRubberband;
  const isInputDelayRef = useRef(isInputDelay);
  isInputDelayRef.current = isInputDelay;

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
      spinStartTimeRef.current = Date.now();
    }
  }, [props.disabled]);

  // Flush and submit drawing safely
  const performSubmit = () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    const canvas = canvasRef.current;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      onSubmitRef.current(url, strokesRef.current);
    }
  };

  // Auto-submit when timer expires
  useEffect(() => {
    if (!props.endTime || hasSubmittedRef.current) return;
    const check = setInterval(() => {
      const remaining = props.endTime! - Date.now();
      if (remaining <= 0 && !hasSubmittedRef.current) {
        clearInterval(check);
        performSubmit();
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

    const adjust = (col: string, amount: number) => {
      let r = parseInt(col.substring(1, 3), 16);
      let g = parseInt(col.substring(3, 5), 16);
      let b = parseInt(col.substring(5, 7), 16);
      r = Math.max(0, Math.min(255, r + amount));
      g = Math.max(0, Math.min(255, g + amount));
      b = Math.max(0, Math.min(255, b + amount));
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
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

  // Helper to draw bubbles stamp
  const drawBubbleCluster = (ctx: CanvasRenderingContext2D, center: StrokePoint, bubbleColor: string) => {
    const count = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < count; i++) {
      const radius = Math.floor(Math.random() * 16) + 7;
      const offsetX = (Math.random() - 0.5) * 28;
      const offsetY = (Math.random() - 0.5) * 28;
      const bx = center.x + offsetX;
      const by = center.y + offsetY;

      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fillStyle = bubbleColor + "55"; // translucent
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = bubbleColor;
      ctx.stroke();

      // Specular white highlight on bubble
      ctx.beginPath();
      ctx.arc(bx - radius * 0.35, by - radius * 0.35, Math.max(1.5, radius * 0.22), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fill();
      ctx.restore();
    }
  };

  // Helper to draw gravity paint drip
  const drawGravityDrip = (ctx: CanvasRenderingContext2D, point: StrokePoint, dripColor: string) => {
    const dripLen = Math.floor(Math.random() * 26) + 14;
    const dripWidth = Math.max(2, activeStrokeWidthRef.current * 0.6);

    ctx.save();
    ctx.strokeStyle = dripColor;
    ctx.fillStyle = dripColor;
    ctx.lineWidth = dripWidth;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x, point.y + dripLen);
    ctx.stroke();

    // Drip droplet bead
    ctx.beginPath();
    ctx.arc(point.x, point.y + dripLen, dripWidth * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Helper to draw pixel block
  const drawPixelBlock = (ctx: CanvasRenderingContext2D, point: StrokePoint, blockColor: string) => {
    const gridSize = 16;
    const gx = Math.floor(point.x / gridSize) * gridSize;
    const gy = Math.floor(point.y / gridSize) * gridSize;

    ctx.save();
    ctx.fillStyle = blockColor;
    ctx.fillRect(gx, gy, gridSize, gridSize);
    ctx.restore();
  };

  // Real-time animation loop for Rubberband & 1s Input Delay
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      // 1. Rubberband Spring Physics
      if (isRubberbandRef.current && isSpringDrawingRef.current && targetPointerRef.current && canvas && ctx) {
        const target = targetPointerRef.current;
        const pos = springPosRef.current;
        const vel = springVelRef.current;

        const k = 0.16; // spring tension
        const damping = 0.72; // friction

        const fx = (target.x - pos.x) * k;
        const fy = (target.y - pos.y) * k;

        vel.vx = (vel.vx + fx) * damping;
        vel.vy = (vel.vy + fy) * damping;

        const nextX = pos.x + vel.vx;
        const nextY = pos.y + vel.vy;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = colorRef.current;
        ctx.lineWidth = activeStrokeWidthRef.current;

        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(nextX, nextY);
        ctx.stroke();

        springPosRef.current = { x: nextX, y: nextY };
        currentPointsRef.current.push({ x: nextX, y: nextY });

        // Update visual rubberband tether line
        const rect = canvas.getBoundingClientRect();
        setRubberbandDisplay({
          x1: (pos.x / canvas.width) * rect.width,
          y1: (pos.y / canvas.height) * rect.height,
          x2: (target.x / canvas.width) * rect.width,
          y2: (target.y / canvas.height) * rect.height
        });

        setHasDrawn(true);
        onChangeRef.current?.();
      }

      // 2. 1-Second Input Lag Dequeue
      if (isInputDelayRef.current && canvas && ctx) {
        const now = Date.now();
        const queue = delayedQueueRef.current;

        while (queue.length > 0 && now - queue[0]!.time >= 1000) {
          const item = queue.shift()!;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = item.color;
          ctx.lineWidth = item.size;

          if (item.type === "down") {
            currentPointsRef.current = [item.p];
            strokeStartRef.current = item.p;
            strokeMovedRef.current = false;
          } else if (item.type === "move") {
            const prev = currentPointsRef.current[currentPointsRef.current.length - 1];
            currentPointsRef.current.push(item.p);
            if (prev) {
              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.lineTo(item.p.x, item.p.y);
              ctx.stroke();
            }
            setHasDrawn(true);
            onChangeRef.current?.();
          } else if (item.type === "up") {
            if (currentPointsRef.current.length > 0) {
              const newStroke: StrokeEvent = {
                id: Math.random().toString(36).substr(2, 9),
                playerId: playerIdRef.current,
                points: [...currentPointsRef.current],
                brushSize: item.size,
                color: hexToRgb(item.color),
                opacity: 1,
                timestamp: Date.now()
              };
              strokesRef.current.push(newStroke);
              currentPointsRef.current = [];
            }
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Main Pointer Down / Move / Up Handling
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

      let p = getCanvasPos(evt, canvas, isUpsideDownRef.current, isSpinningRef.current, spinStartTimeRef.current);

      if (isWobbleRef.current) {
        const jX = (Math.random() - 0.5) * 16;
        const jY = (Math.random() - 0.5) * 16;
        p = { x: Math.max(0, Math.min(canvas.width, p.x + jX)), y: Math.max(0, Math.min(canvas.height, p.y + jY)) };
      }

      // Input Delay queue
      if (isInputDelayRef.current) {
        delayedQueueRef.current.push({
          time: Date.now(),
          type: "down",
          p,
          color: colorRef.current,
          size: activeStrokeWidthRef.current
        });
        return;
      }

      // Rubberband Spring
      if (isRubberbandRef.current) {
        springPosRef.current = { ...p };
        springVelRef.current = { vx: 0, vy: 0 };
        targetPointerRef.current = { ...p };
        isSpringDrawingRef.current = true;
        currentPointsRef.current = [p];
        return;
      }

      strokeStartRef.current = p;
      currentPointsRef.current = [p];

      // Setup drawing styles for standard / special brushes
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = colorRef.current;

      if (isRandomBrushRef.current) {
        const randomSizes = [4, 8, 14, 22, 32, 42];
        currentDynamicSizeRef.current = randomSizes[Math.floor(Math.random() * randomSizes.length)]!;
        pointsSinceSizeShiftRef.current = 0;
        ctx.lineWidth = currentDynamicSizeRef.current;
      } else {
        ctx.lineWidth = activeStrokeWidthRef.current;
      }

      if (isPixelArtRef.current) {
        drawPixelBlock(ctx, p, colorRef.current);
        setHasDrawn(true);
        onChangeRef.current?.();
      } else if (isBubblesRef.current) {
        drawBubbleCluster(ctx, p, colorRef.current);
        setHasDrawn(true);
        onChangeRef.current?.();
      }
    };

    const onMove = (evt: PointerEvent) => {
      // Zoom lens position tracking
      if (isZoom && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const zx = Math.max(0, Math.min(100, ((evt.clientX - rect.left) / rect.width) * 100));
        const zy = Math.max(0, Math.min(100, ((evt.clientY - rect.top) / rect.height) * 100));
        setZoomOrigin({ x: zx, y: zy });
      }

      if (!drawing || (isOneStrokeRef.current && hasSubmittedRef.current)) return;

      const rawPos = getCanvasPos(evt, canvas, isUpsideDownRef.current, isSpinningRef.current, spinStartTimeRef.current);
      let p = rawPos;

      if (isWobbleRef.current) {
        const angle = Date.now() / 35 + currentPointsRef.current.length * 0.5;
        const jX = Math.sin(angle) * 16 + (Math.random() - 0.5) * 10;
        const jY = Math.cos(angle) * 16 + (Math.random() - 0.5) * 10;
        p = { x: Math.max(0, Math.min(canvas.width, p.x + jX)), y: Math.max(0, Math.min(canvas.height, p.y + jY)) };
      }

      if (isGlitchRef.current) {
        if (Math.random() < 0.28) {
          const gx = (Math.random() - 0.5) * 45;
          const gy = (Math.random() - 0.5) * 45;
          p = { x: Math.max(0, Math.min(canvas.width, p.x + gx)), y: Math.max(0, Math.min(canvas.height, p.y + gy)) };
        }
      }

      // Input Delay queue
      if (isInputDelayRef.current) {
        delayedQueueRef.current.push({
          time: Date.now(),
          type: "move",
          p,
          color: colorRef.current,
          size: activeStrokeWidthRef.current
        });
        return;
      }

      // Rubberband Spring
      if (isRubberbandRef.current) {
        targetPointerRef.current = p;
        return;
      }

      if (isRandomBrushRef.current) {
        pointsSinceSizeShiftRef.current += 1;
        if (pointsSinceSizeShiftRef.current >= 6) {
          pointsSinceSizeShiftRef.current = 0;
          const randomSizes = [4, 8, 14, 22, 32, 42];
          currentDynamicSizeRef.current = randomSizes[Math.floor(Math.random() * randomSizes.length)]!;
          ctx.lineWidth = currentDynamicSizeRef.current;
        }
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

      if (isPixelArtRef.current) {
        drawPixelBlock(ctx, p, colorRef.current);
      } else if (isBubblesRef.current) {
        if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 14) {
          drawBubbleCluster(ctx, p, colorRef.current);
        }
      } else {
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

          if (isGravityDripRef.current && Math.random() < 0.12) {
            drawGravityDrip(ctx, p, colorRef.current);
          }
        }
      }

      setHasDrawn(true);
      onChangeRef.current?.();
    };

    const onUp = (evt: PointerEvent) => {
      if (!drawing) return;
      drawing = false;

      if (isInputDelayRef.current) {
        const p = getCanvasPos(evt, canvas, isUpsideDownRef.current, isSpinningRef.current, spinStartTimeRef.current);
        delayedQueueRef.current.push({
          time: Date.now(),
          type: "up",
          p,
          color: colorRef.current,
          size: activeStrokeWidthRef.current
        });
        return;
      }

      if (isRubberbandRef.current) {
        isSpringDrawingRef.current = false;
        targetPointerRef.current = null;
        setRubberbandDisplay(null);
      }

      if (isOneStrokeRef.current && hasSubmittedRef.current) {
        return;
      }

      if (currentPointsRef.current.length > 0) {
        const effectiveStrokeSize = isRandomBrushRef.current ? currentDynamicSizeRef.current : activeStrokeWidthRef.current;

        if (!strokeMovedRef.current && !isPixelArtRef.current && !isBubblesRef.current) {
          const p = currentPointsRef.current[0]!;
          ctx.beginPath();
          ctx.arc(p.x, p.y, effectiveStrokeSize / 2, 0, Math.PI * 2);
          if (isMirrorRef.current) {
            ctx.arc(canvas.width - p.x, p.y, effectiveStrokeSize / 2, 0, Math.PI * 2);
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
          brushSize: effectiveStrokeSize,
          color: hexToRgb(colorRef.current),
          opacity: 1,
          timestamp: Date.now()
        };
        strokesRef.current.push(newStroke);

        if (isMirrorRef.current) {
          strokesRef.current.push({
            id: Math.random().toString(36).substr(2, 9),
            playerId: playerIdRef.current,
            points: currentPointsRef.current.map((pt) => ({ x: canvas.width - pt.x, y: pt.y })),
            brushSize: effectiveStrokeSize,
            color: hexToRgb(colorRef.current),
            opacity: 1,
            timestamp: Date.now()
          });
        }

        if (isOneStrokeRef.current && canvasRef.current) {
          performSubmit();
        }
      }

      strokeStartRef.current = null;
      currentPointsRef.current = [];
      try {
        canvas.releasePointerCapture(evt.pointerId);
      } catch {}
    };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isZoom]);

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
    delayedQueueRef.current = [];
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

      <div
        ref={containerRef}
        className={`canvasWrap ${isZoom ? "trick-zoom-viewport" : ""}`}
        style={{ position: "relative", overflow: isSpinning || isZoom ? "hidden" : "visible" }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`canvas ${isSpinning ? "trick-spinning-canvas" : ""}`}
          style={{
            ...(isBlind ? { opacity: 0.05, filter: "blur(20px)" } : {}),
            ...(isZoom ? { transform: "scale(2.65)", transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`, transition: "transform-origin 0.04s ease-out" } : {})
          }}
        />

        {/* Rubberband visual elastic band */}
        {rubberbandDisplay && (
          <svg className="trick-rubberband-tether">
            <line
              x1={rubberbandDisplay.x1}
              y1={rubberbandDisplay.y1}
              x2={rubberbandDisplay.x2}
              y2={rubberbandDisplay.y2}
              stroke="#ec4899"
              strokeWidth={3}
              strokeDasharray="4,4"
            />
            <circle cx={rubberbandDisplay.x2} cy={rubberbandDisplay.y2} r={6} fill="#ec4899" />
          </svg>
        )}

        {isBlind && (
          <div
            style={{
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
            }}
          >
            🙈 Blind Drawing Active! Strokes are hidden!
          </div>
        )}

        {isInputDelay && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(249, 115, 22, 0.3)",
              border: "1px solid rgba(249, 115, 22, 0.6)",
              color: "#fed7aa",
              padding: "4px 12px",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 700,
              pointerEvents: "none"
            }}
          >
            ⏱️ 1.0s Input Lag
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
                  {props.trick === "large_brush"
                    ? "35px (Mega)"
                    : props.trick === "pixel_art"
                    ? "16px (Pixel Grid)"
                    : "🎲 Dynamic (Morphing)"}
                </span>
              )}
            </div>
          </div>

          <div className="row space" style={{ marginTop: "16px" }}>
            <button className="btn" onClick={clear}>
              Clear
            </button>

            <div className="muted">{hasDrawn ? "Nice." : "Draw your line!"}</div>

            <button
              className="btn primary"
              onClick={() => {
                if (props.oneStrokeMode && hasSubmittedRef.current) return;
                performSubmit();
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