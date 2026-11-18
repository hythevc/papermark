import React from "react";

import { Hr, Link, Section, Text } from "react-email";

import { BRAND } from "@/lib/brand";

export const Footer = ({
  withAddress = false,
  marketing = false,
  footerText,
  postalAddress = process.env.EMAIL_POSTAL_ADDRESS?.trim(),
  unsubscribeUrl = process.env.EMAIL_MARKETING_UNSUBSCRIBE_URL?.trim(),
}: {
  withAddress?: boolean;
  marketing?: boolean;
  footerText?: string | React.ReactNode;
  postalAddress?: string;
  unsubscribeUrl?: string;
}) => {
  if (marketing) {
    let validUnsubscribeUrl = false;
    try {
      validUnsubscribeUrl =
        !!unsubscribeUrl &&
        ["http:", "https:"].includes(new URL(unsubscribeUrl).protocol);
    } catch {
      // Missing or malformed destinations must not produce a misleading link.
    }
    if (!postalAddress || !validUnsubscribeUrl) {
      throw new Error(
        "Marketing footer requires an owned postal address and unsubscribe URL.",
      );
    }

    return (
      <>
        <Hr className="mx-0 my-6 w-full border border-neutral-200" />
        <Text className="text-[12px] leading-6 text-neutral-500">
          Manage the product emails you receive.{" "}
          <Link className="text-neutral-700 underline" href={unsubscribeUrl}>
            Unsubscribe or update your preferences.
          </Link>
        </Text>
        <Text className="text-[12px] text-neutral-500">
          {BRAND.name}
          <br />
          {postalAddress}
        </Text>
        {footerText && (
          <Text className="text-xs text-neutral-500">{footerText}</Text>
        )}
      </>
    );
  }

  return (
    <>
      <Hr />
      <Section className="text-gray-400">
        <Text className="text-xs">
          © {new Date().getFullYear()} {BRAND.name}
          {withAddress && postalAddress && (
            <>
              <br />
              {postalAddress}
            </>
          )}
        </Text>
        {footerText && <Text className="text-xs">{footerText}</Text>}
      </Section>
    </>
  );
};
