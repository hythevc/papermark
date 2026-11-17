import type { DataroomFolder } from "@prisma/client";

type DocumentVersion = {
  id: string;
  type: string;
  versionNumber: number;
  hasPages: boolean;
  isVertical: boolean;
  updatedAt: Date;
  fileSize?: number | bigint | null;
};
export function getDataroomPreviewDataset() {
  const createdAt = new Date("2026-01-01T00:00:00Z");
  const folders: DataroomFolder[] = [
    "Company overview",
    "Financials",
    "Legal",
  ].map((name, index) => ({
    id: `preview-folder-${index}`,
    name,
    path: `/${name}`,
    parentId: null,
    icon: null,
    color: null,
    dataroomId: "preview",
    orderIndex: index,
    hierarchicalIndex: `${index + 1}`,
    createdAt,
    updatedAt: createdAt,
  }));
  const documents: {
    id: string;
    name: string;
    dataroomDocumentId: string;
    folderName: string | null;
    downloadOnly: boolean;
    canDownload: boolean;
    hierarchicalIndex: string | null;
    versions: DocumentVersion[];
  }[] = [
    { name: "Pitch deck.pdf", folderName: null },
    { name: "Company overview.pdf", folderName: "Company overview" },
    { name: "Financial model.xlsx", folderName: "Financials" },
  ].map((item, index) => ({
    id: `preview-document-${index}`,
    name: item.name,
    dataroomDocumentId: `preview-item-${index}`,
    folderName: item.folderName,
    downloadOnly: false,
    canDownload: false,
    hierarchicalIndex: null,
    versions: [
      {
        id: `preview-version-${index}`,
        type: item.name.endsWith(".xlsx") ? "sheet" : "pdf",
        versionNumber: 1,
        hasPages: true,
        isVertical: false,
        updatedAt: createdAt,
        fileSize: 1048576,
      },
    ],
  }));
  return { folders, documents };
}
