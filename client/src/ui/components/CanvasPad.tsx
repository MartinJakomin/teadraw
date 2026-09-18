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

  rawX = Math.max(0, Math.min(canvas.width, rawX));
  rawY = Math.max(0, Math.min(canvas.height, rawY));

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
    rawX = Math.max(0, Math.min(canvas.width, rawX));
    rawY = Math.max(0, Math.min(canvas.height, rawY));
  }

  return {
    x: isUpsideDown ? canvas.width - rawX : rawX,
    y: isUpsideDown ? canvas.height - rawY : rawY
  };
}

const TYPO_CHARS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "K", "M", "N", "P", "R", "S", "T", "W", "X", "Y", "Z",
  "0", "1", "2", "3", "7", "8", "!", "?", "#", "$", "%", "&", "*", "@", "⚡", "✨", "🔥", "☕", "⭐️", "✏️", "❤️"
];

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
  colors?: string[];
  disabled?: boolean;
  initialDataUrl?: string;
  submitText?: string;
  oneStrokeMode?: boolean;
  autoSubmitOnOneStroke?: boolean;
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
  const isSnakeTail = props.trick === "snake_tail";
  const isTractorBeam = props.trick === "tractor_beam";
  const isSizeLocked = props.trick === "large_brush" || isRandomBrush || isPixelArt;
  const strokeWidth = props.trick === "large_brush" ? 35 : (props.strokeWidth ?? 10);

  const isOneStroke = Boolean(props.oneStrokeMode || props.trick === "one_stroke");
  const isBlind = props.trick === "blind";
  const isUpsideDown = props.trick === "upside_down";
  const isWobble = props.trick === "wobble";
  const isMirror = props.trick === "mirror";
  const isRubberband = props.trick === "rubberband";
  const isInputDelay = props.trick === "input_delay";
  const isSpinning = props.trick === "spinning";
  const isGlitch = props.trick === "glitch";
  const isGravityDrip = props.trick === "gravity_drip";
  const isSplitHalves = props.trick === "split_halves";
  const isFlashlight = props.trick === "flashlight";
  const isIceSkater = props.trick === "ice_skater";
  const isTypoStomp = props.trick === "typo_stomp";
  const isShadowFinger = props.trick === "shadow_finger";
  const isTrashCompactor = props.trick === "trash_compactor";
  const isPuzzleJumble = props.trick === "puzzle_jumble";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [color, setColor] = useState(props.initialColor ?? "#111111");
  const [size, setSize] = useState(strokeWidth);
  const activeStrokeWidth = isSizeLocked ? strokeWidth : size;

  const effectiveInkLimit = props.trick === "ink_limit" ? 3000 : props.inkLimit;
  const maxInk = effectiveInkLimit ?? 0;
  const [inkRemaining, setInkRemaining] = useState<number>(maxInk);
  const inkRemainingRef = useRef<number>(maxInk);

  // Spinning canvas reference timestamp
  const spinStartTimeRef = useRef(Date.now());

  // Trash compactor start timestamp & reactive progress (60 seconds)
  const compactorStartTimeRef = useRef(Date.now());
  const [compactorProgress, setCompactorProgress] = useState<number>(0);

  // Drawing state ref
  const drawingRef = useRef<boolean>(false);

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
  const pointsSinceGlitchRef = useRef<number>(0);
  const teleportOffsetRef = useRef<StrokePoint>({ x: 0, y: 0 });
  const isTeleportJumpRef = useRef<boolean>(false);

  // Slingshot Pull & Shoot physics state
  const slingshotAnchorRef = useRef<StrokePoint | null>(null);
  const slingshotPullRef = useRef<StrokePoint | null>(null);
  const isSlingshotAimingRef = useRef<boolean>(false);

  // Slingshot visual trajectory DOM refs
  const tetherSvgRef = useRef<SVGSVGElement | null>(null);
  const tetherPullLineRef = useRef<SVGLineElement | null>(null);
  const tetherAimPathRef = useRef<SVGPathElement | null>(null);
  const tetherAnchorCircleRef = useRef<SVGCircleElement | null>(null);
  const tetherPullCircleRef = useRef<SVGCircleElement | null>(null);
  const tetherTargetCircleRef = useRef<SVGCircleElement | null>(null);
  const tetherTargetCenterRef = useRef<SVGCircleElement | null>(null);

  // UFO Tractor Beam state & DOM
  const ufoPosRef = useRef<StrokePoint>({ x: 450, y: 36 });
  const ufoDomRef = useRef<HTMLDivElement | null>(null);
  const tractorBeamDomRef = useRef<HTMLDivElement | null>(null);

  // Flashlight overlay DOM ref
  const flashlightOverlayRef = useRef<HTMLDivElement | null>(null);

  // Reverse Spotlight shadow finger overlay DOM ref
  const shadowOverlayRef = useRef<HTMLDivElement | null>(null);

  // Typo Stomp step accumulator distance
  const typoDistAccumulatorRef = useRef<number>(0);

  // Ice Skater slippery physics state
  const icePosRef = useRef<StrokePoint | null>(null);
  const iceVelRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });

  // Delayed events queue for 2s Input Lag
  const delayedQueueRef = useRef<Array<{
    time: number;
    type: "down" | "move" | "up";
    p: StrokePoint;
    color: string;
    size: number;
  }>>([]);

  // Vanishing segments for 2s Input Lag + 2s Vanishing display
  const vanishingSegmentsRef = useRef<Array<{
    p1: StrokePoint;
    p2: StrokePoint;
    color: string;
    size: number;
    spawnTime: number;
  }>>([]);
  const delayedInProgressPointsRef = useRef<StrokePoint[]>([]);

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
  const isSplitHalvesRef = useRef(isSplitHalves);
  isSplitHalvesRef.current = isSplitHalves;
  const isFlashlightRef = useRef(isFlashlight);
  isFlashlightRef.current = isFlashlight;
  const isIceSkaterRef = useRef(isIceSkater);
  isIceSkaterRef.current = isIceSkater;
  const isTypoStompRef = useRef(isTypoStomp);
  isTypoStompRef.current = isTypoStomp;
  const isShadowFingerRef = useRef(isShadowFinger);
  isShadowFingerRef.current = isShadowFinger;
  const isTrashCompactorRef = useRef(isTrashCompactor);
  isTrashCompactorRef.current = isTrashCompactor;
  const isPuzzleJumbleRef = useRef(isPuzzleJumble);
  isPuzzleJumbleRef.current = isPuzzleJumble;
  const isSnakeTailRef = useRef(isSnakeTail);
  isSnakeTailRef.current = isSnakeTail;
  const isTractorBeamRef = useRef(isTractorBeam);
  isTractorBeamRef.current = isTractorBeam;

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
  }, [props.disabled, props.endTime]);

  // Helper to draw cute snake head (with eyes & forked tongue) and tail (rattle beads)
  const drawSnakeDetails = (
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    snakeColorStr: string,
    brushSize: number
  ) => {
    if (points.length < 2) return;

    // --- DRAW SNAKE HEAD (at the latest / front point) ---
    const head = points[points.length - 1]!;
    let prevHead = points[points.length - 2]!;
    for (let i = points.length - 2; i >= 0; i--) {
      const d = Math.hypot(head.x - points[i]!.x, head.y - points[i]!.y);
      if (d >= 3) {
        prevHead = points[i]!;
        break;
      }
    }

    const headAngle = Math.atan2(head.y - prevHead.y, head.x - prevHead.x);
    const headScale = Math.max(11, brushSize * 1.05);

    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(headAngle);

    // 1. Red Forked Tongue sticking out front
    ctx.save();
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = Math.max(2, headScale * 0.18);
    ctx.lineCap = "round";
    ctx.beginPath();
    const tStart = headScale * 0.8;
    const tMid = tStart + headScale * 0.75;
    const tFork = headScale * 0.45;
    ctx.moveTo(tStart, 0);
    ctx.lineTo(tMid, 0);
    // Fork tips
    ctx.moveTo(tMid, 0);
    ctx.lineTo(tMid + tFork, -headScale * 0.28);
    ctx.moveTo(tMid, 0);
    ctx.lineTo(tMid + tFork, headScale * 0.28);
    ctx.stroke();
    ctx.restore();

    // 2. Head base shape (cute rounded viper/cobra head)
    ctx.save();
    ctx.fillStyle = snakeColorStr;
    ctx.beginPath();
    ctx.ellipse(headScale * 0.2, 0, headScale * 1.15, headScale * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 3. Expressive Eyes
    const eyeOffsetX = headScale * 0.32;
    const eyeOffsetY = headScale * 0.52;
    const eyeRadius = Math.max(3.2, headScale * 0.28);
    const pupilRadius = Math.max(1.8, eyeRadius * 0.58);

    // Eye Whites
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(eyeOffsetX, -eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pupils (looking forward)
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(eyeOffsetX + eyeRadius * 0.32, -eyeOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + eyeRadius * 0.32, eyeOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight shine in eyes
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(eyeOffsetX + eyeRadius * 0.45, -eyeOffsetY - pupilRadius * 0.3, pupilRadius * 0.42, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + eyeRadius * 0.45, eyeOffsetY - pupilRadius * 0.3, pupilRadius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore(); // Restore head transform

    // --- DRAW SNAKE TAIL (at the oldest / back point) ---
    const tail = points[0]!;
    let nextTail = points[1]!;
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(tail.x - points[i]!.x, tail.y - points[i]!.y);
      if (d >= 3) {
        nextTail = points[i]!;
        break;
      }
    }

    const tailAngle = Math.atan2(tail.y - nextTail.y, tail.x - nextTail.x);
    const tailBaseRadius = Math.max(7, brushSize * 0.75);

    ctx.save();
    ctx.translate(tail.x, tail.y);
    ctx.rotate(tailAngle);

    // 3-segment tapered rattle beads
    const rattleColors = ["#eab308", "#ca8a04", "#a16207"];
    for (let b = 0; b < 3; b++) {
      const beadDist = (b + 1) * (tailBaseRadius * 0.88);
      const beadR = Math.max(2.2, tailBaseRadius * (0.8 - b * 0.22));
      ctx.fillStyle = rattleColors[b] ?? "#ca8a04";
      ctx.beginPath();
      ctx.arc(beadDist, 0, beadR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore(); // Restore tail transform
  };

  // Helper to cleanly redraw all recorded strokes for full permanent export
  const redrawAllStrokes = (
    targetCtx: CanvasRenderingContext2D,
    targetCanvas: HTMLCanvasElement,
    allStrokes: StrokeEvent[],
    currentInProgressPoints?: StrokePoint[]
  ) => {
    targetCtx.fillStyle = "#fff";
    targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    for (const s of allStrokes) {
      if (s.points.length < 1) continue;
      targetCtx.lineCap = "round";
      targetCtx.lineJoin = "round";
      targetCtx.strokeStyle = `rgb(${s.color.r},${s.color.g},${s.color.b})`;
      targetCtx.lineWidth = s.brushSize;
      targetCtx.globalAlpha = s.opacity ?? 1;

      if (s.points.length === 1) {
        targetCtx.beginPath();
        targetCtx.arc(s.points[0]!.x, s.points[0]!.y, s.brushSize / 2, 0, Math.PI * 2);
        targetCtx.fillStyle = `rgb(${s.color.r},${s.color.g},${s.color.b})`;
        targetCtx.fill();
      } else {
        targetCtx.beginPath();
        targetCtx.moveTo(s.points[0]!.x, s.points[0]!.y);
        for (let i = 1; i < s.points.length; i++) {
          targetCtx.lineTo(s.points[i]!.x, s.points[i]!.y);
        }
        targetCtx.stroke();
      }
    }
    targetCtx.globalAlpha = 1;

    // Draw current in-progress points if supplied
    if (currentInProgressPoints && currentInProgressPoints.length > 0) {
      targetCtx.save();
      targetCtx.lineCap = "round";
      targetCtx.lineJoin = "round";
      targetCtx.strokeStyle = colorRef.current;
      targetCtx.lineWidth = activeStrokeWidthRef.current;
      if (currentInProgressPoints.length === 1) {
        targetCtx.beginPath();
        targetCtx.arc(currentInProgressPoints[0]!.x, currentInProgressPoints[0]!.y, activeStrokeWidthRef.current / 2, 0, Math.PI * 2);
        targetCtx.fillStyle = colorRef.current;
        targetCtx.fill();
      } else {
        targetCtx.beginPath();
        targetCtx.moveTo(currentInProgressPoints[0]!.x, currentInProgressPoints[0]!.y);
        for (let i = 1; i < currentInProgressPoints.length; i++) {
          targetCtx.lineTo(currentInProgressPoints[i]!.x, currentInProgressPoints[i]!.y);
        }
        targetCtx.stroke();
      }
      targetCtx.restore();
    }

    if (isSnakeTailRef.current) {
      const allPoints: StrokePoint[] = [];
      for (const s of allStrokes) {
        for (const pt of s.points) {
          allPoints.push(pt);
        }
      }
      if (currentInProgressPoints) {
        for (const pt of currentInProgressPoints) {
          allPoints.push(pt);
        }
      }
      if (allPoints.length >= 2) {
        const lastStroke = allStrokes.length > 0 ? allStrokes[allStrokes.length - 1] : null;
        const strokeColor = lastStroke
          ? `rgb(${lastStroke.color.r},${lastStroke.color.g},${lastStroke.color.b})`
          : colorRef.current;
        const bSize = lastStroke ? lastStroke.brushSize : activeStrokeWidthRef.current;
        drawSnakeDetails(targetCtx, allPoints, strokeColor, bSize);
      }
    }
  };

  // Flush and submit drawing safely
  const performSubmit = () => {
    if (hasSubmittedRef.current || disabledRef.current) return;
    hasSubmittedRef.current = true;
    const canvas = canvasRef.current;
    if (canvas) {
      // If user was mid-drawing when submit fired, flush unfinished points into strokes
      if (currentPointsRef.current.length > 0) {
        const effectiveStrokeSize = isRandomBrushRef.current ? currentDynamicSizeRef.current : activeStrokeWidthRef.current;
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
        currentPointsRef.current = [];
      }

      // If input delay mode was active, flush remaining queue items and re-render the full drawing
      if (isInputDelayRef.current) {
        if (delayedInProgressPointsRef.current.length > 0) {
          strokesRef.current.push({
            id: Math.random().toString(36).substr(2, 9),
            playerId: playerIdRef.current,
            points: [...delayedInProgressPointsRef.current],
            brushSize: activeStrokeWidthRef.current,
            color: hexToRgb(colorRef.current),
            opacity: 1,
            timestamp: Date.now()
          });
          delayedInProgressPointsRef.current = [];
        }

        const queue = delayedQueueRef.current;
        let delayedCurrentPoints: StrokePoint[] = [];
        let lastSize = activeStrokeWidthRef.current;
        let lastColor = colorRef.current;

        for (const item of queue) {
          lastSize = item.size;
          lastColor = item.color;
          if (item.type === "down") {
            if (delayedCurrentPoints.length > 0) {
              strokesRef.current.push({
                id: Math.random().toString(36).substr(2, 9),
                playerId: playerIdRef.current,
                points: [...delayedCurrentPoints],
                brushSize: lastSize,
                color: hexToRgb(lastColor),
                opacity: 1,
                timestamp: Date.now()
              });
            }
            delayedCurrentPoints = [item.p];
          } else if (item.type === "move") {
            delayedCurrentPoints.push(item.p);
          } else if (item.type === "up") {
            if (delayedCurrentPoints.length > 0) {
              strokesRef.current.push({
                id: Math.random().toString(36).substr(2, 9),
                playerId: playerIdRef.current,
                points: [...delayedCurrentPoints],
                brushSize: item.size,
                color: hexToRgb(item.color),
                opacity: 1,
                timestamp: Date.now()
              });
              delayedCurrentPoints = [];
            }
          }
        }
        if (delayedCurrentPoints.length > 0) {
          strokesRef.current.push({
            id: Math.random().toString(36).substr(2, 9),
            playerId: playerIdRef.current,
            points: [...delayedCurrentPoints],
            brushSize: lastSize,
            color: hexToRgb(lastColor),
            opacity: 1,
            timestamp: Date.now()
          });
        }
        delayedQueueRef.current = [];

        const ctx = canvas.getContext("2d");
        if (ctx) {
          redrawAllStrokes(ctx, canvas, strokesRef.current);
        }
      }

      // Guillotine Chop: Randomly slice off a plane (half) of the final image upon submission
      if (isSplitHalvesRef.current) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const plane = Math.floor(Math.random() * 6);
          const w = canvas.width;
          const h = canvas.height;

          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";

          if (plane === 0) {
            // Left Half Chopped (X < w / 2)
            ctx.fillRect(0, 0, w / 2, h);
            ctx.beginPath();
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w / 2, h);
            ctx.stroke();
          } else if (plane === 1) {
            // Right Half Chopped (X > w / 2)
            ctx.fillRect(w / 2, 0, w / 2, h);
            ctx.beginPath();
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w / 2, h);
            ctx.stroke();
          } else if (plane === 2) {
            // Top Half Chopped (Y < h / 2)
            ctx.fillRect(0, 0, w, h / 2);
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();
          } else if (plane === 3) {
            // Bottom Half Chopped (Y > h / 2)
            ctx.fillRect(0, h / 2, w, h / 2);
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();
          } else if (plane === 4) {
            // Top-Left Diagonal Half Chopped
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(w, 0);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(w, 0);
            ctx.lineTo(0, h);
            ctx.stroke();
          } else {
            // Bottom-Right Diagonal Half Chopped
            ctx.beginPath();
            ctx.moveTo(w, 0);
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(w, 0);
            ctx.lineTo(0, h);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // Puzzle Jumble: Full 3x3 (9 tiles) scramble with numbered badges indicating original order
      if (isPuzzleJumbleRef.current) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const rows = 3;
          const cols = 3;
          const tw = w / cols;
          const th = h / rows;
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = w;
          tempCanvas.height = h;
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0);

            // Generate a full random permutation of all 9 tiles (0..8)
            const perm = [0, 1, 2, 3, 4, 5, 6, 7, 8];
            for (let i = perm.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              const temp = perm[i]!;
              perm[i] = perm[j]!;
              perm[j] = temp;
            }
            if (perm.every((val, idx) => val === idx)) {
              const temp = perm[0]!;
              perm[0] = perm[1]!;
              perm[1] = temp;
            }

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);

            for (let d = 0; d < 9; d++) {
              const srcIndex = perm[d]!;
              const srcR = Math.floor(srcIndex / cols);
              const srcC = srcIndex % cols;
              const dstR = Math.floor(d / cols);
              const dstC = d % cols;

              const sx = srcC * tw;
              const sy = srcR * th;
              const dx = dstC * tw;
              const dy = dstR * th;

              ctx.drawImage(tempCanvas, sx, sy, tw, th, dx, dy, tw, th);

              // Stamp badge with original correct tile number (#1 to #9)
              ctx.save();
              const badgeX = dx + 10;
              const badgeY = dy + 10;
              const badgeSize = 28;

              ctx.fillStyle = "rgba(15, 23, 42, 0.90)";
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 6);
              } else {
                ctx.rect(badgeX, badgeY, badgeSize, badgeSize);
              }
              ctx.fill();
              ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#ffffff";
              ctx.fillText(String(srcIndex + 1), badgeX + badgeSize / 2, badgeY + badgeSize / 2);
              ctx.restore();
            }

            // Draw clean puzzle cut grid lines
            ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
            ctx.lineWidth = 2.5;
            for (let c = 1; c < cols; c++) {
              ctx.beginPath();
              ctx.moveTo(c * tw, 0);
              ctx.lineTo(c * tw, h);
              ctx.stroke();
            }
            for (let r = 1; r < rows; r++) {
              ctx.beginPath();
              ctx.moveTo(0, r * th);
              ctx.lineTo(w, r * th);
              ctx.stroke();
            }
          }
        }
      }

      const url = canvas.toDataURL("image/png");
      onSubmitRef.current(url, strokesRef.current);
    }
  };

  // Auto-submit when timer expires
  useEffect(() => {
    if (!props.endTime || props.disabled || hasSubmittedRef.current) return;
    const check = setInterval(() => {
      const remaining = props.endTime! - Date.now();
      if (remaining <= 0 && !hasSubmittedRef.current && !disabledRef.current) {
        clearInterval(check);
        performSubmit();
      }
    }, 150);
    return () => clearInterval(check);
  }, [props.endTime, props.disabled]);

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

  // Helper to get open compactor bounding box inside shrinking walls
  const getCompactorBounds = (w: number, h: number, progress: number) => {
    if (progress <= 0) return { minX: 0, maxX: w, minY: 0, maxY: h };
    const wallPercent = Math.min(0.485, progress * 0.485);
    return {
      minX: w * wallPercent,
      maxX: w * (1 - wallPercent),
      minY: h * wallPercent,
      maxY: h * (1 - wallPercent)
    };
  };

  // Helper to draw bubbles stamp (compact bubble clusters with high variance)
  const drawBubbleCluster = (ctx: CanvasRenderingContext2D, center: StrokePoint, bubbleColor: string) => {
    const count = Math.floor(Math.random() * 3) + 1; // 1 to 3 bubbles
    for (let i = 0; i < count; i++) {
      const radius = Math.floor(Math.random() * 10) + 3; // 3px to 13px compact size
      const offsetX = (Math.random() - 0.5) * 18;
      const offsetY = (Math.random() - 0.5) * 18;
      const bx = center.x + offsetX;
      const by = center.y + offsetY;

      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fillStyle = bubbleColor + "55"; // translucent
      ctx.fill();
      ctx.lineWidth = Math.max(1.2, radius * 0.12);
      ctx.strokeStyle = bubbleColor;
      ctx.stroke();

      // Specular white highlight on bubble
      ctx.beginPath();
      ctx.arc(bx - radius * 0.35, by - radius * 0.35, Math.max(1.0, radius * 0.28), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.fill();
      ctx.restore();
    }
  };

  // Helper to draw gravity paint drip (heavy, thick dripping streams)
  const drawGravityDrip = (ctx: CanvasRenderingContext2D, point: StrokePoint, dripColor: string) => {
    const streamCount = Math.random() < 0.5 ? 1 : 2;
    for (let s = 0; s < streamCount; s++) {
      const spreadAngle = (Math.random() - 0.5) * (Math.PI * 0.5);
      const dripLen = Math.floor(Math.random() * 75) + 35; // 35px to 110px
      const dripWidth = Math.max(4, activeStrokeWidthRef.current * (0.6 + Math.random() * 0.7)); // thicker drips
      const endX = point.x + Math.sin(spreadAngle) * (dripLen * 0.5);
      const endY = point.y + Math.cos(spreadAngle) * dripLen;

      ctx.save();
      ctx.strokeStyle = dripColor;
      ctx.fillStyle = dripColor;
      ctx.lineWidth = dripWidth;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      const midX = (point.x + endX) / 2 + (Math.random() - 0.5) * 8;
      const midY = (point.y + endY) / 2;
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();

      // Droplet bead at tip
      ctx.beginPath();
      ctx.arc(endX, endY, dripWidth * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Heavy falling splatter drop
      if (Math.random() < 0.55) {
        const fallDist = Math.floor(Math.random() * 28) + 14;
        ctx.beginPath();
        ctx.arc(endX + Math.sin(spreadAngle) * fallDist, endY + Math.cos(spreadAngle) * fallDist, dripWidth * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // Helper to draw pixel block (32px chunky arcade grid)
  const drawPixelBlock = (ctx: CanvasRenderingContext2D, point: StrokePoint, blockColor: string) => {
    const gridSize = 32;
    const gx = Math.floor(point.x / gridSize) * gridSize;
    const gy = Math.floor(point.y / gridSize) * gridSize;

    ctx.save();
    ctx.fillStyle = blockColor;
    ctx.fillRect(gx, gy, gridSize, gridSize);
    ctx.restore();
  };

  // Helper to trim snake strokes in real-time across committed and in-progress strokes
  const trimSnakeToLength = (strokes: StrokeEvent[], currentPoints: StrokePoint[], maxTotalLength = 3500) => {
    let totalLength = 0;
    for (const s of strokes) {
      for (let i = 1; i < s.points.length; i++) {
        totalLength += Math.hypot(s.points[i]!.x - s.points[i - 1]!.x, s.points[i]!.y - s.points[i - 1]!.y);
      }
    }
    for (let i = 1; i < currentPoints.length; i++) {
      totalLength += Math.hypot(currentPoints[i]!.x - currentPoints[i - 1]!.x, currentPoints[i]!.y - currentPoints[i - 1]!.y);
    }
    if (totalLength <= maxTotalLength) return false;

    let modified = false;
    while (totalLength > maxTotalLength) {
      if (strokes.length > 0) {
        const oldestStroke = strokes[0]!;
        if (oldestStroke.points.length <= 1) {
          strokes.shift();
          modified = true;
          continue;
        }
        const p0 = oldestStroke.points[0]!;
        const p1 = oldestStroke.points[1]!;
        const segDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        oldestStroke.points.shift();
        totalLength -= segDist;
        modified = true;
      } else if (currentPoints.length > 1) {
        const p0 = currentPoints[0]!;
        const p1 = currentPoints[1]!;
        const segDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        currentPoints.shift();
        totalLength -= segDist;
        modified = true;
      } else {
        break;
      }
    }
    return modified;
  };

  // Direct DOM Slingshot trajectory updater with curved ballistic arc preview
  const updateSlingshotDOM = (anchor: StrokePoint, pull: StrokePoint) => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      !tetherSvgRef.current ||
      !tetherPullLineRef.current ||
      !tetherAimPathRef.current ||
      !tetherAnchorCircleRef.current ||
      !tetherPullCircleRef.current ||
      !tetherTargetCircleRef.current ||
      !tetherTargetCenterRef.current
    )
      return;

    const rect = canvas.getBoundingClientRect();
    const ax = (anchor.x / canvas.width) * rect.width;
    const ay = (anchor.y / canvas.height) * rect.height;
    const px = (pull.x / canvas.width) * rect.width;
    const py = (pull.y / canvas.height) * rect.height;

    const dx = pull.x - anchor.x;
    const dy = pull.y - anchor.y;
    const pullDist = Math.hypot(dx, dy);

    // Calculate opposite firing vector with ballistic gravity drop
    const flingPower = Math.min(320, pullDist * 2.2);
    const angle = Math.atan2(-dy, -dx);
    const targetX = Math.max(10, Math.min(canvas.width - 10, anchor.x + Math.cos(angle) * flingPower));
    const targetY = Math.max(10, Math.min(canvas.height - 10, anchor.y + Math.sin(angle) * flingPower));

    const tx = (targetX / canvas.width) * rect.width;
    const ty = (targetY / canvas.height) * rect.height;

    const midX = (ax + tx) / 2;
    const curveDrop = Math.min(55, pullDist * 0.22) * (rect.height / canvas.height);
    const midY = (ay + ty) / 2 + curveDrop;

    tetherSvgRef.current.style.display = "block";

    // 1. Pull elastic cord
    tetherPullLineRef.current.setAttribute("x1", String(ax));
    tetherPullLineRef.current.setAttribute("y1", String(ay));
    tetherPullLineRef.current.setAttribute("x2", String(px));
    tetherPullLineRef.current.setAttribute("y2", String(py));

    // 2. Aiming trajectory ballistic curved path
    tetherAimPathRef.current.setAttribute("d", `M ${ax} ${ay} Q ${midX} ${midY} ${tx} ${ty}`);

    // 3. Anchor & Pull markers
    tetherAnchorCircleRef.current.setAttribute("cx", String(ax));
    tetherAnchorCircleRef.current.setAttribute("cy", String(ay));
    tetherPullCircleRef.current.setAttribute("cx", String(px));
    tetherPullCircleRef.current.setAttribute("cy", String(py));

    // 4. Target landing reticle
    tetherTargetCircleRef.current.setAttribute("cx", String(tx));
    tetherTargetCircleRef.current.setAttribute("cy", String(ty));
    tetherTargetCenterRef.current.setAttribute("cx", String(tx));
    tetherTargetCenterRef.current.setAttribute("cy", String(ty));
  };

  const hideTetherDOM = () => {
    if (tetherSvgRef.current) {
      tetherSvgRef.current.style.display = "none";
    }
  };

  // Direct DOM Flashlight spotlight updater (zero React re-renders)
  const updateFlashlightDOM = (clientX: number, clientY: number) => {
    if (!flashlightOverlayRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fx = clientX - rect.left;
    const fy = clientY - rect.top;
    flashlightOverlayRef.current.style.background = `radial-gradient(circle 65px at ${fx}px ${fy}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 42px, rgba(0,0,0,0.92) 58px, #000000 65px, #000000 100%)`;
  };

  // Direct DOM Reverse Spotlight shadow finger updater (enlarged dark eclipse circle)
  const updateShadowDOM = (clientX: number, clientY: number) => {
    if (!shadowOverlayRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fx = clientX - rect.left;
    const fy = clientY - rect.top;
    shadowOverlayRef.current.style.background = `radial-gradient(circle 165px at ${fx}px ${fy}px, #000000 0%, #000000 135px, rgba(0,0,0,0.85) 150px, rgba(0,0,0,0) 165px)`;
  };

  // Real-time animation loop for 2s Input Delay + Vanishing Ink, Helium Drift & Trash Compactor
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      // Trash Compactor: 5-second delay before starting, then smooth 60s shrink of available drawing boundary
      if (isTrashCompactorRef.current && !hasSubmittedRef.current && canvas && ctx) {
        const elapsed = Date.now() - compactorStartTimeRef.current;
        const progress = elapsed < 5000 ? 0 : Math.min(1, (elapsed - 5000) / 60000);
        setCompactorProgress(progress);
      }

      // Alien Vaporizer Beam: Charges up every few seconds and completely removes all ink/area in the beam
      if (isTractorBeamRef.current && !hasSubmittedRef.current && canvas) {
        const t = Date.now();
        const cycle = t % 4200; // 4.2s cycle
        const isCharging = cycle >= 2200 && cycle < 3200;
        const isFiring = cycle >= 3200 && cycle < 3800;

        if (!isCharging && !isFiring) {
          // Patrol movement
          const ufoX = canvas.width / 2 + Math.sin(t / 1100) * (canvas.width * 0.38);
          ufoPosRef.current = { x: ufoX, y: 36 };
        }

        const ufoX = ufoPosRef.current.x;
        const ufoY = ufoPosRef.current.y;

        if (ufoDomRef.current && tractorBeamDomRef.current && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const screenX = (ufoX / canvas.width) * rect.width;
          const screenY = (ufoY / canvas.height) * rect.height;

          ufoDomRef.current.style.transform = `translate(${screenX - 32}px, ${screenY - 24}px)`;

          if (isFiring) {
            // Intense vertical disintegrator laser column
            const beamW = (130 / canvas.width) * rect.width;
            tractorBeamDomRef.current.style.transform = `translate(${screenX - beamW / 2}px, ${screenY + 12}px)`;
            tractorBeamDomRef.current.style.width = `${beamW}px`;
            tractorBeamDomRef.current.style.height = `${rect.height - screenY - 12}px`;
            tractorBeamDomRef.current.style.clipPath = "none";
            tractorBeamDomRef.current.style.background = "linear-gradient(to bottom, #ffffff 0%, rgba(56, 189, 248, 0.95) 30%, rgba(34, 197, 94, 0.8) 100%)";
            tractorBeamDomRef.current.style.boxShadow = "0 0 45px rgba(56, 189, 248, 0.95), inset 0 0 20px #fff";
            tractorBeamDomRef.current.style.opacity = "1";
            ufoDomRef.current.style.filter = "drop-shadow(0 0 25px #38bdf8)";
          } else if (isCharging) {
            // Flashing warning beam
            const beamHalf = (80 / canvas.width) * rect.width;
            tractorBeamDomRef.current.style.transform = `translate(${screenX - beamHalf}px, ${screenY + 12}px)`;
            tractorBeamDomRef.current.style.width = `${beamHalf * 2}px`;
            tractorBeamDomRef.current.style.height = `${rect.height - screenY - 12}px`;
            tractorBeamDomRef.current.style.clipPath = "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)";
            const flash = (t % 200) < 100;
            tractorBeamDomRef.current.style.background = flash
              ? "linear-gradient(to bottom, rgba(239, 68, 68, 0.75) 0%, rgba(249, 115, 22, 0.35) 100%)"
              : "linear-gradient(to bottom, rgba(239, 68, 68, 0.3) 0%, rgba(249, 115, 22, 0.1) 100%)";
            tractorBeamDomRef.current.style.boxShadow = "0 0 30px rgba(239, 68, 68, 0.8)";
            tractorBeamDomRef.current.style.opacity = "1";
            ufoDomRef.current.style.filter = "drop-shadow(0 0 20px #ef4444)";
          } else {
            // Calm scanning cone
            const beamHalf = (90 / canvas.width) * rect.width;
            tractorBeamDomRef.current.style.transform = `translate(${screenX - beamHalf}px, ${screenY + 12}px)`;
            tractorBeamDomRef.current.style.width = `${beamHalf * 2}px`;
            tractorBeamDomRef.current.style.height = `${rect.height - screenY - 12}px`;
            tractorBeamDomRef.current.style.clipPath = "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)";
            tractorBeamDomRef.current.style.background = "linear-gradient(to bottom, rgba(74, 222, 128, 0.35) 0%, rgba(34, 197, 94, 0.1) 85%, rgba(34, 197, 94, 0) 100%)";
            tractorBeamDomRef.current.style.boxShadow = "0 0 20px rgba(74, 222, 128, 0.4)";
            tractorBeamDomRef.current.style.opacity = "0.75";
            ufoDomRef.current.style.filter = "drop-shadow(0 0 14px rgba(74, 222, 128, 0.8))";
          }
        }

        // Disintegrate & split strokes across beam during firing phase
        if (isFiring && ctx) {
          const beamLeft = ufoX - 65;
          const beamRight = ufoX + 65;
          let modified = false;
          const nextStrokes: StrokeEvent[] = [];

          for (const s of strokesRef.current) {
            let curChunk: StrokePoint[] = [];
            for (const pt of s.points) {
              if (pt.x >= beamLeft && pt.x <= beamRight) {
                if (curChunk.length > 0) {
                  nextStrokes.push({ ...s, id: Math.random().toString(36).substr(2, 9), points: curChunk });
                  curChunk = [];
                }
                modified = true;
              } else {
                curChunk.push(pt);
              }
            }
            if (curChunk.length > 0) {
              if (modified) {
                nextStrokes.push({ ...s, id: Math.random().toString(36).substr(2, 9), points: curChunk });
              } else {
                nextStrokes.push(s);
              }
            }
          }

          if (currentPointsRef.current.length > 0) {
            const beforeLen = currentPointsRef.current.length;
            currentPointsRef.current = currentPointsRef.current.filter((pt) => pt.x < beamLeft || pt.x > beamRight);
            if (currentPointsRef.current.length !== beforeLen) {
              modified = true;
            }
          }

          if (modified) {
            strokesRef.current = nextStrokes;
            redrawAllStrokes(ctx, canvas, strokesRef.current);
          }

          // Visual clear of the vaporized beam column on canvas
          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(beamLeft, 0, beamRight - beamLeft, canvas.height);
          ctx.restore();
        }
      }

      if (isInputDelayRef.current && canvas && ctx && !hasSubmittedRef.current) {
        const now = Date.now();
        const queue = delayedQueueRef.current;

        // Process queue items that have reached 2000ms delay
        while (queue.length > 0 && now - queue[0]!.time >= 2000) {
          const item = queue.shift()!;

          if (item.type === "down") {
            delayedInProgressPointsRef.current = [item.p];
          } else if (item.type === "move") {
            const prev = delayedInProgressPointsRef.current[delayedInProgressPointsRef.current.length - 1];
            delayedInProgressPointsRef.current.push(item.p);
            if (prev) {
              vanishingSegmentsRef.current.push({
                p1: prev,
                p2: item.p,
                color: item.color,
                size: item.size,
                spawnTime: item.time
              });
            }
            setHasDrawn(true);
            onChangeRef.current?.();
          } else if (item.type === "up") {
            if (delayedInProgressPointsRef.current.length > 0) {
              const newStroke: StrokeEvent = {
                id: Math.random().toString(36).substr(2, 9),
                playerId: playerIdRef.current,
                points: [...delayedInProgressPointsRef.current],
                brushSize: item.size,
                color: hexToRgb(item.color),
                opacity: 1,
                timestamp: Date.now()
              };
              strokesRef.current.push(newStroke);
              delayedInProgressPointsRef.current = [];
            }
          }
        }

        // Clean up segments older than 4000ms (2000ms delay + 2000ms visible = 4000ms total)
        vanishingSegmentsRef.current = vanishingSegmentsRef.current.filter(
          (seg) => now - seg.spawnTime < 4000
        );

        // Render visible vanishing segments to canvas
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (const seg of vanishingSegmentsRef.current) {
          const elapsedSinceSpawn = now - seg.spawnTime;
          if (elapsedSinceSpawn >= 2000 && elapsedSinceSpawn < 4000) {
            // Smoothly dissolve in the last 600ms before vanishing
            const alpha = elapsedSinceSpawn > 3400 ? Math.max(0, (4000 - elapsedSinceSpawn) / 600) : 1;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = seg.color;
            ctx.lineWidth = seg.size;
            ctx.beginPath();
            ctx.moveTo(seg.p1.x, seg.p1.y);
            ctx.lineTo(seg.p2.x, seg.p2.y);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
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
      drawingRef.current = true;
      strokeMovedRef.current = false;
      try {
        canvas.setPointerCapture(evt.pointerId);
      } catch {}

      if (isFlashlightRef.current) {
        updateFlashlightDOM(evt.clientX, evt.clientY);
      }
      if (isShadowFingerRef.current) {
        updateShadowDOM(evt.clientX, evt.clientY);
      }

      let p = getCanvasPos(
        evt,
        canvas,
        isUpsideDownRef.current,
        isSpinningRef.current,
        spinStartTimeRef.current
      );

      // Trash Compactor: block drawing outside the active open area
      if (isTrashCompactorRef.current) {
        const elapsed = Date.now() - compactorStartTimeRef.current;
        const prog = elapsed < 5000 ? 0 : Math.min(1, (elapsed - 5000) / 60000);
        const bounds = getCompactorBounds(canvas.width, canvas.height, prog);
        if (p.x < bounds.minX || p.x > bounds.maxX || p.y < bounds.minY || p.y > bounds.maxY) {
          return;
        }
      }

      if (isIceSkaterRef.current) {
        icePosRef.current = { ...p };
        iceVelRef.current = { vx: 0, vy: 0 };
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

      // Slingshot Pull & Shoot mode
      if (isRubberbandRef.current) {
        slingshotAnchorRef.current = { ...p };
        slingshotPullRef.current = { ...p };
        isSlingshotAimingRef.current = true;
        updateSlingshotDOM(p, p);
        return;
      }

      if (isGlitchRef.current) {
        teleportOffsetRef.current = { x: 0, y: 0 };
        isTeleportJumpRef.current = false;
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
      } else if (isTypoStompRef.current) {
        typoDistAccumulatorRef.current = 0;
        ctx.save();
        ctx.font = `bold ${Math.max(16, activeStrokeWidthRef.current * 1.5)}px "Comic Sans MS", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = colorRef.current;
        const char = TYPO_CHARS[Math.floor(Math.random() * TYPO_CHARS.length)]!;
        ctx.fillText(char, p.x, p.y);
        ctx.restore();
        setHasDrawn(true);
        onChangeRef.current?.();
      }
    };

    const onMove = (evt: PointerEvent) => {
      if (isFlashlightRef.current) {
        updateFlashlightDOM(evt.clientX, evt.clientY);
      }
      if (isShadowFingerRef.current) {
        updateShadowDOM(evt.clientX, evt.clientY);
      }

      if (!drawing || (isOneStrokeRef.current && hasSubmittedRef.current)) return;

      const rawPos = getCanvasPos(
        evt,
        canvas,
        isUpsideDownRef.current,
        isSpinningRef.current,
        spinStartTimeRef.current
      );
      let p = rawPos;

      // Trash Compactor: clamp position to open wall boundary
      if (isTrashCompactorRef.current) {
        const elapsed = Date.now() - compactorStartTimeRef.current;
        const prog = elapsed < 5000 ? 0 : Math.min(1, (elapsed - 5000) / 60000);
        const bounds = getCompactorBounds(canvas.width, canvas.height, prog);
        p = {
          x: Math.max(bounds.minX, Math.min(bounds.maxX, p.x)),
          y: Math.max(bounds.minY, Math.min(bounds.maxY, p.y))
        };
      }

      if (isWobbleRef.current) {
        const angle = Date.now() / 35 + currentPointsRef.current.length * 0.5;
        const jX = Math.sin(angle) * 16 + (Math.random() - 0.5) * 10;
        const jY = Math.cos(angle) * 16 + (Math.random() - 0.5) * 10;
        p = { x: Math.max(0, Math.min(canvas.width, p.x + jX)), y: Math.max(0, Math.min(canvas.height, p.y + jY)) };
      }

      // Slingshot Aiming
      if (isRubberbandRef.current && isSlingshotAimingRef.current && slingshotAnchorRef.current) {
        slingshotPullRef.current = p;
        updateSlingshotDOM(slingshotAnchorRef.current, p);
        return;
      }

      // Ice Skater: Smooth gliding inertia & momentum slide physics (frictionless ice)
      if (isIceSkaterRef.current && icePosRef.current) {
        const currentIce = icePosRef.current;
        const ax = (p.x - currentIce.x) * 0.18;
        const ay = (p.y - currentIce.y) * 0.18;
        iceVelRef.current.vx = (iceVelRef.current.vx + ax) * 0.94;
        iceVelRef.current.vy = (iceVelRef.current.vy + ay) * 0.94;
        const newIce = {
          x: Math.max(0, Math.min(canvas.width, currentIce.x + iceVelRef.current.vx)),
          y: Math.max(0, Math.min(canvas.height, currentIce.y + iceVelRef.current.vy))
        };
        p = newIce;
        icePosRef.current = newIce;
      }

      // Glitch Teleport (Controlled, less frequent, clean gap jumps)
      if (isGlitchRef.current) {
        pointsSinceGlitchRef.current = (pointsSinceGlitchRef.current || 0) + 1;
        if (pointsSinceGlitchRef.current >= 26 || (pointsSinceGlitchRef.current >= 16 && Math.random() < 0.05)) {
          pointsSinceGlitchRef.current = 0;
          const jumpAngle = Math.random() * Math.PI * 2;
          const jumpDist = Math.floor(Math.random() * 60) + 60; // 60px to 120px controlled jump
          const jumpDistX = Math.cos(jumpAngle) * jumpDist;
          const jumpDistY = Math.sin(jumpAngle) * jumpDist;
          teleportOffsetRef.current = { x: jumpDistX, y: jumpDistY };

          const teleportX = Math.max(10, Math.min(canvas.width - 10, rawPos.x + jumpDistX));
          const teleportY = Math.max(10, Math.min(canvas.height - 10, rawPos.y + jumpDistY));

          p = { x: teleportX, y: teleportY };
          strokeStartRef.current = p;
          currentPointsRef.current.push(p);
          isTeleportJumpRef.current = true;
          return;
        }
      }

      if (isGlitchRef.current && teleportOffsetRef.current.x !== 0) {
        p = {
          x: Math.max(0, Math.min(canvas.width, rawPos.x + teleportOffsetRef.current.x)),
          y: Math.max(0, Math.min(canvas.height, rawPos.y + teleportOffsetRef.current.y))
        };
      }

      const prev = currentPointsRef.current[currentPointsRef.current.length - 1] ?? strokeStartRef.current ?? p;

      // Ink limit budget calculation
      if (maxInk > 0 && inkRemainingRef.current <= 0) {
        return;
      }

      if (maxInk > 0 && prev) {
        const segDist = Math.hypot(p.x - prev.x, p.y - prev.y);
        const newRemaining = Math.max(0, inkRemainingRef.current - segDist);
        inkRemainingRef.current = newRemaining;
        setInkRemaining(newRemaining);
        if (newRemaining <= 0) {
          return;
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

      strokeMovedRef.current = true;
      currentPointsRef.current.push(p);

      if (isPixelArtRef.current) {
        drawPixelBlock(ctx, p, colorRef.current);
        setHasDrawn(true);
        onChangeRef.current?.();
        return;
      }

      if (isBubblesRef.current) {
        drawBubbleCluster(ctx, p, colorRef.current);
        setHasDrawn(true);
        onChangeRef.current?.();
        return;
      }

      if (isSnakeTailRef.current) {
        trimSnakeToLength(strokesRef.current, currentPointsRef.current, 3500);
        redrawAllStrokes(ctx, canvas, strokesRef.current, currentPointsRef.current);
        setHasDrawn(true);
        onChangeRef.current?.();
        return;
      }

      if (isTypoStompRef.current) {
        const segDist = Math.hypot(p.x - prev.x, p.y - prev.y);
        typoDistAccumulatorRef.current += segDist;
        const stepInterval = Math.max(18, activeStrokeWidthRef.current * 1.6);
        if (typoDistAccumulatorRef.current >= stepInterval) {
          typoDistAccumulatorRef.current = 0;
          const angle = Math.atan2(p.y - prev.y, p.x - prev.x);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          ctx.font = `bold ${Math.max(16, activeStrokeWidthRef.current * 1.5)}px "Comic Sans MS", monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = colorRef.current;
          const char = TYPO_CHARS[Math.floor(Math.random() * TYPO_CHARS.length)]!;
          ctx.fillText(char, 0, 0);
          ctx.restore();
          setHasDrawn(true);
          onChangeRef.current?.();
        }
        return;
      }

      let strokeWidthToUse = activeStrokeWidthRef.current;
      if (isRandomBrushRef.current) {
        pointsSinceSizeShiftRef.current++;
        if (pointsSinceSizeShiftRef.current >= 8) {
          pointsSinceSizeShiftRef.current = 0;
          const randomSizes = [4, 8, 14, 22, 32, 42];
          currentDynamicSizeRef.current = randomSizes[Math.floor(Math.random() * randomSizes.length)]!;
        }
        strokeWidthToUse = currentDynamicSizeRef.current;
      }

      ctx.lineWidth = strokeWidthToUse;

      if (isGravityDripRef.current) {
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Spawn gravity drip droplets downward occasionally
        if (Math.random() < 0.22) {
          const dripLength = Math.floor(Math.random() * 45) + 15;
          const dripWidth = Math.max(2, strokeWidthToUse * 0.45);
          ctx.save();
          ctx.lineWidth = dripWidth;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          const dripBendX = p.x + (Math.random() - 0.5) * 8;
          const endY = Math.min(canvas.height - 6, p.y + dripLength);
          ctx.lineTo(dripBendX, endY);
          ctx.stroke();

          // Droplet bead at bottom
          ctx.beginPath();
          ctx.arc(dripBendX, endY, dripWidth * 1.4, 0, Math.PI * 2);
          ctx.fillStyle = colorRef.current;
          ctx.fill();

          // Detached heavy falling drop
          if (Math.random() < 0.5) {
            const dropDist = Math.floor(Math.random() * 25) + 12;
            const dropY = Math.min(canvas.height - 6, endY + dropDist);
            ctx.beginPath();
            ctx.arc(dripBendX, dropY, dripWidth * 0.9, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      if (isMirrorRef.current) {
        const mirrorPrevX = canvas.width - prev.x;
        const mirrorCurrX = canvas.width - p.x;
        ctx.beginPath();
        ctx.moveTo(mirrorPrevX, prev.y);
        ctx.lineTo(mirrorCurrX, p.y);
        ctx.stroke();
      }

      setHasDrawn(true);
      onChangeRef.current?.();
    };

    const onUp = (evt: PointerEvent) => {
      if (!drawing) return;
      drawing = false;
      drawingRef.current = false;

      // Slingshot release to fire with ballistic curved arc
      if (isRubberbandRef.current && isSlingshotAimingRef.current && slingshotAnchorRef.current && slingshotPullRef.current) {
        isSlingshotAimingRef.current = false;
        hideTetherDOM();

        const anchor = slingshotAnchorRef.current;
        const pull = slingshotPullRef.current;
        const dx = pull.x - anchor.x;
        const dy = pull.y - anchor.y;
        const pullDist = Math.hypot(dx, dy);

        if (pullDist > 12) {
          const flingPower = Math.min(320, pullDist * 2.2);
          const angle = Math.atan2(-dy, -dx);
          const targetX = Math.max(10, Math.min(canvas.width - 10, anchor.x + Math.cos(angle) * flingPower));
          const targetY = Math.max(10, Math.min(canvas.height - 10, anchor.y + Math.sin(angle) * flingPower));

          const midX = (anchor.x + targetX) / 2;
          const curveDrop = Math.min(55, pullDist * 0.22);
          const midY = (anchor.y + targetY) / 2 + curveDrop;

          ctx.save();
          ctx.lineCap = "round";
          ctx.strokeStyle = colorRef.current;
          ctx.lineWidth = Math.max(6, activeStrokeWidthRef.current * 1.4);

          // Impact ballistic curved projectile line
          ctx.beginPath();
          ctx.moveTo(anchor.x, anchor.y);
          ctx.quadraticCurveTo(midX, midY, targetX, targetY);
          ctx.stroke();

          // Splatter blast on landing
          const splashCount = Math.floor(Math.random() * 8) + 8;
          ctx.fillStyle = colorRef.current;
          for (let s = 0; s < splashCount; s++) {
            const spAngle = Math.random() * Math.PI * 2;
            const spDist = Math.random() * 26 + 6;
            const spRadius = Math.random() * 4.5 + 2;
            ctx.beginPath();
            ctx.arc(targetX + Math.cos(spAngle) * spDist, targetY + Math.sin(spAngle) * spDist, spRadius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // Sample curved quadratic trajectory into stroke points
          const curvePoints: StrokePoint[] = [];
          const steps = 14;
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const cx = (1 - t) * (1 - t) * anchor.x + 2 * (1 - t) * t * midX + t * t * targetX;
            const cy = (1 - t) * (1 - t) * anchor.y + 2 * (1 - t) * t * midY + t * t * targetY;
            curvePoints.push({ x: cx, y: cy });
          }

          strokesRef.current.push({
            id: Math.random().toString(36).substr(2, 9),
            playerId: playerIdRef.current,
            points: curvePoints,
            brushSize: Math.max(6, activeStrokeWidthRef.current * 1.4),
            color: hexToRgb(colorRef.current),
            opacity: 1,
            timestamp: Date.now()
          });

          setHasDrawn(true);
          onChangeRef.current?.();
        }

        slingshotAnchorRef.current = null;
        slingshotPullRef.current = null;
        try {
          canvas.releasePointerCapture(evt.pointerId);
        } catch {}
        return;
      }

      // Input Delay queue
      if (isInputDelayRef.current) {
        const rawPos = getCanvasPos(
          evt,
          canvas,
          isUpsideDownRef.current,
          isSpinningRef.current,
          spinStartTimeRef.current
        );
        delayedQueueRef.current.push({
          time: Date.now(),
          type: "up",
          p: rawPos,
          color: colorRef.current,
          size: activeStrokeWidthRef.current
        });
        try {
          canvas.releasePointerCapture(evt.pointerId);
        } catch {}
        return;
      }

      const rawPos = getCanvasPos(
        evt,
        canvas,
        isUpsideDownRef.current,
        isSpinningRef.current,
        spinStartTimeRef.current
      );
      let p = rawPos;
      if (isGlitchRef.current && teleportOffsetRef.current.x !== 0) {
        p = {
          x: Math.max(0, Math.min(canvas.width, rawPos.x + teleportOffsetRef.current.x)),
          y: Math.max(0, Math.min(canvas.height, rawPos.y + teleportOffsetRef.current.y))
        };
      }

      if (isSnakeTailRef.current && currentPointsRef.current.length > 0) {
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
        trimSnakeToLength(strokesRef.current, [], 3500);
        redrawAllStrokes(ctx, canvas, strokesRef.current);
        currentPointsRef.current = [];
        strokeStartRef.current = null;
        setHasDrawn(true);
        onChangeRef.current?.();
        try {
          canvas.releasePointerCapture(evt.pointerId);
        } catch {}
        return;
      }

      if (currentPointsRef.current.length > 0) {
        const effectiveStrokeSize = isRandomBrushRef.current ? currentDynamicSizeRef.current : activeStrokeWidthRef.current;

        // If tap without moving, draw a dot
        if (!strokeMovedRef.current && strokeStartRef.current) {
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

        if (isOneStrokeRef.current) {
          if (props.autoSubmitOnOneStroke !== false && canvasRef.current) {
            performSubmit();
          } else {
            hasSubmittedRef.current = true;
            setHasDrawn(true);
            onChangeRef.current?.();
          }
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
    delayedQueueRef.current = [];
    vanishingSegmentsRef.current = [];
    delayedInProgressPointsRef.current = [];
    icePosRef.current = null;
    iceVelRef.current = { vx: 0, vy: 0 };
    typoDistAccumulatorRef.current = 0;
    compactorStartTimeRef.current = Date.now();
    setCompactorProgress(0);
    hasSubmittedRef.current = false;
    hideTetherDOM();
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
        className="canvasWrap"
        style={{
          position: "relative",
          overflow: isSpinning || isTrashCompactor ? "hidden" : "visible",
          aspectRatio: `${width} / ${height}`,
          maxWidth: width === height ? "min(320px, calc(100vh - 340px))" : undefined
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`canvas ${isSpinning ? "trick-spinning-canvas" : ""}`}
          style={{
            ...(isBlind ? { opacity: 0.05, filter: "blur(20px)" } : {})
          }}
        />

        {/* Alien Vaporizer Beam & UFO DOM */}
        {isTractorBeam && (
          <>
            <div
              ref={tractorBeamDomRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
                zIndex: 5,
                background: "linear-gradient(to bottom, rgba(74, 222, 128, 0.45) 0%, rgba(34, 197, 94, 0.15) 85%, rgba(34, 197, 94, 0) 100%)",
                clipPath: "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)",
                boxShadow: "0 0 25px rgba(74, 222, 128, 0.5)",
                transition: "background 0.15s ease, box-shadow 0.15s ease"
              }}
            />
            <div
              ref={ufoDomRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "64px",
                height: "48px",
                pointerEvents: "none",
                zIndex: 7,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.4rem",
                filter: "drop-shadow(0 0 14px rgba(74, 222, 128, 0.9))",
                transition: "filter 0.15s ease"
              }}
            >
              🛸
            </div>
          </>
        )}

        {/* Puzzle Jumble warning badge */}
        {isPuzzleJumble && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(16, 185, 129, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "#fff",
              padding: "4px 14px",
              borderRadius: "999px",
              fontSize: "0.78rem",
              fontWeight: 800,
              pointerEvents: "none",
              zIndex: 6,
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>🧩</span>
            <span>Puzzle Jumble: All 9 tiles will scramble with numbered badges on submit!</span>
          </div>
        )}

        {/* Guillotine Chop top warning badge */}
        {isSplitHalves && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(239, 68, 68, 0.88)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "#fff",
              padding: "4px 14px",
              borderRadius: "999px",
              fontSize: "0.78rem",
              fontWeight: 800,
              pointerEvents: "none",
              zIndex: 6,
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>🪓</span>
            <span>Guillotine Chop: A random half will be sliced off upon submission!</span>
          </div>
        )}

        {/* Flashlight Spotlight in the dark overlay */}
        {isFlashlight && (
          <div
            ref={flashlightOverlayRef}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              borderRadius: "inherit",
              background: "radial-gradient(circle 65px at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 42px, rgba(0,0,0,0.92) 58px, #000000 65px, #000000 100%)",
              zIndex: 6
            }}
          />
        )}

        {/* Reverse Spotlight shadow finger overlay */}
        {isShadowFinger && (
          <div
            ref={shadowOverlayRef}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              borderRadius: "inherit",
              background: "radial-gradient(circle 165px at 50% 50%, #000000 0%, #000000 135px, rgba(0,0,0,0.85) 150px, rgba(0,0,0,0) 165px)",
              zIndex: 6
            }}
          />
        )}

        {/* Trash Compactor Shrinking Walls Overlay */}
        {isTrashCompactor && (
          <>
            {compactorProgress === 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(239, 68, 68, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  color: "#fff",
                  padding: "4px 14px",
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  pointerEvents: "none",
                  zIndex: 6,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
                  whiteSpace: "nowrap"
                }}
              >
                ⚠️ Compactor starting in 5 seconds...
              </div>
            )}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, overflow: "hidden" }}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: `${Math.min(48.5, compactorProgress * 48.5)}%`,
                  background: "repeating-linear-gradient(45deg, #1e293b, #1e293b 15px, #f59e0b 15px, #f59e0b 30px)",
                  borderBottom: compactorProgress > 0 ? "3px solid #ef4444" : "none",
                  boxShadow: compactorProgress > 0 ? "0 2px 4px rgba(0,0,0,0.35)" : "none"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${Math.min(48.5, compactorProgress * 48.5)}%`,
                  background: "repeating-linear-gradient(45deg, #1e293b, #1e293b 15px, #f59e0b 15px, #f59e0b 30px)",
                  borderTop: compactorProgress > 0 ? "3px solid #ef4444" : "none",
                  boxShadow: compactorProgress > 0 ? "0 -2px 4px rgba(0,0,0,0.35)" : "none"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: `${Math.min(48.5, compactorProgress * 48.5)}%`,
                  bottom: `${Math.min(48.5, compactorProgress * 48.5)}%`,
                  left: 0,
                  width: `${Math.min(48.5, compactorProgress * 48.5)}%`,
                  background: "repeating-linear-gradient(45deg, #1e293b, #1e293b 15px, #f59e0b 15px, #f59e0b 30px)",
                  borderRight: compactorProgress > 0 ? "3px solid #ef4444" : "none",
                  boxShadow: compactorProgress > 0 ? "2px 0 4px rgba(0,0,0,0.35)" : "none"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: `${Math.min(48.5, compactorProgress * 48.5)}%`,
                  bottom: `${Math.min(48.5, compactorProgress * 48.5)}%`,
                  right: 0,
                  width: `${Math.min(48.5, compactorProgress * 48.5)}%`,
                  background: "repeating-linear-gradient(45deg, #1e293b, #1e293b 15px, #f59e0b 15px, #f59e0b 30px)",
                  borderLeft: compactorProgress > 0 ? "3px solid #ef4444" : "none",
                  boxShadow: compactorProgress > 0 ? "-2px 0 4px rgba(0,0,0,0.35)" : "none"
                }}
              />
            </div>
          </>
        )}

        {/* Slingshot Pull & Shoot trajectory overlay */}
        <svg ref={tetherSvgRef} className="trick-rubberband-tether" style={{ display: "none" }}>
          {/* Aiming trajectory forward ballistic curve */}
          <path
            ref={tetherAimPathRef}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={3}
            strokeDasharray="6,4"
          />
          {/* Pull back tension cord */}
          <line
            ref={tetherPullLineRef}
            stroke="#ec4899"
            strokeWidth={3.5}
            strokeDasharray="4,3"
          />
          {/* Anchor origin marker */}
          <circle ref={tetherAnchorCircleRef} r={6} fill="#f43f5e" />
          {/* Pull handle marker */}
          <circle ref={tetherPullCircleRef} r={8} fill="#ec4899" />
          {/* Target landing crosshair */}
          <circle ref={tetherTargetCircleRef} r={12} fill="none" stroke="#38bdf8" strokeWidth={2.5} strokeDasharray="3,3" />
          <circle ref={tetherTargetCenterRef} r={3.5} fill="#38bdf8" />
        </svg>

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
            ⏱️ 2s Lag + Vanishing Ink
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
                    ? "32px (Chunky Pixel Grid)"
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