/**
 * Reflecta — data instrumen skrining kesehatan mental
 *
 * Semua butir pertanyaan, opsi jawaban, rumus skoring, dan ambang interpretasi
 * diambil dari instrumen aslinya (lihat `sources` pada tiap instrumen dan README.md).
 * Jangan mengubah angka-angka skoring tanpa memverifikasi ulang sumber primernya.
 */
"use strict";

/** Opsi frekuensi 4 poin (0–3) — dipakai PHQ-9 & GAD-7. */
const FREQ4 = [
  { label: "Tidak pernah", value: 0 },
  { label: "Beberapa hari", value: 1 },
  { label: "Lebih dari setengah hari", value: 2 },
  { label: "Hampir setiap hari", value: 3 },
];

/** Opsi DASS-21 (0–3, format respons resmi DASS). */
const DASS4 = [
  { label: "Tidak sesuai dengan saya sama sekali", value: 0 },
  { label: "Sedikit sesuai, atau sesekali", value: 1 },
  { label: "Cukup sesuai, atau sering kali", value: 2 },
  { label: "Sangat sesuai, atau hampir selalu", value: 3 },
];

/** Opsi PSS-10 (0–4). */
const PSS5 = [
  { label: "Tidak pernah", value: 0 },
  { label: "Hampir tidak pernah", value: 1 },
  { label: "Kadang-kadang", value: 2 },
  { label: "Cukup sering", value: 3 },
  { label: "Sangat sering", value: 4 },
];

/** Opsi WHO-5 (0–5). */
const WHO6 = [
  { label: "Tidak pernah", value: 0 },
  { label: "Kadang-kadang", value: 1 },
  { label: "Kurang dari setengah waktu", value: 2 },
  { label: "Lebih dari setengah waktu", value: 3 },
  { label: "Sebagian besar waktu", value: 4 },
  { label: "Sepanjang waktu", value: 5 },
];

