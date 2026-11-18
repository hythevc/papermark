import React from "react";

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";

import { BRAND } from "@/lib/brand";

import { Footer } from "./shared/footer";

interface WelcomeEmailProps {
  name: string | null | undefined;
  unsubscribeUrl?: string;
}

const WelcomeEmail = ({ name, unsubscribeUrl }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {BRAND.name}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-[#f6f5f0] font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-neutral-200 bg-white px-10 py-5">
            <Section className="mt-8">
              <Text className="text-2xl font-bold tracking-tighter text-[#146354]">
                {BRAND.name}
              </Text>
            </Section>
            <Heading className="mx-0 my-7 p-0 text-xl font-semibold text-black">
              {name ? `Welcome, ${name}!` : `Welcome to ${BRAND.name}!`}
            </Heading>
            <Text className="mb-8 text-sm leading-6 text-gray-600">
              Bring your documents, sharing controls, and viewer insights
              together in one focused workspace. Here is where to get started.
            </Text>
            <Heading className="mx-0 my-6 p-0 text-lg font-semibold text-black">
              Your first steps
            </Heading>
            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <Link
                href={`${BRAND.appUrl}/documents`}
                className="font-semibold text-[#146354] underline"
              >
                1. Add your documents
              </Link>
              <br />
              Upload the files you want to share, then choose your link
              settings.
            </Text>
            <Text className="mb-4 text-sm leading-6 text-gray-600">
              <Link
                href={`${BRAND.appUrl}/datarooms`}
                className="font-semibold text-[#146354] underline"
              >
                2. Organize a data room
              </Link>
              <br />
              Bring related documents together for your next conversation.
            </Text>
            <Text className="mb-8 text-sm leading-6 text-gray-600">
              <Link
                href={`${BRAND.appUrl}/dashboard`}
                className="font-semibold text-[#146354] underline"
              >
                3. Follow the activity
              </Link>
              <br />
              Return to your dashboard to see engagement and decide what comes
              next.
            </Text>
            <Section className="mb-8">
              <Link
                className="rounded-lg bg-[#146354] px-6 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={`${BRAND.appUrl}/dashboard`}
              >
                Open your workspace
              </Link>
            </Section>
            <Footer marketing unsubscribeUrl={unsubscribeUrl} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default WelcomeEmail;
