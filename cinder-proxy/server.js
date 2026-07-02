import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, '..');

const app = express();
app.use(cors());
app.use(express.json());

// Redirect root / to the real FlameTech home page
app.get('/', (req, res) => {
  res.redirect('/Flametech.html');
});

// Serve static files
app.use(express.static(SITE_ROOT));


const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

app.post('/api/chat', async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set. Copy .env.example to .env and add your key.' });
  }
  try {
    const { messages = [], system } = req.body;
    const orMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;

    let upstream, data;
    for (let attempt = 0; attempt < 3; attempt++) {
      upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: orMessages,
        }),
      });
      data = await upstream.json();
      if (upstream.status !== 429) break;
      console.warn(`Rate limited, retrying (${attempt + 1}/3)...`);
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }

    if (!upstream.ok) {
      console.error('OpenRouter error', upstream.status, data);
      return res.status(upstream.status).json(data);
    }

    const text = data.choices?.[0]?.message?.content ?? '';
    res.json({ content: [{ type: 'text', text }] });
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n💬 Cinder chat API running at: ${url}/api/chat`);
  console.log(`🤖 Model: ${OPENROUTER_MODEL}\n`);
  // Note: the browser is opened by the Vite dev server (see root package.json),
  // so this process no longer auto-opens a tab — that used to cause a second,
  // wrong tab to pop up pointed at the legacy static site instead of the app.
});
