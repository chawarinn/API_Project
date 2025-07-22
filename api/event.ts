import { conn } from "../dbconnect"; 
import express from "express";
import mysql from "mysql";


export const router = express.Router();

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


// GET /EventH?userID=xx  -> คืน array ของ events พร้อม artists
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
