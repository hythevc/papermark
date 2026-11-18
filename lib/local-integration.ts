/** Local service capture is deliberately unavailable in production builds. */
export function isLocalIntegration(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  if (env.ROOMLINE_LOCAL_INTEGRATION !== "1") return false;
  if (env.NODE_ENV !== "development") {
    throw new Error("Local integration services require NODE_ENV=development.");
  }
  return true;
}

export function localSmtpOptions(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  if (!isLocalIntegration(env)) return null;
  const host = env.EMAIL_SERVER_HOST ?? "127.0.0.1";
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
    throw new Error("Local email capture requires a loopback SMTP host.");
  }
  const portValue = env.EMAIL_SERVER_PORT ?? "51025";
  const port = Number(portValue);
  if (
    !/^\d+$/.test(portValue) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error("Local email capture requires a valid SMTP port.");
  }
  return {
    // Avoid a DNS lookup even when the local hostname is configured.
    host: host === "localhost" ? "127.0.0.1" : host,
    port,
    secure: false,
    ignoreTLS: true,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  };
}
