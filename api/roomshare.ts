import express from "express";
import { conn } from "../dbconnect";

export const router = express.Router();

router.get('/roomshare', (req, res) => {
  const sql = `
  SELECT 
      RoomShare.*, 
      RoomShare.contact AS shareContact,
      User.*, 
      User.phone AS userPhone,
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
  artistID: number;
  artistName: string;
  userID: number;
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
      User.*, 
      Artist.artistID, 
      Artist.artistName
    FROM User
    JOIN Fav_Artist ON User.userID = Fav_Artist.userID
    JOIN Artist ON Fav_Artist.artistID = Artist.artistID
    WHERE User.userID = ?
  `;

  conn.query(sql, [userID], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "An error occurred", error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "User not found or no favorite artists" });
    }

   
    const user = {
      userID: results[0].userID,
      name: results[0].name,
        photo: results[0].photo,
  email: results[0].email,
  gender: results[0].gender,
  phone: results[0].phone
    };

    const favoriteArtists = (results as FavoriteArtistRow[]).map((row) => ({
  artistID: row.artistID,
  artistName: row.artistName,
}));


    return res.json({
      user,
      favoriteArtists,
    });
  });
});

