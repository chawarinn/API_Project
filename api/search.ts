import { conn } from "../dbconnect"; 
import express from "express";

export const router = express.Router();

router.get('/hotel', async (req, res) => {
    try {
        const hotel = 'SELECT * FROM Hotel';
        const hotelResults = await new Promise((resolve, reject) => {
            conn.query(hotel, (error, results) => {
                if (error) {
                    reject(error);  
                } else {
                    res.json(results);  
                }
            });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching hotels' });
    }
});

interface Hotel {
    hotelName: string;
    hotelName2: string;
    hotelPhoto: string;
    startingPrice: number;
    location: string;
    phone: string;
    contact: string;
    lat: number;
    long: number;
  }
  
  interface Event {
    location: string;
    lat: number;
    long: number;
  }
  interface HotelWithDistance extends Hotel {
    distance: number | null; 
    eventLat?: number; 
    eventLong?: number;
}
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;  
}


router.get('/search/hotel', (req, res) => {
    const searchQuery = req.query.query || '';  
    const maxDistance = 20;  
    
    let hotelQuery = '';

     if (!searchQuery) {
        const hotelQuery = 'SELECT * FROM Hotel';
        const hotelResults =  new Promise<any[]>((resolve, reject) => {
            conn.query(hotelQuery, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
        res.json({ hotels: hotelResults });
    }

    if (searchQuery) {
        hotelQuery = `
        SELECT * FROM Hotel
                WHERE hotelName LIKE ? OR hotelName2 LIKE ?
        `;
        conn.query(hotelQuery, [`%${searchQuery}%`, `%${searchQuery}%`], (error, results: (Hotel)[]) => {
            if (error) {
                return res.status(500).json({ error: 'Database query error' });
            }

            if (results.length > 0) {
                results.forEach(result => {
                    const hotelWithDistance: HotelWithDistance = result as HotelWithDistance;
                        hotelWithDistance.distance = null;  
                });

                return res.json(results);
            }

            hotelQuery = `
                SELECT 
                H.*,
                E.lat AS eventLat,
                E.long AS eventLong,
                (6371 * 
                    ACOS(
                        COS(RADIANS(E.lat)) * COS(RADIANS(H.lat)) * 
                        COS(RADIANS(H.long) - RADIANS(E.long)) + 
                        SIN(RADIANS(E.lat)) * SIN(RADIANS(H.lat))
                    )
                ) AS distance
            FROM Hotel H
            CROSS JOIN Event E
            WHERE 
                H.hotelName LIKE ? 
                OR E.location LIKE ? 
            HAVING distance <= ?
            ORDER BY distance ASC;
            `;
            conn.query(hotelQuery, [`%${searchQuery}%`, `%${searchQuery}%`, maxDistance], (error, results: (Hotel & { eventLat: number, eventLong: number, distance: number })[]) => {
                if (error) {
                    return res.status(500).json({ error: 'Database query error' });
                }

                if (results.length > 0) {
                    results.forEach(result => {
                        if (result.distance) {
                            result.distance = parseFloat(result.distance.toFixed(4));  // Round to 4 decimal places
                        }
                    });
                    

                    return res.json(results);
                } else {
                    return res.status(404).json({ error: 'No hotels found' });
                }
            });
        });
    } else {
        res.status(400).json({ error: 'Missing search query' });
    }
});
