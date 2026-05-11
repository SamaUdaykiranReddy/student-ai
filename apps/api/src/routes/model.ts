import { Router, Request, Response } from "express";

const router = Router();

router.get("/drift", async (req: Request, res: Response) => {
  try {
    const mlRes = await fetch(`${process.env.ML_SERVICE_URL}/drift`);
    const data = await mlRes.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch model metrics" });
  }
});

router.post("/retrain", async (req: Request, res: Response) => {
  try {
    const mlRes = await fetch(`${process.env.ML_SERVICE_URL}/retrain`, {
      method: "POST",
    });
    const data = await mlRes.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to trigger retraining" });
  }
});

export default router;
