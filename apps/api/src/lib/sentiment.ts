const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://ml:8000";

export async function analyzeSentiment(
  text: string,
): Promise<{ sentiment: string; score: number }> {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: `Analyze the sentiment of this student forum post. 
Return ONLY a JSON object with two fields:
- sentiment: one of "positive", "neutral", "frustrated", "confused", "distressed"
- score: a float between 0 and 1 (1 = most negative/concerning)

Examples:
- "I love this course!" -> {"sentiment": "positive", "score": 0.1}
- "I don't understand anything" -> {"sentiment": "confused", "score": 0.7}
- "This is too hard, I want to give up" -> {"sentiment": "distressed", "score": 0.9}
Return only the JSON, no other text.`,
            },
            {
              role: "user",
              content: text,
            },
          ],
          max_tokens: 50,
        }),
      },
    );

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    const parsed = JSON.parse(content);
    return {
      sentiment: parsed.sentiment || "neutral",
      score: parsed.score || 0.5,
    };
  } catch (err) {
    console.error("Sentiment analysis error:", err);
    return { sentiment: "neutral", score: 0.5 };
  }
}
