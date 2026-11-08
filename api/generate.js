/**
 * Vercel Serverless Function: /api/generate
 * Mengamankan API Key di sisi server (Environment Variables)
 * Sistem Dual-Provider Fallback Otomatis (Tanpa mengekspos nama provider/error internal ke publik)
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

/**
 * Helper fetch dengan batas waktu (timeout) agar cepat fallback jika salah satu provider lambat
 */
async function fetchWithTimeout(url, options, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ekstraksi & validasi JSON soal dari teks mentah AI
 */
function parseQuestionsJson(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response');
  }

  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;
  let isArr = false;

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
    isArr = true;
  } else if (firstBrace !== -1) {
    start = firstBrace;
    isArr = false;
  }

  if (start !== -1) {
    const end = cleaned.lastIndexOf(isArr ? ']' : '}');
    if (end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }
  }

  const parsed = JSON.parse(cleaned);
  let list = [];

  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.questions)) list = parsed.questions;
    else if (Array.isArray(parsed.soal)) list = parsed.soal;
    else if (Array.isArray(parsed.items)) list = parsed.items;
    else {
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) {
          list = parsed[key];
          break;
        }
      }
    }
  }

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Invalid question list');
  }

  const sanitize = (str) => String(str ?? '').replace(/[|\n\r]/g, ' ').trim();
  const valid = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const q = sanitize(item.q || item.pertanyaan || item.question);
    const a = sanitize(item.a || item.jawaban || item.answer || item.correct);
    let w = item.w || item.salah || item.wrong || item.distractors || [];

    if (!Array.isArray(w)) {
      w = typeof w === 'string' ? [w] : [];
    }
    w = w.map(sanitize).filter(Boolean);

    if (q && a && w.length >= 3) {
      valid.push({ q, a, w: w.slice(0, 3) });
    }
  }

  if (valid.length === 0) {
    throw new Error('No valid questions parsed');
  }

  return valid;
}

/**
 * Provider 1: Groq Cloud
 */
async function requestProviderA(topic, count, apiKey) {
  if (!apiKey) throw new Error('Provider A key not configured');

  const prompt = `Buat TEPAT ${count} soal pilihan ganda bahasa Indonesia yang berbeda-beda (tidak boleh berulang) tentang topik: "${topic}".
Aturan wajib:
1. Jumlah soal harus TEPAT ${count} butir soal unik (untuk dibagi ke 4 babak permainan).
2. Pertanyaan jelas dan ringkas (maksimal 85 karakter).
3. Jawaban benar ringkas (maksimal 25 karakter).
4. Sediakan tepat 3 pilihan jawaban salah yang masuk akal (maksimal 25 karakter per pilihan).
5. Keluarkan HANYA JSON object dengan format:
{"questions":[{"q":"Pertanyaan","a":"Jawaban Benar","w":["Salah 1","Salah 2","Salah 3"]}]}`;

  let lastError = null;
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetchWithTimeout(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Anda adalah pembuat soal kuis edukasi berbahasa Indonesia. Selalu balas hanya dengan JSON object valid sesuai jumlah soal yang diminta.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        })
      }, 18000);

      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return parseQuestionsJson(content);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Provider A failed');
}

/**
 * Provider 2: Google AI Studio (Gemini)
 */
async function requestProviderB(topic, count, apiKey) {
  if (!apiKey) throw new Error('Provider B key not configured');

  const prompt = `Buat TEPAT ${count} soal pilihan ganda bahasa Indonesia yang berbeda-beda (tidak boleh berulang) tentang topik: "${topic}".
Aturan wajib:
- Jumlah soal harus TEPAT ${count} butir soal unik (untuk dibagi ke 4 babak permainan).
- Pertanyaan jelas dan ringkas (maksimal 85 karakter).
- Jawaban benar ringkas (maksimal 25 karakter).
- Tepat 3 pilihan jawaban salah (maksimal 25 karakter per pilihan).
- Keluarkan HANYA JSON object persis dengan struktur:
{"questions":[{"q":"Pertanyaan","a":"Jawaban Benar","w":["Salah 1","Salah 2","Salah 3"]}]}`;

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
            maxOutputTokens: 4096
          }
        })
      }, 18000);

      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return parseQuestionsJson(rawText);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Provider B failed');
}

module.exports = async function handler(req, res) {
  // Set CORS & Security Headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Metode permintaan tidak diizinkan.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const rawTopic = String(body.topic || '').trim().slice(0, 120);
    const topic = rawTopic || 'Pengetahuan Umum';
    const rawCount = parseInt(body.count, 10);
    const count = Number.isFinite(rawCount) ? Math.min(48, Math.max(4, rawCount)) : 20;

    const groqKey = (process.env.GROQ_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const primary = (process.env.PRIMARY_AI || 'groq').toLowerCase();

    if (!groqKey && !geminiKey) {
      console.error('[Server Config Error] API Keys belum diatur pada Environment Variables.');
      return res.status(503).json({
        ok: false,
        error: 'Layanan pembuatan soal belum aktif. Silakan hubungi administrator.'
      });
    }

    // Urutan fallback berdasarkan prioritas (Default: Provider A -> Provider B)
    const tasks = primary === 'gemini'
      ? [
          () => requestProviderB(topic, count, geminiKey),
          () => requestProviderA(topic, count, groqKey)
        ]
      : [
          () => requestProviderA(topic, count, groqKey),
          () => requestProviderB(topic, count, geminiKey)
        ];

    for (const task of tasks) {
      try {
        const questions = await task();
        if (questions && questions.length > 0) {
          return res.status(200).json({
            ok: true,
            questions
          });
        }
      } catch (internalErr) {
        // Error dicatat hanya di log internal server, tidak pernah dikirim ke client
        console.warn('[AI Fallback Triggered] Mencoba jalur cadangan...');
      }
    }

    // Jika semua jalur gagal, kirim pesan generik yang aman ke pengguna
    return res.status(503).json({
      ok: false,
      error: 'Layanan pembuat soal sedang sibuk. Silakan coba lagi beberapa saat.'
    });
  } catch (err) {
    console.error('[Internal Error]');
    return res.status(500).json({
      ok: false,
      error: 'Terjadi kendala saat memproses permintaan soal. Silakan coba kembali.'
    });
  }
};
