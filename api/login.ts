
import bcrypt from 'bcryptjs';
import { conn } from "../dbconnect";
import express from "express";

export const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  console.log("Received login request for email:", email);
  

  const sqlUser = "SELECT * FROM User WHERE email = ?";
  conn.query(sqlUser, [email], (err, userResult) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "An error occurred" });
    }
  
    if (userResult.length > 0) {
      const user = userResult[0];
      bcrypt.compare(password, user.password, (err, match) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "An error occurred" });
        }
        if (match) {
          console.log("User login successful:", user.email);
          return res.json({
            message: "User login successful",
            user: user
          });
        } else {
          console.log("Password mismatch for:", email);
          return res.status(401).json({ message: "Invalid email or password" });
        }
      });
    } else {
      console.log("No user found with email:", email);
      return res.status(404).json({ message: "No user found with that email" });
    }
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