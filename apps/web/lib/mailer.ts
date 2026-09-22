import nodemailer from 'nodemailer';

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * Sends an email via SMTP when SMTP_* env vars are configured. Otherwise logs
 * the message to the server console so flows like password reset still work
 * end-to-end in local/dev environments without a mail provider.
 */
export async function sendEmail(input: SendEmailInput) {
  if (!isSmtpConfigured()) {
    console.log(`[mailer] SMTP not configured — logging email instead of sending.\nTo: ${input.to}\nSubject: ${input.subject}\n${input.text}`);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
