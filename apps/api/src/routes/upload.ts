import { Router, Request, Response } from "express";
import multer from "multer";
import { parse } from "csv-parse";
import pool from "../db.js";

const router = Router();
 const upload = multer({ storage: multer.memoryStorage() });

router.post("/csv", upload.any(), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  
  console.log("Files received:", files?.length);
  console.log("File fields:", files?.map(f => f.fieldname));
  
  if (!files || files.length === 0) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const file = files[0];

  try {
    const records: any[] = await new Promise((resolve, reject) => {
      parse(file.buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

      let studentsCreated = 0;
      let engagementLogged = 0;
      let assessmentsLogged = 0;
      const errors: string[] = [];

      for (const row of records) {
        try {
          const email = row.email?.trim();
          const name = row.name?.trim();
          const cohort = row.cohort?.trim() || "unknown";
          const gender = row.gender?.trim() || "M";
          const week = parseInt(row.week) || 1;
          const loginCount = parseInt(row.login_count) || 0;
          const forumPosts = parseInt(row.forum_posts) || 0;
          const videoMinutes = parseInt(row.video_watch_minutes) || 0;
          const submissions = parseInt(row.assignment_submissions) || 0;
          const score = row.score ? parseFloat(row.score) : null;
          const submitted = row.submitted === "true" || row.submitted === "1";

          if (!email || !name) {
            errors.push(`Row missing name or email: ${JSON.stringify(row)}`);
            continue;
          }

          let studentId: string;
          const existing = await pool.query(
            "SELECT id FROM students WHERE email = $1",
            [email],
          );

          if (existing.rows.length > 0) {
            studentId = existing.rows[0].id;
          } else {
            const result = await pool.query(
              `INSERT INTO students (name, email, cohort, gender, disability)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
              [name, email, cohort, gender, "N"],
            );
            studentId = result.rows[0].id;
            studentsCreated++;
          }

          const engExists = await pool.query(
            "SELECT id FROM engagement WHERE student_id = $1 AND week = $2",
            [studentId, week],
          );

          if (engExists.rows.length === 0) {
            await pool.query(
              `INSERT INTO engagement 
              (student_id, week, login_count, forum_posts, video_watch_minutes, assignment_submissions)
             VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                studentId,
                week,
                loginCount,
                forumPosts,
                videoMinutes,
                submissions,
              ],
            );
            engagementLogged++;
          }

          if (score !== null) {
            const asmExists = await pool.query(
              "SELECT id FROM assessments WHERE student_id = $1 AND week = $2",
              [studentId, week],
            );

            if (asmExists.rows.length === 0) {
              await pool.query(
                `INSERT INTO assessments (student_id, week, score, submitted)
               VALUES ($1, $2, $3, $4)`,
                [studentId, week, score, submitted],
              );
              assessmentsLogged++;
            }
          }
        } catch (rowErr) {
          errors.push(`Error processing row: ${String(rowErr)}`);
        }
      }

      res.json({
        success: true,
        summary: {
          total_rows: records.length,
          students_created: studentsCreated,
          engagement_logged: engagementLogged,
          assessments_logged: assessmentsLogged,
          errors: errors.length,
        },
        errors: errors.slice(0, 10),
      });
    } catch (err) {
      console.error("CSV upload error:", err);
      res
        .status(500)
        .json({ error: "Failed to process CSV", details: String(err) });
    }
  },
);

export default router;
