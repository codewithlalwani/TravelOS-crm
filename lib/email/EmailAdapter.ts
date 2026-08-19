import nodemailer, { type Transporter } from "nodemailer";
import path from "node:path";

const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");
const VIA_RAIL_LOGO_PATH = path.join(process.cwd(), "public", "via-rail-logo.jpg");
const AMTRAK_LOGO_PATH = path.join(process.cwd(), "public", "amtrak-logo.png");

const EMBEDDED_LOGOS = [
  { filename: "logo.png", path: LOGO_PATH, cid: "brand-logo" },
  { filename: "via-rail-logo.jpg", path: VIA_RAIL_LOGO_PATH, cid: "via-rail-logo" },
  { filename: "amtrak-logo.png", path: AMTRAK_LOGO_PATH, cid: "amtrak-logo" },
] as const;

const AIRLINE_LOGO_CID_PATTERN = /cid:airline-logo-([a-z0-9]{2})/gi;

async function airlineLogoAttachments(html: string) {
  const codes = new Set<string>();
  for (const match of html.matchAll(AIRLINE_LOGO_CID_PATTERN)) codes.add(match[1].toLowerCase());

  return Promise.all([...codes].map(async (code) => {
    const base = { filename: `${code}.png`, cid: `airline-logo-${code}` };
    try {
      const response = await fetch(`https://pics.avs.io/200/80/${code.toUpperCase()}.png`, {
        signal: AbortSignal.timeout(4_000),
      });
      if (response.ok && response.headers.get("content-type")?.startsWith("image/")) {
        const content = Buffer.from(await response.arrayBuffer());
        if (content.length >= 100) return { ...base, content };
      }
    } catch {
      // The synchronized local catalog below keeps email delivery independent of the API.
    }
    return {
      ...base,
      path: path.join(process.cwd(), "public", "logos", "airlines", `${code}.png`),
    };
  }));
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

export interface SendEmailResult {
  status: "sent" | "failed";
  messageId?: string;
  error?: string;
}

function createTransport(): Transporter {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }
  // Dev/default fallback when no SMTP_HOST is configured: composes the message and
  // returns it as JSON instead of making a real network call, so the workflow is fully
  // testable without a mailbox. Swap in real SMTP creds via env vars, no code change.
  return nodemailer.createTransport({ jsonTransport: true });
}

const transporter = createTransport();

function createAuthTransport(): Transporter {
  const host = process.env.AUTH_SMTP_HOST;
  if (!host) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const encryption = process.env.AUTH_SMTP_ENCRYPTION?.trim().toLowerCase();
  const port = Number(process.env.AUTH_SMTP_PORT || (encryption === "ssl" ? 465 : 587));

  return nodemailer.createTransport({
    host,
    port,
    secure: encryption === "ssl" || port === 465,
    requireTLS: encryption === "tls" || encryption === "starttls",
    auth: process.env.AUTH_SMTP_USERNAME
      ? { user: process.env.AUTH_SMTP_USERNAME, pass: process.env.AUTH_SMTP_PASSWORD }
      : undefined,
  });
}

const authTransporter = createAuthTransport();

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    // Nodemailer/Gmail may expose unused inline images as regular attachments.
    // Only include logos that are actually referenced by this email's HTML.
    const embeddedLogos = EMBEDDED_LOGOS.filter(({ cid }) =>
      params.html.includes(`cid:${cid}`)
    );
    const airlineLogos = await airlineLogoAttachments(params.html);

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || "Flight Connect <no-reply@flightconnect.local>",
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      attachments: [
        ...embeddedLogos,
        ...airlineLogos,
        ...(params.attachments || []),
      ],
    });
    return { status: "sent", messageId: info.messageId };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Sends authentication/security mail without using the application's general SMTP account. */
export async function sendAuthEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const fromEmail = process.env.AUTH_SMTP_FROM_EMAIL || "noreply@travelfs9.com";
    const fromName = process.env.AUTH_SMTP_FROM_NAME || "Travel OS Security";
    const info = await authTransporter.sendMail({
      from: { name: fromName, address: fromEmail },
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      attachments: params.attachments || [],
    });
    return { status: "sent", messageId: info.messageId };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}
