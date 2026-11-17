import type { NextApiRequest, NextApiResponse } from "next";

import { handleAdminRequestList } from "@/ee/features/request-lists/lib/admin";

import { withTeamApi } from "@/lib/api/auth/with-session-team";

const read = withTeamApi(handleAdminRequestList, {
  requiredPermissions: ["datarooms.read"],
  dataroomParam: "id",
});
const write = withTeamApi(handleAdminRequestList, {
  requiredPermissions: ["datarooms.write"],
  dataroomParam: "id",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") return read(req, res);
  if (["POST", "PATCH", "DELETE"].includes(req.method ?? ""))
    return write(req, res);
  res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
  return res.status(405).json({ error: "Method not allowed." });
}
