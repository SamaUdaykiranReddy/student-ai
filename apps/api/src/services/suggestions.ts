import Groq from "groq-sdk";

interface ShapFactor {
  feature: string;
  impact: number;
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
  studentName: string,
  riskScore: number,
  riskLabel: string,
  topFactors: ShapFactor[]
): Promise<string> => {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const factorDescriptions = topFactors
    .map((f) => {
      const label = featureLabels[f.feature] || f.feature;
      const direction = f.impact > 0 ? "negatively impacting" : "positively impacting";
      return `${label} (${direction} risk)`;
    })
    .join(", ");

  const prompt = `You are an academic advisor assistant. A student named ${studentName} has been flagged as ${riskLabel} risk with a risk score of ${Math.round(riskScore * 100)}%.

The top factors contributing to this risk assessment are: ${factorDescriptions}.

Write a brief, practical intervention recommendation for their instructor. Be specific, empathetic, and actionable. Keep it to 2-3 sentences maximum.`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 150,
    temperature: 0.7,
  });

  return response.choices[0].message.content || 
    "Schedule an immediate academic review meeting with this student.";
};
