"use strict";
/**
 * Reflecta — lapisan integrasi LLM.
 *
 * Desain:
 * - Kompatibel dengan API gaya OpenAI (POST {baseUrl}/chat/completions), sehingga
 *   bisa dipakai dengan OpenAI, OpenRouter, Groq, Z.ai/GLM, Ollama/vLLM lokal, dll.
 * - Kredensial hanya disimpan di localStorage peramban pengguna dan dikirim
 *   langsung ke penyedia yang dipilih — tidak ada server perantara.
 * - Tanpa kredensial / tanpa jaringan → fallback ringkasan offline deterministik
 *   agar alat tetap berfungsi penuh.
 * - Prompt dibangun HANYA dari skor & kategori (bukan isi jawaban mentah) +
 *   konteks hasil skrining, dan secara eksplisit melarang model mengklaim diagnosis.
 */
(function (root) {
  const DEFAULTS = {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  };
  const LS_KEY = "reflecta.ai.settings.v1";

  function loadSettings() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(LS_KEY);
      if (raw) return Object.assign({}, DEFAULTS, JSON.parse(raw));
    } catch (e) { /* abaikan */ }
    return Object.assign({}, DEFAULTS);
  }

  function saveSettings(s) {
    try {
      root.localStorage && root.localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch (e) { /* abaikan */ }
  }

  /**
   * Susun ringkasan terstruktur dari hasil skoring (tanpa jawaban mentah).
   * @param {Array} scoredList hasil Scoring.scoreInstrument
   * @param {object} overall {index, band}
   * @param {boolean} crisis apakah ada flag krisis
   */
  function buildScoreDigest(scoredList, overall, crisis) {
    const lines = [];
    lines.push("INDEKS KESEJAHTERAAN KESELURUHAN: " + overall.index + "/100 (" + overall.band + ")");
    scoredList.forEach(function (r) {
      const inst = (typeof INSTRUMENTS !== "undefined" ? INSTRUMENTS : []).find(function (i) { return i.id === r.id; });
      const name = inst ? inst.short : r.id;
      if (r.subscales) {
        lines.push(name + ":");
        r.subscales.forEach(function (s) {
          lines.push("  - " + s.name + ": skor " + s.score + "/42 → " + s.band.label);
        });
      } else {
        lines.push(name + ": skor " + r.score + "/" + r.max + " → " + (r.band ? r.band.label : "-"));
      }
    });
    if (crisis) {
      lines.push("CATATAN KEAMANAN: responden menandai butir ideasi menyakiti diri (PHQ-9 butir 9) > 0. WAJIB menyertakan imbauan menghubungi 119 ext. 8 (Kemenkes RI) atau layanan darurat setempat, dengan nada hangat dan tidak menghakimi.");
    }
    return lines.join("\n");
  }

  /**
   * Prompt sistem: peran, batasan, dan gaya keluaran.
   */
  function buildSystemPrompt() {
    return [
      "Kamu adalah pendamping refleksi dalam alat skrining kesehatan mental bernama Reflecta, berbahasa Indonesia.",
      "TUGASMU: menafsirkan RINGKASAN SKOR skrining (bukan mendiagnosis) dengan hangat, jelas, dan berbasis buku.",
      "ATURAN WAJIB:",
      "1. JANGAN mengklaim diagnosis atau menegakkan kondisi klinis. Gunakan frasa seperti 'skor ini berada pada rentang ...' dan arahkan ke profesional bila relevan.",
      "2. JANGAN menyebut nomor resep, dosis, atau pengobatan spesifik.",
      "3. SELALU sertakan imbauan bahwa ini bukan diagnosis dan hasil terbaik didapat dari konsultasi psikolog/psikiater bila skor menonjol.",
      "4. Bila ada CATATAN KEAMANAN, letakkan imbauan krisis (119 ext. 8 / layanan darurat) di paragraf pertama dengan nada peduli, tanpa menghakimi, tanpa drama berlebihan.",
      "5. Struktur keluaran (maks ~250 kata, tanpa heading markdown):",
      "   a) Refleksi umum (2–3 kalimat, berempati, spesifik ke pola skornya).",
      "   b) Pola yang menonjol (sebutkan 1–3 instrumen/subskala paling relevan dan apa artinya).",
      "   c) 2–3 saran kecil yang konkret dan realistis (mis. jurnal, tidur, aktivitas fisik ringan, koneksi sosial).",
      "   d) Penutup: dorongan mencari bantuan profesional bila perlu + pengingat bahwa skor bisa berubah.",
      "Gaya: Bahasa Indonesia santun, hangat, tegas saat perlu, tanpa jargon klinis berlebihan, tanpa emoji berlebihan (maks 2).",
    ].join("\n");
  }

  function buildUserPrompt(scoredList, overall, crisis) {
    return [
      "Berikut ringkasan hasil skrining pengguna (skala dan kategori mengikuti instrumen tervalidasi WHO-5, PSS-10, DASS-21, GAD-7, PHQ-9):",
      "",
      buildScoreDigest(scoredList, overall, crisis),
      "",
      "Tulis refleksi sesuai struktur dan aturan pada instruksi sistem.",
    ].join("\n");
  }

  /**
   * Panggil API chat/completions gaya OpenAI.
   * @returns {Promise<string>} teks refleksi
   */
  async function generateReflection(scoredList, overall, crisis, opts) {
    const cfg = Object.assign(loadSettings(), opts || {});
    const url = cfg.baseUrl.replace(/\/+$/, "") + "/chat/completions";
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + cfg.apiKey,
        },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0.7,
          max_tokens: 700,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: buildUserPrompt(scoredList, overall, crisis) },
          ],
        }),
      });
    } catch (e) {
      throw new Error("Tidak dapat menghubungi penyedia AI: " + e.message);
    }
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.text()).slice(0, 300); } catch (e) { /* abaikan */ }
      throw new Error("API menjawab " + res.status + (detail ? ": " + detail : ""));
    }
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error("Respons API tidak berisi teks.");
    return text.trim();
  }

  /** Tampilkan teks secara bertahap (efek mesin tik sederhana). */
  function typewrite(el, text, cps) {
    el.textContent = "";
    el.classList.add("caret");
    const step = Math.max(1, Math.round((cps || 220) / 30));
    let i = 0;
    const timer = setInterval(function () {
      i += step;
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(timer);
        el.classList.remove("caret");
      }
    }, 33);
    return function cancel() { clearInterval(timer); el.classList.remove("caret"); el.textContent = text; };
  }

  const api = {
    DEFAULTS: DEFAULTS,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    buildScoreDigest: buildScoreDigest,
    buildSystemPrompt: buildSystemPrompt,
    buildUserPrompt: buildUserPrompt,
    generateReflection: generateReflection,
    typewrite: typewrite,
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ReflectaAI = api;
})(typeof self !== "undefined" ? self : this);
