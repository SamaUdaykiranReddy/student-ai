import { Router, Request, Response } from "express";
import pool from "../db.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM students ORDER BY enrolled_at DESC"
    );
    res.json({ students: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const { name, email, cohort } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO students (name, email, cohort) VALUES ($1, $2, $3) RETURNING *",
      [name, email, cohort]
    );
    res.status(201).json({ student: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create student" });
  }
});

export default router;