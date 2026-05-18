import { StrokeEvent } from "../types";

/** Build a PNG data URL: only pixels owned by `accusedPlayerId` based on authoritative stroke tracking. */

export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").trim();
  let r = 255, g = 220, b = 90;
  if (h.length === 3) {
    r = parseInt(h[0]! + h[0]!, 16);
    g = parseInt(h[1]! + h[1]!, 16);
    b = parseInt(h[2]! + h[2]!, 16);
  } else if (h.length >= 6) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  return {
    r: isNaN(r) ? 255 : r,
    g: isNaN(g) ? 220 : g,
    b: isNaN(b) ? 90 : b
  };
}

function distanceSqToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return (px - x1) ** 2 + (py - y1) ** 2;
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return (px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2;
}

function rasterizeStrokeInto(
  stroke: StrokeEvent,
  ownerBuffer: Int32Array,
  alphaBuffer: Uint8Array,
  strokeIndex: number,
  width: number,
  height: number
) {
  const { points, brushSize } = stroke;
  if (points.length === 0) return;

  const radius = brushSize / 2;

  // If only one point, treat as a tiny segment
  const segments = points.length === 1
    ? [{ p1: points[0]!, p2: points[0]! }]
    : points.slice(0, -1).map((p, i) => ({ p1: p, p2: points[i + 1]! }));

  for (const { p1, p2 } of segments) {
    const minX = Math.floor(Math.min(p1.x, p2.x) - radius - 1);
    const maxX = Math.ceil(Math.max(p1.x, p2.x) + radius + 1);
    const minY = Math.floor(Math.min(p1.y, p2.y) - radius - 1);
    const maxY = Math.ceil(Math.max(p1.y, p2.y) + radius + 1);

    const startX = Math.max(0, minX);
    const endX = Math.min(width - 1, maxX);
    const startY = Math.max(0, minY);
    const endY = Math.min(height - 1, maxY);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        // 4x Super-sampling (SSAA) for extreme precision
        const samples = [
          { dx: 0.25, dy: 0.25 },
          { dx: 0.75, dy: 0.25 },
          { dx: 0.25, dy: 0.75 },
          { dx: 0.75, dy: 0.75 },
        ];

        let totalAlpha = 0;
        for (const s of samples) {
          const dSq = distanceSqToSegment(x + s.dx, y + s.dy, p1.x, p1.y, p2.x, p2.y);
          if (dSq <= radius ** 2) {
            const d = Math.sqrt(dSq);
            let a = 1.0;
            if (d > radius - 0.5) {
              a = 1.0 - (d - (radius - 0.5)) / 1.5;
              a = Math.max(0, Math.min(1, a));
            }
            totalAlpha += a;
          }
        }

        if (totalAlpha > 0) {
          const idx = y * width + x;
          const finalAlpha = Math.round((totalAlpha / 4) * 255);

          // Latest stroke wins (Z-order)
          ownerBuffer[idx] = strokeIndex;
          alphaBuffer[idx] = finalAlpha;
        }
      }
    }
  }
}

export async function buildAccusedStrokesOverlay(
  strokeLog: StrokeEvent[],
  accusedPlayerId: string,
  tint: { r: number; g: number; b: number }
): Promise<string | null> {
  if (!strokeLog || !strokeLog.length) return null;

  const w = 900;
  const h = 550;

  // ownerBuffer tracks which stroke (by index) owns the pixel. -1 means no owner.
  const ownerBuffer = new Int32Array(w * h).fill(-1);
  const alphaBuffer = new Uint8Array(w * h);

  // Process all strokes in order (authoritative Z-order)
  for (let i = 0; i < strokeLog.length; i++) {
    rasterizeStrokeInto(strokeLog[i]!, ownerBuffer, alphaBuffer, i, w, h);
  }

  // Now build the final transparent overlay
  const outC = document.createElement("canvas");
  outC.width = w;
  outC.height = h;
  const octx = outC.getContext("2d");
  if (!octx) return null;

  const outData = octx.createImageData(w, h);

  for (let i = 0; i < w * h; i++) {
    const strokeIdx = ownerBuffer[i];
    if (strokeIdx !== -1) {
      const stroke = strokeLog[strokeIdx]!;
      if (stroke.playerId === accusedPlayerId) {
        const targetIdx = i * 4;
        outData.data[targetIdx] = tint.r;
        outData.data[targetIdx + 1] = tint.g;
        outData.data[targetIdx + 2] = tint.b;
        outData.data[targetIdx + 3] = alphaBuffer[i]!;
      }
    }
  }

  octx.putImageData(outData, 0, 0);
  return outC.toDataURL("image/png");
}

