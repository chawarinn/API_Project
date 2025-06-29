import { conn } from "../dbconnect"; 
import express from "express";
import mysql from "mysql";


export const router = express.Router();

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
