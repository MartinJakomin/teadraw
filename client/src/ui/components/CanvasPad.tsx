import React, { useEffect, useMemo, useRef, useState } from "react";
import { StrokeEvent, StrokePoint } from "../../types";

const SPIN_SCALE = 0.64;
const SPIN_PERIOD_MS = 14000;

function getCanvasPos(
  evt: PointerEvent,
  canvas: HTMLCanvasElement,
  container: HTMLDivElement | null,
  isUpsideDown = false,
  isSpinning = false,
  spinAngleRad = 0
): StrokePoint {
  if (isSpinning && container) {
    const rect = container.getBoundingClientRect();
    const baseW = container.clientWidth || rect.width;
    const baseH = container.clientHeight || rect.height;
    const cxScreen = rect.left + rect.width / 2;
    const cyScreen = rect.top + rect.height / 2;
    const dxScreen = evt.clientX - cxScreen;
    const dyScreen = evt.clientY - cyScreen;

    // Un-rotate in isotropic screen space around the unrotated container center
    const cos = Math.cos(-spinAngleRad);
    const sin = Math.sin(-spinAngleRad);
    const unrotXScreen = (dxScreen * cos - dyScreen * sin) / SPIN_SCALE;
    const unrotYScreen = (dxScreen * sin + dyScreen * cos) / SPIN_SCALE;

    let rawX = canvas.width / 2 + unrotXScreen * (canvas.width / baseW);
    let rawY = canvas.height / 2 + unrotYScreen * (canvas.height / baseH);

    rawX = Math.max(0, Math.min(canvas.width, rawX));
    rawY = Math.max(0, Math.min(canvas.height, rawY));

    return {
      x: isUpsideDown ? canvas.width - rawX : rawX,
      y: isUpsideDown ? canvas.height - rawY : rawY
    };
  }

  const rect = canvas.getBoundingClientRect();
  let rawX = (evt.clientX - rect.left) * (canvas.width / rect.width);
  let rawY = (evt.clientY - rect.top) * (canvas.height / rect.height);

  rawX = Math.max(0, Math.min(canvas.width, rawX));
  rawY = Math.max(0, Math.min(canvas.height, rawY));

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
  const isCubism = props.trick === "cubism";
  const isSpiderweb = props.trick === "spiderweb";
  const isMagnets = props.trick === "magnets";
  const isWindTunnel = props.trick === "wind_tunnel";
  const isPoltergeist = props.trick === "poltergeist";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [color, setColor] = useState(props.initialColor ?? "#111111");
  const lastNonWhiteColorRef = useRef(props.initialColor && props.initialColor.toUpperCase() !== "#FFFFFF" ? props.initialColor : "#111111");
  const [size, setSize] = useState(strokeWidth);
  const activeStrokeWidth = isSizeLocked ? strokeWidth : size;

  const effectiveInkLimit = props.trick === "ink_limit" ? 3000 : props.inkLimit;
  const maxInk = effectiveInkLimit ?? 0;
  const [inkRemaining, setInkRemaining] = useState<number>(maxInk);
  const inkRemainingRef = useRef<number>(maxInk);

  // Spinning canvas reference timestamp & live angle (radians)
  const spinStartTimeRef = useRef(Date.now());
  const spinAngleRef = useRef<number>(0);

  // Trash compactor start timestamp & direct DOM refs (zero 60fps React re-renders)
  const compactorStartTimeRef = useRef(Date.now());
  const compactorWarnRef = useRef<HTMLDivElement | null>(null);
  const compactorTopRef = useRef<HTMLDivElement | null>(null);
  const compactorBottomRef = useRef<HTMLDivElement | null>(null);
  const compactorLeftRef = useRef<HTMLDivElement | null>(null);
  const compactorRightRef = useRef<HTMLDivElement | null>(null);

  // Undo snapshot stack (bounded to 15 steps)
  const undoStackRef = useRef<Array<{
    imageData: ImageData;
    strokesLen: number;
    inkRemaining: number;
    hasDrawnBefore: boolean;
  }>>([]);

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

  // Poltergeist autonomous canvas ghost state & DOM ref
  const poltergeistDomRef = useRef<HTMLDivElement | null>(null);
  const ghostAgentRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    mode: "roam" | "draw" | "erase";
    modeUntil: number;
    activeStroke: StrokeEvent | null;
    lastTick: number;
    phase: number;
  }>({
    x: 450,
    y: 275,
    targetX: 620,
    targetY: 190,
    mode: "roam",
    modeUntil: 0,
    activeStroke: null,
    lastTick: 0,
    phase: 0
  });

  // Magnet Anomaly DOM refs (5 poles across the canvas)
  const magnetDomRefs = useRef<Array<HTMLDivElement | null>>([null, null, null, null, null]);

  // Wind Tunnel state & DOM ref
  const lastWindTickRef = useRef<number>(Date.now());
  const windBannerDomRef = useRef<HTMLDivElement | null>(null);

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
  const isCubismRef = useRef(isCubism);
  isCubismRef.current = isCubism;
  const isSpiderwebRef = useRef(isSpiderweb);
  isSpiderwebRef.current = isSpiderweb;
  const isMagnetsRef = useRef(isMagnets);
  isMagnetsRef.current = isMagnets;
  const isWindTunnelRef = useRef(isWindTunnel);
  isWindTunnelRef.current = isWindTunnel;
  const isPoltergeistRef = useRef(isPoltergeist);
  isPoltergeistRef.current = isPoltergeist;

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

  // Helper to draw an 8-legged spider either perched on the web or hanging from a silk drop-thread
  const drawSpiderCreature = (
    ctx: CanvasRenderingContext2D,
    anchor: StrokePoint,
    seedIndex: number,
    strokeColor: string
  ) => {
    const isHanging = seedIndex % 2 === 1;
    const hangLen = isHanging ? 28 + ((seedIndex * 17) % 38) : 0;
    const sx = anchor.x;
    const sy = Math.min(542, anchor.y + hangLen);
    const scale = 0.85 + ((seedIndex * 7) % 5) * 0.1;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Silk drop-thread if hanging
    if (isHanging) {
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.95;
    ctx.translate(sx, sy);
    if (!isHanging) {
      ctx.rotate(((seedIndex * 43) % 360) * (Math.PI / 180));
    }

    // 8 jointed spider legs (4 on each side)
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.6 * scale;
    const legAngles = [-0.85, -0.32, 0.28, 0.82];
    for (const side of [-1, 1]) {
      for (const la of legAngles) {
        const kneeX = side * Math.cos(la) * 8.5 * scale;
        const kneeY = Math.sin(la) * 7.5 * scale - 1.5 * scale;
        const footX = side * Math.cos(la + 0.25) * 14.5 * scale;
        const footY = Math.sin(la + 0.25) * 13 * scale + 2.5 * scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(footX, footY);
        ctx.stroke();
      }
    }

    // Spider abdomen & cephalothorax
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, -3.2 * scale, 5.2 * scale, 0, Math.PI * 2);
    ctx.arc(0, 3.2 * scale, 3.4 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Red hourglass mark on abdomen
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, -3.2 * scale, 1.7 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Glowing eyes
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(-1.3 * scale, 4.4 * scale, 0.95 * scale, 0, Math.PI * 2);
    ctx.arc(1.3 * scale, 4.4 * scale, 0.95 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Helper to draw spiderweb silk threads + concentric web rungs + perched/hanging spiders
  const drawSpiderwebThreads = (
    ctx: CanvasRenderingContext2D,
    pt: StrokePoint,
    priorStrokes: StrokeEvent[],
    currentPts: StrokePoint[],
    strokeColor: string,
    brushSize: number
  ) => {
    const totalPtIdx = currentPts.length;
    // Weave web strands every 3rd point for rich cobwebs without turning solid black
    if (totalPtIdx % 3 !== 0) return;

    const maxDist = 148;
    const minDist = 18;
    const maxLinks = 6;
    const connectedTargets: StrokePoint[] = [];

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(0.9, brushSize * 0.14);
    ctx.lineCap = "round";

    // Check earlier points in current stroke
    for (let i = currentPts.length - 5; i >= 0 && connectedTargets.length < maxLinks; i -= 4) {
      const target = currentPts[i]!;
      const d = Math.hypot(pt.x - target.x, pt.y - target.y);
      if (d >= minDist && d <= maxDist) {
        ctx.globalAlpha = (1 - d / maxDist) * 0.34;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        connectedTargets.push(target);
      }
    }

    // Check points in previous strokes
    for (let sIdx = priorStrokes.length - 1; sIdx >= 0 && connectedTargets.length < maxLinks; sIdx--) {
      const sPts = priorStrokes[sIdx]!.points;
      for (let i = sPts.length - 1; i >= 0 && connectedTargets.length < maxLinks; i -= 5) {
        const target = sPts[i]!;
        const d = Math.hypot(pt.x - target.x, pt.y - target.y);
        if (d >= minDist && d <= maxDist) {
          ctx.globalAlpha = (1 - d / maxDist) * 0.3;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          connectedTargets.push(target);
        }
      }
    }

    // Weave concentric cross-silk rungs between connected radial strands
    if (connectedTargets.length >= 2) {
      ctx.lineWidth = Math.max(0.8, brushSize * 0.11);
      for (let k = 0; k < Math.min(connectedTargets.length - 1, 3); k++) {
        const t1 = connectedTargets[k]!;
        const t2 = connectedTargets[k + 1]!;
        for (const ratio of [0.38, 0.72]) {
          const r1x = pt.x + (t1.x - pt.x) * ratio;
          const r1y = pt.y + (t1.y - pt.y) * ratio;
          const r2x = pt.x + (t2.x - pt.x) * ratio;
          const r2y = pt.y + (t2.y - pt.y) * ratio;
          if (Math.hypot(r1x - r2x, r1y - r2y) < 105) {
            ctx.globalAlpha = 0.24;
            ctx.beginPath();
            ctx.moveTo(r1x, r1y);
            ctx.lineTo(r2x, r2y);
            ctx.stroke();
          }
        }
      }
    }

    ctx.restore();

    // Deterministically place perched or hanging spiders along the web every 14 points
    if (totalPtIdx > 0 && totalPtIdx % 14 === 0 && connectedTargets.length >= 1) {
      const spiderSeed = Math.floor(totalPtIdx / 14) + priorStrokes.length * 7;
      drawSpiderCreature(ctx, pt, spiderSeed, strokeColor);
    }
  };

  // Helper for Polygon Cubism: bridges straight lines (and curves) to previously drawn strokes or creates an angular Cubist shard
  const buildCubismPolygonPoints = (
    rawPts: StrokePoint[],
    priorStrokes: StrokeEvent[],
    canvasWidth: number,
    canvasHeight: number
  ): StrokePoint[] => {
    if (rawPts.length < 2) return rawPts;
    const pts = [...rawPts];
    const start = pts[0]!;
    const end = pts[pts.length - 1]!;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const chordLen = Math.hypot(dx, dy);

    // Measure how "straight" or flat the stroke is (max perpendicular distance from start->end line)
    let maxPerp = 0;
    const ux = chordLen > 1 ? dx / chordLen : 1;
    const uy = chordLen > 1 ? dy / chordLen : 0;
    const nx = -uy;
    const ny = ux;
    for (const p of pts) {
      const perp = Math.abs((p.x - start.x) * nx + (p.y - start.y) * ny);
      if (perp > maxPerp) maxPerp = perp;
    }

    const isStraightish = maxPerp < Math.max(24, chordLen * 0.22);

    // 1. Try to connect to a vertex on something already drawn so strokes fuse into a connected Cubist mesh!
    let bestAnchor: StrokePoint | null = null;
    let bestScore = -1;
    for (let sIdx = priorStrokes.length - 1; sIdx >= 0; sIdx--) {
      const sPts = priorStrokes[sIdx]!.points;
      const step = Math.max(1, Math.floor(sPts.length / 8));
      for (let i = 0; i < sPts.length; i += step) {
        const cand = sPts[i]!;
        const distMid = Math.hypot(cand.x - midX, cand.y - midY);
        if (distMid < 22 || distMid > 310) continue;
        const perpDist = Math.abs((cand.x - start.x) * nx + (cand.y - start.y) * ny);
        if (perpDist < 20) continue; // Avoid collinear points that would still look like a flat line
        // Prefer nearby points that give a nice wide triangle facet
        const score = perpDist - distMid * 0.35;
        if (score > bestScore) {
          bestScore = score;
          bestAnchor = cand;
        }
      }
    }

    if (bestAnchor && (isStraightish || bestScore > 12)) {
      pts.push({ x: bestAnchor.x, y: bestAnchor.y });
    } else if (isStraightish) {
      // 2. Fallback when nothing else is drawn yet (or nearby): project a geometric Cubist prism vertex perpendicular to the line
      const shardHeight = Math.max(38, Math.min(115, chordLen * 0.38));
      const sign = ((Math.round(start.x + end.y) % 2) === 0) ? 1 : -1;
      const vx = Math.max(8, Math.min(canvasWidth - 8, midX + nx * shardHeight * sign));
      const vy = Math.max(8, Math.min(canvasHeight - 8, midY + ny * shardHeight * sign));
      pts.push({ x: vx, y: vy });
    }

    // Close polygon loop back to start
    pts.push({ x: start.x, y: start.y });
    return pts;
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
    const drawnSoFar: StrokeEvent[] = [];
    for (const s of allStrokes) {
      if (s.points.length < 1) continue;
      const colorStr = `rgb(${s.color.r},${s.color.g},${s.color.b})`;
      targetCtx.lineCap = "round";
      targetCtx.lineJoin = "round";
      targetCtx.strokeStyle = colorStr;
      targetCtx.lineWidth = s.brushSize;
      targetCtx.globalAlpha = s.opacity ?? 1;

      if (s.points.length === 1) {
        targetCtx.beginPath();
        targetCtx.arc(s.points[0]!.x, s.points[0]!.y, s.brushSize / 2, 0, Math.PI * 2);
        targetCtx.fillStyle = colorStr;
        targetCtx.fill();
      } else {
        targetCtx.beginPath();
        targetCtx.moveTo(s.points[0]!.x, s.points[0]!.y);
        for (let i = 1; i < s.points.length; i++) {
          targetCtx.lineTo(s.points[i]!.x, s.points[i]!.y);
        }
        if (isCubismRef.current && s.points.length >= 3) {
          targetCtx.closePath();
          targetCtx.save();
          targetCtx.fillStyle = colorStr;
          targetCtx.globalAlpha = 0.28;
          targetCtx.fill();
          targetCtx.restore();
        }
        targetCtx.stroke();

        if (isSpiderwebRef.current) {
          const accPts: StrokePoint[] = [];
          for (const pt of s.points) {
            accPts.push(pt);
            drawSpiderwebThreads(targetCtx, pt, drawnSoFar, accPts, colorStr, s.brushSize);
          }
        }
      }
      drawnSoFar.push(s);
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
        if (isCubismRef.current && currentPointsRef.current.length >= 2) {
          currentPointsRef.current = buildCubismPolygonPoints(
            currentPointsRef.current,
            strokesRef.current,
            canvas.width,
            canvas.height
          );
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(currentPointsRef.current[0]!.x, currentPointsRef.current[0]!.y);
            for (let i = 1; i < currentPointsRef.current.length; i++) {
              ctx.lineTo(currentPointsRef.current[i]!.x, currentPointsRef.current[i]!.y);
            }
            ctx.closePath();
            ctx.fillStyle = colorRef.current;
            ctx.globalAlpha = 0.28;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = colorRef.current;
            ctx.lineWidth = effectiveStrokeSize;
            ctx.stroke();
            ctx.restore();
          }
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
    undoStackRef.current = [];
    setCanUndo(false);
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
    const flingPower = Math.min(1050, pullDist * 2.5);
    const angle = Math.atan2(-dy, -dx);
    const targetX = Math.max(0, Math.min(canvas.width, anchor.x + Math.cos(angle) * flingPower));
    const targetY = Math.max(0, Math.min(canvas.height, anchor.y + Math.sin(angle) * flingPower));

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

  // Helper to update Trash Compactor DOM walls directly without triggering React state re-renders
  const updateCompactorDOM = (progress: number) => {
    if (compactorWarnRef.current) {
      compactorWarnRef.current.style.display = progress === 0 ? "block" : "none";
    }
    const pct = `${Math.min(48.5, progress * 48.5)}%`;
    const activeBorder = progress > 0;
    if (compactorTopRef.current) {
      compactorTopRef.current.style.height = pct;
      compactorTopRef.current.style.borderBottom = activeBorder ? "3px solid #ef4444" : "none";
      compactorTopRef.current.style.boxShadow = activeBorder ? "0 2px 4px rgba(0,0,0,0.35)" : "none";
    }
    if (compactorBottomRef.current) {
      compactorBottomRef.current.style.height = pct;
      compactorBottomRef.current.style.borderTop = activeBorder ? "3px solid #ef4444" : "none";
      compactorBottomRef.current.style.boxShadow = activeBorder ? "0 -2px 4px rgba(0,0,0,0.35)" : "none";
    }
    if (compactorLeftRef.current) {
      compactorLeftRef.current.style.top = pct;
      compactorLeftRef.current.style.bottom = pct;
      compactorLeftRef.current.style.width = pct;
      compactorLeftRef.current.style.borderRight = activeBorder ? "3px solid #ef4444" : "none";
      compactorLeftRef.current.style.boxShadow = activeBorder ? "2px 0 4px rgba(0,0,0,0.35)" : "none";
    }
    if (compactorRightRef.current) {
      compactorRightRef.current.style.top = pct;
      compactorRightRef.current.style.bottom = pct;
      compactorRightRef.current.style.width = pct;
      compactorRightRef.current.style.borderLeft = activeBorder ? "3px solid #ef4444" : "none";
      compactorRightRef.current.style.boxShadow = activeBorder ? "-2px 0 4px rgba(0,0,0,0.35)" : "none";
    }
  };

  // Real-time animation loop (only runs when an animated trick is active)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isSpinning && canvas) {
      spinAngleRef.current = 0;
      canvas.style.transform = "";
    }

    const needsLoop = isSpinning || isTrashCompactor || isTractorBeam || isInputDelay || isMagnets || isWindTunnel || isPoltergeist;
    if (!needsLoop) return;

    let animId: number;

    const renderLoop = () => {
      const c = canvasRef.current;
      const ctx = c?.getContext("2d");

      // Spinning Canvas: Drive rotation & scale directly in JS so pointer un-rotation is 100% synchronized
      if (isSpinningRef.current && c) {
        const elapsed = (Date.now() - spinStartTimeRef.current) % SPIN_PERIOD_MS;
        const angle = (elapsed / SPIN_PERIOD_MS) * 2 * Math.PI;
        spinAngleRef.current = angle;
        const deg = (angle * 180) / Math.PI;
        c.style.transform = `rotate(${deg.toFixed(2)}deg) scale(${SPIN_SCALE})`;
      }

      // Magnet Anomaly: Update all 5 high-power magnetic pole indicators directly in DOM every frame (10s polarity cycle)
      if (isMagnetsRef.current && !hasSubmittedRef.current) {
        const now = Date.now();
        const flip = Math.floor(now / 10000) % 2 === 0;
        const remSec = Math.ceil((10000 - (now % 10000)) / 1000);
        for (let idx = 0; idx < 5; idx++) {
          const el = magnetDomRefs.current[idx];
          if (!el) continue;
          const attract = idx % 2 === 0 ? flip : !flip;
          const pulse = 1 + Math.sin(now / 160 + idx * 1.1) * 0.1;
          el.style.transform = `translate(-50%, -50%) scale(${pulse.toFixed(3)})`;
          el.style.borderColor = attract ? "rgba(244, 63, 94, 0.92)" : "rgba(56, 189, 248, 0.92)";
          el.style.background = attract ? "rgba(225, 29, 72, 0.85)" : "rgba(2, 132, 199, 0.85)";
          el.style.boxShadow = attract
            ? "0 0 26px rgba(244, 63, 94, 0.75)"
            : "0 0 26px rgba(56, 189, 248, 0.75)";
          el.textContent = attract
            ? idx === 2
              ? `🧲 CORE PULL (${remSec}s)`
              : "🧲 ATTRACT"
            : idx === 2
              ? `🧲 CORE PUSH (${remSec}s)`
              : "🧲 REPEL";
        }
      }

      // Poltergeist Ghost: A mischievous floating 👻 emoji roaming all over the canvas, drawing and erasing segments
      if (isPoltergeistRef.current && !hasSubmittedRef.current && !disabledRef.current && c && ctx) {
        const now = Date.now();
        const g = ghostAgentRef.current;

        if (now - g.lastTick >= 30) {
          g.lastTick = now;
          g.phase += 0.22;

          // Helper to pick a random point on a player-drawn stroke
          const pickPlayerStrokePoint = (): StrokePoint | null => {
            const playerStrokes = strokesRef.current.filter(
              (st) => !st.id.startsWith("ghost-") && st.points.length >= 3
            );
            if (playerStrokes.length > 0) {
              const st = playerStrokes[Math.floor(Math.random() * playerStrokes.length)]!;
              const pt = st.points[Math.floor(Math.random() * st.points.length)];
              if (pt) return { x: pt.x, y: pt.y };
            }
            if (currentPointsRef.current.length > 8) {
              const idx = Math.floor(Math.random() * (currentPointsRef.current.length - 4));
              const pt = currentPointsRef.current[idx];
              if (pt) return { x: pt.x, y: pt.y };
            }
            return null;
          };

          // Switch ghost mode when timer expires: mostly draws and roams, erases at 30%
          if (now >= g.modeUntil) {
            const targetPlayerPt = pickPlayerStrokePoint();
            // Erase at 30% chance when player strokes exist
            if (targetPlayerPt && Math.random() < 0.30) {
              g.mode = "erase";
              g.modeUntil = now + 500 + Math.random() * 350;
              g.activeStroke = null;
              g.targetX = targetPlayerPt.x;
              g.targetY = targetPlayerPt.y;
            } else if (Math.random() < 0.70) {
              // Draw frequently (70% chance) with longer doodle strokes!
              g.mode = "draw";
              g.modeUntil = now + 1200 + Math.random() * 800;
              g.targetX = 25 + Math.random() * (c.width - 50);
              g.targetY = 25 + Math.random() * (c.height - 50);
              const newGhostStroke: StrokeEvent = {
                id: `ghost-${Math.random().toString(36).slice(2, 9)}`,
                playerId: playerIdRef.current,
                points: [{ x: g.x, y: g.y }],
                brushSize: Math.max(3.5, activeStrokeWidthRef.current * 0.75),
                color: hexToRgb(colorRef.current),
                opacity: 0.85,
                timestamp: now
              };
              strokesRef.current.push(newGhostStroke);
              g.activeStroke = newGhostStroke;
            } else {
              // Roam briefly
              g.mode = "roam";
              g.modeUntil = now + 800 + Math.random() * 600;
              g.activeStroke = null;
              g.targetX = 20 + Math.random() * (c.width - 40);
              g.targetY = 20 + Math.random() * (c.height - 40);
            }
          }

          // Steer ghost toward current target
          const dx = g.targetX - g.x;
          const dy = g.targetY - g.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 28) {
            g.targetX = 20 + Math.random() * (c.width - 40);
            g.targetY = 20 + Math.random() * (c.height - 40);
          }

          const speed = g.mode === "erase" ? 5.8 : g.mode === "draw" ? 5.2 : 4.0;
          const dirAngle = Math.atan2(dy, dx);
          // Playful flowing wobble
          const wobbleAngle = dirAngle + Math.sin(g.phase) * 0.55;
          const prevX = g.x;
          const prevY = g.y;
          g.x = Math.max(16, Math.min(c.width - 16, g.x + Math.cos(wobbleAngle) * speed));
          g.y = Math.max(16, Math.min(c.height - 16, g.y + Math.sin(wobbleAngle) * speed));

          if (g.mode === "draw" && g.activeStroke) {
            g.activeStroke.points.push({ x: g.x, y: g.y });
            if (!isBlind) {
              ctx.save();
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.strokeStyle = `rgb(${g.activeStroke.color.r},${g.activeStroke.color.g},${g.activeStroke.color.b})`;
              ctx.lineWidth = g.activeStroke.brushSize;
              ctx.globalAlpha = 0.85;
              ctx.beginPath();
              ctx.moveTo(prevX, prevY);
              ctx.lineTo(g.x, g.y);
              ctx.stroke();
              ctx.restore();
            }
            setHasDrawn(true);
            onChangeRef.current?.();
          } else if (g.mode === "erase") {
            // Smaller erase radius (20px) so it only pinches tiny segments without wiping out whole drawings
            const eraseRadius = 20;
            let erasedAny = false;
            const nextStrokes: StrokeEvent[] = [];

            for (const st of strokesRef.current) {
              if (st.id.startsWith("ghost-")) {
                nextStrokes.push(st);
                continue;
              }
              let currentChunk: StrokePoint[] = [];
              let strokeModified = false;
              for (const pt of st.points) {
                if (Math.hypot(pt.x - g.x, pt.y - g.y) <= eraseRadius) {
                  strokeModified = true;
                  erasedAny = true;
                  if (currentChunk.length >= 2) {
                    nextStrokes.push({
                      ...st,
                      id: Math.random().toString(36).slice(2, 9),
                      points: currentChunk
                    });
                  }
                  currentChunk = [];
                } else {
                  currentChunk.push(pt);
                }
              }
              if (!strokeModified) {
                nextStrokes.push(st);
              } else if (currentChunk.length >= 2) {
                nextStrokes.push({
                  ...st,
                  id: Math.random().toString(36).slice(2, 9),
                  points: currentChunk
                });
              }
            }

            // Also erase earlier points of player's in-progress stroke if passing nearby
            if (currentPointsRef.current.length > 8) {
              const safeTail = currentPointsRef.current.slice(-4);
              const checkHead = currentPointsRef.current.slice(0, -4);
              const keptHead = checkHead.filter((pt) => {
                const hit = Math.hypot(pt.x - g.x, pt.y - g.y) <= eraseRadius;
                if (hit) erasedAny = true;
                return !hit;
              });
              if (keptHead.length !== checkHead.length) {
                currentPointsRef.current = [...keptHead, ...safeTail];
              }
            }

            if (erasedAny) {
              strokesRef.current = nextStrokes;
              if (!isBlind) {
                redrawAllStrokes(ctx, c, strokesRef.current, currentPointsRef.current);
              }
              onChangeRef.current?.();
              // After nipping a tiny segment, immediately switch back to drawing or roaming
              g.mode = "draw";
              g.modeUntil = now + 1000 + Math.random() * 600;
              g.targetX = 25 + Math.random() * (c.width - 50);
              g.targetY = 25 + Math.random() * (c.height - 50);
            }
          }

          // Update floating Ghost emoji avatar on canvas
          if (poltergeistDomRef.current) {
            const el = poltergeistDomRef.current;
            const floatBob = Math.sin(g.phase * 1.4) * 6;
            const tilt = Math.cos(g.phase * 0.9) * 12;
            const flip = Math.cos(dirAngle) < 0 ? -1 : 1;
            el.style.left = `${(g.x / c.width) * 100}%`;
            el.style.top = `${((g.y + floatBob) / c.height) * 100}%`;
            el.style.transform = `translate(-50%, -50%) scaleX(${flip}) rotate(${tilt}deg) scale(${g.mode === "erase" ? 1.25 : 1})`;
            el.style.filter = g.mode === "erase"
              ? "drop-shadow(0 0 16px rgba(239, 68, 68, 0.9)) drop-shadow(0 0 6px #f43f5e)"
              : g.mode === "draw"
                ? "drop-shadow(0 0 16px rgba(168, 85, 247, 0.9)) drop-shadow(0 0 6px #c084fc)"
                : "drop-shadow(0 0 14px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 4px #e0e7ff)";
          }
        }
      }

      // Wind Tunnel: Brisk winds that alternate direction for every stroke!
      if (isWindTunnelRef.current && !hasSubmittedRef.current && c && ctx) {
        const now = Date.now();
        const activeStrokeDir = strokesRef.current.length % 2 === 0 ? 1 : -1;
        if (windBannerDomRef.current) {
          const arrow = activeStrokeDir > 0 ? "💨 ➡️ RIGHT" : "⬅️ 💨 LEFT";
          windBannerDomRef.current.textContent = `🌬️ Wind Tunnel (${arrow}): Direction flips every stroke!`;
        }
        if (now - lastWindTickRef.current >= 38) {
          lastWindTickRef.current = now;
          let drifted = false;
          for (let sIdx = 0; sIdx < strokesRef.current.length; sIdx++) {
            const s = strokesRef.current[sIdx]!;
            if (now - s.timestamp < 3600) {
              const dir = sIdx % 2 === 0 ? 1 : -1;
              const dx = dir * 1.45;
              const dy = dir * 0.22;
              for (const pt of s.points) {
                pt.x = Math.max(0, Math.min(c.width, pt.x + dx));
                pt.y = Math.max(0, Math.min(c.height, pt.y + dy));
              }
              drifted = true;
            }
          }
          if (drifted && !isBlind) {
            redrawAllStrokes(ctx, c, strokesRef.current, currentPointsRef.current);
          }
        }
      }

      // Trash Compactor: 5-second delay before starting, then smooth 60s shrink of available drawing boundary
      if (isTrashCompactorRef.current && !hasSubmittedRef.current && c && ctx) {
        const elapsed = Date.now() - compactorStartTimeRef.current;
        const progress = elapsed < 5000 ? 0 : Math.min(1, (elapsed - 5000) / 60000);
        updateCompactorDOM(progress);
      }

      // Alien Vaporizer Beam: Charges up every few seconds and completely removes all ink/area in the beam
      if (isTractorBeamRef.current && !hasSubmittedRef.current && c) {
        const t = Date.now();
        const cycle = t % 4200; // 4.2s cycle
        const isCharging = cycle >= 2200 && cycle < 3200;
        const isFiring = cycle >= 3200 && cycle < 3800;

        if (!isCharging && !isFiring) {
          // Patrol movement
          const ufoX = c.width / 2 + Math.sin(t / 1100) * (c.width * 0.38);
          ufoPosRef.current = { x: ufoX, y: 36 };
        }

        const ufoX = ufoPosRef.current.x;
        const ufoY = ufoPosRef.current.y;

        if (ufoDomRef.current && tractorBeamDomRef.current && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const screenX = (ufoX / c.width) * rect.width;
          const screenY = (ufoY / c.height) * rect.height;

          ufoDomRef.current.style.transform = `translate(${screenX - 32}px, ${screenY - 24}px)`;

          if (isFiring) {
            // Intense vertical disintegrator laser column
            const beamW = (130 / c.width) * rect.width;
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
            const beamHalf = (80 / c.width) * rect.width;
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
            const beamHalf = (90 / c.width) * rect.width;
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
            redrawAllStrokes(ctx, c, strokesRef.current);
          }

          // Visual clear of the vaporized beam column on canvas
          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(beamLeft, 0, beamRight - beamLeft, c.height);
          ctx.restore();
        }
      }

      if (isInputDelayRef.current && c && ctx && !hasSubmittedRef.current) {
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
        ctx.fillRect(0, 0, c.width, c.height);

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
  }, [isSpinning, isTrashCompactor, isTractorBeam, isInputDelay, isMagnets, isWindTunnel, isPoltergeist]);

  // Main Pointer Down / Move / Up Handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drawing = false;

    const onDown = (evt: PointerEvent) => {
      if (disabledRef.current || (isOneStrokeRef.current && hasSubmittedRef.current)) return;

      let p = getCanvasPos(
        evt,
        canvas,
        containerRef.current,
        isUpsideDownRef.current,
        isSpinningRef.current,
        spinAngleRef.current
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

      // Save undo snapshot before starting stroke (except for tricks where undo doesn't apply)
      if (!isOneStrokeRef.current && !isInputDelayRef.current && !isTractorBeamRef.current) {
        try {
          const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
          undoStackRef.current.push({
            imageData: snap,
            strokesLen: strokesRef.current.length,
            inkRemaining: inkRemainingRef.current,
            hasDrawnBefore: strokesRef.current.length > 0
          });
          if (undoStackRef.current.length > 15) {
            undoStackRef.current.shift();
          }
          setCanUndo(true);
        } catch {}
      }

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
        containerRef.current,
        isUpsideDownRef.current,
        isSpinningRef.current,
        spinAngleRef.current
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
        const rawIceX = currentIce.x + iceVelRef.current.vx;
        const rawIceY = currentIce.y + iceVelRef.current.vy;
        if (rawIceX <= 0 || rawIceX >= canvas.width) iceVelRef.current.vx = 0;
        if (rawIceY <= 0 || rawIceY >= canvas.height) iceVelRef.current.vy = 0;
        const newIce = {
          x: Math.max(0, Math.min(canvas.width, rawIceX)),
          y: Math.max(0, Math.min(canvas.height, rawIceY))
        };
        p = newIce;
        icePosRef.current = newIce;
      }

      // Magnet Anomaly: 5 balanced alternating magnetic poles (switching every 10s) gently bend the brush path without locking the cursor
      if (isMagnetsRef.current) {
        const now = Date.now();
        const flip = Math.floor(now / 10000) % 2 === 0;
        const poleCoords = [
          { rx: 0.24, ry: 0.26, radius: 210, power: 42 },
          { rx: 0.76, ry: 0.26, radius: 210, power: 42 },
          { rx: 0.50, ry: 0.50, radius: 230, power: 52 },
          { rx: 0.24, ry: 0.74, radius: 210, power: 42 },
          { rx: 0.76, ry: 0.74, radius: 210, power: 42 }
        ];
        let mx = 0;
        let my = 0;
        for (let idx = 0; idx < poleCoords.length; idx++) {
          const pc = poleCoords[idx]!;
          const px = canvas.width * pc.rx;
          const py = canvas.height * pc.ry;
          const attract = idx % 2 === 0 ? flip : !flip;
          const dx = px - p.x;
          const dy = py - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2 && dist < pc.radius) {
            const strength = Math.pow(1 - dist / pc.radius, 1.25) * pc.power;
            const sign = attract ? 1 : -1;
            mx += (dx / dist) * strength * sign;
            my += (dy / dist) * strength * sign;
          }
        }
        // Attenuate magnetic pull right at the outer 22px rim so all 4 edges (0..width, 0..height) remain 100% reachable
        const borderDist = Math.min(p.x, canvas.width - p.x, p.y, canvas.height - p.y);
        const borderFactor = Math.min(1, Math.max(0, borderDist / 22));
        p = {
          x: Math.max(0, Math.min(canvas.width, p.x + mx * borderFactor)),
          y: Math.max(0, Math.min(canvas.height, p.y + my * borderFactor))
        };
      }

      // Glitch Teleport (Controlled, less frequent, clean gap jumps with decaying offset so edges are never blocked)
      if (isGlitchRef.current) {
        pointsSinceGlitchRef.current = (pointsSinceGlitchRef.current || 0) + 1;
        if (pointsSinceGlitchRef.current >= 26 || (pointsSinceGlitchRef.current >= 16 && Math.random() < 0.05)) {
          pointsSinceGlitchRef.current = 0;
          const jumpAngle = Math.random() * Math.PI * 2;
          const jumpDist = Math.floor(Math.random() * 60) + 60; // 60px to 120px controlled jump
          const jumpDistX = Math.cos(jumpAngle) * jumpDist;
          const jumpDistY = Math.sin(jumpAngle) * jumpDist;
          teleportOffsetRef.current = { x: jumpDistX, y: jumpDistY };

          const teleportX = Math.max(0, Math.min(canvas.width, rawPos.x + jumpDistX));
          const teleportY = Math.max(0, Math.min(canvas.height, rawPos.y + jumpDistY));

          p = { x: teleportX, y: teleportY };
          strokeStartRef.current = p;
          currentPointsRef.current.push(p);
          isTeleportJumpRef.current = true;
          return;
        }
      }

      if (isGlitchRef.current && (teleportOffsetRef.current.x !== 0 || teleportOffsetRef.current.y !== 0)) {
        teleportOffsetRef.current = {
          x: Math.abs(teleportOffsetRef.current.x) < 1 ? 0 : teleportOffsetRef.current.x * 0.72,
          y: Math.abs(teleportOffsetRef.current.y) < 1 ? 0 : teleportOffsetRef.current.y * 0.72
        };
        p = {
          x: Math.max(0, Math.min(canvas.width, rawPos.x + teleportOffsetRef.current.x)),
          y: Math.max(0, Math.min(canvas.height, rawPos.y + teleportOffsetRef.current.y))
        };
      }

      const prev = currentPointsRef.current[currentPointsRef.current.length - 1] ?? strokeStartRef.current ?? p;
      const segDist = Math.hypot(p.x - prev.x, p.y - prev.y);

      // Decimate sub-pixel/micro pointer jitter to keep stroke logs compact & smooth
      if (segDist < 1.5 && currentPointsRef.current.length > 1) {
        return;
      }

      // Ink limit budget calculation
      if (maxInk > 0 && inkRemainingRef.current <= 0) {
        return;
      }

      if (maxInk > 0 && prev) {
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
          const endY = Math.min(canvas.height, p.y + dripLength);
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
            const dropY = Math.min(canvas.height, endY + dropDist);
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

      if (isSpiderwebRef.current) {
        drawSpiderwebThreads(
          ctx,
          p,
          strokesRef.current,
          currentPointsRef.current,
          colorRef.current,
          strokeWidthToUse
        );
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
          const flingPower = Math.min(1050, pullDist * 2.5);
          const angle = Math.atan2(-dy, -dx);
          const targetX = Math.max(0, Math.min(canvas.width, anchor.x + Math.cos(angle) * flingPower));
          const targetY = Math.max(0, Math.min(canvas.height, anchor.y + Math.sin(angle) * flingPower));

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
          containerRef.current,
          isUpsideDownRef.current,
          isSpinningRef.current,
          spinAngleRef.current
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
        containerRef.current,
        isUpsideDownRef.current,
        isSpinningRef.current,
        spinAngleRef.current
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
        } else if (isCubismRef.current && currentPointsRef.current.length >= 2) {
          currentPointsRef.current = buildCubismPolygonPoints(
            currentPointsRef.current,
            strokesRef.current,
            canvas.width,
            canvas.height
          );
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(currentPointsRef.current[0]!.x, currentPointsRef.current[0]!.y);
          for (let i = 1; i < currentPointsRef.current.length; i++) {
            ctx.lineTo(currentPointsRef.current[i]!.x, currentPointsRef.current[i]!.y);
          }
          ctx.closePath();
          ctx.fillStyle = colorRef.current;
          ctx.globalAlpha = 0.28;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = colorRef.current;
          ctx.lineWidth = effectiveStrokeSize;
          ctx.stroke();
          ctx.restore();
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

    const targetEl: HTMLElement = containerRef.current ?? canvas;
    targetEl.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      targetEl.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const undo = () => {
    if (disabledRef.current || isOneStrokeRef.current || isInputDelayRef.current || isTractorBeamRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const snap = undoStackRef.current.pop();
    if (!snap) return;

    ctx.putImageData(snap.imageData, 0, 0);
    strokesRef.current = strokesRef.current.slice(0, snap.strokesLen);
    if (maxInkRef.current > 0) {
      inkRemainingRef.current = snap.inkRemaining;
      setInkRemaining(snap.inkRemaining);
    }
    setCanUndo(undoStackRef.current.length > 0);
    setHasDrawn(strokesRef.current.length > 0 || snap.hasDrawnBefore);
    props.onChange?.();
  };

  // Support Ctrl+Z / Cmd+Z keyboard shortcut for Undo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
    setCanUndo(false);
    undoStackRef.current = [];
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
    updateCompactorDOM(0);
    if (maxInkRef.current > 0) {
      inkRemainingRef.current = maxInkRef.current;
      setInkRemaining(maxInkRef.current);
    }
    hasSubmittedRef.current = false;
    hideTetherDOM();
    props.onChange?.();
  };

  const toDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  };

  const isEraserActive = color.toUpperCase() === "#FFFFFF";

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
        className={`canvasWrap ${isSpinning ? "spinning-stage" : ""}`}
        style={{
          position: "relative",
          overflow: isTrashCompactor ? "hidden" : "visible",
          touchAction: "none",
          aspectRatio: `${width} / ${height}`,
          maxWidth: width === height ? "min(320px, calc(100vh - 340px))" : undefined
        }}
      >
        {isSpinning && (
          <div className="spinning-stage-badge" aria-hidden="true">
            <span>🎡</span>
            <span>Draw inside the framed rotating sheet!</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`canvas ${isSpinning ? "spinning-canvas-framed" : ""}`}
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

        {/* Magnet Anomaly Pole Overlays (5 high-power poles across canvas) */}
        {isMagnets && (
          <>
            {[
              { left: "24%", top: "26%", label: "🧲 ATTRACT" },
              { left: "76%", top: "26%", label: "🧲 REPEL" },
              { left: "50%", top: "50%", label: "🧲 CORE PULL" },
              { left: "24%", top: "74%", label: "🧲 REPEL" },
              { left: "76%", top: "74%", label: "🧲 ATTRACT" }
            ].map((pole, idx) => (
              <div
                key={idx}
                ref={(el) => {
                  magnetDomRefs.current[idx] = el;
                }}
                style={{
                  position: "absolute",
                  left: pole.left,
                  top: pole.top,
                  transform: "translate(-50%, -50%)",
                  padding: idx === 2 ? "5px 12px" : "4px 9px",
                  borderRadius: "999px",
                  fontSize: idx === 2 ? "0.76rem" : "0.68rem",
                  fontWeight: 800,
                  color: "#fff",
                  background: idx % 2 === 0 ? "rgba(225, 29, 72, 0.86)" : "rgba(2, 132, 199, 0.86)",
                  border: `2px solid ${idx % 2 === 0 ? "#fda4af" : "#7dd3fc"}`,
                  boxShadow: idx % 2 === 0 ? "0 0 24px rgba(244, 63, 94, 0.7)" : "0 0 24px rgba(56, 189, 248, 0.7)",
                  pointerEvents: "none",
                  zIndex: 7,
                  whiteSpace: "nowrap",
                  transition: "background 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease"
                }}
              >
                {pole.label}
              </div>
            ))}
          </>
        )}

        {/* Wind Tunnel Indicator Pill */}
        {isWindTunnel && (
          <div
            ref={windBannerDomRef}
            style={{
              position: "absolute",
              top: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(15, 23, 42, 0.85)",
              color: "#38bdf8",
              padding: "4px 14px",
              borderRadius: "999px",
              fontSize: "0.78rem",
              fontWeight: 800,
              pointerEvents: "none",
              zIndex: 8,
              border: "1px solid rgba(56, 189, 248, 0.45)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap"
            }}
          >
            🌬️ Wind Gust ➡️ (Wet ink drifts!)
          </div>
        )}

        {/* Poltergeist Mischievous Floating Ghost Emoji (No text) */}
        {isPoltergeist && (
          <div
            ref={poltergeistDomRef}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%) scale(1)",
              opacity: 1,
              fontSize: "2.4rem",
              lineHeight: 1,
              pointerEvents: "none",
              zIndex: 9,
              userSelect: "none",
              filter: "drop-shadow(0 0 14px rgba(255, 255, 255, 0.85)) drop-shadow(0 0 6px #c084fc)",
              transition: "transform 0.12s ease-out, filter 0.2s ease"
            }}
          >
            👻
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

        {/* Trash Compactor Shrinking Walls Overlay (Direct DOM refs for 60fps zero-rerender smoothness) */}
        {isTrashCompactor && (
          <>
            <div
              ref={compactorWarnRef}
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
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, overflow: "hidden" }}>
              <div
                ref={compactorTopRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "0%",
                  background: "repeating-linear-gradient(45deg, #1e293b, #1e293b 15px, #f59e0b 15px, #f59e0b 30px)"
                }}
              />
              <div
                ref={compactorBottomRef}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "0%",
                  background: "repeating-linear-gradient(45deg, #1e293b, #1e293b 15px, #f59e0b 15px, #f59e0b 30px)"
                }}
              />
              <div
                ref={compactorLeftRef}
                style={{
                  position: "absolute",
                  top: "0%",
                  bottom: "0%",
                  left: 0,
                  width: "0%",
                  background: "repeating-linear-gradient(45deg, #1e293b, #1e293b 15px, #f59e0b 15px, #f59e0b 30px)"
                }}
              />
              <div
                ref={compactorRightRef}
                style={{
                  position: "absolute",
                  top: "0%",
                  bottom: "0%",
                  right: 0,
                  width: "0%",
                  background: "repeating-linear-gradient(45deg, #1e293b, #1e293b 15px, #f59e0b 15px, #f59e0b 30px)"
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
                  className={`color-btn ${color.toUpperCase() === c.toUpperCase() ? "active" : ""} ${c.toUpperCase() === "#FFFFFF" ? "white-btn" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    if (c.toUpperCase() !== "#FFFFFF") {
                      lastNonWhiteColorRef.current = c;
                    }
                    setColor(c);
                    props.onColorChange?.(c);
                  }}
                  title={c.toUpperCase() === "#FFFFFF" ? "Eraser (White)" : `Color ${c}`}
                />
              ))}
              <button
                type="button"
                className={`tool-pill-btn ${isEraserActive ? "active" : ""}`}
                onClick={() => {
                  const next = isEraserActive ? lastNonWhiteColorRef.current : "#FFFFFF";
                  setColor(next);
                  props.onColorChange?.(next);
                }}
                title="Toggle Eraser"
              >
                🧹 {isEraserActive ? "Erasing" : "Eraser"}
              </button>
            </div>
            <div className="size-picker" style={{ opacity: isSizeLocked ? 0.85 : 1, display: "flex", alignItems: "center", gap: "8px" }}>
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
              <span
                className="brush-preview-dot"
                title={`${activeStrokeWidth}px`}
                style={{
                  width: `${Math.max(4, Math.min(28, activeStrokeWidth * 0.7))}px`,
                  height: `${Math.max(4, Math.min(28, activeStrokeWidth * 0.7))}px`,
                  background: isEraserActive ? "#ffffff" : color,
                  border: isEraserActive ? "2px dashed #64748b" : "1px solid rgba(255,255,255,0.5)"
                }}
              />
              {isSizeLocked ? (
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f59e0b", whiteSpace: "nowrap" }}>
                  {props.trick === "large_brush"
                    ? "35px (Mega)"
                    : props.trick === "pixel_art"
                    ? "32px (Pixel)"
                    : "🎲 Morphing"}
                </span>
              ) : (
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", minWidth: "30px" }}>
                  {size}px
                </span>
              )}
            </div>
          </div>

          <div className="row space" style={{ marginTop: "14px" }}>
            <div className="row" style={{ gap: "8px" }}>
              {!isOneStroke && !isInputDelay && !isTractorBeam && (
                <button
                  type="button"
                  className="btn"
                  onClick={undo}
                  disabled={!canUndo}
                  title="Undo last stroke (Ctrl+Z)"
                  style={{ padding: "8px 14px", fontSize: "0.9rem" }}
                >
                  ↩️ Undo
                </button>
              )}
              <button
                type="button"
                className="btn"
                onClick={clear}
                disabled={!hasDrawn && !canUndo}
                style={{ padding: "8px 14px", fontSize: "0.9rem" }}
              >
                🗑️ Clear
              </button>
            </div>

            <div className="muted" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              {hasDrawn ? "✨ Looking good!" : "✏️ Draw on the canvas!"}
            </div>

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