import { Router, Request, Response } from "express";
import pool from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();
// Student Login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM students WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const student = result.rows[0];

    if (!student.password_hash) {
      res.status(401).json({ error: "Account not activated yet" });
      return;
    }

    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Auto-track login
    const enrolledAt = new Date(student.enrolled_at);
    const currentWeek = Math.max(
      1,
      Math.ceil(
        (Date.now() - enrolledAt.getTime()) / (7 * 24 * 60 * 60 * 1000),
      ),
    );

    const existing = await pool.query(
      "SELECT id FROM engagement WHERE student_id = $1 AND week = $2",
      [student.id, currentWeek],
    );

    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE engagement SET login_count = login_count + 1 WHERE student_id = $1 AND week = $2",
        [student.id, currentWeek],
      );
    } else {
      await pool.query(
        "INSERT INTO engagement (student_id, week, login_count) VALUES ($1, $2, 1)",
        [student.id, currentWeek],
      );
    }

    const token = jwt.sign(
      { id: student.id, role: "student" },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        cohort: student.cohort,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Get Student Dashboard Data
router.get("/me", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (decoded.role !== "student") {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const studentId = decoded.id;

    // Get student profile
    const studentResult = await pool.query(
      "SELECT id, name, email, cohort, enrolled_at FROM students WHERE id = $1",
      [studentId],
    );

    // Get latest risk score
    const riskResult = await pool.query(
      "SELECT * FROM risk_scores WHERE student_id = $1 ORDER BY predicted_at DESC LIMIT 1",
      [studentId],
    );

    // Get engagement stats
    const engagementResult = await pool.query(
      "SELECT * FROM engagement WHERE student_id = $1 ORDER BY recorded_at DESC LIMIT 1",
      [studentId],
    );

    // Get assessments
    const assessmentResult = await pool.query(
      "SELECT * FROM assessments WHERE student_id = $1 ORDER BY submitted_at DESC",
      [studentId],
    );

    res.json({
      student: studentResult.rows[0],
      riskScore: riskResult.rows[0] || null,
      engagement: engagementResult.rows[0] || null,
      assessments: assessmentResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch student data" });
  }
});

// Set/Reset Student Password (called by instructor)
router.post("/set-password", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "UPDATE students SET password_hash = $1 WHERE email = $2 RETURNING id, name, email",
      [hashed, email],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.json({ message: "Password set successfully", student: result.rows[0] });
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Failed to set password" });
  }
});
// Log forum post
router.post("/activity/forum", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "No token" });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };
    const week = Math.max(
      1,
      Math.ceil(
        (Date.now() -
          new Date(
            (
              await pool.query(
                "SELECT enrolled_at FROM students WHERE id = $1",
                [decoded.id],
              )
            ).rows[0].enrolled_at,
          ).getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ),
    );
    const existing = await pool.query(
      "SELECT id FROM engagement WHERE student_id = $1 AND week = $2",
      [decoded.id, week],
    );
    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE engagement SET forum_posts = forum_posts + 1 WHERE student_id = $1 AND week = $2",
        [decoded.id, week],
      );
    } else {
      await pool.query(
        "INSERT INTO engagement (student_id, week, forum_posts) VALUES ($1, $2, 1)",
        [decoded.id, week],
      );
    }
    res.json({ message: "Forum post logged" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// Log video watch
router.post("/activity/video", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "No token" });
    return;
  }
  const token = authHeader.split(" ")[1];
  const { minutes } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };
    const week = Math.max(
      1,
      Math.ceil(
        (Date.now() -
          new Date(
            (
              await pool.query(
                "SELECT enrolled_at FROM students WHERE id = $1",
                [decoded.id],
              )
            ).rows[0].enrolled_at,
          ).getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ),
    );
    const existing = await pool.query(
      "SELECT id FROM engagement WHERE student_id = $1 AND week = $2",
      [decoded.id, week],
    );
    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE engagement SET video_watch_minutes = video_watch_minutes + $1 WHERE student_id = $2 AND week = $3",
        [minutes, decoded.id, week],
      );
    } else {
      await pool.query(
        "INSERT INTO engagement (student_id, week, video_watch_minutes) VALUES ($1, $2, $3)",
        [decoded.id, week, minutes],
      );
    }
    res.json({ message: "Video watch logged" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// Submit assignment
router.post("/activity/assignment", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "No token" });
    return;
  }
  const token = authHeader.split(" ")[1];
  const { score } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };
    const week = Math.max(
      1,
      Math.ceil(
        (Date.now() -
          new Date(
            (
              await pool.query(
                "SELECT enrolled_at FROM students WHERE id = $1",
                [decoded.id],
              )
            ).rows[0].enrolled_at,
          ).getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ),
    );
    // Add to assessments
    await pool.query(
      "INSERT INTO assessments (student_id, week, score, submitted) VALUES ($1, $2, $3, true)",
      [decoded.id, week, score],
    );
    // Update engagement
    const existing = await pool.query(
      "SELECT id FROM engagement WHERE student_id = $1 AND week = $2",
      [decoded.id, week],
    );
    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE engagement SET assignment_submissions = assignment_submissions + 1 WHERE student_id = $1 AND week = $2",
        [decoded.id, week],
      );
    } else {
      await pool.query(
        "INSERT INTO engagement (student_id, week, assignment_submissions) VALUES ($1, $2, 1)",
        [decoded.id, week],
      );
    }
    res.json({ message: "Assignment submitted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});
export default router;
