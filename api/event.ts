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
