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
app.use(express.static(SITE_ROOT));

app.get('/', (req, res) => {
  res.redirect('/h.html');
});

// AI_PROVIDER=ollama   -> local free model, for your own dev machine only
// AI_PROVIDER=openrouter -> cloud model, works for deployed/client-facing site
const PROVIDER = process.env.AI_PROVIDER || 'ollama-cloud';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:31b-cloud';
const OLLAMA_KEY= process.env.OLLAMA_KEY || ''
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

async function callOllama(messages, system) {
  const ollamaMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;
  const upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json'  },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages: ollamaMessages, stream: false }),
  });
  if (!upstream.ok) {
    const errText = await upstream.text();
    throw new Error(errText || 'Ollama request failed');
  }
  const data = await upstream.json();
  return data.message?.content ?? '';
}

async function callOpenRouter(messages, system) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set.');
  }
  const orMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;

  let upstream, data;
  for (let attempt = 0; attempt < 3; attempt++) {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({ model: OPENROUTER_MODEL, messages: orMessages }),
    });
    data = await upstream.json();
    if (upstream.status !== 429) break;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  if (!upstream.ok) {
    throw new Error(JSON.stringify(data));
  }
  return data.choices?.[0]?.message?.content ?? '';
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], system } = req.body;
    const text = PROVIDER === 'openrouter'
      ? await callOpenRouter(messages, system)
      : await callOllama(messages, system);
    res.json({ content: [{ type: 'text', text }] });
  } catch (err) {
    console.error('Proxy error:', err);
    if (err.cause?.code === 'ECONNREFUSED') {
      return res.status(500).json({ error: 'Cannot reach Ollama. Is it running? Try: ollama serve' });
    }
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🔥 FlameTech running at: ${url}`);
  console.log(`💬 Cinder chat at:       ${url}/AI.html`);
  console.log(`🤖 Provider: ${PROVIDER} (${PROVIDER === 'openrouter' ? OPENROUTER_MODEL : OLLAMA_MODEL })\n`);

  if (process.env.NODE_ENV !== 'production') {
    const opener =
      process.platform === 'win32' ? `start ${url}` :
      process.platform === 'darwin' ? `open ${url}` :
      `xdg-open ${url}`;
    exec(opener);
  }
});