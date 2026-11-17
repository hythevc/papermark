import { DocumentStorageType } from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";

import {
  assertConversionScope,
  convertDocumentVersion,
} from "./trigger/convert-files";

test("conversion never trusts a mismatched team, document, version, or S3 object prefix", () => {
  const payload = {
    teamId: "team",
    documentId: "document",
    documentVersionId: "version",
  };
  const version = {
    id: "version",
    documentId: "document",
    document: { teamId: "team" },
    file: "team/upload/source.docx",
    originalFile: "team/upload/source.docx",
    storageType: DocumentStorageType.S3_PATH,
  };
  assert.doesNotThrow(() => assertConversionScope(payload, version));
  for (const invalid of [
    { id: "other-version" },
    { documentId: "other-document" },
    { document: { teamId: "other-team" } },
    { file: "other-team/upload/source.docx" },
    { originalFile: "other-team/upload/source.docx" },
    { file: "team-similar/upload/source.docx" },
  ])
    assert.throws(
      () => assertConversionScope(payload, { ...version, ...invalid }),
      /unavailable in this team|outside this team/,
    );
});

test("missing identifiers are rejected before a Prisma lookup can broaden its scope", async () => {
  await assert.rejects(
    convertDocumentVersion({
      teamId: "",
      documentId: "document",
      documentVersionId: "version",
    }),
    /identifiers are required/,
  );
  await assert.rejects(
    convertDocumentVersion({
      teamId: "team",
      documentId: " ",
      documentVersionId: "version",
    }),
    /identifiers are required/,
  );
});

test("legacy Blob sources cannot send server-side conversion fetches to arbitrary origins", () => {
  const payload = {
    teamId: "team",
    documentId: "document",
    documentVersionId: "version",
  };
  const version = {
    id: "version",
    documentId: "document",
    document: { teamId: "team" },
    file: "https://fixture.public.blob.vercel-storage.com/file.docx",
    originalFile: null,
    storageType: DocumentStorageType.VERCEL_BLOB,
  };
  assert.doesNotThrow(() => assertConversionScope(payload, version));
  for (const file of [
    "http://localhost/file.docx",
    "https://example.com/file.docx",
    "https://fixture.blob.vercel-storage.com.attacker.example/file.docx",
    "https://user:password@fixture.blob.vercel-storage.com/file.docx",
  ]) {
    assert.throws(
      () => assertConversionScope(payload, { ...version, file }),
      /Unsupported conversion storage origin/,
    );
  }
});
