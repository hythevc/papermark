import type { NextApiRequest, NextApiResponse } from "next";

import { resolveTusIdentityMetadata } from "@/ee/features/request-lists/lib/tus-metadata";
import { resolveViewerUploadAccess } from "@/ee/features/request-lists/lib/viewer-upload-access";
import { MultiRegionS3Store } from "@/ee/features/storage/s3-store";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { Server } from "@tus/server";
import path from "node:path";

import { verifyDataroomSessionInPagesRouter } from "@/lib/auth/dataroom-auth";
import { getTeamS3ClientAndConfig } from "@/lib/files/aws-client";
import { RedisLocker } from "@/lib/files/tus-redis-locker";
import { newId } from "@/lib/id-helper";
import { lockerRedisClient } from "@/lib/redis";
import { buildContentDisposition, safeSlugify } from "@/lib/utils";
import { log } from "@/lib/utils";

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: false,
  },
};

const locker = new RedisLocker({
  redisClient: lockerRedisClient,
});

/**
 * Validates a viewer upload and resolves the team the file belongs to.
 *
 * Shared by `namingFunction` and `onUploadCreate` so the same authorization is
 * enforced when the transfer starts and when the upload record is created.
 *
 * Request List task uploads are gated by task assignment rather than the link's
 * generic `enableUpload` toggle — mirroring `/api/links/[id]/upload` — so a file
 * required by an assigned UPLOAD task can be sent even when the link/group does
 * not otherwise allow visitor uploads. Throws when the upload is not permitted.
 */
async function resolveViewerUploadTeamId(
  metadata: {
    teamId?: string;
    viewerId?: string;
    linkId?: string;
    dataroomId?: string;
    taskId?: string;
  },
  request: NextApiRequest,
): Promise<string> {
  const { teamId, viewerId, linkId, dataroomId, taskId } = metadata;
  if (teamId !== "visitor-upload" || !viewerId || !linkId || !dataroomId)
    throw new Error("Missing upload identity");
  const session = await verifyDataroomSessionInPagesRouter(
    request,
    linkId,
    dataroomId,
  );
  if (!session?.viewerId || session.viewerId !== viewerId)
    throw new Error("Invalid viewer session");
  const access = await resolveViewerUploadAccess(
    session,
    linkId,
    dataroomId,
    taskId,
  );
  return access.teamId;
}

let tusServer: Server | undefined;

