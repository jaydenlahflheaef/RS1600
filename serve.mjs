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
We have two tutor tiers — Core and Elite. All sessions are 1-on-1 (no group lessons).

Core Tutors ($35/session):
- Flexible pay-per-session, no commitment
- Diagnostic assessment included, custom session plan
- No score guarantee on single sessions

Core Package ($250 for 8 sessions, saves $30):
- 8 x 60-min 1-on-1 sessions
- Full diagnostic + custom plan, weekly progress reports
- Score increase guarantee — avg. improvement +100 points

Elite Tutors ($50/session):
- Our most experienced tutors, ideal for students targeting top scores
- Flexible pay-per-session, no commitment
- Diagnostic assessment included, custom session plan
- No score guarantee on single sessions

Elite Package — Most Popular ($350 for 8 sessions, saves $50):
- 8 x 60-min 1-on-1 sessions with an Elite tutor
- Full diagnostic + custom plan, weekly progress reports
- Score increase guarantee — avg. improvement +130 points
- Priority tutor + Slack access

REFERRAL PROGRAM:
- Every enrolled student gets a personal referral code
- Book a session: both get 50% off a session
- Buy a package: referred student gets $25 off, referrer gets $50 credit

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
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set on server.' }));
          return;
        }
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'API error');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ content: data.content[0].text }));
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
