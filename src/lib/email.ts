import { logger } from "@/lib/logger";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    logger.warn("email.provider_missing", {
      to: input.to,
      subject: input.subject,
    });
    return { sent: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  }).catch((error) => {
    logger.error("email.provider_request_failed", error, {
      to: input.to,
      subject: input.subject,
    });
    return null;
  });

  if (!response) {
    return { sent: false };
  }

  if (!response.ok) {
    logger.error("email.send_failed", {
      to: input.to,
      status: response.status,
      body: await response.text().catch(() => null),
    });
    return { sent: false };
  }

  logger.info("email.sent", { to: input.to, subject: input.subject });
  return { sent: true };
}
