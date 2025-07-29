// src/api/otpRouter.ts
import { conn } from "../dbconnect";
import express from "express";
import nodemailer from "nodemailer";

export const router = express.Router();

const OTP_STORE: {
  [email: string]: { otp: string; expires: number };
} = {};

// ส่ง OTP
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  conn.query("SELECT * FROM User WHERE email = ?", [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Email not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000;

    OTP_STORE[email] = { otp, expires };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "concertcloseinn@gmail.com",
        pass: "ryvz ogow zfkv rxnt",
      },
    });

    const mailOptions = {
      from: 'concertcloseinn@gmail.com',
      to: email,
      subject: "Your OTP for Password Reset",
      html: `
        <div style="background-color: #f4f4f4; padding: 30px; text-align: center;">
          <div style="background: #c997bb; border-radius: 8px; padding: 30px; color: white;">
            <h2>🔐 OTP Verification</h2>
            <p>Use the code below to reset your password:</p>
            <div style="font-size: 36px; font-weight: bold; color: #6a1b9a; background: #fff; padding: 10px; border-radius: 6px;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return res.json({ success: true, message: "OTP sent", expiresAt: expires });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to send email", error: error.toString() });
    }
  });
});


// router.post("/auth/verify-otp", (req, res) => {
//   const { email, otp } = req.body;

//   if (!email || !otp) {
//     return res.status(400).json({ success: false, message: "Email and OTP are required" });
//   }

//   const record = OTP_STORE[email];
//   if (!record) {
//     return res.status(400).json({ success: false, message: "No OTP found for this email. Please send OTP again." });
//   }

//   if (Date.now() > record.expires) {
//     delete OTP_STORE[email];
//     return res.status(400).json({ success: false, message: "OTP has expired. Please send OTP again." });
//   }

//   if (record.otp !== otp) {
//     return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
//   }

//   delete OTP_STORE[email];

//   return res.json({ success: true, message: "OTP verified successfully" });
// });

