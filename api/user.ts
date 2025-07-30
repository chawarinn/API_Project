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

router.get('/AllUser', (req, res) => {
  const sql = `
    SELECT 
      u.userID, 
      u.name, 
      u.email, 
      u.photo, 
      u.gender, 
      u.phone, 
      u.password, 
      u.typeID, 
      t.typeName 
    FROM User u
    LEFT JOIN userType t ON u.typeID = t.typeID
  `;

  conn.query(sql, (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงผู้ใช้' });
    }
    res.json(results);
  });
});

router.get("/user", (req, res) => {
  const userID = req.query.userID;
  const sql = "SELECT * FROM User WHERE userID = ?";
  conn.query(sql, [userID], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "An error occurred", error: err });
    }
    if (results.length > 0) {
      return res.json(results[0]); // ✅ ส่ง object
    } else {
      return res.status(404).json({ message: "User not found" }); // ✅ สำรองเมื่อไม่เจอ
    }
  });
});

router.delete("/deleteAccount", (req, res) => {
  const userID = req.query.userID;
 
  const deleteFavArtist = "DELETE FROM Fav_Artist WHERE userID = ?";
  const deleteRoomShare = "DELETE FROM RoomShare WHERE userID = ?";
  const deleteHotel = "DELETE FROM Hotel WHERE userID = ?";
  const deleteEvent = "DELETE FROM Event WHERE userID = ?";
  const deleteRestaurant = "DELETE FROM Restaurant WHERE userID = ?";
  const deletePoint = "DELETE FROM Piont WHERE userID = ?";
  const deleteUser = "DELETE FROM User WHERE userID = ?";
  

  // ลบ Fav_Artist
  conn.query(deleteFavArtist, [userID], (err) => {
    if (err) return res.status(500).json({ message: "ลบ Fav_Artist ไม่สำเร็จ", error: err });

    // ลบ RoomShare
    conn.query(deleteRoomShare, [userID], (err) => {
      if (err) return res.status(500).json({ message: "ลบ RoomShare ไม่สำเร็จ", error: err });

      // ลบ Hotel
      conn.query(deleteHotel, [userID], (err) => {
        if (err) return res.status(500).json({ message: "ลบ Hotel ไม่สำเร็จ", error: err });

        // ลบ Event
        conn.query(deleteEvent, [userID], (err) => {
          if (err) return res.status(500).json({ message: "ลบ Event ไม่สำเร็จ", error: err });

          // ลบ Restaurant
          conn.query(deleteRestaurant, [userID], (err) => {
            if (err) return res.status(500).json({ message: "ลบ Restaurant ไม่สำเร็จ", error: err });
   // ลบ Point
             conn.query(deletePoint, [userID], (err) => {
            if (err) return res.status(500).json({ message: "ลบ Point ไม่สำเร็จ", error: err });

            // สุดท้ายลบ User
            conn.query(deleteUser, [userID], (err, result) => {
              if (err) {
                return res.status(500).json({ message: "ลบ User ไม่สำเร็จ", error: err });
              }

              if (result.affectedRows === 0) {
                return res.status(404).json({ message: "ไม่พบผู้ใช้หรือถูกลบไปแล้ว" });
              }

              return res.status(200).json({ message: "ลบบัญชีผู้ใช้เรียบร้อยแล้ว" });
            });
          });
        });
      });
    });
    });
  });
});

router.put('/editpass', async (req, res) => {
  const { userId, newPassword } = req.body;

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    const sqlUpdate = 'UPDATE User SET password = ? WHERE userID = ?';
    conn.query(sqlUpdate, [newHashedPassword, userId], (updateErr) => {
      if (updateErr) return res.status(500).json({ message: 'Update failed' });

      res.json({ message: 'แก้ไขรหัสผ่านใหม่สำเร็จ' });
    });
});

router.put('/editpasslogin', async (req, res) => {
  const { email, newPassword } = req.body;

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    const sqlUpdate = 'UPDATE User SET password = ? WHERE email = ?';
    conn.query(sqlUpdate, [newHashedPassword, email], (updateErr) => {
      if (updateErr) return res.status(500).json({ message: 'Update failed' });

      res.json({ message: 'แก้ไขรหัสผ่านใหม่สำเร็จ' });
    });
});