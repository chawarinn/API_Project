// otpRouter.ts
import { conn } from "../dbconnect";       // เชื่อมต่อ MySQL ของคุณ
import express from "express";
import nodemailer from "nodemailer";

export const router = express.Router();

// เก็บ OTP ชั่วคราวในหน่วยความจำ (production ควรใช้ Redis หรือ DB)
const OTP_STORE: {
  [email: string]: { otp: string; expires: number };
} = {};

router.post("/auth/send-otp", async (req, res) => {
  const { email } = req.body;


  conn.query("SELECT * FROM User WHERE email = ?", [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error", error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Email not found in the system" });
    }

    // สร้าง OTP 6 หลัก
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    OTP_STORE[email] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000, // หมดอายุ 5 นาที
    };

    // สร้าง transporter สำหรับส่งเมล Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "your_email@gmail.com",       // แก้เป็น Gmail ของคุณ
        pass: "your_app_password",          // ต้องเป็น App Password (16 ตัว) เท่านั้น
      },
    });

    const mailOptions = {
      from: '"Your App Name" <your_email@gmail.com>',
      to: email,
      subject: "Your OTP for Password Reset",
      text: `Your OTP is: ${otp}. It will expire in 5 minutes.`,
    };

    try {
      await transporter.sendMail(mailOptions);
      return res.json({ success: true, message: "OTP has been sent to your email" });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP",
        error: error.toString(),
      });
    }
  });
});
