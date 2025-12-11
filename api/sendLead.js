import nodemailer from "nodemailer";

export const config = {
  api: {
    bodyParser: false, // We'll use formidable for file uploads
  },
};

import formidable from "formidable";

export default async function handler(req, res) {
  // Allow CORS from your Webflow site
  res.setHeader("Access-Control-Allow-Origin", "https://growpixel.webflow.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Handle preflight
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    const { name, email, mainService, subService, brief } = fields;
    const file = files.file;

    if (!name || !email || !mainService) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    try {
      // Configure NodeMailer (example using Gmail SMTP, replace with your credentials)
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER, // Your email
          pass: process.env.EMAIL_PASS, // Your email password / app password
        },
      });

      const mailOptions = {
        from: `"GrowPixel Chatbot" <${process.env.EMAIL_USER}>`,
        to: "info@growpixel.co", // Destination email
        subject: `New Project Submission from ${name}`,
        html: `
          <h3>New project submission</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Main Service:</strong> ${mainService}</p>
          <p><strong>Sub Service:</strong> ${subService}</p>
          <p><strong>Brief:</strong> ${brief}</p>
        `,
      };

      // If a file was uploaded, attach it
      if (file) {
        mailOptions.attachments = [
          {
            filename: file.originalFilename,
            path: file.filepath,
          },
        ];
      }

      await transporter.sendMail(mailOptions);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Email sending error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });
}