function getTusServer(): Server {
  if (tusServer) return tusServer;
  tusServer = new Server({
    // `path` needs to match the route declared by the next file router
    path: "/api/file/tus-viewer",
    maxSize: 1024 * 1024 * 1024 * 2, // 2 GiB
    respectForwardedHeaders: true,
    locker,
    datastore: new MultiRegionS3Store(),
    async namingFunction(req, metadata) {
      // Extract viewer data from metadata
      const { teamId, fileName, viewerId, linkId, dataroomId, taskId } =
        metadata as {
          teamId: string;
          fileName: string;
          viewerId: string;
          linkId: string;
          dataroomId: string;
          taskId?: string;
        };

      // Validate the viewer exists and has permission
      let teamIdToUse: string;
      try {
        teamIdToUse = await resolveViewerUploadTeamId(
          {
            teamId,
            viewerId,
            linkId,
            dataroomId,
            taskId,
          },
          req as NextApiRequest,
        );
      } catch (error) {
        console.error("Error validating viewer:", error);
        throw {
          status_code: 403,
          body: "This session cannot upload to this room or request.",
        };
      }

      const docId = newId("doc");
      const { name, ext } = path.parse(fileName);
      const newName = `${teamIdToUse}/${docId}/${safeSlugify(name)}${ext}`;
      return newName;
    },
    generateUrl(req, { proto, host, path, id }) {
      // Encode the ID to be URL safe
      id = Buffer.from(id, "utf-8").toString("base64url");
      return `${proto}://${host}${path}/${id}`;
    },
    getFileIdFromRequest(req) {
      // Extract the ID from the URL
      const id = (req.url as string).split("/api/file/tus-viewer/")[1];
      return Buffer.from(id, "base64url").toString("utf-8");
    },
    onResponseError(req, res, err) {
      // Keep authorization and standard TUS offset/size failures as client
      // errors. Mapping every rejection to 500 encourages futile retries.
      if (
        "status_code" in err &&
        err.status_code >= 400 &&
        err.status_code < 500
      )
        return err;
      log({
        message: "Error uploading a file via viewer. Error: \n\n" + err,
        type: "error",
      });
      return { status_code: 500, body: "Internal Server Error" };
    },
    async onUploadCreate(req, res, upload) {
      // Extract viewer data from metadata
      const { teamId, viewerId, linkId, dataroomId, taskId } =
        upload.metadata as {
          teamId: string;
          fileName: string;
          viewerId: string;
          dataroomId: string;
          linkId: string;
          taskId?: string;
        };

      // Validate the viewer exists and has permission
      try {
        await resolveViewerUploadTeamId(
          {
            teamId,
            viewerId,
            linkId,
            dataroomId,
            taskId,
          },
          req as NextApiRequest,
        );

        return res;
      } catch (error) {
        console.error("Error validating viewer:", error);
        throw {
          status_code: 403,
          body: "This session cannot upload to this room or request.",
        };
      }
    },
    async onUploadFinish(req, res, upload) {
      try {
        const metadata = upload.metadata || {};
        const contentType = metadata.contentType || "application/octet-stream";
        const { name, ext } = path.parse(metadata.fileName!);
        const originalFileName = `${name}${ext}`;
        const contentDisposition = buildContentDisposition(
          originalFileName,
          `${safeSlugify(name)}${ext}`,
        );

        // The Key (object path) where the file was uploaded
        const objectKey = upload.id;

        // Extract teamId from the object key (format: teamId/docId/filename)
        const teamId = objectKey.split("/")[0];
        if (!teamId) {
          throw { status_code: 500, body: "Invalid object key format" };
        }

        // Get team-specific S3 client and config
        const { client, config } = await getTeamS3ClientAndConfig(teamId);

        // Copy the object onto itself, replacing the metadata
        const params = {
          Bucket: config.bucket,
          CopySource: `${config.bucket}/${objectKey}`,
          Key: objectKey,
          ContentType: contentType,
          ContentDisposition: contentDisposition,
          MetadataDirective: "REPLACE" as const,
        };

        const copyCommand = new CopyObjectCommand(params);
        await client.send(copyCommand);

        return res;
      } catch (error) {
        throw { status_code: 500, body: "Error updating metadata" };
      }
    },
    async onIncomingRequest(req, res, uploadId) {
      if (req.method === "OPTIONS") return;
      try {
        const metadata = await resolveTusIdentityMetadata({
          method: req.method,
          uploadId,
          metadataHeader: req.headers["upload-metadata"],
          loadMetadata: async (id) =>
            (await getTusServer().datastore.getUpload(id)).metadata ?? {},
        });
        await resolveViewerUploadTeamId(metadata, req as NextApiRequest);
      } catch {
        throw {
          status_code: 403,
          body: "This session cannot upload to this room or request.",
        };
      }
    },
  });
  return tusServer;
}

// CORS headers to allow custom domains
const setCorsHeaders = (req: NextApiRequest, res: NextApiResponse) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, GET, OPTIONS, DELETE, PATCH, HEAD",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Upload-Length, Upload-Metadata, Upload-Offset, Tus-Resumable, Upload-Defer-Length, Upload-Concat",
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Upload-Offset, Location, Upload-Length, Tus-Version, Tus-Resumable, Tus-Max-Size, Tus-Extension, Upload-Metadata, Upload-Defer-Length, Upload-Concat",
  );
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    setCorsHeaders(req, res);
    return res.status(204).end();
  }

  // Set CORS headers for all requests
  setCorsHeaders(req, res);

  // The TUS hooks bind stored metadata to the current dataroom session.
  let server: Server;
  try {
    server = getTusServer();
  } catch {
    return res
      .status(503)
      .json({
        message: "File uploads are not configured or storage is unavailable.",
      });
  }
  return server.handle(req, res);
}
