import pool from "./db.js";

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      cohort VARCHAR(50) NOT NULL,
      enrolled_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      week INT NOT NULL,
      score FLOAT NOT NULL,
      submitted_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS engagement (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      week INT NOT NULL,
      login_count INT DEFAULT 0,
      forum_posts INT DEFAULT 0,
      video_watch_minutes INT DEFAULT 0,
      assignment_submissions INT DEFAULT 0,
      recorded_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS risk_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      week INT NOT NULL,
      risk_score FLOAT NOT NULL,
      risk_label VARCHAR(20) NOT NULL,
      shap_factors JSONB,
      predicted_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("✅ Database tables created");
  await pool.end();
};

createTables().catch(console.error);