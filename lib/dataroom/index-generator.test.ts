import ExcelJS from "exceljs";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

import {
  type DataroomIndexSource,
  generateDataroomIndex,
} from "./index-generator";

const createdAt = new Date("2026-01-05T10:00:00Z");
const updatedAt = new Date("2026-01-08T10:00:00Z");

function source(): DataroomIndexSource {
  const document = (id: string, folderId: string | null, fileSize: number) => ({
    id,
    folderId,
    createdAt,
    updatedAt,
    orderIndex: 0,
    hierarchicalIndex: folderId ? "1.1" : "2",
    document: {
      id: `document-${id}`,
      name: `${id}.pdf`,
      versions: [
        {
          id: `version-${id}`,
          versionNumber: 2,
          type: "application/pdf",
          hasPages: true,
          file: "stored-file.pdf",
          fileSize,
          isVertical: true,
          numPages: 3,
          updatedAt,
        },
      ],
    },
  });

  return {
    id: "link-visible",
    dataroom: {
      id: "room-visible",
      name: "Shared materials",
      createdAt,
      lastUpdatedAt: updatedAt,
      folders: [
        {
          id: "folder-visible",
          name: "Finance",
          path: "/Finance",
          parentId: null,
          dataroomId: "room-visible",
          orderIndex: 0,
          hierarchicalIndex: "1",
          createdAt,
          updatedAt,
          icon: null,
          color: null,
        },
      ],
      documents: [
        document("overview", null, 1024 * 1024),
        document("financials", "folder-visible", 512 * 1024),
      ],
    },
  };
}

test("index accepts the minimal authorized source and includes only supplied items", async () => {
  const result = await generateDataroomIndex(source(), {
    format: "json",
    baseUrl: "https://rooms.example/view/link-visible",
    showHierarchicalIndex: true,
  });
  const index = JSON.parse(result.data.toString());

  assert.equal(result.mimeType, "application/json");
  assert.match(result.filename, /^Shared_materials_Index_.*\.json$/);
  assert.equal(index.linkId, "link-visible");
  assert.equal(index.totalFiles, 2);
  assert.equal(index.totalFolders, 1);
  assert.equal(index.totalSize, 1536 * 1024);
  assert.deepEqual(
    index.entries.map((entry: { name: string; path: string }) => [
      entry.name,
      entry.path,
    ]),
    [
      ["Shared materials", ""],
      ["Finance", "/"],
      ["financials.pdf", "/Finance/"],
      ["overview.pdf", "/"],
    ],
  );
  assert.equal(
    index.entries[2].onlineUrl,
    "https://rooms.example/view/link-visible/d/financials",
  );
  assert.equal(index.entries[2].hierarchicalIndex, "1.1");
  assert.equal(index.entries[2].size, 0.5);
  assert.equal(index.entries[2].version, 2);
});

test("Excel export uses the same source totals without requiring a full link record", async () => {
  const result = await generateDataroomIndex(source(), {
    format: "excel",
    baseUrl: "https://rooms.example/view/link-visible",
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.read(Readable.from([result.data]));

  assert.match(result.filename, /\.xlsx$/);
  assert.deepEqual(
    workbook.worksheets.map((worksheet) => worksheet.name),
    ["Dataroom Index", "Summary"],
  );
  const summary = workbook.getWorksheet("Summary")!;
  assert.equal(summary.getCell("B4").value, 2);
  assert.equal(summary.getCell("B5").value, 1);
  assert.equal(summary.getCell("B6").value, 1.5);
});
