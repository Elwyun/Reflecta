# 🧠 Reflecta — Alat Skrining Kesehatan Mental & Stres

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Unit Tests](https://github.com/Elwyun/Refelecta/actions/workflows/ci.yml/badge.svg)](https://github.com/Elwyun/Refelecta/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen)](https://nodejs.org)

Reflecta memandu pengguna melalui **lima instrumen skrining tervalidasi** dan merangkum hasilnya
menjadi peta kondisi yang mudah dibaca, lengkap dengan refleksi opsional dari **LLM**.

> ⚠️ **Bukan alat diagnosis.** Skrining hanya memberi gambaran tingkat gejala untuk edukasi dan
> refleksi diri. Diagnosis hanya dapat ditegakkan oleh profesional kesehatan mental.

---

## ✨ Fitur

| | |
|---|---|
| 📋 **5 instrumen tervalidasi** | WHO-5, PSS-10, DASS-21, GAD-7, PHQ-9 — 52 butir, semua butir & rumus skoring asli |
| 🎨 **UI modern** | Tema gelap aurora, glassmorphism, gauge SVG animasi, responsif, keyboard-friendly (1–6 pilih jawaban, Enter lanjut) |
| 🛟 **Lapisan keamanan krisis** | Jawaban > 0 pada butir 9 PHQ-9 langsung memunculkan banner + panel imbauan **119 ext. 8** (Kemenkes RI, 24 jam) |
| 🤖 **Refleksi LLM** | Kompatibel OpenAI (OpenAI / OpenRouter / Groq / GLM / vLLM lokal). Kunci API disimpan di localStorage peramban |
| 🔌 **Mode offline** | Tanpa API key tetap berfungsi: ringkasan deterministik non-AI |
| 🔒 **Privasi** | Semua data jawaban tersimpan lokal; tidak ada pengiriman ke server mana pun kecuali panggilan AI yang Anda picu sendiri |
| ✅ **Terverifikasi test** | Unit test Node untuk seluruh rumus skoring (`node --test tests/`) |

## 🚀 Menjalankan

Cukup buka `index.html` di peramban, atau sajikan lewat server lokal:

```bash
npx serve .        # atau: python -m http.server
```

Jalankan unit test skoring:

```bash
node --test tests/scoring.test.js
```

## 🤖 Menghubungkan LLM

Klik **⚙️** pada bagian *Refleksi dari AI* lalu isi:

- **Base URL** — mis. `https://api.openai.com/v1`, `https://openrouter.ai/api/v1`, `https://api.groq.com/openai/v1`
- **API key** — disimpan hanya di peramban Anda
- **Model** — mis. `gpt-4o-mini`, `llama-3.1-8b-instant`, `glm-4-flash`

Refleksi dibangun dari **ringkasan skor** (bukan jawaban mentah) dengan prompt sistem yang
melarang diagnosis, melarang saran obat/dosis, dan mewajibkan imbauan profesional.
Jika panggilan gagal, tersedia fallback ringkasan offline.

## 📊 Instrumen & interpretasi (ringkasan riset)

| Instrumen | Sumber primer | Skoring | Interpretasi |
|---|---|---|---|
| **WHO-5** (5 butir, 0–5) | WHO Psychiatric Research Unit (1998); Topp dkk. 2015, *Psychother Psychosom* 84:167–176 | jumlah 0–25 × 4 = 0–100 | ≤50 kesejahteraan rendah (indikasi skrining depresi lanjutan); 51–69 sedang; ≥70 tinggi |
| **PSS-10** (10 butir, 0–4) | Cohen, Kamarck & Mermelstein 1983, *J Health Soc Behav* 24:385–396; CMU Stress & Immunity Lab | jumlah 0–40; butir 4, 5, 7, 8 **reverse-scored** | 0–13 rendah; 14–26 sedang; 27–40 tinggi (guideline umum; PSS bukan instrumen diagnostik) |
| **DASS-21** (21 butir, 0–3) | Lovibond & Lovibond 1995, *Manual for the DASS*; Henry & Crawford 2005 | jumlah per subskala (D/A/S masing-masing 7 butir) **× 2** → skala 0–42 | tabel severity resmi per subskala (Normal/Ringan/Sedang/Berat/Sangat berat) |
| **GAD-7** (7 butir, 0–3) | Spitzer dkk. 2006, *Arch Intern Med* 166:1092–1097 | jumlah 0–21 | 0–4 minimal; 5–9 ringan; 10–14 sedang; 15–21 berat |
| **PHQ-9** (9 butir, 0–3) | Kroenke, Spitzer & Williams 2001, *J Gen Intern Med* 16:606–613 | jumlah 0–27 | 0–4 minimal; 5–9 ringan; 10–14 sedang; 15–19 sedang-berat; 20–27 berat |

**Catatan penting dari literatur:**
- PSS secara resmi *tidak memiliki cut-off diagnostik* (CMU); rentang 0–13/14–26/27–40 adalah
  pedoman interpretasi umum yang dipakai luas di literatur terapan.
- Butir 9 PHQ-9 ("lebih baik mati / melukai diri") diperlakukan terpisah dari total skor:
  jawaban apa pun selain 0 memicu tampilan sumber bantuan krisis — konsisten dengan praktik
  klinis bahwa butir ini "warrants immediate clinical attention".
- DASS-21 dikali 2 agar sebanding dengan DASS-42; label severity mengikuti manual, bukan
  diagnosis klinis.

## 🇮🇩 Sumber bantuan krisis (Indonesia)

- **119 → ext. 8** — SEJIWA / Healing119, Kementerian Kesehatan RI (gratis, 24 jam)
- IGD rumah sakit terdekat untuk keadaan gawat darurat
- Daftar hotline lain: [Into The Light Indonesia](https://www.intothelightid.org/tentang-bunuh-diri/hotline-bunuh-diri-di-indonesia/)

## 🗂️ Struktur

```
index.html          — shell aplikasi (Tailwind CDN + font)
js/instruments.js   — data instrumen (butir, opsi, rumus, sumber)
js/scoring.js       — mesin skoring (UMD: browser + Node)
js/ai.js            — lapisan LLM (OpenAI-compatible) + fallback offline
js/app.js           — pengendali UI
tests/              — unit test rumus skoring
```

## 📄 Lisensi

Dirilis di bawah [MIT License](LICENSE).

## 🧩 Catatan desain & batasan

- **Validitas bahasa**: butir diterjemahkan ke Bahasa Indonesia secara bermakna; untuk penggunaan
  riset formal, gunakan versi resmi tervalidasi berbahasa Indonesia dari pemegang hak cipta instrumen.
- **Bukan aplikasi medis**: tidak menyimpan data terenkripsi, tidak ada mode klinis, tidak ada
  audit trail. Jangan dipakai sebagai satu-satunya dasar keputusan kesehatan.
- **LLM**: keluaran model bisa keliru; prompt sistem membatasi peran model ke pendamping
  refleksi, dan UI selalu menampilkan disclaimer.
- **Instrumen skrining**: WHO-5, PSS-10, DASS-21, GAD-7, PHQ-9 memiliki pemegang hak cipta
  masing-masing; lisensi MIT ini mencakup *kode* proyek, bukan butir instrumen tersebut.
