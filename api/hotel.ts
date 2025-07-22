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
          INSERT INTO \`Hotel\`(\`hotelName\`, \`hotelName2\`, \`hotelPhoto\`, \`detail\`, \`lat\`, \`long\`, \`phone\`, \`contact\`, \`startingPrice\`, \`location\`, \`userID\`) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          hotel.userID,
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

  router.get('/hotelpiont', async (req, res) => {
    try {
        const hotelQuery = `
            SELECT H.*, IFNULL(SUM(P.piont), 0) AS totalPiont
            FROM Hotel H
            LEFT JOIN Piont P ON H.hotelID = P.hotelID
            GROUP BY H.hotelID
            ORDER BY totalPiont DESC
        `;

        const hotelResults = await new Promise((resolve, reject) => {
            conn.query(hotelQuery, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        res.json(hotelResults); 

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching hotels with points' });
    }
});

interface HotelRoomRow {
  hotelID: number;
  hotelName: string;
  hotelName2: string;
  location: string;
  phone: string;
  contact: string;
  hotelPhoto: string;
  detail: string;
  lat: number;
  long: number;
  startingPrice: number;
  totalPiont: number;
  roomID?: number | null;
  roomName?: string | null;
  status?: string | null;
  photo?: string | null;
  size?: string | null;
  price?: number | null;
}

router.get('/hoteldetail', async (req, res) => {
  const hotelID = req.query.hotelID as string;

  const sql = `
    SELECT 
        H.hotelID,
        H.hotelName,
        H.hotelName2,
        H.location,
        H.phone,
        H.contact,
        H.hotelPhoto,
        H.detail,
        H.lat,
        H.long,
        H.startingPrice,
        (SELECT IFNULL(SUM(P.piont), 0) FROM Piont P WHERE P.hotelID = H.hotelID) AS totalPiont,
        R.roomID,
        R.roomName,
        R.status,
        R.photo,
        R.size,
        R.price
      FROM Hotel H
      LEFT JOIN Type_Room R ON H.hotelID = R.hotelID
      WHERE H.hotelID = ?
  `;

  conn.query(sql, [hotelID], (err, results: HotelRoomRow[]) => {
    if (err) {
      return res.status(500).json({ message: "An error occurred", error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    const hotel = {
      hotelID: results[0].hotelID,
      hotelName: results[0].hotelName,
      hotelName2: results[0].hotelName2,
      location: results[0].location,
      phone: results[0].phone,
      contact: results[0].contact,
      hotelPhoto: results[0].hotelPhoto,
      detail: results[0].detail,
      lat: results[0].lat,
      long: results[0].long,
      startingPrice: results[0].startingPrice,
      totalPiont: results[0].totalPiont,
      rooms: [] as {  roomID?: number;
  roomName?: string;
  status?: string;
  photo?: string;
  size?: string;
  price?: number;}[]
    };

    results.forEach((row: HotelRoomRow) => {
      if (row.roomID) {
        hotel.rooms.push({
      roomID: row.roomID,
      roomName: row.roomName || '',
      status: row.status || '',
      photo: row.photo || '',
      size: row.size || '',
      price: row.price || undefined,
        });
      }
    });

    return res.json(hotel);
  });
});

router.get('/checkpoint', (req, res) => {
  const userID = req.query.userID;
  const hotelID = req.query.hotelID;
  const sql = 'SELECT * FROM Piont WHERE userID = ? AND hotelID = ?';

  conn.query(sql, [userID, hotelID], (err, result) => {
    if (err) return res.status(500).send('Error');
    if (result.length > 0) {
      res.json({ hasRated: true });
    } else {
      res.json({ hasRated: false });
    }
  });
});

  router.post(
    "/addpoint",
    async (req, res): Promise<void> => {  
      const point = req.body;
      try {
        let sql = `
          INSERT INTO \`Piont\`(\`userID\`, \`hotelID\`,\`piont\`) 
          VALUES (?, ?, ?)
        `;
  
        sql = mysql.format(sql, [
            point.userID,
            point.hotelID,
            1
        ]);
  
        conn.query(sql, (err, result) => {
          if (err) {
            console.error("Error inserting artist:", err);
            res.status(501).json({ error: "Error adding point." });
            return; 
          }
  
          res.status(201).json({
            message: "added successfully.",
            pointID: point.pointID,
          });
        });
      } catch (hashError) {
        console.error("Error in SQL query:", hashError);
        res.status(500).json({ error: "Error adding point." });
      }
    }
  );
