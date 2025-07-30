import express from "express";
import { conn } from "../dbconnect";
import multer from "multer";
import mysql from "mysql";
export const router = express.Router();
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";


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

router.post(
  "/photo",
  fileUpload.diskLoader.array("file", 20), 
  async (req, res): Promise<void> => {
    const files = req.files as Express.Multer.File[];
    const urls: string[] = [];

    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded." });
      return;
    }

    try {
      for (const file of files) {
        const filename = Date.now() + "-" + Math.round(Math.random() * 10000) + ".png";
        const storageRef = ref(storage, "/images/" + filename);
        const metadata = { contentType: file.mimetype };

        const snapshot = await uploadBytesResumable(storageRef, file.buffer, metadata);
        const imageUrl = await getDownloadURL(snapshot.ref);
        urls.push(imageUrl);
      }

      res.status(200).json({ urls }); 
    } catch (error) {
      console.error("Error uploading to Firebase:", error);
      res.status(500).json({ error: "Upload failed." });
    }
  }
);
