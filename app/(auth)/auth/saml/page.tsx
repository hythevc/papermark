import { BRAND, brandMetadata } from "@/lib/brand";

import SAMLCallbackClient from "./page-client";

export const metadata = brandMetadata(`SSO login | ${BRAND.name}`);

export default function SAMLCallbackPage() {
  return <SAMLCallbackClient />;
}
