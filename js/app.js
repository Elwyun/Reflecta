"use strict";
/**
 * Reflecta — pengendali UI (vanilla JS).
 * Alur: Landing → Disclaimer → Kuis (5 instrumen) → Hasil (gauge, kartu, AI, langkah).
 */
(function () {
  const INSTRUMENTS = window.INSTRUMENTS;
  const REFERENCES = window.REFERENCES;
  const Scoring = window.Scoring;
  const AI = window.ReflectaAI;

  // ---------------------------------------------------------------- state
  const LS_ANSWERS = "reflecta.answers.v1";
  const state = {
    view: "landing",
    idx: 0,
    answers: {}, // instId -> Array<(number|null)>
  };

  const queue = [];
  INSTRUMENTS.forEach((inst) => {
    inst.items.forEach((item, i) => {
      queue.push({ instId: inst.id, itemIndex: i, text: item.text, flag: item.flag || null });
    });
  });
  const TOTAL = queue.length;

  const instById = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i]));

  // ---------------------------------------------------------------- helpers
  const $ = (id) => document.getElementById(id);

  function show(view) {
    state.view = view;
    ["landing", "disclaimer", "quiz", "results"].forEach((v) => {
      $("view-" + v).classList.toggle("active", v === view);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function persist() {
    try { localStorage.setItem(LS_ANSWERS, JSON.stringify(state.answers)); } catch (e) { /* abaikan */ }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(LS_ANSWERS);
      if (!raw) return false;
      const data = JSON.parse(raw);
      const flat = [];
      INSTRUMENTS.forEach((inst) => {
        const arr = data[inst.id];
        if (!Array.isArray(arr) || arr.length !== inst.items.length) return;
        arr.forEach((v) => flat.push(typeof v === "number" && v >= 0));
      });
      if (flat.length !== TOTAL || !flat.some(Boolean)) return false;
      state.answers = data;
      return true;
    } catch (e) { return false; }
  }

  function answeredCount() {
    let n = 0;
    INSTRUMENTS.forEach((inst) => {
      (state.answers[inst.id] || []).forEach((v) => { if (typeof v === "number") n++; });
    });
    return n;
  }

  function allAnswered() {
    return INSTRUMENTS.every((inst) =>
      (state.answers[inst.id] || []).filter((v) => typeof v === "number").length === inst.items.length
    );
  }

  function severityTone(fraction) {
    if (fraction < 0.34) return "ok";
    if (fraction < 0.67) return "warn";
    return "alert";
  }
  const TONE_HEX = { ok: "#34d399", warn: "#fbbf24", alert: "#f87171" };
  const TONE_BG = {
    ok: "rgba(52,211,153,.15)", warn: "rgba(251,191,36,.15)", alert: "rgba(248,113,113,.15)",
  };

  function bandTone(inst, bandLabel) {
    if (inst.id === "who5") {
      if (bandLabel.includes("tinggi")) return "ok";
      if (bandLabel.includes("sedang")) return "warn";
      return "alert";
    }
    const l = bandLabel.toLowerCase();
    if (l.includes("minimal") || l.includes("normal") || l.includes("rendah")) return "ok";
    if (l.includes("ringan")) return "warn";
    if (l.includes("sedang")) return "warn";
    return "alert";
  }

  // ---------------------------------------------------------------- landing
  function renderSourceCards() {
    const wrap = $("sourceCards");
    wrap.innerHTML = INSTRUMENTS.map((inst) => `
      <div class="glass rounded-2xl p-5">
        <div class="flex items-center gap-2">
          <span class="text-lg">${inst.icon}</span>
          <b class="font-display">${inst.name}</b>
        </div>
        <ul class="mt-2 text-xs space-y-1" style="color:var(--muted)">
          ${inst.sources.map((s) => `<li>• ${s}</li>`).join("")}
        </ul>
      </div>
    `).join("") + `
      <div class="glass rounded-2xl p-5 md:col-span-2">
        <b class="font-display">📞 Rujukan krisis — Indonesia</b>
        <p class="mt-2 text-xs leading-relaxed" style="color:var(--muted)">
          SEJIWA / Healing119 — Kementerian Kesehatan RI: telepon <b>119, tekan ekstensi 8</b> (gratis, 24 jam)
          untuk dukungan kesehatan jiwa dan pertolongan pertama krisis. Daftar hotline lain:
          <a class="underline" href="https://www.intothelightid.org/tentang-bunuh-diri/hotline-bunuh-diri-di-indonesia/" target="_blank" rel="noopener">intothelightid.org</a>.
        </p>
      </div>`;
  }

  // ---------------------------------------------------------------- quiz
  function startQuiz() {
    state.idx = 0;
    INSTRUMENTS.forEach((inst) => {
      if (!Array.isArray(state.answers[inst.id]) || state.answers[inst.id].length !== inst.items.length) {
        state.answers[inst.id] = Array(inst.items.length).fill(null);
      }
    });
    renderChips();
    renderQuestion();
    show("quiz");
  }

  function renderChips() {
    $("instrumentChips").innerHTML = INSTRUMENTS.map((inst) => {
      const arr = state.answers[inst.id] || [];
      const done = arr.filter((v) => typeof v === "number").length;
      const total = inst.items.length;
      const complete = done === total;
      return `<span class="badge glass" style="${complete ? "color:#6ee7b7" : "color:var(--muted)"}">
        ${complete ? "✓" : inst.icon} ${inst.short} ${done}/${total}</span>`;
    }).join("");
  }

  function renderQuestion() {
    const q = queue[state.idx];
    const inst = instById[q.instId];
    $("quizInstrumentLabel").textContent = `${inst.icon} ${inst.name}`;
    $("qInstrument").textContent = inst.short;
    $("qText").textContent = q.text;
    $("qContext").textContent = inst.context;
    $("quizCounter").textContent = `${state.idx + 1} / ${TOTAL}  •  terjawab ${answeredCount()}`;
    $("quizProgress").style.width = (answeredCount() / TOTAL) * 100 + "%";

    const wrap = $("optionsWrap");
    wrap.innerHTML = "";
    const current = state.answers[inst.id][q.itemIndex];
    inst.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option glass rounded-2xl px-4 py-3 text-left flex items-center gap-3 text-sm" +
        (current === opt.value ? " selected" : "");
      btn.innerHTML = `<span class="scale-dot${current === opt.value ? " on" : ""}"></span>
        <span class="font-medium">${opt.label}</span>
        <span class="ml-auto text-xs" style="color:var(--muted)">${opt.value}</span>`;
      btn.addEventListener("click", () => selectOption(opt.value));
      wrap.appendChild(btn);
    });

    $("btnPrev").disabled = state.idx === 0;
    $("btnPrev").style.opacity = state.idx === 0 ? ".4" : "1";
    const answered = typeof current === "number";
    $("btnNext").classList.toggle("opacity-40", !answered);
    $("btnNext").classList.toggle("pointer-events-none", !answered);
    $("btnNext").textContent = state.idx === TOTAL - 1 ? "Lihat hasil ✨" : "Lanjut →";
  }

  function selectOption(value) {
    const q = queue[state.idx];
    const inst = instById[q.instId];
    state.answers[inst.id][q.itemIndex] = value;
    persist();
    renderQuestion();
    renderChips();
    // Auto-lanjut agar pengisian terasa mengalir.
    if (state.idx < TOTAL - 1) setTimeout(() => { if (state.view === "quiz") next(); }, 220);
    else if (allAnswered()) setTimeout(finishQuiz, 260);
  }

  function next() {
    const q = queue[state.idx];
    if (typeof state.answers[q.instId][q.itemIndex] !== "number") return;
    if (state.idx < TOTAL - 1) {
      state.idx++;
      renderQuestion();
    } else if (allAnswered()) {
      finishQuiz();
    }
  }

  function prev() {
    if (state.idx > 0) {
      state.idx--;
      renderQuestion();
    }
  }

  // ---------------------------------------------------------------- results
  function computeResults() {
    const scored = [];
    let crisis = false;
    INSTRUMENTS.forEach((inst) => {
      const r = Scoring.scoreInstrument(inst, state.answers[inst.id]);
      if (r.flags.includes("crisis")) crisis = true;
      scored.push(r);
    });
    const index = Scoring.overallIndex(scored);
    const who5 = scored.find((r) => r.id === "who5");
    const overallBand = who5 ? who5.band.label : (index >= 70 ? "Kesejahteraan tinggi" : index >= 51 ? "Kesejahteraan sedang" : "Kesejahteraan rendah");
    return { scored, crisis, index, overallBand };
  }

  function finishQuiz() {
    renderResults();
    show("results");
  }

  function renderResults() {
    const { scored, crisis, index, overallBand } = computeResults();
    state.lastResults = { scored, crisis, index, overallBand };

    $("crisisAlert").classList.toggle("hidden", !crisis);
    if (crisis) $("crisisBanner").classList.remove("hidden");

    // Gauge
    const C = 2 * Math.PI * 100;
    $("gaugeArc").style.strokeDashoffset = String(C * (1 - index / 100));
    animateCount($("overallValue"), index, 1100);
    const tone = bandTone(instById.who5, overallBand);
    const badge = $("overallBadge");
    badge.textContent = overallBand;
    badge.style.background = TONE_BG[tone];
    badge.style.color = TONE_HEX[tone];
    $("overallExplain").textContent =
      overallBand === "Kesejahteraan tinggi"
        ? "Indeks kesejahteraan Anda berada di rentang sehat. Pertahankan kebiasaan yang selama ini menopang Anda — tidur, relasi, dan aktivitas yang bermakna."
        : overallBand === "Kesejahteraan sedang"
        ? "Indeks kesejahteraan Anda berada di tengah: ada beban yang mulai terasa. Perhatikan pola di bawah dan cobalah satu-dua langkah kecil — jangan tunggu sampai berat."
        : "Indeks kesejahteraan Anda rendah. Ini bukan vonis, tapi sinyal yang layak diseriusi: pertimbangkan bicara dengan psikolog/psikiater, dan gunakan 119 ext. 8 bila butuh bicara sekarang juga.";

    // Kartu per instrumen
    $("resultCards").innerHTML = scored.map((r) => {
      const inst = instById[r.id];
      let rows;
      if (r.subscales) {
        rows = r.subscales.map((s) => {
          const t = bandTone(inst, s.band.label);
          return `<div class="mt-2">
            <div class="flex justify-between text-xs"><span>${s.name}</span>
            <span style="color:${TONE_HEX[t]}">${s.score}/42 • ${s.band.label}</span></div>
            <div class="bar-track mt-1"><div class="bar-fill" data-w="${(s.score / 42) * 100}" style="background:${TONE_HEX[t]}"></div></div>
          </div>`;
        }).join("");
      } else {
        const t = bandTone(inst, r.band.label);
        rows = `<div class="mt-3">
          <div class="bar-track"><div class="bar-fill" data-w="${r.fraction * 100}" style="background:${TONE_HEX[t]}"></div></div>
        </div>`;
      }
      const mainTone = r.subscales ? severityTone(Math.max(...r.subscales.map((s) => s.score / 42))) : bandTone(inst, r.band.label);
      const bandBadge = r.subscales
        ? `<span class="badge" style="background:${TONE_BG[mainTone]};color:${TONE_HEX[mainTone]}">per subskala ↓</span>`
        : `<span class="badge" style="background:${TONE_BG[mainTone]};color:${TONE_HEX[mainTone]}">${r.band.label}</span>`;
      const note = r.flags.includes("crisis")
        ? `<div class="mt-3 rounded-xl border border-red-400/40 p-3 text-xs" style="background:rgba(248,113,113,.1);color:#fca5a5">
             ⚠️ Anda menandai butir tentang pikiran untuk melukai diri. Silakan lihat bagian perhatian di atas — 119 ext. 8 tersedia 24 jam.</div>`
        : "";
      return `<div class="glass rounded-3xl p-6">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">${inst.icon}</span>
            <div>
              <b class="font-display">${inst.short}</b>
              <div class="text-xs" style="color:var(--muted)">${r.subscales ? "tiga subskala" : r.score + " / " + r.max}</div>
            </div>
          </div>
          ${bandBadge}
        </div>
        ${rows}
        ${note}
      </div>`;
    }).join("");

    // Animasikan bar setelah render.
    requestAnimationFrame(() => {
      document.querySelectorAll("#resultCards .bar-fill").forEach((el) => {
        el.style.width = el.dataset.w + "%";
      });
    });

    renderActionItems(crisis);
    $("aiBox").classList.add("hidden");
    $("aiBox").textContent = "";
    $("btnAI").disabled = false;
    $("btnAI").textContent = "Buat refleksi";
  }

  function animateCount(el, target, ms) {
    const t0 = performance.now();
    function tick(t) {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderActionItems(crisis) {
    const items = [];
    if (crisis) {
      items.push({ icon: "🆘", title: "Prioritas utama: bicara dengan orang", body: "Hubungi 119 ext. 8 (24 jam, gratis) atau orang yang Anda percaya sekarang. Jangan menunggu — Anda layak didengar." });
    }
    items.push(
      { icon: "😴", title: "Amati tidur Anda", body: "Tidur adalah penopang kesehatan mental paling dasar. Coba jam tidur-bangun yang konsisten selama 7 hari dan catat perubahannya." },
      { icon: "🚶", title: "Gerak 10 menit sehari", body: "Jalan kaki ringan, peregangan, atau naik tangga. Aktivitas fisik ringan terbukti membantu suasana hati dan stres." },
      { icon: "✍️", title: "Curahkan di kertas", body: "Tulis apa yang berat saat ini selama 5 menit tanpa menyaring. Menamai pengalaman membantu otak mengaturnya." },
      { icon: "🫂", title: "Satu koneksi per hari", body: "Kirim kabar ke satu orang yang aman. Koneksi kecil dan rutin lebih berdampak daripada obrolan besar yang jarang." },
      { icon: "📵", title: "Jeda layar sebelum tidur", body: "30 menit tanpa layar sebelum tidur membantu otak turun gigir — terutama jika khawatir banyak berputar di kepala." },
      { icon: "📅", title: "Ulangi skrining 2–4 minggu", body: "Skor bukan label permanen. Isi ulang secara berkala untuk melihat arah perubahan, dan bawa hasilnya bila konsultasi ke profesional." }
    );
    $("actionItems").innerHTML = items.map((it) => `
      <div class="rounded-2xl border p-4" style="border-color:var(--border)">
        <div class="flex items-center gap-2"><span class="text-lg">${it.icon}</span><b class="text-sm font-display">${it.title}</b></div>
        <p class="mt-2 text-xs leading-relaxed" style="color:var(--muted)">${it.body}</p>
      </div>`).join("");
  }

  // ---------------------------------------------------------------- AI
  function offlineReflection(res) {
    const { scored, crisis, index, overallBand } = res;
    const lines = [];
    lines.push(`Indeks kesejahteraan keseluruhan Anda ${index}/100 (${overallBand.toLowerCase()}).`);
    const top = [];
    scored.forEach((r) => {
      if (r.subscales) {
        const worst = r.subscales.slice().sort((a, b) => b.score / 42 - a.score / 42)[0];
        if (worst.score / 42 >= 0.34) top.push(`${worst.name.toLowerCase()} (${worst.band.label.toLowerCase()}, ${worst.score}/42)`);
      } else if (r.id !== "who5" && r.fraction >= 0.34) {
        top.push(`${instById[r.id].short.toLowerCase()} (${r.band.label.toLowerCase()})`);
      }
    });
    if (top.length) lines.push(`Area yang paling menonjol: ${top.join(", ")}.`);
    if (crisis) {
      lines.push("Yang paling penting: Anda menandai pikiran untuk melukai diri. Tolong jangan memikul ini sendiri — hubungi 119 ext. 8 (gratis, 24 jam) atau orang yang Anda percaya hari ini juga.");
    }
    lines.push("Langkah kecil yang layak dicoba: jaga jam tidur, gerak ringan 10 menit sehari, dan tulis apa yang berat di kertas. Jika gejala menetap lebih dari dua minggu atau mengganggu aktivitas, bicaralah dengan psikolog/psikiater.");
    lines.push("(Mode offline: hubungkan API AI di pengaturan untuk refleksi yang lebih personal.)");
    lines.push("Ingat — ini skrining edukatif, bukan diagnosis.");
    return lines.join(" ");
  }

  async function runAI() {
    const res = state.lastResults;
    if (!res) return;
    const box = $("aiBox");
    const btn = $("btnAI");
    const cfg = AI.loadSettings();
    if (!cfg.apiKey) {
      openAIModal("Tambahkan API key untuk membuat refleksi personal, atau biarkan kosong untuk mode offline.");
      return;
    }
    btn.disabled = true;
    btn.textContent = "Menyusun…";
    box.classList.remove("hidden");
    box.style.color = "var(--muted)";
    box.textContent = "Menyusun refleksi…";
    try {
      const text = await AI.generateReflection(res.scored, { index: res.index, band: res.overallBand }, res.crisis);
      box.style.color = "";
      AI.typewrite(box, text, 260);
    } catch (err) {
      box.style.color = "";
      box.innerHTML = `<div class="text-red-300 text-xs mb-2">Gagal memanggil AI: ${String(err.message || err)}</div>`;
      const fb = document.createElement("button");
      fb.className = "btn-ghost px-4 py-2 text-xs";
      fb.textContent = "Pakai ringkasan offline";
      fb.addEventListener("click", () => AI.typewrite(box, offlineReflection(res), 260));
      box.appendChild(fb);
    } finally {
      btn.disabled = false;
      btn.textContent = "Buat ulang refleksi";
    }
  }

  function openAIModal(note) {
    const cfg = AI.loadSettings();
    $("aiBaseUrl").value = cfg.baseUrl || "";
    $("aiApiKey").value = cfg.apiKey || "";
    $("aiModel").value = cfg.model || "";
    let n = $("aiModalNote");
    if (!n) {
      n = document.createElement("p");
      n.id = "aiModalNote";
      n.className = "mt-3 text-xs";
      $("aiModal").querySelector("p").after(n);
    }
    n.textContent = note || "";
    n.style.color = "var(--muted)";
    $("aiModal").classList.remove("hidden");
  }

  // ---------------------------------------------------------------- summary
  function copySummary() {
    const res = state.lastResults;
    if (!res) return;
    const digest = AI.buildScoreDigest(res.scored, { index: res.index, band: res.overallBand }, res.crisis);
    const text = [
      "Hasil skrining Reflecta (" + new Date().toLocaleDateString("id-ID") + ")",
      "",
      digest,
      "",
      "Catatan: skrining edukatif, bukan diagnosis. Butir krisis PHQ-9: " + (res.crisis ? "terjawab > 0" : "tidak aktif") + ".",
    ].join("\n");
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => flash("Ringkasan disalin ✓"))
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        flash("Ringkasan disalin ✓");
      });
  }

  function flash(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    el.className = "fixed bottom-6 left-1/2 -translate-x-1/2 glass rounded-full px-5 py-2.5 text-sm z-50";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  // ---------------------------------------------------------------- modal sumber
  function openSources() {
    $("sourcesModalBody").innerHTML =
      `<p class="text-xs" style="color:var(--muted)">Reflecta memakai butir, rumus skoring, dan ambang resmi dari instrumen berikut tanpa modifikasi.</p>` +
      REFERENCES.map((r) => `<div class="rounded-2xl border p-4" style="border-color:var(--border)">
        <b class="font-display">${r.t}</b><p class="mt-1 text-xs leading-relaxed" style="color:var(--muted)">${r.d}</p></div>`).join("");
    $("sourcesModal").classList.remove("hidden");
  }

  // ---------------------------------------------------------------- events
  function bind() {
    $("btnStart").addEventListener("click", () => show("disclaimer"));
    $("btnBackLanding").addEventListener("click", () => show("landing"));
    $("agreeCheck").addEventListener("change", (e) => {
      const ok = e.target.checked;
      $("btnAgree").classList.toggle("opacity-40", !ok);
      $("btnAgree").classList.toggle("pointer-events-none", !ok);
    });
    $("btnAgree").addEventListener("click", startQuiz);
    $("btnNext").addEventListener("click", next);
    $("btnPrev").addEventListener("click", prev);
    $("btnQuitQuiz").addEventListener("click", () => show("landing"));
    $("btnRestart").addEventListener("click", () => {
      state.answers = {};
      persist();
      show("landing");
    });
    $("btnCopySummary").addEventListener("click", copySummary);
    $("btnAI").addEventListener("click", runAI);
    $("btnAISettings").addEventListener("click", () => openAIModal(""));
    $("aiModalClose").addEventListener("click", () => $("aiModal").classList.add("hidden"));
    $("aiSave").addEventListener("click", () => {
      AI.saveSettings({
        baseUrl: $("aiBaseUrl").value.trim() || AI.DEFAULTS.baseUrl,
        apiKey: $("aiApiKey").value.trim(),
        model: $("aiModel").value.trim() || AI.DEFAULTS.model,
      });
      $("aiModal").classList.add("hidden");
      flash("Pengaturan AI disimpan ✓");
    });
    $("btnSources").addEventListener("click", openSources);
    $("sourcesClose").addEventListener("click", () => $("sourcesModal").classList.add("hidden"));
    $("btnCrisis").addEventListener("click", () => $("crisisBanner").classList.remove("hidden"));
    $("crisisClose").addEventListener("click", () => $("crisisBanner").classList.add("hidden"));
    [["sourcesModal", "sourcesClose"], ["aiModal", "aiModalClose"]].forEach(([m]) => {
      $(m).addEventListener("click", (e) => { if (e.target.id === m) $(m).classList.add("hidden"); });
    });

    // Keyboard: 1..6 pilih opsi, Enter lanjut, ← kembali.
    document.addEventListener("keydown", (e) => {
      if (state.view !== "quiz") return;
      const q = queue[state.idx];
      const inst = instById[q.instId];
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= inst.options.length) selectOption(inst.options[n - 1].value);
      else if (e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    });
  }

  // ---------------------------------------------------------------- init
  function init() {
    renderSourceCards();
    bind();
    if (restore()) {
      // Ada progres tersimpan — langsung tawarkan lanjut lewat disclaimer.
      const resume = document.createElement("div");
      resume.className = "mt-4 rounded-2xl border p-4 text-sm flex items-center gap-3";
      resume.style.borderColor = "var(--border)";
      resume.innerHTML = `<span>🔖</span><div class="flex-1">Ada sesi belum selesai (${answeredCount()}/${TOTAL} pertanyaan terjawab).</div>`;
      const b = document.createElement("button");
      b.className = "btn-primary px-4 py-2 text-xs";
      b.textContent = "Lanjutkan";
      b.addEventListener("click", () => {
        state.idx = 0;
        renderChips();
        renderQuestion();
        show("quiz");
      });
      resume.appendChild(b);
      document.querySelector("#view-disclaimer .glass").prepend(resume);
    }
    show("landing");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
