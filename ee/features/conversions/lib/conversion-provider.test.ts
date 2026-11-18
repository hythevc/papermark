import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { PDFDocument } from "pdf-lib";

import {
  conversionProviderConfig,
  readConversionBytes,
  requestConvertedPdf,
} from "./conversion-provider";

test("Office and Keynote need independent explicit provider configuration", () => {
  assert.throws(
    () => conversionProviderConfig("office", {}),
    /ROOMLINE_OFFICE_CONVERSION_URL/,
  );
  assert.throws(
    () =>
      conversionProviderConfig("keynote", {
        ROOMLINE_OFFICE_CONVERSION_URL: "https://office.example/convert",
      }),
    /ROOMLINE_KEYNOTE_CONVERSION_URL/,
  );
  for (const value of [
    "file:///tmp/converter",
    "https://user:password@example.com/convert",
  ]) {
    assert.throws(
      () =>
        conversionProviderConfig("office", {
          ROOMLINE_OFFICE_CONVERSION_URL: value,
        }),
      /HTTP\(S\).*without embedded credentials/,
    );
  }
});

test("configured provider transport sends a multipart file and reads PDF response over real local HTTP", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const fixture = Buffer.from(await pdf.save());
  let requests = 0;
  const server = createServer(async (req, res) => {
    requests++;
    assert.equal(req.method, "POST");
    assert.equal(req.url, "/forms/libreoffice/convert");
    assert.equal(req.headers.authorization, "Bearer fixture-credential");
    assert.match(
      req.headers["content-type"] ?? "",
      /^multipart\/form-data; boundary=/,
    );
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks).toString();
    assert.match(body, /name="files"; filename="contract-example.docx"/);
    assert.match(body, /office-input-fixture/);
    res.writeHead(200, { "content-type": "application/pdf" });
    res.end(fixture);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const output = await requestConvertedPdf(
      {
        kind: "office",
        bytes: Buffer.from("office-input-fixture"),
        filename: "contract-example.docx",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      {
        env: {
          ROOMLINE_OFFICE_CONVERSION_URL: `http://127.0.0.1:${address.port}/forms/libreoffice/convert`,
          ROOMLINE_OFFICE_CONVERSION_TOKEN: "fixture-credential",
        },
      },
    );
    assert.deepEqual(output, fixture);
    assert.equal(
      (await PDFDocument.load(new Uint8Array(output))).getPageCount(),
      1,
    );
    assert.equal(requests, 1);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("provider failure, redirects, empty input and non-PDF results cannot report conversion success", async () => {
  const input = {
    kind: "office" as const,
    bytes: Buffer.from("input"),
    filename: "example.docx",
    contentType: "application/octet-stream",
  };
  const env = {
    ROOMLINE_OFFICE_CONVERSION_URL: "https://converter.example/convert",
  };
  for (const response of [
    new Response("unavailable", { status: 503 }),
    new Response("<html>error</html>"),
    new Response(null),
  ]) {
    await assert.rejects(
      requestConvertedPdf(input, {
        env,
        fetch: async (_url, init) => {
          assert.equal(init?.redirect, "error");
          return response;
        },
      }),
    );
  }
  await assert.rejects(
    requestConvertedPdf(
      { ...input, bytes: Buffer.alloc(0) },
      {
        env,
        fetch: async () => {
          throw new Error("must not fetch");
        },
      },
    ),
    /empty/,
  );
});

test("size bounds apply to both content-length and actual streamed bytes", async () => {
  await assert.rejects(
    readConversionBytes(
      new Response("small", { headers: { "content-length": "101" } }),
      100,
    ),
    /size limit/,
  );
  await assert.rejects(
    readConversionBytes(new Response("too many bytes"), 3),
    /size limit/,
  );
  assert.equal(
    (await readConversionBytes(new Response("ok"), 3)).toString(),
    "ok",
  );
});
