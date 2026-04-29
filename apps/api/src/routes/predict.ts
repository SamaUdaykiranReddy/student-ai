import { Router, Request, Response } from "express";
import pool from "../db.js";

const router = Router();

router.post("/:studentId", async (req: Request, res: Response) => {
  const { studentId } = req.params;

  try {
    const engResult = await pool.query(
      `SELECT 
        AVG(login_count) as avg_logins,
        AVG(forum_posts) as avg_forum_posts,
        AVG(video_watch_minutes) as avg_video_minutes,
        AVG(assignment_submissions) as avg_submissions,
        SUM(login_count) as total_logins,
        MAX(login_count) - MIN(login_count) as login_trend
       FROM engagement WHERE student_id = $1`,
      [studentId]
    );

    const asmResult = await pool.query(
      `SELECT 
        AVG(score) as avg_score,
        MIN(score) as min_score,
        COUNT(*) FILTER (WHERE submitted = false) as missed_assignments,
        AVG(CASE WHEN submitted THEN 1 ELSE 0 END) as submission_rate
       FROM assessments WHERE student_id = $1`,
      [studentId]
    );

    const studentResult = await pool.query(
      `SELECT gender, disability FROM students WHERE id = $1`,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const eng = engResult.rows[0];
    const asm = asmResult.rows[0];
    const student = studentResult.rows[0];

    const features = {
      avg_logins: parseFloat(eng.avg_logins) || 0,
      avg_forum_posts: parseFloat(eng.avg_forum_posts) || 0,
      avg_video_minutes: parseFloat(eng.avg_video_minutes) || 0,
      avg_submissions: parseFloat(eng.avg_submissions) || 0,
      total_logins: parseFloat(eng.total_logins) || 0,
      login_trend: parseFloat(eng.login_trend) || 0,
      avg_score: parseFloat(asm.avg_score) || 0,
      min_score: parseFloat(asm.min_score) || 0,
      missed_assignments: parseInt(asm.missed_assignments) || 0,
      submission_rate: parseFloat(asm.submission_rate) || 0,
      gender_enc: student.gender === "M" ? 1 : 0,
      disability_enc: student.disability === "Y" ? 1 : 0,
      age_enc: 0,
      edu_enc: 0,
    };

    const mlResponse = await fetch(
      `${process.env.ML_SERVICE_URL}/predict`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
      }
    );

    const prediction = await mlResponse.json() as {
      risk_score: number;
      risk_label: string;
      at_risk: boolean;
      top_factors: Array<{ feature: string; impact: number }>;
    };

    await pool.query(
      `INSERT INTO risk_scores 
        (student_id, week, risk_score, risk_label, shap_factors)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        studentId,
        1,
        prediction.risk_score,
        prediction.risk_label,
        JSON.stringify(prediction.top_factors),
      ]
    );

    res.json({
      student_id: studentId,
      ...prediction,
    });

  } catch (err) {
    console.error("Prediction error:", err);
    res.status(500).json({ error: "Prediction failed", details: String(err) });
  }
});

export default router;