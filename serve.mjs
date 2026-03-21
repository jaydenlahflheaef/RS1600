import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
};

const SYSTEM_PROMPT = `You are a friendly and knowledgeable assistant for ReadySet1600, a premier SAT, SHSAT, ACT, and AMC tutoring service based in New York City. Your job is to answer questions from prospective students and parents about our services, pricing, tutors, and process.

ABOUT READYSET1600:
- Expert tutoring for SAT, SHSAT, ACT, and AMC (8/10/12)
- Based in NYC — sessions available in-person (NYC area) and online via Zoom with interactive whiteboard
- All tutors are Stuyvesant High School students who scored in the 99th percentile

OUR TUTORS:
- Jayden Kim (Co-Founder): Physics Event Leader of Stuyvesant Science Olympiad, ARISTA member, 1-on-1 tutoring experience
- Daniel Li (Co-Founder): Varsity fencer, math & biology focus
- Ethan Zhang: VP of Stuyvesant Study Society, coordinated 90+ tutors for 150+ students, 100+ hours of 1-on-1 tutoring
- Tae Kim: Competition math, classical guitar at national level
- Henry Li: Varsity fencer, science olympiad, euphonium
- Alwin Ng: Software engineer on award-winning robotics team, experienced tutor
- Cyrus Yau: Gymnastics team captain, badminton team starter, science olympiad & math team

SERVICES & PRICING:
1. Starter (1-on-1 Private): $35/session (was $50 — 30% off)
   - Flexible scheduling, diagnostic assessment included, custom session plan
2. 8-Week Intensive (Most Popular): $500/program (was $750 — 33% off)
   - 16 x 60-min 1-on-1 sessions, full diagnostic + custom plan, weekly progress reports
   - +100 point score GUARANTEE — if they don't hit +100 pts, we keep going at no extra cost
   - Average improvement: +130 points in 8 weeks
3. Small Group: $25/student/session (was $35 — 29% off)
   - 2–4 students per session, 90-min structured sessions, collaborative problem-solving

REFERRAL PROGRAM:
- Every enrolled student gets a personal referral code
- Both referrer and new student get 50% off a session (or $25/$50 off packages)

RESULTS:
- 100+ students tutored
- +130 average SAT score gain
- 10+ years combined teaching experience
- 95% hit their target score

OUR PROCESS (3 steps):
1. Diagnostic Assessment — full-length practice test, detailed score breakdown, priority skill ID
2. Custom Study Plan — personalized week-by-week plan built around diagnostic findings
3. Expert Coaching — 99th percentile tutors, session-by-session feedback, test-day strategy

FAQ:
- Start prep at least 8–12 weeks before the test (SHSAT 8th graders: start by September)
- Digital SAT: 2hr 14min, adaptive, on Bluebook app, calculator allowed throughout math
- Score guarantee applies to 8-Week Intensive if student attends all sessions and does homework
- Free 30-minute diagnostic consultation to start

BOOKING: Direct prospective customers to book a free 30-minute consultation at the #contact section of the website, or by scrolling down to "Book a Free Consultation."

Keep answers concise, warm, and helpful. If you don't know something specific, encourage them to book a free consultation. Do not make up prices or details not listed above.`;

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  // ── Chat API endpoint ──
  if (req.method === 'POST' && urlPath === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { messages } = JSON.parse(body);
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY not set on server.' }));
          return;
        }
        const geminiMessages = messages
          .filter((m, i) => !(i === 0 && m.role === 'assistant'))
          .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents: geminiMessages,
            }),
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Gemini API error');
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ content: text }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(__dirname, urlPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
