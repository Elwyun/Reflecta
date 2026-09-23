"use strict";
/**
 * Reflecta — mesin skoring.
 * Rumus mengikuti instrumen asli (lihat js/instruments.js & README.md).
 * Kompatibel browser (window.Scoring) dan Node (module.exports) untuk unit test.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Scoring = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Nilai opsi tertinggi pada sebuah instrumen (skala butir). */
  function scaleMax(instrument) {
    return instrument.options.reduce((m, o) => Math.max(m, o.value), 0);
  }

  /** Validasi bentuk & rentang jawaban. Lempar Error bila tidak valid. */
  function validateAnswers(instrument, answers) {
    if (!Array.isArray(answers) || answers.length !== instrument.items.length) {
      throw new Error(
        "Jumlah jawaban (" + (answers ? answers.length : "null") +
        ") tidak cocok dengan jumlah butir (" + instrument.items.length + ") pada " + instrument.id
      );
    }
    const max = scaleMax(instrument);
    answers.forEach(function (a, i) {
      if (!Number.isFinite(a) || a < 0 || a > max) {
        throw new Error("Jawaban tidak valid pada butir " + (i + 1) + " (" + instrument.id + "): " + a);
      }
    });
  }

  function bandFor(bands, score) {
    for (let i = 0; i < bands.length; i++) {
      if (score >= bands[i].min && score <= bands[i].max) return bands[i];
    }
    return bands[bands.length - 1];
  }

  /** Jumlah total dengan butir reverse-scored (4 − nilai). */
  function sumScore(instrument, answers) {
    const max = scaleMax(instrument);
    let total = 0;
    instrument.items.forEach(function (item, i) {
      total += item.reverse ? max - answers[i] : answers[i];
    });
    return total;
  }

  /**
   * Skor satu instrumen.
   * @returns {{raw:number, score:number, max:number, fraction:number, band:object,
   *            subscales?:Array, flags:string[]}}
   *  fraction: 0..1 — untuk instrumen "negative" (skor tinggi = lebih berat);
   *            untuk "positive" (WHO-5) fraction tetap skor/tertinggi (tinggi = baik).
   */
  function scoreInstrument(instrument, answers) {
    validateAnswers(instrument, answers);
    const sc = instrument.scoring;
    const flags = [];

    // Flag krisis: butir ber-flag (mis. butir 9 PHQ-9) dijawab > 0.
    instrument.items.forEach(function (item, i) {
      if (item.flag === "crisis" && answers[i] > 0) flags.push("crisis");
    });

    const raw = sumScore(instrument, answers);
    const multiply = sc.multiply || 1;
    const maxDisplay = sc.rawMax * multiply;

    // Subskala (DASS-21): jumlah per subskala × 2, bandingkan dengan band subskala.
    let subscales;
    if (sc.subscales) {
      subscales = [];
      Object.keys(sc.subscales).forEach(function (key) {
        const meta = sc.subscales[key];
        let sub = 0;
        instrument.items.forEach(function (item, i) {
          if (item.subscale === key) sub += answers[i];
        });
        const score = sub * multiply;
        const band = bandFor(meta.bands, score);
        subscales.push({ key: key, name: meta.name, raw: sub, score: score, max: 42, band: band });
        if (band.label === "Sangat berat" && flags.indexOf("severe") === -1) flags.push("severe");
      });
    }

    const score = raw * multiply;
    const band = sc.subscales
      ? null // DASS-21 dinilai per subskala
      : bandFor(sc.bands, score);

    if (!sc.subscales && sc.direction === "negative") {
      const worst = sc.bands[sc.bands.length - 1].label.toLowerCase();
      if (band.label.toLowerCase() === worst && score >= sc.bands[sc.bands.length - 1].min + 2) {
        // hampir/tepat di puncak skala
      }
    }
    if (!sc.subscales && sc.direction === "positive" && band.label === "Kesejahteraan rendah") {
      flags.push("low_wellbeing");
    }

    return {
      id: instrument.id,
      raw: raw,
      score: score,
      max: maxDisplay,
      fraction: maxDisplay === 0 ? 0 : score / maxDisplay,
      band: band,
      subscales: subscales,
      flags: flags,
    };
  }

  /**
   * Indeks kesejahteraan keseluruhan 0–100 (tinggi = baik).
   * Memakai WHO-5 bila tersedia; jika tidak, rata-rata (1 − fraction) instrumen negatif.
   */
  function overallIndex(scoredList) {
    const who5 = scoredList.find(function (r) { return r.id === "who5"; });
    if (who5) return Math.round(who5.fraction * 100);
    const negatives = scoredList.filter(function (r) { return r.band; });
    if (!negatives.length) return null;
    const avg = negatives.reduce(function (s, r) { return s + (1 - r.fraction); }, 0) / negatives.length;
    return Math.round(avg * 100);
  }

  return {
    scaleMax: scaleMax,
    validateAnswers: validateAnswers,
    scoreInstrument: scoreInstrument,
    overallIndex: overallIndex,
  };
});
