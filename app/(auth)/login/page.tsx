import { BRAND, brandMetadata } from "@/lib/brand";

import { GTMComponent } from "@/components/gtm-component";

import LoginClient from "./page-client";

const data = {
  description: `Sign in to ${BRAND.name}`,
  title: `Sign in | ${BRAND.name}`,
  url: "/login",
};

export const metadata = brandMetadata(data.title, data.description, data.url);

export default function LoginPage() {
  return (
    <>
      <GTMComponent />
      <LoginClient />
    </>
  );
}
