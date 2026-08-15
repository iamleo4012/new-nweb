/**
 * Email service using Resend.
 *
 * Environment variables:
 *   RESEND_API_KEY  — Resend API key
 *   APP_URL         — Base URL of the app (e.g. http://localhost:3000)
 *   EMAIL_FROM      — Sender email (e.g. onboarding@resend.dev)
 */
import { Resend } from "resend";

const API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const EMAIL_FROM = process.env.EMAIL_FROM || "AL-NASSIM <onboarding@resend.dev>";

console.log(`[email] Resend config: API_KEY=${API_KEY ? 'SET' : 'MISSING'} APP_URL=${APP_URL} EMAIL_FROM=${EMAIL_FROM}`);

function getClient(): Resend | null {
  if (!API_KEY) return null;
  return new Resend(API_KEY);
}

/**
 * Send a password reset email with a clickable link.
 */
export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  token: string
): Promise<boolean> {
  const client = getClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — password reset email skipped (dev mode)");
    return false;
  }

  const resetLink = `${APP_URL}/password-reset.html?token=${token}`;
  console.log(`[email] Sending password reset to=${to} from=${EMAIL_FROM} link=${resetLink}`);

  const { error } = await client.emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Reset Your Password — AL-NASSIM",
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 800; color: #000308; letter-spacing: -0.5px;">AL-NASSIM</h1>
        </div>
        <h2 style="font-size: 18px; color: #111d27; margin-bottom: 16px;">Reset Your Password</h2>
        <p style="font-size: 14px; color: #44474b; line-height: 1.6; margin-bottom: 24px;">
          Hi ${userName},<br/><br/>
          We received a request to reset your password. Click the button below to set a new password:
        </p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetLink}" style="display: inline-block; background: #000308; color: #ffffff; padding: 14px 36px; border-radius: 4px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 12px; color: #74777c; line-height: 1.6;">
          Or copy this link into your browser:<br/>
          <a href="${resetLink}" style="color: #825335; word-break: break-all;">${resetLink}</a>
        </p>
        <p style="font-size: 12px; color: #74777c; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("[email] Resend send error:", error);
    return false;
  }
  console.log("[email] Password reset email sent successfully");
  return true;
}