router.delete("/deletepoint", (req, res) => {
  const { userID, hotelID } = req.query;

  const sql = `
    DELETE FROM Piont WHERE userID = ? AND hotelID = ?
  `;
  conn.query(sql, [userID, hotelID], (err, results) => {
    if (err) return res.status(500).json({ error: "Delete error" });
    res.json({ message: "Removed from point" });
  });
});

router.get('/hotel', async (req, res) => {
    try {
        const sql = `SELECT * FROM Hotel
`;
        conn.query(sql, (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Query error' });
            }
            res.json(results); 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching events' });
    }
});


router.get('/typeroom', async (req, res) => {
  const hotelID = req.query.hotelID;
    try {
        const sql = `
            SELECT R.* 
            FROM Type_Room R 
            WHERE R.hotelID = ?
        `;
        conn.query(sql, [hotelID], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Query error' });
            }
            res.json(results);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching room types' });
    }
});

router.get('/hotelhome', async (req, res) => {
    const userID = req.query.userID;

    try {
        const hotelQuery = `
            SELECT H.*, IFNULL(SUM(P.piont), 0) AS totalPiont
            FROM Hotel H
            LEFT JOIN Piont P ON H.hotelID = P.hotelID
            WHERE H.userID = ?
            GROUP BY H.hotelID
            ORDER BY totalPiont DESC
        `;

        const hotelResults = await new Promise((resolve, reject) => {
            conn.query(hotelQuery, [userID], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        res.json(hotelResults);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'An error occurred while fetching hotels with points'
        });
    }
});


router.delete("/deletehotel", (req, res) => {
  const hotelID = req.query.hotelID;

  const deleteRoomShare = "DELETE FROM RoomShare WHERE hotelID = ?";
  const deletePoint = "DELETE FROM Piont WHERE hotelID = ?";
  const deleteTypeRoom = "DELETE FROM Type_Room WHERE hotelID = ?";
  const deleteHotel = "DELETE FROM Hotel WHERE hotelID = ?";

   
  conn.query(deleteRoomShare, [hotelID], (err, roomResult) => {
    if (err) return res.status(500).json({ message: "ลบ RoomShare ไม่สำเร็จ", error: err });

    if (roomResult.affectedRows > 0) {
      console.log("ลบ RoomShare แล้ว");
    } else {
      console.log("ไม่มี RoomShare ที่ต้องลบ");
    }

    conn.query(deletePoint, [hotelID], (err, pointResult) => {
      if (err) return res.status(500).json({ message: "ลบ Point ไม่สำเร็จ", error: err });

      if (pointResult.affectedRows > 0) {
        console.log("ลบ Point แล้ว");
      } else {
        console.log("ไม่มี Point ที่ต้องลบ");
      }

      conn.query(deleteTypeRoom, [hotelID], (err, typeRoomResult) => {
        if (err) return res.status(500).json({ message: "ลบ Type_Room ไม่สำเร็จ", error: err });

        if (typeRoomResult.affectedRows > 0) {
          console.log("ลบ Type_Room แล้ว");
        } else {
          console.log("ไม่มี Type_Room ที่ต้องลบ");
        }

        conn.query(deleteHotel, [hotelID], (err, hotelResult) => {
          if (err) return res.status(500).json({ message: "ลบ Hotel ไม่สำเร็จ", error: err });

          if (hotelResult.affectedRows === 0) {
            return res.status(404).json({ message: "ไม่พบโรงแรมหรือถูกลบไปแล้ว" });
          }

          return res.status(200).json({ message: "ลบโรงแรมเรียบร้อยแล้ว" });
        });
      });
    });
  });
});

router.get("/hotels", (req, res) => {
  const hotelID = req.query.hotelID;
  const sql = "SELECT * FROM Hotel WHERE hotelID = ?";
  conn.query(sql, [hotelID], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "An error occurred", error: err });
    }
    if (results.length > 0) {
      return res.json(results[0]); 
    } else {
      return res.status(404).json({ message: "Hotel not found" }); 
    }
  });
});

