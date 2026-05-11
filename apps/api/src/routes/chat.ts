import { Router, Request, Response } from "express";
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

router.post("/", async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { question, risk_score, avg_score, missed_assignments } = req.body;
  if (!question) { res.status(400).json({ error: "Question required" }); return; }

  try {
    const mlRes = await fetch(`${process.env.ML_SERVICE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        student_id: user.id,
        risk_score: risk_score || 0,
        avg_score: avg_score || 0,
        missed_assignments: missed_assignments || 0,
      }),
    });
    const data = await mlRes.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat service unavailable" });
  }
});
// Instructor agent query
router.post("/agent", async (req: Request, res: Response) => {
  const user = getUser(req);
  if (!user || user.role !== "instructor") { res.status(401).json({ error: "Unauthorized" }); return; }

  const { query } = req.body;

  try {
    const mlRes = await fetch(`${process.env.ML_SERVICE_URL}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query || "" }),
    });
    const data = await mlRes.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Agent service unavailable" });
  }
});

export default router;