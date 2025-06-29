
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
