/** Build a PNG data URL: only pixels added on strokes by `accusedPlayerId`, tinted for overlay. */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Failed to load image"));
    im.src = src;
  });
}

function createWhiteImageData(w: number, h: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
  return new ImageData(data, w, h);
}

function drawToImageData(img: HTMLImageElement, targetW: number, targetH: number): ImageData {
  const c = document.createElement("canvas");
  c.width = targetW;
  c.height = targetH;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no ctx");
  // Ensure we have a solid white background to compare against
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return ctx.getImageData(0, 0, targetW, targetH);
}

export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    return {
      r: parseInt(h[0]! + h[0]!, 16),
      g: parseInt(h[1]! + h[1]!, 16),
      b: parseInt(h[2]! + h[2]!, 16)
    };
  }
  if (h.length >= 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }
  return { r: 255, g: 220, b: 90 };
}

export async function buildAccusedStrokesOverlay(
  strokeLog: Array<{ playerId: string; snapshotUrl: string }>,
  accusedPlayerId: string,
  tint: { r: number; g: number; b: number }
): Promise<string | null> {
  if (!strokeLog.length) return null;

  const w = 900;
  const h = 550;

  // Arrays to act as a Z-buffer, tracking who owns which pixel in the final image
  // and what the stroke's alpha should be.
  const ownerMap = new Array<string | null>(w * h).fill(null);
  const alphaMap = new Uint8Array(w * h);

  let prevData = createWhiteImageData(w, h);

  for (let s = 0; s < strokeLog.length; s++) {
    const step = strokeLog[s]!;
    const curImg = await loadImage(step.snapshotUrl);
    const curData = drawToImageData(curImg, w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;

        const r1 = prevData.data[i]!;
        const g1 = prevData.data[i + 1]!;
        const b1 = prevData.data[i + 2]!;

        const r2 = curData.data[i]!;
        const g2 = curData.data[i + 1]!;
        const b2 = curData.data[i + 2]!;

        // Compare consecutive steps. A threshold of > 25 ignores normal rendering noise
        // while capturing intentional strokes.
        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

        if (diff > 25) {
          // This pixel was drawn (or drawn over) during this player's turn!
          const alpha = Math.min(255, Math.round(diff * 1.2));
          
          const pixelIndex = y * w + x;
          // Claim ownership of this pixel for this player
          ownerMap[pixelIndex] = step.playerId;
          alphaMap[pixelIndex] = alpha;
        }
      }
    }
    prevData = curData;
  }

  // Now build the final transparent overlay containing ONLY the visible pixels
  // owned by the accused player.
  const outC = document.createElement("canvas");
  outC.width = w;
  outC.height = h;
  const octx = outC.getContext("2d");
  if (!octx) return null;
  
  const outData = new ImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pixelIndex = y * w + x;
      if (ownerMap[pixelIndex] === accusedPlayerId) {
        const i = pixelIndex * 4;
        outData.data[i] = tint.r;
        outData.data[i + 1] = tint.g;
        outData.data[i + 2] = tint.b;
        outData.data[i + 3] = alphaMap[pixelIndex]!;
      }
    }
  }

  octx.putImageData(outData, 0, 0);
  return outC.toDataURL("image/png");
}
