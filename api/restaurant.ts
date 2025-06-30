import express from "express";
import { conn } from "../dbconnect";

export const router = express.Router();

// 1. ดึงร้านอาหารทั้งหมด
router.get('/Restaurant', (req, res) => {
  const sql = 'SELECT * FROM Restaurant';
  conn.query(sql, (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลร้านอาหาร' });
    }
    res.json(results);
  });
});

// 2. ค้นหาร้านอาหารด้วยชื่อ (query string)
router.get('/search/restaurant', (req, res) => {
  const searchQuery = req.query.query?.toString() || '';

  let sql = 'SELECT * FROM Restaurant';
  const params: any[] = [];

  if (searchQuery) {
    sql += ' WHERE resName LIKE ?';
    params.push(`%${searchQuery}%`);
  }

  conn.query(sql, params, (error, results) => {
    if (error) {
      console.error("Search error:", error);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาร้านอาหาร' });
    }
    res.json(results);
  });
});

// (ไม่จำเป็นต้องใช้ interface ด้านล่างหากคุณใช้ JavaScript หรือ Express ล้วนๆ)
interface Restaurant {
  resId: number;
  resName: string;
  type: number;
  resPhoto: string;
  open: number;
  close: number;
  contact: string;
  location: string;
  lat: number;
  long: number;
}

interface RestaurantWithDistance extends Restaurant {
  distance: number | null;
  eventLat?: number;
  eventLong?: number;
}

