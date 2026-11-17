/** Redact secret-bearing local server output before it reaches logs/artifacts. */
export function redactRuntimeLine(line, env = process.env) {
  let output = String(line);
  for (const [name, value] of Object.entries(env)) {
    if (
      /(?:SECRET|TOKEN|PASSWORD|API_KEY|ACCESS_KEY)/i.test(name) &&
      value?.length >= 6
    ) {
      output = output.split(value).join("[redacted]");
      output = output.split(encodeURIComponent(value)).join("[redacted]");
    }
  }
  return output
    .replace(
      /([?&#](?:[a-z_]*(?:token|secret|password)|code|otp|state|api_key)=)[^\s&#"'<>]+/gi,
      "$1[redacted]",
    )
    .replace(
      /((?:authorization|cookie|set-cookie)\s*:\s*)[^\r\n]+/gi,
      "$1[redacted]",
    );
}
