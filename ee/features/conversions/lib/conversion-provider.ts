export type ConversionKind = "office" | "keynote";
export const MAX_CONVERSION_BYTES = 100 * 1024 * 1024;

export function conversionProviderConfig(
  kind: ConversionKind,
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  const prefix =
    kind === "keynote"
      ? "ROOMLINE_KEYNOTE_CONVERSION"
      : "ROOMLINE_OFFICE_CONVERSION";
  const endpoint = env[`${prefix}_URL`];
  if (!endpoint)
    throw new Error(
      `${kind === "keynote" ? "Keynote" : "Office"} conversion is not configured. Set ${prefix}_URL to a compatible PDF conversion service.`,
    );
  const url = new URL(endpoint);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      `${prefix}_URL must be an HTTP(S) service URL without embedded credentials.`,
    );
  }
  return { endpoint: url.href, token: env[`${prefix}_TOKEN`] };
}

export async function readConversionBytes(
  response: Response,
  limit = MAX_CONVERSION_BYTES,
): Promise<Buffer> {
  if (!response.ok)
    throw new Error(`Conversion transfer failed (HTTP ${response.status}).`);
  const declaredSize = Number(response.headers.get("content-length"));
  if (declaredSize > limit)
    throw new Error("Document exceeds the conversion size limit.");
  if (!response.body)
    throw new Error("Conversion transfer returned an empty body.");
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new Error("Document exceeds the conversion size limit.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  if (length === 0)
    throw new Error("Conversion transfer returned an empty body.");
  return Buffer.concat(chunks, length);
}

/** Multipart input and PDF output; URLs and credentials come only from operator configuration. */
export async function requestConvertedPdf(
  {
    kind,
    bytes,
    filename,
    contentType,
  }: {
    kind: ConversionKind;
    bytes: Buffer;
    filename: string;
    contentType: string;
  },
  options: {
    env?: Readonly<Record<string, string | undefined>>;
    fetch?: typeof fetch;
  } = {},
): Promise<Buffer> {
  const config = conversionProviderConfig(kind, options.env);
  if (bytes.length === 0 || bytes.length > MAX_CONVERSION_BYTES)
    throw new Error("Document exceeds the conversion size limit or is empty.");
  const body = new FormData();
  body.set(
    "files",
    new File([new Uint8Array(bytes)], filename, { type: contentType }),
  );
  const response = await (options.fetch ?? fetch)(config.endpoint, {
    method: "POST",
    body,
    headers: config.token
      ? { Authorization: `Bearer ${config.token}` }
      : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(120_000),
  });
  const output = await readConversionBytes(response);
  if (output.subarray(0, 5).toString("ascii") !== "%PDF-")
    throw new Error("Conversion service did not return a PDF.");
  return output;
}
