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

//รายละเอียดอีเว้นท์
interface EventArtistRow {
  eventID: number;
  lat: number;
  long: number;
  eventName: string;
  eventPhoto: string;
  linkticket: string;
  location: string;
  date: string;
  time: string;
  ltime: string;
  typeEventID: number;
  typeEventName: string;
  artistID?: number | null;
  artistName?: string | null;
  artistPhoto?: string | null;
}

router.get('/detailevent', async (req, res) => {
  const eventID = req.query.eventID as string;

  const sql = `
    SELECT 
      E.eventID,
      E.lat,
      E.long,
      E.eventName,
      E.eventPhoto,
      E.linkticket,
      E.location,
      E.date,
      E.time,
      E.ltime,
      E.typeEventID,
      TE.typeEventName,
      A.artistID,
      A.artistName,
      A.artistPhoto
    FROM 
      Event E
    LEFT JOIN 
      Event_Artist EA ON E.eventID = EA.eventID
    LEFT JOIN 
      Artist A ON EA.artistID = A.artistID
    LEFT JOIN 
      Type_Event TE ON E.typeEventID = TE.typeEventID
    WHERE 
      E.eventID = ?
  `;

  conn.query(sql, [eventID], (err, results: EventArtistRow[]) => {
    if (err) {
      return res.status(500).json({ message: "An error occurred", error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const event = {
      eventID: results[0].eventID,
      lat: results[0].lat,
      long: results[0].long,
      eventName: results[0].eventName,
      eventPhoto: results[0].eventPhoto,
      linkticket: results[0].linkticket,
      location: results[0].location,
      date: results[0].date,
      time: results[0].time,
      ltime: results[0].ltime,
      typeEventID: results[0].typeEventID,
      typeEventName: results[0].typeEventName,
      artists: [] as { artistID: number; artistName: string; artistPhoto: string }[]
    };

    results.forEach((row: EventArtistRow) => {
      if (row.artistID) {
        event.artists.push({
          artistID: row.artistID,
          artistName: row.artistName || '',
          artistPhoto: row.artistPhoto || ''
        });
      }
    });

    return res.json(event);
  });
});


router.get('/Event', async (req, res) => {
    try {
        const sql = `SELECT * FROM Event
WHERE date >= NOW()
ORDER BY date ASC
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

router.get('/event', async (req, res) => {
    try {
        const sql = `SELECT * FROM Event
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
// ค้นหา
router.get('/search/event', (req, res) => {
  const searchQuery = req.query.query?.toString() || '';

  if (!searchQuery) {
    const sql = `SELECT * FROM Event
WHERE date >= NOW()
ORDER BY date ASC
`;
    conn.query(sql, (error, results) => {
      if (error) {
        return res.status(500).json({ error: 'Database query error' });
      }
      res.json(results);
    });
  } else {
    const sql = `
      SELECT * FROM Event 
      WHERE date >= CURDATE()
      AND (eventName LIKE ? OR location LIKE ?)
      ORDER BY date ASC, time ASC
    `;
    const likeValue = `%${searchQuery}%`;
    conn.query(sql, [likeValue, likeValue], (error, results) => {
      if (error) {
        return res.status(500).json({ error: 'Database query error' });
      }
      res.json(results);
    });
  }
});

router.get('/EventH', (req, res) => {
  const userID = req.query.userID as string;

  const sql = `
    SELECT 
      E.eventID,
      E.lat,
      E.long,
      E.eventName,
      E.eventPhoto,
      E.linkticket,
      E.location,
      E.date,
      E.time,
      E.ltime,
      E.typeEventID,
      TE.typeEventName,
      A.artistID,
      A.artistName,
      A.artistPhoto
    FROM 
      Event E
    LEFT JOIN 
      Event_Artist EA ON E.eventID = EA.eventID
    LEFT JOIN 
      Artist A ON EA.artistID = A.artistID
    LEFT JOIN 
      Type_Event TE ON E.typeEventID = TE.typeEventID
    WHERE 
      E.userID = ?
    ORDER BY E.eventID
  `;

  conn.query(sql, [userID], (err, results: EventArtistRow[]) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "An error occurred", error: err });
    }

    if (results.length === 0) {
      return res.status(200).json([]); // ส่ง array ว่างถ้าไม่มี event
    }

    // จัดกลุ่ม events ตาม eventID
    const eventsMap = new Map<number, any>();

    results.forEach(row => {
      if (!eventsMap.has(row.eventID)) {
        eventsMap.set(row.eventID, {
          eventID: row.eventID,
          lat: row.lat,
          long: row.long,
          eventName: row.eventName,
          eventPhoto: row.eventPhoto,
          linkticket: row.linkticket,
          location: row.location,
          date: row.date,
          time: row.time,
          ltime: row.ltime,
          typeEventID: row.typeEventID,
          typeEventName: row.typeEventName,
          artists: []
        });
      }

      if (row.artistID) {
        eventsMap.get(row.eventID).artists.push({
          artistID: row.artistID,
          artistName: row.artistName || '',
          artistPhoto: row.artistPhoto || '',
        });
      }
    });

    // แปลง map เป็น array
    const eventsArray = Array.from(eventsMap.values());

    res.json(eventsArray);
  });
});

router.delete('/deleteevent', (req, res) => {
  const eventID = req.query.eventID as string;

  const sqlDeleteArtists = 'DELETE FROM Event_Artist WHERE eventID = ?';
  const sqlDeleteEvent = 'DELETE FROM Event WHERE eventID = ?';

  conn.getConnection((err, connection) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database connection error' });
    }

    connection.beginTransaction(transactionErr => {
      if (transactionErr) {
        connection.release();
        return res.status(500).json({ message: 'Transaction error', error: transactionErr });
      }

      connection.query(sqlDeleteArtists, [eventID], (err) => {
        if (err) {
          return connection.rollback(() => {
            connection.release();
            res.status(500).json({ message: 'Failed to delete event artists', error: err });
          });
        }

        connection.query(sqlDeleteEvent, [eventID], (err) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ message: 'Failed to delete event', error: err });
            });
          }

          connection.commit(commitErr => {
            connection.release();
            if (commitErr) {
              return res.status(500).json({ message: 'Commit failed', error: commitErr });
            }
            res.json({ message: 'Event deleted successfully' });
          });
        });
      });
    });
  });
});

