import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(
  email: string,
  token: string,
  appUrl?: string
) {
  const baseUrl =
    appUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Verify your ZimCast account",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid #222">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
          <div style="display:inline-block;width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;line-height:48px;font-size:24px;font-weight:bold;color:#fff">Z</div>
          <h1 style="color:#fff;margin:16px 0 0;font-size:24px">ZimCast</h1>
        </div>
        <div style="padding:32px;color:#e5e5e5">
          <h2 style="margin:0 0 8px;color:#fff;font-size:20px">Verify your email</h2>
          <p style="margin:0 0 24px;color:#a3a3a3;font-size:14px;line-height:1.6">
            Thanks for signing up! Click the button below to verify your email address and get the most out of ZimCast.
          </p>
          <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px">
            Verify Email
          </a>
          <p style="margin:24px 0 0;color:#737373;font-size:12px;line-height:1.5">
            This link expires in 24 hours. If you didn&rsquo;t create a ZimCast account, you can ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  appUrl?: string
) {
  const baseUrl =
    appUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Reset your ZimCast password",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;border-radius:16px;overflow:hidden;border:1px solid #222">
        <div style="background:linear-gradient(135deg,#FF416C,#FF4B2B);padding:32px;text-align:center">
          <div style="display:inline-block;width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;line-height:48px;font-size:24px;font-weight:bold;color:#fff">Z</div>
          <h1 style="color:#fff;margin:16px 0 0;font-size:24px">ZimCast</h1>
        </div>
        <div style="padding:32px;color:#e5e5e5">
          <h2 style="margin:0 0 8px;color:#fff;font-size:20px">Reset your password</h2>
          <p style="margin:0 0 24px;color:#a3a3a3;font-size:14px;line-height:1.6">
            We received a request to reset your password. Click the button below to choose a new one.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF416C,#FF4B2B);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px">
            Reset Password
          </a>
          <p style="margin:24px 0 0;color:#737373;font-size:12px;line-height:1.5">
            This link expires in 1 hour. If you didn&rsquo;t request a password reset, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}
