import { Router, Request, Response } from "express";
import pool from "../db.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const instructorId = req.instructor?.id;
    const result = await pool.query(
      "SELECT * FROM students WHERE instructor_id = $1 ORDER BY enrolled_at DESC",
      [instructorId]
    );
    res.json({ students: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { name, email, cohort } = req.body;
  const instructorId = req.instructor?.id;
  try {
    const result = await pool.query(
      "INSERT INTO students (name, email, cohort, instructor_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, email, cohort, instructorId]
    );
    res.status(201).json({ student: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create student" });
  }
});

export default router;