import type { NextApiRequest, NextApiResponse } from "next";

/** Process liveness; authenticated dependency checks live at /api/health/ready. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }
  if (req.method === "HEAD") return res.status(200).end();
  return res.status(200).json({ status: "ok", service: "roomline" });
}
