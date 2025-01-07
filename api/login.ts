import { conn } from "../dbconnect";
import express from "express";
import bcrypt from 'bcryptjs';

export const router = express.Router();

router.post("/login", (req, res) => {
    const { email, password } = req.body;

    const sqlUser = "SELECT * FROM User WHERE email = ?";
    conn.query(sqlUser, [email], (err, userResult) => {
      if (err) {
        return res.status(500).json({ message: "An error occurred" });
      }
    
      if (userResult.length > 0) {
        const user = userResult[0];
        bcrypt.compare(password, user.password, (err, match) => {
          if (err) {
            return res.status(500).json({ message: "An error occurred" });
          }
          if (match) {
            return res.json({
              message: "User login successful",
              user: user
            });
          } else {
            return res.status(401).json({ message: "Invalid email or password" });
          }
        });
      } else {
        return res.status(404).json({ message: "No user found with that email" });
      }
    });
    
});
