/**
 * Reliably downloads any image data URL (SVG or PNG) as a standard, valid PNG file.
 */
export async function downloadImageDataUrl(dataUrl: string, filename: string): Promise<void> {
  if (!dataUrl) return;

  const safeFilename = filename.endsWith(".png") ? filename : `${filename}.png`;

  // For SVG data URLs or any unencoded/complex data URLs, draw to canvas to export pure standard PNG
  if (dataUrl.startsWith("data:image/svg+xml") || !dataUrl.startsWith("data:image/png")) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image for PNG conversion"));
        img.src = dataUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 900;
      canvas.height = img.naturalHeight || 550;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Fill clean white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = safeFilename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          return;
        }
      }
    } catch (err) {
      console.warn("Canvas conversion failed, falling back to direct download:", err);
    }
  }

  // Fallback / standard base64 PNG download
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
