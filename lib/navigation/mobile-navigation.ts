export function navigationPath(path: string): string {
  return path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
}

/** Match path segments, so e.g. /documents-old is not a Documents screen. */
export function matchesNavigationPath(
  path: string,
  destination: string,
  exact = false,
): boolean {
  const current = navigationPath(path);
  const target = navigationPath(destination);
  return current === target || (!exact && current.startsWith(`${target}/`));
}

export function workspaceMobileSection(path: string) {
  for (const section of ["dashboard", "documents", "datarooms"] as const) {
    if (matchesNavigationPath(path, `/${section}`)) return section;
  }
  return "more";
}

/** Works for both Next's route templates and resolved room URLs. */
export function roomMobileSection(path: string) {
  const current = navigationPath(path);
  if (!/^\/datarooms\/[^/]+(?:\/|$)/.test(current)) return null;
  const [section] = current.split("/").slice(3);
  if (!section) return "overview";
  if (section === "documents" || section === "document") return "documents";
  if (section === "permissions" || section === "groups") return "permissions";
  if (section === "analytics") return "analytics";
  return "more";
}