router.put(
  "/edithotel",
  fileUpload.diskLoader.single("file"),
  async (req, res) => {
    try {
      const hotels = req.body;
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
        sql = `UPDATE Hotel SET 
        hotelName = ?, 
        hotelName2 = ?, 
        phone = ?, 
        detail = ?, 
        lat = ?,
        \`long\` = ?, 
        contact = ?,
        startingPrice = ?,
        location = ?,
        hotelPhoto = ? 
        WHERE hotelID = ?`;
        params = [
          hotels.hotelName,
          hotels.hotelName2,
          hotels.phone,
          hotels.detail,
          hotels.lat,
          hotels.long,
          hotels.contact,
          hotels.startingPrice,
          hotels.location,
          imageUrl,
          hotels.hotelID,
        ];
      } else {
        sql = ` UPDATE Hotel SET 
        hotelName = ?, 
        hotelName2 = ?, 
        phone = ?, 
        detail = ?, 
        lat = ?,
        \`long\` = ?, 
        contact = ?,
        startingPrice = ?,
        location = ?
        WHERE hotelID = ?
        `;
        params = [
          hotels.hotelName,
          hotels.hotelName2,
          hotels.phone,
          hotels.detail,
          hotels.lat,
          hotels.long,
          hotels.contact,
          hotels.startingPrice,
          hotels.location,
          hotels.hotelID,
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
          hotelId: hotels.hotelId,
        });
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Unexpected server error." });
    }
  }
);

router.get("/rooms", (req, res) => {
  const hotelID = req.query.hotelID;
  const sql = "SELECT * FROM Type_Room WHERE hotelID = ?";
  conn.query(sql, [hotelID], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "An error occurred", error: err });
    }
    if (results.length > 0) {
      return res.json(results); 
    } else {
      return res.status(404).json({ message: "Type_Room not found" }); 
    }
  });
});

router.delete("/deleteroom", (req, res) => {
  const roomID = req.query.roomID;

  const deleteTypeRoom = "DELETE FROM Type_Room WHERE roomID = ?";

  conn.query(deleteTypeRoom, [roomID], (err, typeRoomResult) => {
    if (err) {
      return res.status(500).json({ message: "ลบ Type_Room ไม่สำเร็จ", error: err });
    }

    if (typeRoomResult.affectedRows > 0) {
      console.log("ลบ Type_Room แล้ว");
    } else {
      console.log("ไม่มี Type_Room ที่ต้องลบ");
    }

    return res.status(200).json({ message: "ลบข้อมูลห้องเรียบร้อยแล้ว" });
  });
});

router.get("/Room", (req, res) => {
  const roomID = req.query.roomID;
  const sql = "SELECT * FROM Type_Room WHERE roomID = ?";
  conn.query(sql, [roomID], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "An error occurred", error: err });
    }
    if (results.length > 0) {
      return res.json(results[0]); 
    } else {
      return res.status(404).json({ message: "Hotel not found" }); 
    }
  });
});

router.delete("/deleteallroom", (req, res) => {
  const hotelID = req.query.hotelID;

  const deleteTypeRoom = "DELETE FROM Type_Room WHERE hotelID = ?";

  conn.query(deleteTypeRoom, [hotelID], (err, typeRoomResult) => {
    if (err) {
      return res.status(500).json({ message: "ลบ Type_Room ไม่สำเร็จ", error: err });
    }

    if (typeRoomResult.affectedRows > 0) {
      console.log("ลบ Type_Room แล้ว");
    } else {
      console.log("ไม่มี Type_Room ที่ต้องลบ");
    }

    // ✅ สำคัญมาก: ต้องตอบกลับ client เสมอ
    return res.status(200).json({ message: "ลบข้อมูลห้องเรียบร้อยแล้ว" });
  });
});


router.put(
  "/editroom",
  fileUpload.diskLoader.single("file"),
  async (req, res) => {
    try {
      const rooms = req.body;
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
        sql = `UPDATE Type_Room SET 
        roomName = ?, 
        price = ?,
        size = ?,
        status = ?,
        photo = ? 
        WHERE roomID = ?`;
        params = [
          rooms.roomName,
          rooms.price,
          rooms.size,
          rooms.status,
          imageUrl,
          rooms.roomID,
        ];
      } else {
        sql = ` UPDATE Type_Room SET 
        roomName = ?, 
        price = ?,
        size = ?,
        status = ?
        WHERE roomID = ?`
        params = [
         rooms.roomName,
          rooms.price,
          rooms.size,
          rooms.status,
          rooms.roomID,
        ];
      }

      const updateUserSql = mysql.format(sql, params);

      conn.query(updateUserSql, (err, result) => {
        if (err) {
          console.error("Error updating room:", err);
          res.status(500).json({ error: "Error updating room." });
          return;
        }

        res.status(200).json({
          imageUrl: imageUrl,
          roomID: rooms.roomID,
        });
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Unexpected server error." });
    }
  }
);
