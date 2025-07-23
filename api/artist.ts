import { conn } from "../dbconnect"; 
import express from "express";
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

router.get('/artist', async (req, res) => {
    try {
        const artist = 'SELECT * FROM Artist';
        conn.query(artist, (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Query error' });
            }
            res.json(results); 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching artists' });
    }
});
// เพิ่มศิลปินโปรด
  router.post(
    "/addArtist",
    async (req, res): Promise<void> => {  
      const artist = req.body;
      try {
        let sql = `
          INSERT INTO \`Fav_Artist\`(\`userID\`, \`artistID\`) 
          VALUES (?, ?)
        `;
  
        sql = mysql.format(sql, [
            artist.userID,
            artist.artistID
        ]);
  
        conn.query(sql, (err, result) => {
          if (err) {
            console.error("Error inserting artist:", err);
            res.status(501).json({ error: "Error adding artist." });
            return; 
          }
  
          res.status(201).json({
            message: "Fav added successfully.",
            favID: artist.favID,
          });
        });
      } catch (hashError) {
        console.error("Error in SQL query:", hashError);
        res.status(500).json({ error: "Error adding artist." });
      }
    }
  );
  // ดึงรายการศิลปินโปรด
router.get("/favArtist/:userID", (req, res) => {
  const sql = `
    SELECT artistID FROM Fav_Artist WHERE userID = ?
  `;
  conn.query(sql, [req.params.userID], (err, results) => {
    if (err) return res.status(500).json({ error: "Query error" });
    res.json(results);
  });
});

// ลบศิลปินโปรด
router.post("/removeArtist", (req, res) => {
  const { userID, artistID } = req.body;
  const sql = `
    DELETE FROM Fav_Artist WHERE userID = ? AND artistID = ?
  `;
  conn.query(sql, [userID, artistID], (err, results) => {
    if (err) return res.status(500).json({ error: "Delete error" });
    res.json({ message: "Removed from favorites" });
  });
});
interface Artist {
    artistName: string;
    artistPhoto: string;
  }
  
// ค้นหาศิลปิน
router.get('/search/artist', (req, res) => {
  const searchQuery = req.query.query?.toString() || '';

  if (!searchQuery) {
    const sql = 'SELECT * FROM Artist';
    conn.query(sql, (error, results) => {
      if (error) {
        return res.status(500).json({ error: 'Database query error' });
      }
      res.json(results);
    });
  } else {
    const sql = 'SELECT * FROM Artist WHERE artistName LIKE ?';
    conn.query(sql, [`%${searchQuery}%`], (error, results) => {
      if (error) {
        return res.status(500).json({ error: 'Database query error' });
      }
      res.json(results);
    });
  }
});

router.delete("/deleteartist", (req, res) => {
  const artistID = req.query.artistID;

  // 1. ตรวจสอบว่า artist มีอยู่ใน Event_Artist หรือไม่
  const checkEventArtist = "SELECT * FROM Event_Artist WHERE artistID = ?";
  conn.query(checkEventArtist, [artistID], (err, eventResult) => {
    if (err) {
      return res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบ Event_Artist", error: err });
    }

    if (eventResult.length > 0) {
      return res.status(400).json({ message: "ไม่สามารถลบศิลปินนี้ได้ เนื่องจากในระบบศิลปินมีงานอีเว้นท์อยู่" });
    }

    // 2. ลบจาก Fav_Artist
    const deleteFromFav = "DELETE FROM Fav_Artist WHERE artistID = ?";
    conn.query(deleteFromFav, [artistID], (err) => {
      if (err) {
        return res.status(500).json({ message: "ลบจาก Fav_Artist ไม่สำเร็จ", error: err });
      }

      // 3. ลบจาก Artist
      const deleteArtist = "DELETE FROM Artist WHERE artistID = ?";
      conn.query(deleteArtist, [artistID], (err, artistResult) => {
        if (err) {
          return res.status(500).json({ message: "ลบ Artist ไม่สำเร็จ", error: err });
        }

        if (artistResult.affectedRows > 0) {
          return res.status(200).json({ message: "ลบข้อมูลศิลปินเรียบร้อยแล้ว" });
        } else {
          return res.status(404).json({ message: "ไม่พบศิลปินที่ต้องการลบ" });
        }
      });
    });
  });
});
router.post(
  "/add",
  fileUpload.diskLoader.single("file"),  
  async (req, res): Promise<void> => {
    const body = req.body;

    let imageUrl: string | null = null;
    if (req.file) {
      try {
        const filename =
          Date.now() + "-" + Math.round(Math.random() * 10000) + ".png";
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
        INSERT INTO \`Artist\`(\`artistName\`, \`artistPhoto\`) 
        VALUES (?, ?)
      `;

      sql = mysql.format(sql, [body.artistName, imageUrl]);

      conn.query(sql, (err, result) => {
        if (err) {
          console.error("Error inserting Artist:", err);
          res.status(501).json({ error: "Error adding Artist." });
          return;
        }
        const artistID = result.insertId;

        res.status(201).json({
          message: "Artist added successfully.",
          imageUrl: imageUrl,
          artistID: artistID,
        });
      });
    } catch (hashError) {
      console.error("Error in SQL query:", hashError);
      res.status(500).json({ error: "Error adding Artist." });
    }
  }
);