const INSTRUMENTS = [
  // ============================================================ WHO-5
  {
    id: "who5",
    name: "WHO-5 Well-Being Index",
    short: "WHO-5",
    icon: "🌸",
    accent: "#7c9cff",
    context: "Dalam 2 minggu terakhir, seberapa sering Anda mengalami hal berikut?",
    options: WHO6,
    items: [
      { text: "Saya merasa ceria dan bersemangat" },
      { text: "Saya merasa tenang dan damai" },
      { text: "Saya merasa aktif dan energik" },
      { text: "Saya merasa segar dan cukup beristirahat ketika bangun pagi" },
      { text: "Keseharian saya dipenuhi hal-hal yang menarik minat saya" },
    ],
    scoring: {
      type: "sum",
      rawMax: 25,
      multiply: 4, // ubah ke skala 0–100
      direction: "positive", // skor tinggi = lebih baik
      bands: [
        { min: 70, max: 100, label: "Kesejahteraan tinggi" },
        { min: 51, max: 69, label: "Kesejahteraan sedang" },
        { min: 0, max: 50, label: "Kesejahteraan rendah" },
      ],
    },
    sources: [
      "WHO-5 Well-Being Index — World Health Organization (1998), Psychiatric Research Unit, WHO Collaborating Centre for Mental Health",
      "Topp CW, Østergaard SD, Søndergaard S, Bech P. The WHO-5 Well-Being Index: a systematic review of the literature. Psychother Psychosom. 2015;84(3):167–176.",
      "WHO (2024). The WHO-5 Well-Being Index (WHO-UCN-MSD-MHE-2024.01).",
    ],
  },

  // ============================================================ PSS-10
  {
    id: "pss10",
    name: "Perceived Stress Scale (PSS-10)",
    short: "PSS-10",
    icon: "🌊",
    accent: "#a78bfa",
    context: "Dalam 1 bulan terakhir, seberapa sering Anda merasa/mengalami hal berikut?",
    options: PSS5,
    items: [
      { text: "Terganggu karena terjadi sesuatu yang tidak terduga" },
      { text: "Tidak mampu mengendalikan hal-hal penting dalam hidup Anda" },
      { text: "Gugup dan \u201cstres\u201d" },
      { text: "Yakin dengan kemampuan Anda untuk menangani masalah pribadi Anda", reverse: true },
      { text: "Merasa bahwa segala sesuatunya berjalan sesuai keinginan Anda", reverse: true },
      { text: "Tidak sanggup menangani semua hal yang harus Anda lakukan" },
      { text: "Mampu mengendalikan rasa jengkel dalam hidup Anda", reverse: true },
      { text: "Merasa mampu menguasai keadaan", reverse: true },
      { text: "Marah karena hal-hal yang berada di luar kendali Anda" },
      { text: "Merasa kesulitan menumpuk begitu tinggi sehingga tidak dapat Anda atasi" },
    ],
    scoring: {
      type: "sum",
      rawMax: 40,
      direction: "negative", // skor tinggi = lebih berat
      bands: [
        { min: 0, max: 13, label: "Stres rendah" },
        { min: 14, max: 26, label: "Stres sedang" },
        { min: 27, max: 40, label: "Stres tinggi" },
      ],
    },
    sources: [
      "Cohen S, Kamarck T, Mermelstein R. A global measure of perceived stress. J Health Soc Behav. 1983;24(4):385–396.",
      "Perceived Stress Scale — Laboratory for the Study of Stress, Immunity, and Disease, Carnegie Mellon University (cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales).",
    ],
  },

  // ============================================================ DASS-21
  {
    id: "dass21",
    name: "Depression Anxiety Stress Scales-21 (DASS-21)",
    short: "DASS-21",
    icon: "🎭",
    accent: "#f472b6",
    context: "Pilih sejauh mana pernyataan berikut berlaku untuk Anda dalam 7 hari terakhir (bukan hari ini saja).",
    options: DASS4,
    items: [
      { text: "Saya sulit merasa tenang", subscale: "S" },
      { text: "Saya menyadari mulut saya terasa kering", subscale: "A" },
      { text: "Saya tidak dapat merasakan perasaan positif apa pun", subscale: "D" },
      { text: "Saya mengalami kesulitan bernapas (mis. napas terlalu cepat, sesak tanpa aktivitas fisik)", subscale: "A" },
      { text: "Saya sulit berinisiatif untuk melakukan sesuatu", subscale: "D" },
      { text: "Saya cenderung bereaksi berlebihan terhadap situasi", subscale: "S" },
      { text: "Saya mengalami gemetar (mis. pada tangan)", subscale: "A" },
      { text: "Saya merasa memakai banyak energi saraf", subscale: "S" },
      { text: "Saya khawatir tentang situasi ketika saya mungkin panik dan mempermalukan diri sendiri", subscale: "A" },
      { text: "Saya merasa tidak ada apa pun yang bisa saya harapkan", subscale: "D" },
      { text: "Saya mendapati diri saya menjadi gelisah", subscale: "S" },
      { text: "Saya sulit relaks/santai", subscale: "S" },
      { text: "Saya merasa sedih dan murung", subscale: "D" },
      { text: "Saya tidak sabar terhadap apa pun yang menghalangi saya menyelesaikan pekerjaan saya", subscale: "S" },
      { text: "Saya merasa hampir panik", subscale: "A" },
      { text: "Saya tidak dapat merasa antusias tentang apa pun", subscale: "D" },
      { text: "Saya merasa diri saya tidak berharga sebagai manusia", subscale: "D" },
      { text: "Saya merasa cukup sensitif/tersinggung", subscale: "S" },
      { text: "Saya menyadari detak jantung saya padahal tidak beraktivitas fisik (mis. jantung berdebar, meleset detak)", subscale: "A" },
      { text: "Saya merasa takut tanpa alasan yang jelas", subscale: "A" },
      { text: "Saya merasa hidup tidak berarti", subscale: "D" },
    ],
    scoring: {
      type: "sum",
      rawMax: 21,
      multiply: 2, // skor subskala DASS-21 dikali 2 agar setara DASS-42
      direction: "negative",
      subscales: {
        D: { name: "Depresi", bands: [
          { min: 0, max: 9, label: "Normal" },
          { min: 10, max: 13, label: "Ringan" },
          { min: 14, max: 20, label: "Sedang" },
          { min: 21, max: 27, label: "Berat" },
          { min: 28, max: 42, label: "Sangat berat" },
        ]},
        A: { name: "Ansietas", bands: [
          { min: 0, max: 7, label: "Normal" },
          { min: 8, max: 9, label: "Ringan" },
          { min: 10, max: 14, label: "Sedang" },
          { min: 15, max: 19, label: "Berat" },
          { min: 20, max: 42, label: "Sangat berat" },
        ]},
        S: { name: "Stres", bands: [
          { min: 0, max: 14, label: "Normal" },
          { min: 15, max: 18, label: "Ringan" },
          { min: 19, max: 25, label: "Sedang" },
          { min: 26, max: 33, label: "Berat" },
          { min: 34, max: 42, label: "Sangat berat" },
        ]},
      },
    },
    sources: [
      "Lovibond SH, Lovibond PF. Manual for the Depression Anxiety Stress Scales (2nd ed.). Sydney: Psychology Foundation of Australia; 1995.",
      "Henry JD, Crawford JR. The short-form version of the Depression Anxiety Stress Scales (DASS-21). Br J Clin Psychol. 2005;44:227–239.",
    ],
  },

  // ============================================================ GAD-7
  {
    id: "gad7",
    name: "Generalized Anxiety Disorder-7 (GAD-7)",
    short: "GAD-7",
    icon: "🌀",
    accent: "#fbbf24",
    context: "Dalam 2 minggu terakhir, seberapa sering Anda terganggu oleh masalah berikut?",
    options: FREQ4,
    items: [
      { text: "Merasa gugup, cemas, atau sangat tegang" },
      { text: "Tidak bisa berhenti memikirkan atau mengendalikan kekhawatiran" },
      { text: "Terlalu banyak khawatir tentang berbagai hal" },
      { text: "Sulit bersantai" },
      { text: "Sangat resah sehingga sulit duduk diam" },
      { text: "Mudah kesal atau jengkel" },
      { text: "Merasa takut seolah-olah sesuatu yang mengerikan bisa terjadi" },
    ],
    scoring: {
      type: "sum",
      rawMax: 21,
      direction: "negative",
      bands: [
        { min: 0, max: 4, label: "Ansietas minimal" },
        { min: 5, max: 9, label: "Ansietas ringan" },
        { min: 10, max: 14, label: "Ansietas sedang" },
        { min: 15, max: 21, label: "Ansietas berat" },
      ],
    },
    sources: [
      "Spitzer RL, Kroenke K, Williams JB, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092–1097.",
    ],
  },

  // ============================================================ PHQ-9
  {
    id: "phq9",
    name: "Patient Health Questionnaire-9 (PHQ-9)",
    short: "PHQ-9",
    icon: "🌧️",
    accent: "#f87171",
    context: "Dalam 2 minggu terakhir, seberapa sering Anda terganggu oleh masalah berikut?",
    options: FREQ4,
    items: [
      { text: "Kurang minat atau kesenangan dalam melakukan sesuatu" },
      { text: "Merasa sedih, murung, atau putus asa" },
      { text: "Sulit tidur, mudah terbangun, atau tidur berlebihan" },
      { text: "Merasa lelah atau kurang energi" },
      { text: "Kurang nafsu makan atau makan berlebihan" },
      { text: "Merasa buruk tentang diri sendiri — merasa gagal atau mengecewakan diri sendiri/keluarga" },
      { text: "Sulit berkonsentrasi, misalnya saat membaca atau menonton televisi" },
      { text: "Bergerak/berbicara sangat lambat hingga terlihat orang lain — atau justru resah hingga sulit diam" },
      { text: "Berpikir bahwa Anda lebih baik mati, atau ingin melukai diri sendiri dengan cara tertentu", flag: "crisis" },
    ],
    scoring: {
      type: "sum",
      rawMax: 27,
      direction: "negative",
      bands: [
        { min: 0, max: 4, label: "Depresi minimal" },
        { min: 5, max: 9, label: "Depresi ringan" },
        { min: 10, max: 14, label: "Depresi sedang" },
        { min: 15, max: 19, label: "Depresi sedang-berat" },
        { min: 20, max: 27, label: "Depresi berat" },
      ],
    },
    sources: [
      "Kroenke K, Spitzer RL, Williams JB. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001;16(9):606–613.",
      "Kroenke K, Spitzer RL, Williams JB. The PHQ-9: validity of a brief depression severity measure (PMC1495268) — ambang 5/10/15/20.",
    ],
  },
];

