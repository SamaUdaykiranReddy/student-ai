import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "./db";
import studentRoutes from "./routes/students.js";
dotenv.config({ path: "../../.env" });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/students", studentRoutes);
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Student AI API is running",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});

export default app;