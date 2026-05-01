import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "./db";
import studentRoutes from "./routes/students.js";
import predictRoutes from "./routes/predict.js";
import engagementRoutes from "./routes/engagement.js";
import assessmentRoutes from "./routes/assessments.js";
import authRoutes from "./routes/auth.js";
import "./cache";
 

dotenv.config({ path: "../../.env" });

const app = express();
const PORT = process.env.PORT || 5010;

app.use(cors());
app.use(express.json());
app.post("/api/engagement-test", async (req, res) => {
  res.json({ received: req.body });
});
app.use("/api/students", studentRoutes);
app.use("/api/predict", predictRoutes);
app.use("/api/engagement", engagementRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/auth", authRoutes);
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Student AI API is running",
    timestamp: new Date().toISOString(),
  });
});

console.log(
  "Routes registered: /api/students, /api/predict, /api/engagement, /api/assessments",
);
console.log(
  "Routes registered: /api/students, /api/predict, /api/engagement, /api/assessments, /api/auth",
);
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});

export default app;
