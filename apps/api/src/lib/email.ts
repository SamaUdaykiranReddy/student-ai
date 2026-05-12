import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

const FROM_EMAIL = "noreply@student-ai.com";
const INSTRUCTOR_EMAIL = process.env.INSTRUCTOR_EMAIL || "";
export async function sendAlertEmail(
  subject: string,
  body: string,
  toEmail?: string,
): Promise<void> {
  const recipient = toEmail || INSTRUCTOR_EMAIL;

  if (!recipient || !process.env.SENDGRID_API_KEY) {
    console.log("Email not configured, skipping:", subject);
    return;
  }

  try {
    await sgMail.send({
      to: recipient,
      from: FROM_EMAIL,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">🎓 Student AI Alert</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
            ${body}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated alert from Student AI Early Warning System.<br>
              Visit your dashboard at http://54.86.60.216:3001
            </p>
          </div>
        </div>
      `,
    });
    console.log(`Email sent to ${recipient}: ${subject}`);
  } catch (err) {
    console.error("Email error:", err);
  }
}

export async function sendAtRiskAlert(
  studentName: string,
  issues: string,
  studyPlan: string,
): Promise<void> {
  const subject = `⚠️ At-Risk Student Alert: ${studentName}`;
  const body = `
    <h2 style="color: #dc2626;">Student Needs Attention</h2>
    <p><strong>Student:</strong> ${studentName}</p>
    <p><strong>Issues Detected:</strong> ${issues}</p>
    <h3 style="color: #1e40af;">AI Generated Study Plan:</h3>
    <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #1e40af;">
      ${studyPlan.replace(/\n/g, "<br>")}
    </div>
    <br>
    <a href="http://54.86.60.216:3001" style="background: #1e40af; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
      View Dashboard
    </a>
  `;
  await sendAlertEmail(subject, body);
}

export async function sendDriftAlert(
  currentAuc: number,
  baselineAuc: number,
  driftPct: number,
): Promise<void> {
  const subject = `🔴 Model Drift Detected - Action Required`;
  const body = `
    <h2 style="color: #dc2626;">Model Performance Alert</h2>
    <p>The ML model's accuracy has dropped significantly:</p>
    <table style="border-collapse: collapse; width: 100%;">
      <tr>
        <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Baseline AUC</strong></td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${baselineAuc.toFixed(4)}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Current AUC</strong></td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; color: #dc2626;">${currentAuc.toFixed(4)}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Performance Drop</strong></td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; color: #dc2626;">${driftPct.toFixed(1)}%</td>
      </tr>
    </table>
    <br>
    <p><strong>Recommended Actions:</strong></p>
    <ol>
      <li>Collect more student data</li>
      <li>Review feature engineering</li>
      <li>Trigger manual retraining</li>
    </ol>
  `;
  await sendAlertEmail(subject, body);
}

export async function sendSentimentAlert(
  studentName: string,
  postTitle: string,
  instructorEmail?: string,
): Promise<void> {
  const toEmail = instructorEmail || INSTRUCTOR_EMAIL;

  if (!toEmail || !process.env.SENDGRID_API_KEY) {
    console.log("Email not configured, skipping:", studentName);
    return;
  }

  const subject = `😟 Distressed Student Detected: ${studentName}`;
  const body = `
    <h2 style="color: #dc2626;">Student Wellbeing Alert</h2>
    <p>A student has posted content that may indicate distress:</p>
    <p><strong>Student:</strong> ${studentName}</p>
    <p><strong>Post Title:</strong> "${postTitle}"</p>
    <p style="color: #dc2626;"><strong>Action Required:</strong> Please reach out to this student as soon as possible.</p>
    <br>
    <a href="http://54.86.60.216:3001" style="background: #dc2626; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
      View Student Dashboard
    </a>
  `;
  await sendAlertEmail(subject, body, toEmail);
}
