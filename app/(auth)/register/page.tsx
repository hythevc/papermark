import { BRAND, brandMetadata } from "@/lib/brand";

import RegisterClient from "./page-client";

const data = {
  description: `Create your ${BRAND.name} account`,
  title: `Sign up | ${BRAND.name}`,
  url: "/register",
};

export const metadata = brandMetadata(data.title, data.description, data.url);

export default function RegisterPage() {
  return <RegisterClient />;
}
