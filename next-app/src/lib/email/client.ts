import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { welcomeEmail } from "./templates";

function getSESClient(): SESClient | null {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

const FROM_EMAIL =
  process.env.SES_FROM_EMAIL || "techopolis@techopolisonline.com";
const FROM_NAME = "Perspective Intelligence";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const client = getSESClient();
  if (!client) {
    console.warn("AWS SES not configured, skipping email send");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const command = new SendEmailCommand({
      Source: `${FROM_NAME} <${FROM_EMAIL}>`,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: html,
            Charset: "UTF-8",
          },
          ...(text
            ? {
                Text: {
                  Data: text,
                  Charset: "UTF-8",
                },
              }
            : {}),
        },
      },
    });

    const result = await client.send(command);
    console.log(`Email sent to ${to}: ${result.MessageId}`);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Email send failed: ${message}`);
    return { success: false, error: message };
  }
}

export async function sendWelcomeEmail(
  to: string,
  displayName: string | null
): Promise<void> {
  const email = welcomeEmail(displayName);
  await sendEmail(to, email.subject, email.html, email.text);
}
