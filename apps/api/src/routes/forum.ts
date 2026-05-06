import { Router, Request, Response } from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";

const router = Router();

const getStudentId = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string };
    return decoded.role === "student" ? decoded.id : null;
  } catch { return null; }
};

// Get all posts
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT p.*, s.name as student_name,
        (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id) as reply_count
      FROM posts p
      JOIN students s ON p.student_id = s.id
      ORDER BY p.created_at DESC
    `);
    res.json({ posts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Get single post with replies
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const postResult = await pool.query(`
      SELECT p.*, s.name as student_name
      FROM posts p JOIN students s ON p.student_id = s.id
      WHERE p.id = $1
    `, [req.params.id]);

    if (postResult.rows.length === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const repliesResult = await pool.query(`
      SELECT r.*, s.name as student_name
      FROM replies r JOIN students s ON r.student_id = s.id
      WHERE r.post_id = $1
      ORDER BY r.created_at ASC
    `, [req.params.id]);

    res.json({ post: postResult.rows[0], replies: repliesResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

// Create post
router.post("/", async (req: Request, res: Response) => {
  const studentId = getStudentId(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { title, content } = req.body;
  if (!title || !content) { res.status(400).json({ error: "Title and content required" }); return; }

  try {
    const result = await pool.query(
      "INSERT INTO posts (student_id, title, content) VALUES ($1, $2, $3) RETURNING *",
      [studentId, title, content]
    );

    // Auto-track forum post in engagement
    const student = await pool.query("SELECT enrolled_at FROM students WHERE id = $1", [studentId]);
    const week = Math.max(1, Math.ceil((Date.now() - new Date(student.rows[0].enrolled_at).getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const existing = await pool.query("SELECT id FROM engagement WHERE student_id = $1 AND week = $2", [studentId, week]);
    if (existing.rows.length > 0) {
      await pool.query("UPDATE engagement SET forum_posts = forum_posts + 1 WHERE student_id = $1 AND week = $2", [studentId, week]);
    } else {
      await pool.query("INSERT INTO engagement (student_id, week, forum_posts) VALUES ($1, $2, 1)", [studentId, week]);
    }

    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Create reply
router.post("/:id/replies", async (req: Request, res: Response) => {
  const studentId = getStudentId(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "Content required" }); return; }

  try {
    const result = await pool.query(
      "INSERT INTO replies (post_id, student_id, content) VALUES ($1, $2, $3) RETURNING *",
      [req.params.id, studentId, content]
    );

    // Auto-track forum post in engagement
    const student = await pool.query("SELECT enrolled_at FROM students WHERE id = $1", [studentId]);
    const week = Math.max(1, Math.ceil((Date.now() - new Date(student.rows[0].enrolled_at).getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const existing = await pool.query("SELECT id FROM engagement WHERE student_id = $1 AND week = $2", [studentId, week]);
    if (existing.rows.length > 0) {
      await pool.query("UPDATE engagement SET forum_posts = forum_posts + 1 WHERE student_id = $1 AND week = $2", [studentId, week]);
    } else {
      await pool.query("INSERT INTO engagement (student_id, week, forum_posts) VALUES ($1, $2, 1)", [studentId, week]);
    }

    res.status(201).json({ reply: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create reply" });
  }
});

export default router;