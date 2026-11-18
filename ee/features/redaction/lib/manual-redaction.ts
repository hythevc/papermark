import { PDFDocument } from "pdf-lib";
import { z } from "zod";

export const MAX_REDACTION_PAGES = 20;
export const regionSchema = z
  .object({
    pageNumber: z.number().int().min(1).max(MAX_REDACTION_PAGES),
    x: z.number().finite().min(0).max(1000),
    y: z.number().finite().min(0).max(1000),
    width: z.number().finite().positive().max(1000),
    height: z.number().finite().positive().max(1000),
  })
  .strict()
  .refine(
    (r) => r.x + r.width <= 1000 && r.y + r.height <= 1000,
    "Region must fit within the page.",
  );
export type ManualRegion = z.infer<typeof regionSchema>;

export async function inspectPdf(bytes: Uint8Array) {
  const mupdf = await import("mupdf");
  const pdf = new mupdf.PDFDocument(bytes);
  try {
    const numPages = pdf.countPages();
    if (numPages < 1 || numPages > MAX_REDACTION_PAGES)
      throw new Error("Manual redaction supports PDFs with 1–20 pages.");
    if (pdf.needsPassword())
      throw new Error("Unlock the PDF before creating a redacted copy.");
    return numPages;
  } finally {
    pdf.destroy();
  }
}

export async function sourcePagePng(bytes: Uint8Array, pageNumber: number) {
  const mupdf = await import("mupdf");
  const pdf = new mupdf.PDFDocument(bytes);
  try {
    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > pdf.countPages()
    )
      throw new Error("Page not found.");
    const page = pdf.loadPage(pageNumber - 1);
    try {
      const [x0, y0, x1, y1] = page.getBounds();
      const scale = Math.min(
        1.5,
        1600 / (x1 - x0),
        4000 / (y1 - y0),
        Math.sqrt(4000000 / ((x1 - x0) * (y1 - y0))),
      );
      const pixmap = page.toPixmap(
        [scale, 0, 0, scale, 0, 0],
        mupdf.ColorSpace.DeviceRGB,
        false,
        true,
      );
      try {
        return Buffer.from(pixmap.asPNG());
      } finally {
        pixmap.destroy();
      }
    } finally {
      page.destroy();
    }
  } finally {
    pdf.destroy();
  }
}

/**
 * Apply MuPDF redactions before rasterizing every page into a new PDF. The
 * derivative contains no original text layer, attachments, forms, or metadata.
 * This intentionally trades text selection/search for a flattened copy.
 */
export async function redactToFlattenedPdf(
  bytes: Uint8Array,
  input: ManualRegion[],
) {
  const regions = z.array(regionSchema).min(1).max(200).parse(input);
  await inspectPdf(bytes);
  const mupdf = await import("mupdf");
  const source = new mupdf.PDFDocument(bytes);
  const output = await PDFDocument.create();
  let imageBytes = 0;
  try {
    const count = source.countPages();
    if (regions.some((r) => r.pageNumber > count))
      throw new Error("Region refers to a missing page.");
    for (let index = 0; index < count; index++) {
      const page = source.loadPage(index);
      try {
        const [x0, y0, x1, y1] = page.getBounds();
        const width = x1 - x0,
          height = y1 - y0;
        if (width <= 0 || height <= 0)
          throw new Error("Invalid page dimensions.");
        for (const region of regions.filter(
          (r) => r.pageNumber === index + 1,
        )) {
          const annotation = page.createAnnotation("Redact");
          annotation.setRect([
            x0 + (region.x / 1000) * width,
            y0 + (region.y / 1000) * height,
            x0 + ((region.x + region.width) / 1000) * width,
            y0 + ((region.y + region.height) / 1000) * height,
          ]);
          annotation.update();
        }
        page.applyRedactions(
          true,
          mupdf.PDFPage.REDACT_IMAGE_PIXELS,
          mupdf.PDFPage.REDACT_LINE_ART_REMOVE_IF_TOUCHED,
          mupdf.PDFPage.REDACT_TEXT_REMOVE,
        );
        const scale = Math.min(
          1.5,
          1600 / width,
          4000 / height,
          Math.sqrt(4000000 / (width * height)),
        );
        const pixmap = page.toPixmap(
          [scale, 0, 0, scale, 0, 0],
          mupdf.ColorSpace.DeviceRGB,
          false,
          true,
        );
        try {
          const png = pixmap.asPNG();
          imageBytes += png.byteLength;
          if (imageBytes > 20 * 1024 * 1024)
            throw new Error(
              "Flattened output exceeds the 20 MiB processing limit.",
            );
          const image = await output.embedPng(png);
          output
            .addPage([width, height])
            .drawImage(image, { x: 0, y: 0, width, height });
        } finally {
          pixmap.destroy();
        }
      } finally {
        page.destroy();
      }
    }
    output.setTitle("Redacted copy");
    output.setProducer("Roomline");
    const result = await output.save();
    if (result.byteLength > 20 * 1024 * 1024)
      throw new Error("Flattened output exceeds the 20 MiB processing limit.");
    return result;
  } finally {
    source.destroy();
  }
}
