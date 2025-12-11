import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // required for file uploads
  },
};

// ====== Allowed file types ======
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword"
];

export default async function handler(req, res) {
  // ===== CORS =====
  res.setHeader("Access-Control-Allow-Origin", "https://growpixel.webflow.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const form = formidable({ multiples: false, keepExtensions: true });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Extract data
    const {
      name,
      email,
      mainService,
      subService,
      brief,
      businessType,
      industry,
      estimatedBudget,
      ongoingMaintenance,
      hiringLikelihood
    } = fields;

    let attachment = null;

    if (files.file) {
      const uploaded = files.file;
      if (!ALLOWED_TYPES.includes(uploaded.mimetype)) {
        return res.status(400).json({
          success: false,
          error: "Invalid file type. Only PDF and Word files are allowed."
        });
      }

      attachment = {
        filename: uploaded.originalFilename,
        content: fs.readFileSync(uploaded.filepath),
      };
    }

    // ======= SMTP Transport =======
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // mail.privateemail.com
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      }
      tls: {
    rejectUnauthorized: false // ignore cert mismatch
  }
    });

    // ============================================
    // 1️⃣ Send email to YOU
    // ============================================
    await transporter.sendMail({
      from: `"GrowPixel Lead Bot" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL, // e.g., info@growpixel.co
      subject: `🚀 New Lead — ${name} (${mainService} → ${subService})`,
      html: `
        <h2>New Project Lead from GrowPixel Chatbot</h2>

        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Service:</b> ${mainService} → ${subService}</p>
        <p><b>Business Type:</b> ${businessType}</p>
        <p><b>Industry:</b> ${industry}</p>
        <p><b>Estimated Budget:</b> ${estimatedBudget}</p>
        <p><b>Maintenance Needed:</b> ${ongoingMaintenance}</p>
        <p><b>Hiring Likelihood:</b> ${hiringLikelihood}</p>

        <h3>Project Brief:</h3>
        <div style="white-space:pre-wrap;padding:10px;border:1px solid #ddd;border-radius:8px;background:#fafafa;">
          ${brief}
        </div>

        <br>
        <p>Chatbot Submission • GrowPixel.co</p>
      `,
      attachments: attachment ? [attachment] : [],
    });

    // ============================================
    // 2️⃣ Send email COPY to USER
    // ============================================
    await transporter.sendMail({
      from: `"GrowPixel Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "📄 Copy of Your Submission — GrowPixel Project Intake",
      html: `
        <h2>Thanks for submitting your project!</h2>

        <p>Here’s a copy of your intake form.</p>

        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Service:</b> ${mainService} → ${subService}</p>
        <p><b>Business Type:</b> ${businessType}</p>
        <p><b>Industry:</b> ${industry}</p>
        <p><b>Estimated Budget:</b> ${estimatedBudget}</p>
        <p><b>Maintenance Needed:</b> ${ongoingMaintenance}</p>
        <p><b>Hiring Likelihood:</b> ${hiringLikelihood}</p>

        <h3>Your Project Brief:</h3>
        <div style="white-space:pre-wrap;padding:10px;border:1px solid #ddd;border-radius:8px;background:#fafafa;">
          ${brief}
        </div>

        <br><p>Our team will reach out shortly 🚀</p>
      `,
      attachments: attachment ? [attachment] : [],
    });

    return res.json({ success: true });

  } catch (err) {
    console.error("EMAIL ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Server error: " + err.message,
    });
  }
}

