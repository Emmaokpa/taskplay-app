import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export const sendEmail = async ({ to, subject, react }: SendEmailOptions) => {
  if (!FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL environment variable is not set. Please set it in your .env file.');
  }

  return await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    react,
  });
};