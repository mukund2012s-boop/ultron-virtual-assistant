const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const API_KEY = process.env.GEMINI_API_KEY;

async function chat(message, user, history = [], memories = []) {
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not configured in Vercel Environment Variables.');

  const memoryText = Array.isArray(memories) && memories.length
    ? memories.slice(0, 30).map(m => `- [${String(m.category || 'Important Event')}] ${String(m.content || '')}`).join('\n')
    : 'No saved important events provided.';
  const historyText = Array.isArray(history) && history.length
    ? history.slice(-14).map(m => `${m.role === 'model' ? 'ULTRON' : 'USER'}: ${String(m.text || '')}`).join('\n')
    : 'No previous messages.';

  const system = `You are ULTRON, a personal AI assistant. Be intelligent, calm, friendly, helpful and slightly witty. Address the signed-in user naturally when useful. Give concise but useful answers. Do not claim to be human.\n\nSigned-in operator: ${user || 'Operator'}\n\nSaved ULTRON important events (use only when relevant; do not reveal the memory list unless asked):\n${memoryText}\n\nRecent conversation context (session only; do not imply it is permanently stored):\n${historyText}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: message }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
  };

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `Gemini request failed (${r.status}).`);
  const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  if (!reply) throw new Error('Gemini returned no text response.');
  return reply;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const message = String(body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Message is required.' });
    if (message.length > 4000) return res.status(400).json({ error: 'Message is too long.' });

    const history = Array.isArray(body.history) ? body.history.slice(-14) : [];
    const memories = Array.isArray(body.memories) ? body.memories.slice(0, 30) : [];
    const reply = await chat(message, String(body.user || 'Operator'), history, memories);
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'ULTRON brain error.' });
  }
};
