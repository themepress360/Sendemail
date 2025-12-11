import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    const {
      mainService,
      subService,
      name,
      email,
      project_brief,
      business_type,
      industry,
      estimated_budget,
      ongoing_maintenance,
      hiring_likelihood,
    } = fields;

    let attachments = [];
    if (files.file) {
      const file = files.file;
      attachments.push({
        filename: file.originalFilename,
        content: fs.readFileSync(file.filepath),
      });
    }

    try {
      // Create SMTP transporter with TLS option
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "465"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false, // ignore cert mismatch
        },
      });

      const htmlContent = `
        <h2>New Project Submission</h2>
        <p><b>Service:</b> ${mainService} → ${subService}</p>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Business Type:</b> ${business_type}</p>
        <p><b>Industry:</b> ${industry}</p>
        <p><b>Budget:</b> ${estimated_budget}</p>
        <p><b>Maintenance:</b> ${ongoing_maintenance || "N/A"}</p>
        <p><b>Hiring:</b> ${hiring_likelihood}</p>
        <p><b>Project Brief:</b><br>${project_brief || ""}</p>
      `;

      // Send email to admin
      await transporter.sendMail({
        from: `"GrowPixel Chatbot" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Project Submission from ${name}`,
        html: htmlContent,
        attachments,
      });

      // Send copy to user
      await transporter.sendMail({
        from: `"GrowPixel Chatbot" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Copy of Your Project Submission`,
        html: `<p>Hi ${name},</p><p>Thanks for submitting your project. Here’s a copy of your submission:</p>${htmlContent}`,
        attachments,
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Email send error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });
}
