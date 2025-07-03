import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'TaskPlay <taskplayteam@gmail.com>'; // Replace with your verified domain

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export const sendEmail = async ({ to, subject, react }: SendEmailOptions) => {
  return await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    react,
  });
};