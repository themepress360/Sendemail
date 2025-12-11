import nodemailer from 'nodemailer';
import multiparty from 'multiparty';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).send(err);

    try {
      const mainService = fields.mainService[0];
      const subService = fields.subService[0];
      const name = fields.name[0];
      const email = fields.email[0];
      const brief = fields.brief[0];
      const budget = fields.budget[0];
      const maintenance = fields.maintenance[0];
      const hiringLikelihood = fields.hiringLikelihood[0];
      const transcript = fields.transcript[0] || '';
      const file = files.file ? files.file[0] : null;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const adminMailOptions = {
        from: `"GrowPixel Chatbot" <${process.env.SMTP_USER}>`,
        to: 'info@growpixel.co',
        subject: `New Project Lead: ${mainService} → ${subService}`,
        html: `
          <h2>New Project Lead</h2>
          <p><b>Service:</b> ${mainService} → ${subService}</p>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Budget:</b> ${budget}</p>
          <p><b>Maintenance:</b> ${maintenance}</p>
          <p><b>Hiring Likelihood:</b> ${hiringLikelihood}</p>
          <h3>Project Brief</h3>
          <p>${brief}</p>
          <h3>Chat Transcript</h3>
          <pre>${transcript}</pre>
        `,
        attachments: file ? [{ filename: file.originalFilename, path: file.path }] : [],
      };

      await transporter.sendMail(adminMailOptions);

      const userMailOptions = {
        from: `"GrowPixel Chatbot" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Copy of your GrowPixel Chat',
        html: `<p>Thanks for contacting GrowPixel! Here is a copy of your chat:</p><pre>${transcript}</pre>`,
        attachments: file ? [{ filename: file.originalFilename, path: file.path }] : [],
      };

      await transporter.sendMail(userMailOptions);

      res.status(200).json({ success: true, message: 'Emails sent successfully.' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, error: e.message });
    }
  });
}
