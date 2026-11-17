import { z } from "zod";

export const DataroomCardLayoutSchema = z.enum(["LIST", "GRID", "COMPACT"]);
export type DataroomCardLayout = z.infer<typeof DataroomCardLayoutSchema>;
export const DataroomViewerHeaderStyleSchema = z.enum([
  "DEFAULT",
  "SPLIT",
  "NOTION",
]);
export type DataroomViewerHeaderStyle = z.infer<
  typeof DataroomViewerHeaderStyleSchema
>;
export const DataroomViewerLayoutPresetSchema = z.enum([
  "STANDARD",
  "STRICT",
  "MODERN",
  "NOTION",
  "CUSTOM",
]);
export type DataroomViewerLayoutPreset = z.infer<
  typeof DataroomViewerLayoutPresetSchema
>;
export type DataroomLayoutCardId = Exclude<
  DataroomViewerLayoutPreset,
  "CUSTOM"
>;
export const CARD_LAYOUT_OPTIONS = [
  { value: "LIST", label: "Cards" },
  { value: "COMPACT", label: "List" },
  { value: "GRID", label: "Grid" },
] as const;
export function asDataroomCardLayout(value: unknown): DataroomCardLayout {
  const parsed = DataroomCardLayoutSchema.safeParse(value);
  return parsed.success ? parsed.data : "LIST";
}
export function asDataroomViewerHeaderStyle(
  value: unknown,
): DataroomViewerHeaderStyle {
  const parsed = DataroomViewerHeaderStyleSchema.safeParse(value);
  return parsed.success ? parsed.data : "DEFAULT";
}
export function inferDataroomViewerLayoutPreset(input: {
  cardLayout: string;
  showFolderTree: boolean;
  hideFolderIconsInMain: boolean;
  viewerHeaderStyle: string;
}): DataroomViewerLayoutPreset {
  const {
    cardLayout,
    showFolderTree,
    hideFolderIconsInMain,
    viewerHeaderStyle,
  } = input;
  if (
    cardLayout === "LIST" &&
    showFolderTree &&
    !hideFolderIconsInMain &&
    viewerHeaderStyle === "DEFAULT"
  )
    return "STANDARD";
  if (
    cardLayout === "COMPACT" &&
    !showFolderTree &&
    hideFolderIconsInMain &&
    viewerHeaderStyle === "DEFAULT"
  )
    return "STRICT";
  if (
    cardLayout === "COMPACT" &&
    !showFolderTree &&
    hideFolderIconsInMain &&
    viewerHeaderStyle === "SPLIT"
  )
    return "MODERN";
  if (
    cardLayout === "GRID" &&
    !showFolderTree &&
    !hideFolderIconsInMain &&
    viewerHeaderStyle === "NOTION"
  )
    return "NOTION";
  return "CUSTOM";
}
