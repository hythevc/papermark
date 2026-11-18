type EmailEnvironment = Readonly<Record<string, string | undefined>>;

type EmailIdentityOptions = {
  from?: string;
  replyTo?: string;
  marketing?: boolean;
  system?: boolean;
  verify?: boolean;
  unsubscribeUrl?: string;
};

function configured(value: string | undefined) {
  return value?.trim() || undefined;
}

function httpUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Pass server environment explicitly; sender settings never enter client BRAND. */
export function resolveEmailIdentity(
  options: EmailIdentityOptions,
  environment: EmailEnvironment,
  supportEmail?: string,
) {
  const explicitFrom = configured(options.from);
  const defaultFrom = configured(environment.EMAIL_FROM);
  if (!explicitFrom && !defaultFrom) {
    throw new Error(
      "Email sender not configured. Set EMAIL_FROM to an address you own.",
    );
  }

  const categoryFrom = options.marketing
    ? environment.EMAIL_FROM_MARKETING
    : options.system
      ? environment.EMAIL_FROM_SYSTEM
      : options.verify
        ? environment.EMAIL_FROM_VERIFY
        : undefined;
  const from = explicitFrom || configured(categoryFrom) || defaultFrom!;
  const replyTo =
    configured(options.replyTo) ||
    configured(environment.EMAIL_REPLY_TO) ||
    configured(supportEmail);
  const postalAddress = configured(environment.EMAIL_POSTAL_ADDRESS);
  const unsubscribeUrl = httpUrl(
    configured(options.unsubscribeUrl) ||
      (options.marketing
        ? configured(environment.EMAIL_MARKETING_UNSUBSCRIBE_URL)
        : undefined),
  );

  if (options.marketing && (!postalAddress || !unsubscribeUrl)) {
    throw new Error(
      "Marketing email requires EMAIL_POSTAL_ADDRESS and an unsubscribe URL supplied by the caller or EMAIL_MARKETING_UNSUBSCRIBE_URL.",
    );
  }

  return { from, replyTo, postalAddress, unsubscribeUrl };
}
