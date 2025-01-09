import { conn } from "../dbconnect";
import express from "express";
import mysql from "mysql";
import multer from "multer";
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";


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
    "/addhotel",
    fileUpload.diskLoader.single("file"),
    async (req, res): Promise<void> => {  
      const hotel = req.body;
  
      let imageUrl: string | null = null;
      if (req.file) {
        try {
          const filename = Date.now() + "-" + Math.round(Math.random() * 10000) + ".png";
          const storageRef = ref(storage, "/images/" + filename);
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
        let sql = `
          INSERT INTO \`Hotel\`(\`hotelName\`, \`hotelName2\`, \`hotelPhoto\`, \`detail\`, \`lat\`, \`long\`, \`phone\`, \`contact\`, \`startingPrice\`, \`location\`) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
  
        sql = mysql.format(sql, [
          hotel.hotelName,
          hotel.hotelName2,
          imageUrl,
          hotel.detail,
          hotel.lat,
          hotel.long,
          hotel.phone,
          hotel.contact,
          hotel.startingPrice,
          hotel.location,
        ]);
  
        conn.query(sql, (err, result) => {
          if (err) {
            console.error("Error inserting hotel:", err);
            res.status(501).json({ error: "Error adding hotel." });
            return; 
          }
          const hotelID = result.insertId;
  
          res.status(201).json({
            message: "Hotel added successfully.",
            imageUrl: imageUrl,
            hotelID: hotelID,
          });
        });
      } catch (hashError) {
        console.error("Error in SQL query:", hashError);
        res.status(500).json({ error: "Error adding hotel." });
      }
    }
  );
  
  router.post(
    "/addroom",
    fileUpload.diskLoader.single("file"),
    async (req, res): Promise<void> => {  
      const room = req.body;
  
      let imageUrl: string | null = null;
      if (req.file) {
        try {
          const filename = Date.now() + "-" + Math.round(Math.random() * 10000) + ".png";
          const storageRef = ref(storage, "/images/" + filename);
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
        let sql = `
          INSERT INTO \`Type_Room\`(\`roomName\`, \`hotelID\`, \`photo\`, \`size\`, \`price\`, \`status\`) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
  
        sql = mysql.format(sql, [
          room.roomName,
          room.hotelID,
          imageUrl,
          room.size,
          room.price,
          room.status,
        ]);
  
        conn.query(sql, (err, result) => {
          if (err) {
            console.error("Error inserting hotel:", err);
            res.status(501).json({ error: "Error adding hotel." });
            return; 
          }
          const roomID = result.insertId;
  
          res.status(201).json({
            message: "Hotel added successfully.",
            imageUrl: imageUrl,
            roomID: roomID,
          });
        });
      } catch (hashError) {
        console.error("Error in SQL query:", hashError);
        res.status(500).json({ error: "Error adding hotel." });
      }
    }
  );
  