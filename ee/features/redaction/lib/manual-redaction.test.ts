import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { redactToFlattenedPdf, regionSchema } from "./manual-redaction";

test("manual regions reject out-of-page, nonfinite and empty coordinates", () => {
  const region = { pageNumber: 1, x: 10, y: 10, width: 100, height: 100 };
  for (const change of [
    { width: 0 },
    { x: 950 },
    { y: -1 },
    { pageNumber: 0 },
    { height: Infinity },
  ])
    assert.equal(
      regionSchema.safeParse({ ...region, ...change }).success,
      false,
    );
});

test("redacted PDF has masked pixels and no retained source text or metadata", async () => {
  const mupdf = await import("mupdf");
  const source = await PDFDocument.create();
  const font = await source.embedFont(StandardFonts.Helvetica);
  source.setTitle("PRIVATE-SENTINEL metadata");
  const page = source.addPage([600, 800]);
  page.drawText("PRIVATE-SENTINEL", { x: 50, y: 700, size: 20, font });
  page.drawText("PUBLIC INFORMATION", { x: 50, y: 500, size: 20, font });
  const bytes = await source.save();
  const original = new mupdf.PDFDocument(bytes);
  const originalPage = original.loadPage(0);
  assert.match(originalPage.toStructuredText().asText(), /PRIVATE-SENTINEL/);
  originalPage.destroy();
  original.destroy();
  const result = await redactToFlattenedPdf(bytes, [
    { pageNumber: 1, x: 50, y: 70, width: 600, height: 90 },
  ]);
  const output = new mupdf.PDFDocument(result);
  const rendered = output.loadPage(0);
  assert.equal(rendered.toStructuredText().asText().trim(), "");
  assert.doesNotMatch(
    output.getMetaData("info:Title") ?? "",
    /PRIVATE-SENTINEL/,
  );
  const pixmap = rendered.toPixmap(
    [1, 0, 0, 1, 0, 0],
    mupdf.ColorSpace.DeviceRGB,
    false,
    true,
  );
  const pixels = pixmap.getPixels();
  const channels = pixmap.getNumberOfComponents();
  const pixel = (x: number, y: number) =>
    Array.from(
      pixels.subarray((y * 600 + x) * channels, (y * 600 + x) * channels + 3),
    );
  assert.ok(
    pixel(100, 100).every((v) => v < 10),
    "selected region is actually black in output",
  );
  assert.ok(
    pixel(500, 500).every((v) => v > 240),
    "unselected white area is retained",
  );
  pixmap.destroy();
  rendered.destroy();
  output.destroy();
  await assert.rejects(
    () =>
      redactToFlattenedPdf(bytes, [
        { pageNumber: 2, x: 10, y: 10, width: 20, height: 20 },
      ]),
    /missing page/,
  );
});
