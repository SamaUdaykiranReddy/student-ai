import { Router, Request, Response } from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";

const router = Router();

const getUser = (req: Request): { id: string; role: string } | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try {
    const token = authHeader.split(" ")[1];
    return jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string };
  } catch { return null; }
};

// Get all assignments
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT a.*, i.name as instructor_name,
        (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) as submission_count
      FROM assignments a
      JOIN instructors i ON a.instructor_id = i.id
      ORDER BY a.created_at DESC
    `);
    res.json({ assignments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// Get single assignment with submissions (instructor) or student's submission
router.get("/:id", async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const assignment = await pool.query(
      "SELECT * FROM assignments WHERE id = $1",
      [req.params.id]
    );
    if (assignment.rows.length === 0) { res.status(404).json({ error: "Assignment not found" }); return; }

    if (user.role === "instructor") {
      const submissions = await pool.query(`
        SELECT s.*, st.name as student_name, st.email as student_email
        FROM submissions s
        JOIN students st ON s.student_id = st.id
        WHERE s.assignment_id = $1
        ORDER BY s.submitted_at DESC
      `, [req.params.id]);
      res.json({ assignment: assignment.rows[0], submissions: submissions.rows });
    } else {
      const submission = await pool.query(
        "SELECT * FROM submissions WHERE assignment_id = $1 AND student_id = $2",
        [req.params.id, user.id]
      );
      res.json({ assignment: assignment.rows[0], submission: submission.rows[0] || null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
});

// Create assignment (instructor only)
router.post("/", async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user || user.role !== "instructor") { res.status(401).json({ error: "Unauthorized" }); return; }

  const { title, description, due_date, max_score } = req.body;
  if (!title) { res.status(400).json({ error: "Title required" }); return; }

  try {
    const result = await pool.query(
      `INSERT INTO assignments (instructor_id, title, description, due_date, max_score)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user.id, title, description, due_date, max_score || 100]
    );
    res.status(201).json({ assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// Delete assignment (instructor only)
router.delete("/:id", async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user || user.role !== "instructor") { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    await pool.query("DELETE FROM assignments WHERE id = $1 AND instructor_id = $2", [req.params.id, user.id]);
    res.json({ message: "Assignment deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

// Submit assignment (student only)
router.post("/:id/submit", async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user || user.role !== "student") { res.status(401).json({ error: "Students only" }); return; }

  const { answer } = req.body;
  if (!answer) { res.status(400).json({ error: "Answer required" }); return; }

  try {
    // Check if already submitted
    const existing = await pool.query(
      "SELECT id FROM submissions WHERE assignment_id = $1 AND student_id = $2",
      [req.params.id, user.id]
    );
    if (existing.rows.length > 0) {
      res.status(400).json({ error: "Already submitted" });
      return;
    }

    // Get assignment max score
    const assignment = await pool.query(
      "SELECT max_score FROM assignments WHERE id = $1",
      [req.params.id]
    );
    if (assignment.rows.length === 0) { res.status(404).json({ error: "Assignment not found" }); return; }

    // Insert submission
    const result = await pool.query(
      `INSERT INTO submissions (assignment_id, student_id, answer)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, user.id, answer]
    );

    // Auto-track assignment submission in engagement
    const student = await pool.query("SELECT enrolled_at FROM students WHERE id = $1", [user.id]);
    const week = Math.max(1, Math.ceil((Date.now() - new Date(student.rows[0].enrolled_at).getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const engExisting = await pool.query("SELECT id FROM engagement WHERE student_id = $1 AND week = $2", [user.id, week]);
    if (engExisting.rows.length > 0) {
      await pool.query("UPDATE engagement SET assignment_submissions = assignment_submissions + 1 WHERE student_id = $1 AND week = $2", [user.id, week]);
    } else {
      await pool.query("INSERT INTO engagement (student_id, week, assignment_submissions) VALUES ($1, $2, 1)", [user.id, week]);
    }

    // Also save to assessments table for ML model
    await pool.query(
      "INSERT INTO assessments (student_id, week, score, submitted) VALUES ($1, $2, $3, true)",
      [user.id, week, assignment.rows[0].max_score * 0.7] // default 70% until graded
    );

    res.status(201).json({ submission: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit assignment" });
  }
});

// Grade submission (instructor only)
router.patch("/:id/submissions/:submissionId/grade", async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user || user.role !== "instructor") { res.status(401).json({ error: "Unauthorized" }); return; }

  const { score } = req.body;
  if (score === undefined) { res.status(400).json({ error: "Score required" }); return; }

  try {
    const result = await pool.query(
      "UPDATE submissions SET score = $1 WHERE id = $2 RETURNING *",
      [score, req.params.submissionId]
    );
    res.json({ submission: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to grade submission" });
  }
});

export default router;