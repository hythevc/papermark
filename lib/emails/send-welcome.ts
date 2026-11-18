import { BRAND } from "@/lib/brand";
import { sendEmail } from "@/lib/resend";

import WelcomeEmail from "@/components/emails/welcome";

import { CreateUserEmailProps } from "../types";

export const sendWelcomeEmail = async (params: CreateUserEmailProps) => {
  const { name, email } = params.user;
  const unsubscribeUrl = `${BRAND.appUrl}/account/general`;
  const emailTemplate = WelcomeEmail({ name, unsubscribeUrl });
  try {
    await sendEmail({
      to: email as string,
      marketing: true,
      subject: `Welcome to ${BRAND.name}!`,
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
      unsubscribeUrl,
    });
  } catch (e) {
    console.error(e);
  }
};
