import express from "express";
import multer from "multer";
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage"; // สำหรับ client-side
import admin from "firebase-admin";
import { conn } from "../dbconnect";

export const router = express.Router();

// ✅ Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: "project-rider-1b5ac.appspot.com",
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ✅ Firebase Client SDK (optional, สำหรับ getStorage ในฝั่ง client เท่านั้น)
const firebaseConfig = {
  apiKey: 'AIzaSyAiVnY-8Ajak4xVeQNLzynr8skqCgNFulg',
  appId: '1:259988227090:android:db894289cac749ff6c04cb',
  messagingSenderId: '259988227090',
  projectId: 'project-rider-1b5ac',
  storageBucket: 'project-rider-1b5ac.appspot.com',
};
initializeApp(firebaseConfig);

// ✅ Multer ตั้ง memory storage สำหรับอัปโหลดรูป
class FileMiddleware {
  public readonly diskLoader = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 64 * 1024 * 1024 }, // 64MB
  });
}
const fileUpload = new FileMiddleware();

// ✅ POST /Photo (อัปโหลดรูป)
router.post("/Photo", fileUpload.diskLoader.array("photo"), async (req, res): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const userID = req.body.userID?.toString();
    const hotelID = req.body.hotelID?.toString();

    if (!userID || !hotelID) {
      res.status(400).json({ error: "Missing userID or hotelID" });
      return;
    }

    const uploadedUrls: string[] = [];

    for (const fileData of files) {
      const filename = `images/${Date.now()}-${Math.round(Math.random() * 10000)}.png`;
      const file = bucket.file(filename);

      await file.save(fileData.buffer, {
        metadata: { contentType: fileData.mimetype },
      });

      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "2100-01-01T00:00:00Z",
      });

      uploadedUrls.push(url);
    }

    await db.collection("photo").add({
      userID: userID,
      hotelID: hotelID,
      photo: uploadedUrls,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ imageUrls: uploadedUrls });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload photos" });
  }
});