/** Sumber lengkap untuk modal "Sumber ilmiah". */
const REFERENCES = [
  { t: "PHQ-9 — Depresi", d: "Kroenke K, Spitzer RL, Williams JBW. The PHQ-9: validity of a brief depression severity measure. Journal of General Internal Medicine, 2001;16(9):606–613. Ambang 5/10/15/20 = ringan/sedang/sedang-berat/berat." },
  { t: "GAD-7 — Ansietas", d: "Spitzer RL, Kroenke K, Williams JBW, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Archives of Internal Medicine, 2006;166(10):1092–1097. Ambang 5/10/15 = ringan/sedang/berat." },
  { t: "DASS-21 — Depresi, Ansietas & Stres", d: "Lovibond SH, Lovibond PF. Manual for the Depression Anxiety Stress Scales (2nd ed.), 1995. Skor subskala DASS-21 dikali 2 agar sebanding dengan DASS-42; tabel severity mengikuti manual." },
  { t: "PSS-10 — Stres yang dipersepsikan", d: "Cohen S, Kamarck T, Mermelstein R. A global measure of perceived stress. Journal of Health and Social Behavior, 1983;24(4):385–396. Butir 4, 5, 7, 8 dihitung terbalik (reverse-scored)." },
  { t: "WHO-5 — Kesejahteraan mental", d: "WHO-5 Well-Being Index, WHO Psychiatric Research Unit (1998); Topp CW dkk., Psychotherapy and Psychosomatics, 2015;84:167–176. Skor mentah 0–25 dikali 4 menjadi 0–100; ≤50 menandakan kesejahteraan rendah." },
  { t: "Rujukan krisis — Indonesia", d: "SEJIWA / Healing119 — Kementerian Kesehatan RI: telepon 119, tekan ekstensi 8 (gratis, 24 jam) untuk dukungan kesehatan jiwa dan pertolongan pertama krisis. Sumber: kesprimkom.kemkes.go.id; intothelightid.org." },
];

/* Ekspor untuk unit test Node (di browser variabel ini tersedia sebagai global skrip). */
if (typeof module === "object" && module.exports) {
  module.exports = { INSTRUMENTS: INSTRUMENTS, REFERENCES: REFERENCES };
} else if (typeof window !== "undefined") {
  window.INSTRUMENTS = INSTRUMENTS;
  window.REFERENCES = REFERENCES;
}
