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

router.post(
  "/registerU",
  fileUpload.diskLoader.single("file"),
  async (req, res) => {
    try {
      const users = req.body;

      if (users.password !== users.confirmPassword) {
        res.status(400).json({ error: "Passwords do not match." });
        return; 
      }

      const checkPhoneSql = mysql.format(
        `SELECT phone FROM User WHERE phone = ?`,
        [users.phone]
      );

      conn.query(checkPhoneSql, async (err, results) => {
        if (err) {
          console.error("Error checking phone number:", err);
          res.status(500).json({ error: "Internal server error." });
          return; 
        }

        if (results.length > 0) {
          res.status(409).json({ error: "Phone number already registered." });
          return; 
        }

        // เชื่อม userType
        const userTypeMap: Record<string, number> = {
          User: 1,
          Hotel: 2,
          Restaurant: 3,
          Organizer: 4,
        };

        const userTypeID = userTypeMap[users.userType];
        if (!userTypeID) {
          res.status(400).json({ error: `Invalid userType: ${users.userType}` });
          return; 
        }

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

        try {
          const hashedPassword = await bcrypt.hash(users.password, 10);

          const insertUserSql = mysql.format(
            `INSERT INTO User (name, phone, email, password, photo, typeID) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              users.name,
              users.phone,
              users.email,
              hashedPassword,
              imageUrl,
              userTypeID
            ]
          );

          conn.query(insertUserSql, (err, result) => {
            if (err) {
              console.error("Error inserting user:", err);
              res.status(500).json({ error: "Error registering user." });
              return; 
            }

            const userID = result.insertId;

            res.status(201).json({
              message: "User registered successfully.",
              imageUrl: imageUrl,
              userID: userID,
            });
          });
        } catch (hashError) {
          console.error("Error hashing password:", hashError);
          res.status(500).json({ error: "Error registering user." });
          return; 
        }
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Unexpected server error." });
    }
  }
);
