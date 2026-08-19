import { randomInt, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import "../models/associations";
import { LoginOtpChallenge } from "../models/LoginOtpChallenge";
import { User } from "../models/User";
import { sendAuthEmail } from "../lib/email/EmailAdapter";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export async function createAndSendLoginOtp(params: {
  user: User;
  remember: boolean;
  nextPath: string;
  ipAddress: string | null;
  ipCountry: string | null;
  ipCity: string | null;
  userAgent: string | null;
}) {
  const isAgent = params.user.roleRecord?.key === "agent";
  const recipient = isAgent ? params.user.creator : params.user;
  if (isAgent && (!recipient?.isActive || !["manager", "admin"].includes(recipient.roleRecord?.key ?? ""))) {
    throw new Error("No active reporting manager is available to approve this sign-in");
  }
  if (!recipient) throw new Error("No verification email recipient is configured");

  await LoginOtpChallenge.destroy({
    where: { userId: params.user.id, consumedAt: { [Op.is]: null } },
  });
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const challenge = await LoginOtpChallenge.create({
    id: randomUUID(),
    userId: params.user.id,
    codeHash: await bcrypt.hash(code, 10),
    remember: params.remember,
    nextPath: params.nextPath,
    ipAddress: params.ipAddress,
    ipCountry: params.ipCountry,
    ipCity: params.ipCity,
    userAgent: params.userAgent,
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
  });

  const result = await sendAuthEmail({
    to: recipient.email,
    subject: "Your Travel OS verification code",
    text: isAgent
      ? `${params.user.name} (${params.user.email}) is signing in to Travel OS. Their one-time verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Share it only if you approve this sign-in.`
      : `Your one-time Travel OS verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. If you did not try to sign in, you can ignore this email.`,
    html: isAgent
      ? `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h2>Approve an agent sign-in</h2><p>Hello <strong>${escapeHtml(recipient.name)}</strong>,</p><p><strong>${escapeHtml(params.user.name)}</strong> (${escapeHtml(params.user.email)}) is signing in to Travel OS.</p><p>Share this one-time code with the agent only if you approve the sign-in:</p><p style="font-size:32px;letter-spacing:8px;font-weight:700">${code}</p><p>This code expires in ${OTP_TTL_MINUTES} minutes and can be tried up to ${MAX_ATTEMPTS} times.</p></div>`
      : `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h2>Verify your sign-in</h2><p>Hello <strong>${escapeHtml(params.user.name)}</strong>,</p><p>Enter this one-time code to finish signing in to Travel OS:</p><p style="font-size:32px;letter-spacing:8px;font-weight:700">${code}</p><p>This code expires in ${OTP_TTL_MINUTES} minutes and can be tried up to ${MAX_ATTEMPTS} times. If you did not try to sign in, you can ignore this email.</p></div>`,
  });
  if (result.status === "failed") {
    await challenge.destroy();
    throw new Error("The verification code could not be sent to your email");
  }
  return { challengeId: challenge.id, destinationEmail: maskEmail(recipient.email) };
}

export async function verifyLoginOtp(challengeId: string, code: string) {
  const challenge = await LoginOtpChallenge.findByPk(challengeId);
  if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now()) {
    throw new Error("This OTP has expired. Sign in again to request a new code");
  }
  if (challenge.attempts >= MAX_ATTEMPTS) throw new Error("Too many incorrect attempts. Sign in again");

  const valid = /^\d{6}$/.test(code) && await bcrypt.compare(code, challenge.codeHash);
  if (!valid) {
    await challenge.increment("attempts");
    throw new Error(challenge.attempts + 1 >= MAX_ATTEMPTS ? "Too many incorrect attempts. Sign in again" : "Incorrect OTP");
  }
  const [consumed] = await LoginOtpChallenge.update(
    { consumedAt: new Date() },
    { where: { id: challenge.id, consumedAt: { [Op.is]: null } } },
  );
  if (consumed !== 1) throw new Error("This OTP has already been used");
  return challenge;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}
