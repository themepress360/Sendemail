import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

export default async function handler(req, res) {
  // ===== CORS =====
  res.setHeader("Access-Control-Allow-Origin", "https://growpixel.webflow.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const form = formidable({ multiples: false, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    const { mainService, subService, name, email, project_brief, business_type, industry, estimated_budget, ongoing_maintenance, hiring_likelihood } = fields;

    // Validate required fields
    if (!name || !email || !mainService || !subService) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    let attachments = [];
    if (files.file) {
      const file = Array.isArray(files.file) ? files.file[0] : files.file;

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ success: false, error: "Invalid file type. Only PDF or Word files allowed." });
      }

      // Read file content
      attachments.push({
        filename: file.originalFilename || file.newFilename,
        content: fs.readFileSync(file.filepath),
      });
    }

    try {
      // SMTP transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "465"),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false },
      });

      const htmlContent = `
        <h2>New Project Submission</h2>
        <p><b>Service:</b> ${mainService} → ${subService}</p>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Business Type:</b> ${business_type || "N/A"}</p>
        <p><b>Industry:</b> ${industry || "N/A"}</p>
        <p><b>Budget:</b> ${estimated_budget || "N/A"}</p>
        <p><b>Maintenance:</b> ${ongoing_maintenance || "N/A"}</p>
        <p><b>Hiring:</b> ${hiring_likelihood || "N/A"}</p>
        <p><b>Project Brief:</b><br>${project_brief || "N/A"}</p>
      `;

      // Send to admin
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
