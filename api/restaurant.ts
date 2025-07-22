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

// 1. ดึงร้านอาหารทั้งหมด
router.get('/Restaurant', (req, res) => {
  const sql = 'SELECT * FROM Restaurant';
  conn.query(sql, (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลร้านอาหาร' });
    }
    res.json(results);
  });
});

// 2. ค้นหาร้านอาหารด้วยชื่อ (query string)
router.get('/search/restaurant', (req, res) => {
  const searchQuery = req.query.query?.toString() || '';

  let sql = 'SELECT * FROM Restaurant';
  const params: any[] = [];

  if (searchQuery) {
    sql += ' WHERE resName LIKE ?';
    params.push(`%${searchQuery}%`);
  }

  conn.query(sql, params, (error, results) => {
    if (error) {
      console.error("Search error:", error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาร้านอาหาร' });
    }
    res.json(results);
  });
});

// (ไม่จำเป็นต้องใช้ interface ด้านล่างหากคุณใช้ JavaScript หรือ Express ล้วนๆ)
interface Restaurant {
  resId: number;
  resName: string;
  type: number;
  resPhoto: string;
  open: number;
  close: number;
  contact: string;
  location: string;
  lat: number;
  long: number;
}

interface RestaurantWithDistance extends Restaurant {
  distance: number | null;
  eventLat?: number;
  eventLong?: number;
}
router.get('/reshome', async (req, res) => {
    const userID = req.query.userID;

    try {
        const ResQuery = `
            SELECT *
            FROM Restaurant
            WHERE userID = ?
        `;

        conn.query(ResQuery, [userID], (error, results) => {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Database query failed' });
            } else {
                res.json(results);
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.delete("/deleterestaurant", (req, res) => {
  const resID = req.query.resID;

 
 const deleteRes = "DELETE FROM Restaurant WHERE resID = ?";

  conn.query(deleteRes, [resID], (err, ResResult ) => {
    if (err) {
      return res.status(500).json({ message: "ลบ Restaurant ไม่สำเร็จ", error: err });
    }

    if (ResResult.affectedRows > 0) {
      console.log("ลบ Restaurant แล้ว");
    } else {
      console.log("ไม่มี Restaurant ที่ต้องลบ");
    }

    return res.status(200).json({ message: "ลบข้อมูลร้านอาหารเรียบร้อยแล้ว" });
  });
});

router.get("/Res", (req, res) => {
  const resID = req.query.resID;

  const sql = "SELECT * FROM Restaurant WHERE resID = ?";
  conn.query(sql, [resID], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "An error occurred", error: err });
    }
    if (results.length > 0) {
      return res.json(results[0]); 
    } else {
      return res.status(404).json({ message: "Restaurant not found" }); 
    }
  });
});


router.put(
  "/editres",
  fileUpload.diskLoader.single("file"),
  async (req, res) => {
    try {
      const Res = req.body;
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
        sql = `UPDATE Restaurant SET 
        resName = ?, 
        type = ?, 
        open = ?, 
        close = ?, 
        lat = ?,
        \`long\` = ?, 
        contact = ?,
        location = ?,
        resPhoto = ? 
        WHERE resID = ?`;
        params = [
          Res.resName,
          Res.type,
          Res.open,
          Res.close,
          Res.lat,
          Res.long,
          Res.contact,
          Res.location,
          imageUrl,
          Res.resID,
        ];
      } else {
        sql = ` UPDATE Restaurant SET 
        resName = ?, 
        type = ?, 
        open = ?, 
        close = ?, 
        lat = ?,
        \`long\` = ?, 
        contact = ?,
        location = ?
        WHERE resID = ?
        `;
        params = [
          Res.resName,
          Res.type,
          Res.open,
          Res.close,
          Res.lat,
          Res.long,
          Res.contact,
          Res.location,
          Res.resID,
        ];
      }

      const updateUserSql = mysql.format(sql, params);

      conn.query(updateUserSql, (err, result) => {
        if (err) {
          console.error("Error updating hotel:", err);
          res.status(500).json({ error: "Error updating hotel." });
          return;
        }

        res.status(200).json({
          imageUrl: imageUrl,
          ResID: Res.resID,
        });
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Unexpected server error." });
    }
  }
);

router.post(
    "/addres",
    fileUpload.diskLoader.single("file"),
    async (req, res): Promise<void> => {  
      const Res = req.body;
  
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
          INSERT INTO \`Restaurant\`(\`resName\`, \`type\`, \`open\`, \`close\`, \`lat\`, \`long\`, \`contact\`,  \`location\`, \`resPhoto\`,\`userID\`) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
  
        sql = mysql.format(sql, [
          Res.resName,
          Res.type,
          Res.open,
          Res.close,
          Res.lat,
          Res.long,
          Res.contact,
          Res.location,
          imageUrl,
          Res.userID,
        ]);
  
        conn.query(sql, (err, result) => {
          if (err) {
            console.error("Error inserting Restaurant:", err);
            res.status(501).json({ error: "Error adding Restaurant." });
            return; 
          }
          const resID = result.insertId;
  
          res.status(201).json({
            message: "Restaurant added successfully.",
            imageUrl: imageUrl,
            resID: resID,
          });
        });
      } catch (hashError) {
        console.error("Error in SQL query:", hashError);
        res.status(500).json({ error: "Error adding Restaurant." });
      }
    }
  );
  