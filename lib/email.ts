import 'server-only';
import nodemailer from 'nodemailer';

type EmailMessage = { to: string; subject: string; text: string; html: string };

export function assertEmailConfigured() {
  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT || 587);
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  if (
    !host ||
    !user ||
    !pass ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      'Email delivery is not configured. Set EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, and EMAIL_SERVER_PASSWORD.',
    );
  }
  if (!process.env.EMAIL_FROM)
    throw new Error('EMAIL_FROM must be set to a verified sender address.');
}

function getTransport() {
  assertEmailConfigured();
  const port = Number(process.env.EMAIL_SERVER_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST!,
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_SERVER_USER!,
      pass: process.env.EMAIL_SERVER_PASSWORD!,
    },
  });
}

function sender() {
  return process.env.EMAIL_FROM!;
}

export async function sendEmail(message: EmailMessage) {
  await getTransport().sendMail({ from: sender(), ...message });
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
}

export async function sendVerificationEmail(to: string, url: string) {
  const safeUrl = escapeHtml(url);
  await sendEmail({
    to,
    subject: 'Verify your CloudNest email',
    text: `Verify your CloudNest account by opening this link: ${url}\n\nThis link expires in 24 hours.`,
    html: `<p>Verify your CloudNest account by clicking the link below:</p><p><a href="${safeUrl}">Verify email address</a></p><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  const safeUrl = escapeHtml(url);
  await sendEmail({
    to,
    subject: 'Reset your CloudNest password',
    text: `Reset your CloudNest password by opening this link: ${url}\n\nThis link expires in one hour. If you did not request a reset, you can ignore this email.`,
    html: `<p>We received a request to reset your CloudNest password.</p><p><a href="${safeUrl}">Choose a new password</a></p><p>This link expires in one hour. If you did not request a reset, you can ignore this email.</p>`,
  });
}
