import { BRAND, brandMetadata } from "@/lib/brand";

import EmailVerificationClient from "./page-client";

const data = {
  description: `Verify your login to ${BRAND.name}`,
  title: `Verify login | ${BRAND.name}`,
  url: "/auth/email",
};

export const metadata = brandMetadata(data.title, data.description, data.url);

export default async function EmailVerificationPage() {
  return <EmailVerificationClient />;
}
