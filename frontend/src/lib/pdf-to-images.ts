// Rasterises a PDF into one JPEG per page, in the browser, so the backend only
// ever deals with images (and needs no native PDF tooling).

const MAX_PAGE_WIDTH = 1600;

export async function pdfToImageFiles(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<File[]> {
  // Loaded lazily: pdf.js touches browser-only globals at import time.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await task.promise;
  const baseName = file.name.replace(/\.pdf$/i, "");
  const out: File[] = [];

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const natural = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_PAGE_WIDTH / natural.width);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error(`Could not render page ${n} of ${file.name}`);
    out.push(new File([blob], `${baseName}-p${String(n).padStart(3, "0")}.jpg`, { type: "image/jpeg" }));
    page.cleanup();
    onProgress?.(n, pdf.numPages);
  }
  await task.destroy();
  return out;
}
