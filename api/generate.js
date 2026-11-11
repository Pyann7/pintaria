/**
 * Vercel Serverless Function: /api/generate
 * Mengamankan API Key di sisi server (Environment Variables)
 * Sistem Dual-Provider AI (Groq Cloud & Google Gemini) dengan fallback otomatis
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

/**
 * Pembersih API Key dari spasi atau tanda kutip yang tidak sengaja terbawa saat copy-paste di Vercel
 */
function cleanKey(val) {
  if (!val || typeof val !== 'string') return '';
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Helper fetch dengan batas waktu (timeout)
 */
async function fetchWithTimeout(url, options, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ekstraksi & perbaikan JSON soal dari teks mentah AI
 */
function parseQuestionsJson(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Respons AI kosong.');
  }

  // 1. Bersihkan code fence markdown jika ada
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\s*/gm, '').replace(/```\s*$/gm, '').trim();

  // 2. Ambil substring antara kurung pertama dan terakhir
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
    if (end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }
  }

  // 3. Perbaiki trailing commas yang sering dihasilkan model LLM (mis: [1, 2, ])
  const repaired = cleaned.replace(/,\s*([\]}])/g, '$1');

  let list = [];
  try {
    const parsed = JSON.parse(repaired);
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.questions)) list = parsed.questions;
      else if (Array.isArray(parsed.soal)) list = parsed.soal;
      else if (Array.isArray(parsed.items)) list = parsed.items;
      else if (Array.isArray(parsed.data)) list = parsed.data;
      else {
        for (const key of Object.keys(parsed)) {
          if (Array.isArray(parsed[key])) {
            list = parsed[key];
            break;
          }
        }
      }
    }
  } catch (parseErr) {
    // Fallback: ekstrak blok objek JSON individual dengan regex jika JSON terputus di akhir
    const itemRegex = /\{[^{}]*?(?:"q"|"pertanyaan"|"question")[^{}]*?\}/g;
    const matches = repaired.match(itemRegex);
    if (matches && matches.length) {
      for (const m of matches) {
        try {
          const itemClean = m.replace(/,\s*([\]}])/g, '$1');
          list.push(JSON.parse(itemClean));
        } catch (_) {}
      }
    }
  }

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('Format JSON soal dari AI tidak dapat diurai.');
  }

  const sanitize = (str) => String(str ?? '').replace(/[|\n\r]/g, ' ').trim();
  const valid = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const q = sanitize(item.q || item.pertanyaan || item.question || item.soal);
    const a = sanitize(item.a || item.jawaban || item.answer || item.correct || item.kunci || item.jawaban_benar);

    // Ambil opsi pengecoh (jawaban salah)
    let w = item.w || item.salah || item.wrong || item.distractors || item.jawaban_salah || item.opsi_salah || item.pilihan_salah || item.incorrect_answers || item.wrong_answers;

    // Jika AI mengirim seluruh pilihan (termasuk jawaban benar) dalam satu array options/pilihan
    if (!Array.isArray(w) || w.length < 3) {
      const allChoices = item.options || item.pilihan || item.choices || item.opsi;
      if (Array.isArray(allChoices)) {
        w = allChoices.map(sanitize).filter(c => c && c.toLowerCase() !== a.toLowerCase());
      }
    }

    if (!Array.isArray(w)) {
      w = typeof w === 'string' ? [w] : [];
    }
    w = w.map(sanitize).filter(Boolean);

    if (q && a && w.length >= 3) {
      valid.push({ q, a, w: w.slice(0, 3) });
    }
  }

  if (valid.length === 0) {
    throw new Error('Tidak ada butir soal valid yang dapat diekstrak dari AI.');
  }

  return valid;
}

/**
 * Menyusun prompt terstruktur untuk AI
 */
function buildAiPrompt(topicInfo, count) {
  let desc = '';
  if (typeof topicInfo === 'string') {
    desc = topicInfo.trim() || 'Pengetahuan Umum';
  } else if (topicInfo && typeof topicInfo === 'object') {
    const parts = [];
    if (topicInfo.mapel) parts.push(`Mata Pelajaran: ${topicInfo.mapel}`);
    if (topicInfo.jenjang) parts.push(`Jenjang: ${topicInfo.jenjang}`);
    if (topicInfo.kelas) parts.push(`Kelas: ${topicInfo.kelas}`);
    if (topicInfo.difficulty) parts.push(`Tingkat Kesulitan: ${topicInfo.difficulty}`);
    if (topicInfo.topic && topicInfo.topic.trim()) {
      parts.push(`Topik Khusus: "${topicInfo.topic.trim()}"`);
    } else {
      parts.push(`Topik: Standar kurikulum ${topicInfo.mapel || 'Pengetahuan Umum'}`);
    }
    desc = parts.join(', ');
  } else {
    desc = 'Pengetahuan Umum';
  }

  return `Buat TEPAT ${count} butir soal pilihan ganda bahasa Indonesia (${desc}) yang bervariasi, mendidik, dan sesuai tingkat pemahaman siswa.
Aturan wajib:
1. Jumlah soal harus TEPAT ${count} butir soal unik.
2. Pertanyaan jelas, ringkas, dan fokus materi (maksimal 95 karakter).
3. Jawaban benar ringkas (maksimal 30 karakter).
4. Sediakan tepat 3 pilihan jawaban salah yang masuk akal dan relevan (maksimal 30 karakter per pilihan).
5. Jawaban benar dan salah harus seimbang dan tidak boleh membingungkan.
6. Keluarkan HANYA JSON object dengan format:
{"questions":[{"q":"Pertanyaan","a":"Jawaban Benar","w":["Salah 1","Salah 2","Salah 3"]}]}`;
}

/**
 * Provider 1: Groq Cloud
 */
async function requestGroq(topicInfo, count, apiKey) {
  if (!apiKey) throw new Error('GROQ_API_KEY belum dikonfigurasi.');

  const prompt = buildAiPrompt(topicInfo, count);
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
              content: 'Anda adalah pembuat soal kuis edukasi berbahasa Indonesia. Balas HANYA dengan JSON valid format: {"questions":[{"q":"...","a":"...","w":["...","...","..."]}]}'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.65,
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        })
      }, 18000);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let errMsg = `Status ${res.status}`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson?.error?.message) {
            errMsg = `${errMsg}: ${errJson.error.message}`;
          }
        } catch (_) {
          if (errText) errMsg = `${errMsg}: ${errText.slice(0, 150)}`;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      return parseQuestionsJson(content);
    } catch (err) {
      lastError = new Error(`Groq (${model}): ${err.message || err}`);
    }
  }

  throw lastError || new Error('Semua model Groq gagal.');
}

/**
 * Provider 2: Google AI Studio (Gemini)
 */
async function requestGemini(topicInfo, count, apiKey) {
  if (!apiKey) throw new Error('GEMINI_API_KEY belum dikonfigurasi.');

  const prompt = buildAiPrompt(topicInfo, count);
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.65,
            maxOutputTokens: 4096
          }
        })
      }, 22000);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let errMsg = `Status ${res.status}`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson?.error?.message) {
            errMsg = `${errMsg}: ${errJson.error.message}`;
          }
        } catch (_) {
          if (errText) errMsg = `${errMsg}: ${errText.slice(0, 150)}`;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return parseQuestionsJson(rawText);
    } catch (err) {
      lastError = new Error(`Gemini (${model}): ${err.message || err}`);
    }
  }

  throw lastError || new Error('Semua model Gemini gagal.');
}

module.exports = async function handler(req, res) {
  // Set CORS & Security Headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Metode permintaan tidak diizinkan.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const rawCount = parseInt(body.count, 10);
    const count = Number.isFinite(rawCount) ? Math.min(48, Math.max(4, rawCount)) : 20;

    const topicInfo = {
      jenjang: String(body.jenjang || '').trim(),
      kelas: String(body.kelas || '').trim(),
      mapel: String(body.mapel || '').trim(),
      difficulty: String(body.difficulty || body.kesulitan || '').trim(),
      topic: String(body.topic || '').trim().slice(0, 150)
    };

    const groqKey = cleanKey(process.env.GROQ_API_KEY);
    const geminiKey = cleanKey(process.env.GEMINI_API_KEY);
    const primary = cleanKey(process.env.PRIMARY_AI || 'groq').toLowerCase();

    if (!groqKey && !geminiKey) {
      return res.status(503).json({
        ok: false,
        error: 'API Key AI belum diatur di Vercel. Tambahkan GEMINI_API_KEY atau GROQ_API_KEY di Vercel Settings > Environment Variables.'
      });
    }

    // Tentukan urutan provider berdasarkan primary setting dan ketersediaan key
    const taskList = [];
    if (primary.includes('gemini')) {
      if (geminiKey) taskList.push({ name: 'Gemini', fn: () => requestGemini(topicInfo, count, geminiKey) });
      if (groqKey) taskList.push({ name: 'Groq', fn: () => requestGroq(topicInfo, count, groqKey) });
    } else {
      if (groqKey) taskList.push({ name: 'Groq', fn: () => requestGroq(topicInfo, count, groqKey) });
      if (geminiKey) taskList.push({ name: 'Gemini', fn: () => requestGemini(topicInfo, count, geminiKey) });
    }

    const errors = [];
    for (const { name, fn } of taskList) {
      try {
        const questions = await fn();
        if (questions && questions.length > 0) {
          return res.status(200).json({
            ok: true,
            provider: name,
            questions
          });
        }
      } catch (err) {
        errors.push({ provider: name, message: err.message || String(err) });
        console.warn(`[AI Provider Failed] ${name}:`, err.message);
      }
    }

    // Jika seluruh provider gagal, beri diagnosa yang sangat jelas
    const errTextCombined = errors.map(e => e.message).join(' ').toLowerCase();
    const hasAuthError = errTextCombined.includes('401') || errTextCombined.includes('invalid api key') || errTextCombined.includes('api_key_invalid');
    const hasRateLimit = errTextCombined.includes('429') || errTextCombined.includes('quota') || errTextCombined.includes('rate limit');

    let userFriendlyMsg = 'Layanan AI belum berhasil menyusun soal.';
    if (hasAuthError) {
      userFriendlyMsg = 'API Key AI (Groq/Gemini) tidak valid. Pastikan API Key di Vercel dimasukkan tanpa tanda kutip dan masih aktif.';
    } else if (hasRateLimit) {
      userFriendlyMsg = 'Batas kuota gratis AI (Rate Limit) sementara penuh. Silakan tunggu 1 menit lalu coba lagi.';
    } else if (errors.length > 0) {
      userFriendlyMsg = `Gagal membuat soal: ${errors.map(e => e.message).join(' | ')}`;
    }

    return res.status(503).json({
      ok: false,
      error: userFriendlyMsg,
      details: errors
    });
  } catch (err) {
    console.error('[Internal Error]', err);
    return res.status(500).json({
      ok: false,
      error: 'Terjadi kendala internal saat memproses soal: ' + (err.message || 'Unknown error')
    });
  }
};
