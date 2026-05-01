import pool from "./db.js";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const students = [
  {
    name: "Emma Johnson",
    email: "emma.j@university.edu",
    cohort: "2026-spring",
    gender: "F",
  },
  {
    name: "Liam Smith",
    email: "liam.s@university.edu",
    cohort: "2026-spring",
    gender: "M",
  },
  {
    name: "Olivia Brown",
    email: "olivia.b@university.edu",
    cohort: "2026-spring",
    gender: "F",
  },
  {
    name: "Noah Davis",
    email: "noah.d@university.edu",
    cohort: "2026-spring",
    gender: "M",
  },
  {
    name: "Ava Wilson",
    email: "ava.w@university.edu",
    cohort: "2026-spring",
    gender: "F",
  },
  {
    name: "James Taylor",
    email: "james.t@university.edu",
    cohort: "2026-spring",
    gender: "M",
  },
  {
    name: "Isabella Moore",
    email: "isabella.m@university.edu",
    cohort: "2026-spring",
    gender: "F",
  },
  {
    name: "Oliver Anderson",
    email: "oliver.a@university.edu",
    cohort: "2026-spring",
    gender: "M",
  },
  {
    name: "Sophia Thomas",
    email: "sophia.t@university.edu",
    cohort: "2026-fall",
    gender: "F",
  },
  {
    name: "William Jackson",
    email: "william.j@university.edu",
    cohort: "2026-fall",
    gender: "M",
  },
  {
    name: "Mia White",
    email: "mia.w@university.edu",
    cohort: "2026-fall",
    gender: "F",
  },
  {
    name: "Benjamin Harris",
    email: "ben.h@university.edu",
    cohort: "2026-fall",
    gender: "M",
  },
  {
    name: "Charlotte Martin",
    email: "charlotte.m@university.edu",
    cohort: "2026-fall",
    gender: "F",
  },
  {
    name: "Elijah Garcia",
    email: "elijah.g@university.edu",
    cohort: "2026-fall",
    gender: "M",
  },
  {
    name: "Amelia Martinez",
    email: "amelia.m@university.edu",
    cohort: "2026-fall",
    gender: "F",
  },
  {
    name: "Lucas Robinson",
    email: "lucas.r@university.edu",
    cohort: "2025-fall",
    gender: "M",
  },
  {
    name: "Harper Clark",
    email: "harper.c@university.edu",
    cohort: "2025-fall",
    gender: "F",
  },
  {
    name: "Mason Rodriguez",
    email: "mason.r@university.edu",
    cohort: "2025-fall",
    gender: "M",
  },
  {
    name: "Evelyn Lewis",
    email: "evelyn.l@university.edu",
    cohort: "2025-fall",
    gender: "F",
  },
  {
    name: "Logan Lee",
    email: "logan.l@university.edu",
    cohort: "2025-fall",
    gender: "M",
  },
];

const riskProfiles = [
  // High risk — very low engagement
  {
    logins: [1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    scores: [32, 28, 25],
    submitted: [false, false, false],
  },
  // High risk — declining engagement
  {
    logins: [4, 3, 2, 1, 1, 0, 1, 0, 0, 1],
    scores: [45, 38, 32],
    submitted: [true, false, false],
  },
  // Medium-high risk
  {
    logins: [5, 4, 3, 3, 2, 2, 1, 2, 1, 1],
    scores: [55, 48, 52],
    submitted: [true, true, false],
  },
  // Medium risk
  {
    logins: [4, 5, 4, 3, 4, 3, 4, 3, 4, 3],
    scores: [62, 58, 65],
    submitted: [true, true, true],
  },
  // Medium-low risk
  {
    logins: [5, 6, 5, 6, 5, 6, 5, 5, 6, 5],
    scores: [70, 68, 72],
    submitted: [true, true, true],
  },
  // Low risk — good engagement
  {
    logins: [7, 7, 8, 7, 8, 7, 8, 7, 8, 7],
    scores: [82, 85, 80],
    submitted: [true, true, true],
  },
  // Low risk — excellent
  {
    logins: [9, 8, 9, 10, 9, 8, 9, 10, 9, 8],
    scores: [92, 95, 97],
    submitted: [true, true, true],
  },
  // Very low risk
  {
    logins: [8, 9, 8, 9, 8, 9, 8, 9, 8, 9],
    scores: [88, 90, 92],
    submitted: [true, true, true],
  },
];
const seed = async () => {
  console.log("🌱 Seeding database...");

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const profile = riskProfiles[i % riskProfiles.length];

    const existing = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [s.email],
    );

    let studentId: string;

    if (existing.rows.length > 0) {
      studentId = existing.rows[0].id;
      console.log(`⏭️  Skipping ${s.name} (already exists)`);
    } else {
      const result = await pool.query(
        `INSERT INTO students (name, email, cohort, gender, disability)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [s.name, s.email, s.cohort, s.gender, "N"],
      );
      studentId = result.rows[0].id;
      console.log(`✅ Created ${s.name}`);
    }

    const engCount = await pool.query(
      "SELECT COUNT(*) FROM engagement WHERE student_id = $1",
      [studentId],
    );

    if (parseInt(engCount.rows[0].count) === 0) {
      for (let week = 1; week <= 10; week++) {
        const logins = profile.logins[week - 1];
        await pool.query(
          `INSERT INTO engagement (student_id, week, login_count, forum_posts, video_watch_minutes, assignment_submissions)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            studentId,
            week,
            logins,
            Math.floor(logins * 0.3),
            logins * 8,
            logins > 0 ? 1 : 0,
          ],
        );
      }
    }

    const asmCount = await pool.query(
      "SELECT COUNT(*) FROM assessments WHERE student_id = $1",
      [studentId],
    );

    if (parseInt(asmCount.rows[0].count) === 0) {
      const weeks = [3, 6, 9];
      for (let j = 0; j < weeks.length; j++) {
        await pool.query(
          `INSERT INTO assessments (student_id, week, score, submitted)
           VALUES ($1, $2, $3, $4)`,
          [studentId, weeks[j], profile.scores[j], profile.submitted[j]],
        );
      }
    }
  }

  console.log("✅ Seeding complete!");
  await pool.end();
};

seed().catch(console.error);
