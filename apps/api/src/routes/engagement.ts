import { Router, Request, Response } from "express";
import pool from "../db.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { student_id, week, login_count, forum_posts, video_watch_minutes, assignment_submissions } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO engagement 
        (student_id, week, login_count, forum_posts, video_watch_minutes, assignment_submissions)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [student_id, week, login_count, forum_posts, video_watch_minutes, assignment_submissions]
    );
    res.status(201).json({ engagement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to log engagement" });
  }
});

export default router;