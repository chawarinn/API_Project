import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import multer from "multer";

export const router = express.Router();

router.get('/roomshare', (req, res) => {
  const sql = `
  SELECT 
      RoomShare.*, 
      RoomShare.contact AS shareContact,
      User.*, 
      User.phone AS userPhone,
      User.userID AS userId,
      Event.*, 
      Event.location AS eventLocation,
      Artist.*,
      Hotel.*,
      Hotel.location AS hotelLocation,
      Hotel.contact AS hotelcontact,
    Hotel.phone AS hotelPhone
    FROM RoomShare
    JOIN User ON RoomShare.userID = User.userID
    LEFT JOIN Event ON RoomShare.eventID = Event.eventID
    LEFT JOIN Artist ON RoomShare.artistID = Artist.artistID
    LEFT JOIN Hotel ON RoomShare.hotelID = Hotel.hotelID`;
  conn.query(sql, (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
    res.json(results);
  });
});

router.get('/roomshareevent', (req, res) => {
  const { eventID } = req.query;

  const sql = `
    SELECT 
      RoomShare.*, 
      RoomShare.contact AS shareContact,
      User.*, 
      User.phone AS userPhone,
      User.userID AS userId,
      Event.*, 
      Event.location AS eventLocation,
      Artist.*,
      Hotel.*,
      Hotel.location AS hotelLocation,
      Hotel.contact AS hotelcontact,
      Hotel.phone AS hotelPhone
    FROM RoomShare
    JOIN User ON RoomShare.userID = User.userID
    LEFT JOIN Event ON RoomShare.eventID = Event.eventID
    LEFT JOIN Artist ON RoomShare.artistID = Artist.artistID
    LEFT JOIN Hotel ON RoomShare.hotelID = Hotel.hotelID
    WHERE RoomShare.eventID = ?`;

  conn.query(sql, [eventID], (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
    res.json(results);
  });
});

interface FavoriteArtistRow {
  artistID: number | null;
  artistName: string | null;
}

interface UserRow extends FavoriteArtistRow {
  userID: string;
  name: string;
  photo: string;
  email: string;
  gender: string;
  phone: string;
}


router.get("/userreq", (req, res) => {
  const userID = req.query.userID;

  const sql = `
    SELECT 
      User.userID,
      User.name,
      User.photo,
      User.email,
      User.gender,
      User.phone,
      Artist.artistID, 
      Artist.artistName
    FROM User
    LEFT JOIN Fav_Artist ON User.userID = Fav_Artist.userID
    LEFT JOIN Artist ON Fav_Artist.artistID = Artist.artistID
    WHERE User.userID = ?
  `;

  conn.query(sql, [userID], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "An error occurred", error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = {
      userID: results[0].userID,
      name: results[0].name,
      photo: results[0].photo,
      email: results[0].email,
      gender: results[0].gender,
      phone: results[0].phone
    };

    
const favoriteArtists = (results as UserRow[])
  .filter((row) => row.artistID !== null)
  .map((row) => ({
    artistID: row.artistID!,
    artistName: row.artistName!
  }));

    return res.json({ user, favoriteArtists });
  });
});

const upload = multer(); 

router.post(
  "/addroomshare",
  upload.none(),
  async (req, res): Promise<void> => {
    const roomshare = req.body;

    console.log("Received roomshare:", roomshare);

    // เช็คค่าที่จำเป็น
    const requiredFields = [
      "contact",
      "note",
      "gender_restrictions",
      "price",
      "typeRoom",
      "status",
      "userID",
      "eventID",
      "artistID",
      "hotelID",
    ];

    for (const field of requiredFields) {
      if (
        roomshare[field] === undefined ||
        roomshare[field] === null ||
        (typeof roomshare[field] === "string" && roomshare[field].trim() === "")
      ) {
        res.status(400).json({ error: `Field '${field}' is required.` });
        return;
      }
    }

    try {
      let sql = `
        INSERT INTO RoomShare (
          contact, note, gender_restrictions, price, typeRoom, status,
          userID, eventID, artistID, hotelID
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        roomshare.contact,
        roomshare.note,
        roomshare.gender_restrictions,
        roomshare.price,
        roomshare.typeRoom,
        roomshare.status,
        roomshare.userID,
        roomshare.eventID,
        roomshare.artistID,
        roomshare.hotelID,
      ];

      sql = mysql.format(sql, params);

      conn.query(sql, (err, result) => {
        if (err) {
          console.error("Error inserting:", err);
          res.status(500).json({ error: "Error adding roomshare." });
          return;
        }
        const roomID = result.insertId;

        res.status(201).json({
          message: "Added successfully.",
          roomshareID: roomID,
        });
      });
    } catch (error) {
      console.error("Error in SQL query:", error);
      res.status(500).json({ error: "Error adding roomshare." });
    }
  }
);

router.delete('/deleteroomshare/:id', async (req, res) => {
  const roomshareID = req.params.id;

  try {
    let sql = `DELETE FROM RoomShare WHERE roomshareID = ?`;
    await conn.query(sql, [roomshareID]);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

router.post('/updatestatusroomshare', (req, res) => {
  const { roomshareID, status } = req.body;
  const sql = 'UPDATE RoomShare SET status = ? WHERE roomshareID = ?';

  conn.query(sql, [status, roomshareID], (error, results) => {
    if (error) {
      console.error('MySQL error:', error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตฐานข้อมูล' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'ไม่พบ roomshareID ที่ระบุ' });
    }

    res.json({ message: 'อัปเดตสถานะเรียบร้อยแล้ว' });
  });
});


router.get('/roomshareNoti', (req, res) => {
  const { roomshareID } = req.query;

  const sql = `
    SELECT 
      RoomShare.*, 
      RoomShare.contact AS shareContact,
      User.*, 
      User.phone AS userPhone,
      User.userID AS userId,
      Event.*, 
      Event.location AS eventLocation,
      Artist.*,
      Hotel.*,
      Hotel.location AS hotelLocation,
      Hotel.contact AS hotelcontact,
      Hotel.phone AS hotelPhone
    FROM RoomShare
    JOIN User ON RoomShare.userID = User.userID
    LEFT JOIN Event ON RoomShare.eventID = Event.eventID
    LEFT JOIN Artist ON RoomShare.artistID = Artist.artistID
    LEFT JOIN Hotel ON RoomShare.hotelID = Hotel.hotelID
    WHERE RoomShare.roomshareID = ?`;

  conn.query(sql, [roomshareID], (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
    res.json(results);
  });
});

interface FavoriteArtistRow {
  artistID: number | null;
  artistName: string | null;
}

interface UserRow extends FavoriteArtistRow {
  userID: string;
  name: string;
  photo: string;
  email: string;
  gender: string;
  phone: string;
}