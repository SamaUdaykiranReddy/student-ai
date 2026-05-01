import Groq from "groq-sdk";

interface ShapFactor {
  feature: string;
  impact: number;
}

interface StudentContext {
  name: string;
  cohort: string;
  riskScore: number;
  riskLabel: string;
  topFactors: ShapFactor[];
  avgScore: number;
  missedAssignments: number;
  avgLogins: number;
  weekNumber: number;
}

const featureLabels: Record<string, string> = {
  avg_logins: "average weekly logins",
  avg_forum_posts: "forum participation",
  avg_video_minutes: "video watch time",
  avg_submissions: "assignment submissions",
  total_logins: "total platform logins",
  login_trend: "login frequency trend",
  avg_score: "average assessment score",
  min_score: "lowest assessment score",
  missed_assignments: "missed assignments",
  submission_rate: "assignment submission rate",
};

export const generateSuggestion = async (
  context: StudentContext
): Promise<string> => {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const factorDescriptions = context.topFactors
    .map((f) => {
      const label = featureLabels[f.feature] || f.feature;
      const direction =
        f.impact > 0 ? "increasing risk" : "reducing risk";
      return `${label} (${direction}, impact: ${Math.abs(f.impact).toFixed(2)})`;
    })
    .join("\n- ");

  const urgency =
    context.riskScore >= 0.9
      ? "URGENT"
      : context.riskScore >= 0.7
        ? "HIGH PRIORITY"
        : "MODERATE";

  const prompt = `You are an experienced academic advisor helping university instructors support at-risk students.

STUDENT PROFILE:
- Name: ${context.name}
- Cohort: ${context.cohort}
- Current Week: Week ${context.weekNumber} of the course
- Risk Score: ${Math.round(context.riskScore * 100)}% (${context.riskLabel.toUpperCase()} risk)
- Priority Level: ${urgency}

ACADEMIC PERFORMANCE:
- Average Assessment Score: ${context.avgScore.toFixed(1)}%
- Missed Assignments: ${context.missedAssignments}
- Average Weekly Logins: ${context.avgLogins.toFixed(1)}

TOP RISK FACTORS:
- ${factorDescriptions}

Based on this data, write a personalized intervention recommendation for the instructor. 
Your response should:
1. Acknowledge the specific warning signs
2. Suggest 2-3 concrete actions the instructor can take THIS WEEK
3. Be empathetic and solution-focused
4. Be 3-4 sentences maximum

Do not use bullet points. Write in a natural, professional tone.`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are an academic advisor assistant. You provide concise, actionable intervention recommendations for university instructors. Always be specific, empathetic, and practical.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  return (
    response.choices[0].message.content ||
    "Schedule an immediate academic review meeting with this student."
  );
};