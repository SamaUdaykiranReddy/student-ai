import { Router, Request, Response } from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import { sendAtRiskAlert, sendDriftAlert } from "../lib/email.js";

const router = Router();

const getUser = (req: Request): { id: string; role: string } | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try {
    const token = authHeader.split(" ")[1];
    return jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      role: string;
    };
  } catch {
    return null;
  }
};

// Get all alerts (instructor)
router.get("/", async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user || user.role !== "instructor") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const result = await pool.query(`
      SELECT a.*, s.name as student_name, s.email as student_email
      FROM alerts a
      JOIN students s ON a.student_id = s.id
      ORDER BY a.created_at DESC
      LIMIT 50
    `);
    res.json({ alerts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// Get student's own study plan
router.get("/my-plan", async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user || user.role !== "student") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const result = await pool.query(
      `
      SELECT * FROM alerts
      WHERE student_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [user.id],
    );
    res.json({ alert: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch study plan" });
  }
});

// Mark alert as read
router.patch("/:id/read", async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    await pool.query("UPDATE alerts SET is_read = true WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ message: "Alert marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update alert" });
  }
});
// Called by ML service when creating alerts
router.post("/", async (req: Request, res: Response) => {
  const { student_id, alert_type, message, study_plan, student_name } =
    req.body;

  try {
    const result = await pool.query(
      `
      INSERT INTO alerts (student_id, alert_type, message, study_plan)
      VALUES ($1, $2, $3, $4) RETURNING *
    `,
      [student_id, alert_type, message, study_plan],
    );

    // Send email notification
    if (alert_type !== "model_drift") {
      await sendAtRiskAlert(
        student_name || "Unknown Student",
        message,
        study_plan || "Please check the dashboard for details.",
      );
    }

    res.status(201).json({ alert: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create alert" });
  }
});

export default router;
