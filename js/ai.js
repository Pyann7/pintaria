/**
 * Client-side AI Question Generator Service
 * Memanggil endpoint backend (/api/generate) secara aman tanpa mengekspos API Key atau nama provider di browser.
 */

async function generateQuestionsFromServer(topic, count, onStatus) {
  const notify = (msg) => {
    if (typeof onStatus === 'function') onStatus(msg);
  };

  notify('Sedang menyusun soal dengan AI...');

  let response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: String(topic || 'Pengetahuan Umum').trim(),
        count: Number(count) || 10
      })
    });
  } catch (networkErr) {
    throw new Error('Gagal terhubung ke server pembuat soal. Pastikan aplikasi sudah berjalan di server/Vercel.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    throw new Error('Layanan pembuat soal tidak dapat merespon saat ini. Silakan coba lagi.');
  }

  if (!response.ok || !data || !data.ok || !Array.isArray(data.questions) || !data.questions.length) {
    const safeMsg = (data && data.error)
      ? data.error
      : 'Gagal membuat soal saat ini. Silakan coba beberapa saat lagi.';
    throw new Error(safeMsg);
  }

  return data.questions;
}
