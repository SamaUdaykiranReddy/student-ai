import { Router, Request, Response } from "express";
import pool from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO instructors (name, email, password, role)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role`,
      [name, email, hashed, role || "instructor"]
    );
    const instructor = result.rows[0];
    const token = jwt.sign(
      { id: instructor.id, role: instructor.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );
    res.status(201).json({ instructor, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT * FROM instructors WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const instructor = result.rows[0];
    const valid = await bcrypt.compare(password, instructor.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = jwt.sign(
      { id: instructor.id, role: instructor.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );
    res.json({
      instructor: {
        id: instructor.id,
        name: instructor.name,
        email: instructor.email,
        role: instructor.role,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;