import { Router, Request, Response } from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import multer from "multer";
import { uploadToS3 } from "../lib/s3.js";
const router = Router();

const getInstructorId = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      role: string;
    };
    return decoded.role === "instructor" ? decoded.id : null;
  } catch {
    return null;
  }
};

// Get all videos (students and instructors)
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT v.*, i.name as instructor_name
      FROM videos v
      JOIN instructors i ON v.instructor_id = i.id
      ORDER BY v.created_at DESC
    `);
    res.json({ videos: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

// Add video (instructor only)
router.post("/", async (req: Request, res: Response) => {
  const instructorId = getInstructorId(req);
  if (!instructorId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { title, description, url, duration_minutes } = req.body;
  if (!title || !url) {
    res.status(400).json({ error: "Title and URL required" });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO videos (instructor_id, title, description, url, duration_minutes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [instructorId, title, description, url, duration_minutes || 0],
    );
    res.status(201).json({ video: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add video" });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

// Upload video file (instructor only)
router.post(
  "/upload",
  upload.single("video"),
  async (req: Request, res: Response) => {
    const instructorId = getInstructorId(req);
    if (!instructorId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { title, description, duration_minutes } = req.body;
    if (!title || !req.file) {
      res.status(400).json({ error: "Title and video file required" });
      return;
    }

    try {
      const key = `videos/${Date.now()}-${req.file.originalname.replace(/\s/g, "-")}`;
      const url = await uploadToS3(key, req.file.buffer, req.file.mimetype);

      const result = await pool.query(
        `INSERT INTO videos (instructor_id, title, description, url, duration_minutes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [instructorId, title, description, url, duration_minutes || 0],
      );
      res.status(201).json({ video: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to upload video" });
    }
  },
);
// Delete video (instructor only)
router.delete("/:id", async (req: Request, res: Response) => {
  const instructorId = getInstructorId(req);
  if (!instructorId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    await pool.query(
      "DELETE FROM videos WHERE id = $1 AND instructor_id = $2",
      [req.params.id, instructorId],
    );
    res.json({ message: "Video deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete video" });
  }
});

// Mark video as watched (student)
router.post("/:id/watch", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      role: string;
    };
    if (decoded.role !== "student") {
      res.status(403).json({ error: "Students only" });
      return;
    }

    const studentId = decoded.id;

    // Get video duration
    const videoResult = await pool.query(
      "SELECT duration_minutes FROM videos WHERE id = $1",
      [req.params.id],
    );
    if (videoResult.rows.length === 0) {
      res.status(404).json({ error: "Video not found" });
      return;
    }
    const minutes = videoResult.rows[0].duration_minutes || 1;

    // Auto-track video watch in engagement
    const student = await pool.query(
      "SELECT enrolled_at FROM students WHERE id = $1",
      [studentId],
    );
    const week = Math.max(
      1,
      Math.ceil(
        (Date.now() - new Date(student.rows[0].enrolled_at).getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ),
    );

    const existing = await pool.query(
      "SELECT id FROM engagement WHERE student_id = $1 AND week = $2",
      [studentId, week],
    );
    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE engagement SET video_watch_minutes = video_watch_minutes + $1 WHERE student_id = $2 AND week = $3",
        [minutes, studentId, week],
      );
    } else {
      await pool.query(
        "INSERT INTO engagement (student_id, week, video_watch_minutes) VALUES ($1, $2, $3)",
        [studentId, week, minutes],
      );
    }

    res.json({ message: "Video watched logged", minutes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to log watch" });
  }
});

export default router;
