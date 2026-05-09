const nodemailer = require("nodemailer");

const EMAIL_HOST = process.env.EMAIL_HOST || process.env.SMTP_HOST;
const EMAIL_PORT = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
const EMAIL_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS;
const EMAIL_SECURE = String(process.env.EMAIL_SECURE || process.env.SMTP_SECURE || (EMAIL_PORT === 465)).toLowerCase() === "true";
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || process.env.SMTP_SERVICE;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_FROM || `FinPilot AI <${EMAIL_USER}>`;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5175";

let verifiedPromise = null;

const transportConfig = EMAIL_SERVICE
  ? {
      service: EMAIL_SERVICE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    }
  : {
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    };

const transporter = nodemailer.createTransport(transportConfig);

async function verifyEmailConnection() {
  if (!EMAIL_USER || !EMAIL_PASS || (!EMAIL_SERVICE && !EMAIL_HOST)) {
    throw new Error("Email is not configured. Set SMTP_USER/SMTP_PASS with SMTP_HOST or SMTP_SERVICE.");
  }

  if (!verifiedPromise) {
    verifiedPromise = transporter.verify().catch((error) => {
      verifiedPromise = null;
      throw error;
    });
  }

  await verifiedPromise;
  return true;
}

async function sendNewPasswordEmail(to, newPassword) {
  await verifyEmailConnection();
  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject: "Your new FinPilot password",
    text: `Your password has been reset. Your new temporary password is: ${newPassword}\n\nPlease log in with this password and change it immediately in your profile settings.\n\nIf you did not request this password reset, please contact support immediately.`,
    html: `
      <h2>Your password has been reset</h2>
      <p>Your new temporary password is:</p>
      <div style="background:#f3f4f6;padding:15px;border-radius:5px;font-family:monospace;font-size:18px;font-weight:bold;margin:10px 0;">
        ${newPassword}
      </div>
      <p>Please log in with this password and change it immediately in your profile settings.</p>
      <p style="color:#dc2626;">If you did not request this password reset, please contact support immediately.</p>
    `,
  };
  await transporter.sendMail(mailOptions);
}

module.exports = { sendResetEmail, sendNewPasswordEmail, verifyEmailConnection };
