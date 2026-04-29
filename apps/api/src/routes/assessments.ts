import { Router, Request, Response } from "express";
import pool from "../db.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { student_id, week, score, submitted } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO assessments (student_id, week, score, submitted)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, week, score, submitted]
    );
    res.status(201).json({ assessment: result.rows[0] });
  } catch (err) {
    console.error("Assessment error:", err);
    res.status(500).json({ error: "Failed to log assessment", details: String(err) });
  }
});

export default router;