router.get('/typeEvent', async (req, res) => {
    try {
        const Type_Event = 'SELECT * FROM Type_Event';
        conn.query(Type_Event, (error, results) => {
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


router.put(
  "/editEvent",
  fileUpload.diskLoader.single("file"),
  async (req, res) => {
    try {
      const body = req.body;
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

     
      // Update Event
      let sql = `
        UPDATE Event SET
          eventName = ?,
          date = ?,
          time = ?,
          ltime = ?,
          typeEventID = ?,
          linkticket = ?,
          location = ?,
          lat = ?,
          \`long\` = ?
          ${imageUrl ? ', eventPhoto = ?' : ''}
        WHERE eventID = ?
      `;

      let params = [
        body.eventName,
        body.date,
        body.time,
        body.ltime,
        body.typeEventID,
        body.linkticket,
        body.location,
        body.lat,
        body.long,
      ];

      if (imageUrl) {
        params.push(imageUrl);
      }
      params.push(body.eventID);

      const updateSql = mysql.format(sql, params);

      conn.query(updateSql, async (err, result) => {
        if (err) {
          console.error("Error updating event:", err);
          return res.status(500).json({ error: "Error updating event." });
        }

       // ...
if (body.artists) {
  const artistIDs: number[] = JSON.parse(body.artists); // กรณีใช้ TS กำหนด type ที่นี่ด้วย

  // ลบ artist เดิมออกก่อน
  const deleteArtistSql = `DELETE FROM Event_Artist WHERE eventID = ?`;
  conn.query(deleteArtistSql, [body.eventID], (delErr) => {
    if (delErr) {
      console.error("Error deleting event artists:", delErr);
      return res.status(500).json({ error: "Error updating artists." });
    }

    if (artistIDs.length > 0) {
      const artistInsertValues = artistIDs.map((artistID: number) => [body.eventID, artistID]);
      const insertArtistSql = `INSERT INTO Event_Artist (eventID, artistID) VALUES ?`;

      conn.query(insertArtistSql, [artistInsertValues], (insertErr) => {
        if (insertErr) {
          console.error("Error inserting event artists:", insertErr);
          return res.status(500).json({ error: "Error inserting artists." });
        }

        res.status(200).json({
          message: "Event and artists updated successfully.",
          imageUrl,
          eventID: body.eventID,
        });
      });
    } else {
      res.status(200).json({
        message: "Event updated successfully (no artists).",
        imageUrl,
        eventID: body.eventID,
      });
    }
  });
}
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Unexpected server error." });
    }
  }
);
  
  router.post(
  "/addEvent",
  fileUpload.diskLoader.single("file"),
  async (req, res): Promise<void> => {
    const body = req.body;
    console.log("📥 BODY received:", body);

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
        INSERT INTO Event (
          eventName,
          date,
          time,
          ltime,
          typeEventID,
          linkticket,
          location,
          lat,
          \`long\`,
          eventPhoto,
          userID
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const sqlParams = [
        body.eventName,
        body.date,
        body.time,
        body.ltime,
        body.typeEventID,
        body.linkticket,
        body.location,
        body.lat,
        body.long,
        imageUrl,
        body.userID
      ];

      sql = mysql.format(sql, sqlParams);

      conn.query(sql, (err, result) => {
        if (err) {
          console.error("Error inserting Event:", err);
          res.status(501).json({ error: "Error adding Event." });
          return;
        }

        
        const eventID = result.insertId;
        console.log(" Inserted Event ID:", eventID);

        let artistIDs: number[] = [];
        try {
          if (typeof body.artists === "string") {
            console.log("🎵 Raw artists string:", body.artists);
            artistIDs = JSON.parse(body.artists);
          } else if (Array.isArray(body.artists)) {
            artistIDs = body.artists;
          }
        } catch (parseErr) {
          console.error(" Error parsing artists:", parseErr);
          return res.status(400).json({ error: "Invalid artists format." });
        }

        console.log("🎵 Parsed artistIDs:", artistIDs);

        if (artistIDs.length === 0) {
          return res.status(201).json({
            message: "Event added successfully (no artists).",
            eventID,
            imageUrl,
          });
        }

        const insertArtistSql = `INSERT INTO Event_Artist (eventID, artistID) VALUES (?, ?)`;

        let successCount = 0;
        let hasError = false;

        artistIDs.forEach((artistID: number) => {
          const formattedArtistSql = mysql.format(insertArtistSql, [eventID, artistID]);
          console.log("📥 Inserting:", formattedArtistSql);

          conn.query(formattedArtistSql, (artistErr) => {
            if (artistErr) {
              console.error("Error inserting Event_Artist:", artistErr);
              if (!hasError) {
                hasError = true;
                return res.status(502).json({ error: "Error linking artists." });
              }
            } else {
              console.log(` Inserted artist ${artistID} to event ${eventID}`);
              successCount++;

              if (successCount === artistIDs.length && !hasError) {
                return res.status(201).json({
                  message: "Event and artists added successfully.",
                  eventID,
                  imageUrl,
                });
              }
            }
          });
        });
      });
    } catch (error) {
      console.error("Unexpected server error:", error);
      res.status(500).json({ error: "Unexpected server error." });
    }
  }
);

router.get('/EventAdmin', (req, res) => {
  const sql = `
    SELECT 
      E.eventID,
      E.lat,
      E.long,
      E.eventName,
      E.eventPhoto,
      E.linkticket,
      E.location,
      E.date,
      E.time,
      E.ltime,
      E.typeEventID,
      TE.typeEventName,
      A.artistID,
      COALESCE(A.artistName, '') AS artistName,
      COALESCE(A.artistPhoto, '') AS artistPhoto
    FROM 
      Event E
    LEFT JOIN 
      Event_Artist EA ON E.eventID = EA.eventID
    LEFT JOIN 
      Artist A ON EA.artistID = A.artistID
    LEFT JOIN 
      Type_Event TE ON E.typeEventID = TE.typeEventID
    ORDER BY E.date DESC
  `;

  conn.query(sql, (err: mysql.MysqlError | null, results: EventArtistRow[]) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "An error occurred", error: err });
    }

    if (results.length === 0) {
      return res.status(200).json([]);
    }

    const eventsMap = new Map<number, any>();

    results.forEach((row) => {
      if (!eventsMap.has(row.eventID)) {
        eventsMap.set(row.eventID, {
          eventID: row.eventID,
          lat: row.lat,
          long: row.long,
          eventName: row.eventName,
          eventPhoto: row.eventPhoto,
          linkticket: row.linkticket,
          location: row.location,
          date: row.date,
          time: row.time,
          ltime: row.ltime,
          typeEventID: row.typeEventID,
          typeEventName: row.typeEventName,
          artists: []
        });
      }

      if (row.artistID) {
        eventsMap.get(row.eventID).artists.push({
          artistID: row.artistID,
          artistName: row.artistName,
          artistPhoto: row.artistPhoto
        });
      }
    });

    const eventsArray = Array.from(eventsMap.values());
    return res.status(200).json(eventsArray);
  });
});
