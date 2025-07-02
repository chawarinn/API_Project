import { conn } from "../dbconnect";
import express from "express";
import mysql from "mysql";
import multer from "multer";
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
const bcrypt = require("bcryptjs");

export const router = express.Router();

// Firebase 
const firebaseConfig = {
  apiKey: 'AIzaSyAiVnY-8Ajak4xVeQNLzynr8skqCgNFulg',
  appId: '1:259988227090:android:db894289cac749ff6c04cb',
  messagingSenderId: '259988227090',
  projectId: 'project-rider-1b5ac',
  storageBucket: 'project-rider-1b5ac.appspot.com',
};


initializeApp(firebaseConfig);
const storage = getStorage();


class FileMiddleware {
  filename = "";

  public readonly diskLoader = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 67108864 }, 
  });
}
const fileUpload = new FileMiddleware();
router.put(
  "/editprofile",
  fileUpload.diskLoader.single("file"),
  async (req, res) => {
    try {
      const users = req.body;
      let imageUrl = null;

      if (req.file) {
        try {
          const filename =
            Date.now() + "-" + Math.round(Math.random() * 10000) + ".png";
          const storageRef = ref(storage, `/images/${filename}`);
          const metadata = { contentType: req.file.mimetype };

          const snapshot = await uploadBytesResumable(
            storageRef,
            req.file.buffer,
            metadata
          );
          imageUrl = await getDownloadURL(snapshot.ref);
        } catch (error) {
          console.error("Error uploading to Firebase:", error);
          res.status(509).json({ error: "Error uploading image." });
          return;
        }
      }

      let sql = "";
      let params = [];

      if (imageUrl) {
        sql = `UPDATE User SET name = ?, gender = ?, phone = ?, email = ?, photo = ? WHERE userID = ?`;
        params = [
          users.name,
          users.gender,
          users.phone,
          users.email,
          imageUrl,
          users.userId,
        ];
      } else {
        sql = `UPDATE User SET name = ?, gender = ?, phone = ?, email = ? WHERE userID = ?`;
        params = [
          users.name,
          users.gender,
          users.phone,
          users.email,
          users.userId,
        ];
      }

      const updateUserSql = mysql.format(sql, params);

      conn.query(updateUserSql, (err, result) => {
        if (err) {
          console.error("Error updating user:", err);
          res.status(500).json({ error: "Error updating user." });
          return;
        }

        res.status(200).json({
          imageUrl: imageUrl,
          userId: users.userId,
        });
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Unexpected server error." });
    }
  }
);

router.put('/editpassword', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  const sqlSelect = 'SELECT password FROM User WHERE userID = ?';
  conn.query(sqlSelect, [userId], async (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error' });

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = result[0].password;

    const isMatch = await bcrypt.compare(currentPassword, hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    const sqlUpdate = 'UPDATE User SET password = ? WHERE userID = ?';
    conn.query(sqlUpdate, [newHashedPassword, userId], (updateErr) => {
      if (updateErr) return res.status(500).json({ message: 'Update failed' });

      res.json({ message: 'แก้ไขรหัสผ่านใหม่สำเร็จ' });
    });
  });
});