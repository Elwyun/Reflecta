"use strict";
/**
 * Unit test mesin skoring Reflecta — memverifikasi rumus resmi tiap instrumen.
 * Jalankan: node --test tests/
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { INSTRUMENTS } = require("../js/instruments.js");
const Scoring = require("../js/scoring.js");

const byId = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i]));
const zeros = (n) => Array(n).fill(0);
const maxes = (inst) => inst.items.map(() => Scoring.scaleMax(inst));

// ---------------------------------------------------------------- PSS-10
test("PSS-10: butir 4,5,7,8 dihitung terbalik", () => {
  const pss = byId.pss10;
  // Semua jawaban 0 → butir reverse bernilai 4 → total 16.
  const r0 = Scoring.scoreInstrument(pss, zeros(10));
  assert.equal(r0.raw, 16);
  assert.equal(r0.band.label, "Stres sedang");
  // Semua jawaban 4 → butir reverse bernilai 0 → total 24.
  const r4 = Scoring.scoreInstrument(pss, maxes(pss));
  assert.equal(r4.raw, 24);
  // [0,0,0,4,4,0,4,4,0,0] → reverse jadi 0, total 0 → rendah.
  const rLow = Scoring.scoreInstrument(pss, [0, 0, 0, 4, 4, 0, 4, 4, 0, 0]);
  assert.equal(rLow.raw, 0);
  assert.equal(rLow.band.label, "Stres rendah");
  // [4,4,4,0,0,4,0,0,4,4] → butir reverse jadi 4 (total 16) + 24 = 40 → tinggi.
  const rHigh = Scoring.scoreInstrument(pss, [4, 4, 4, 0, 0, 4, 0, 0, 4, 4]);
  assert.equal(rHigh.raw, 40);
  assert.equal(rHigh.band.label, "Stres tinggi");
});

// ---------------------------------------------------------------- PHQ-9
test("PHQ-9: ambang 0-4/5-9/10-14/15-19/20-27 + flag krisis butir 9", () => {
  const phq = byId.phq9;
  assert.equal(Scoring.scoreInstrument(phq, zeros(9)).band.label, "Depresi minimal");
  const mk = (total) => {
    const a = zeros(9);
    let left = total;
    for (let i = 0; i < 9 && left > 0; i++) {
      const v = Math.min(3, left);
      a[i] = v;
      left -= v;
    }
    return a;
  };
  assert.equal(Scoring.scoreInstrument(phq, mk(4)).band.label, "Depresi minimal");
  assert.equal(Scoring.scoreInstrument(phq, mk(5)).band.label, "Depresi ringan");
  assert.equal(Scoring.scoreInstrument(phq, mk(9)).band.label, "Depresi ringan");
  assert.equal(Scoring.scoreInstrument(phq, mk(10)).band.label, "Depresi sedang");
  assert.equal(Scoring.scoreInstrument(phq, mk(14)).band.label, "Depresi sedang");
  assert.equal(Scoring.scoreInstrument(phq, mk(15)).band.label, "Depresi sedang-berat");
  assert.equal(Scoring.scoreInstrument(phq, mk(19)).band.label, "Depresi sedang-berat");
  assert.equal(Scoring.scoreInstrument(phq, mk(20)).band.label, "Depresi berat");
  assert.equal(Scoring.scoreInstrument(phq, maxes(phq)).raw, 27);
  // Butir 9 (indeks 8) > 0 → flag krisis, terlepas dari total.
  const rFlag = Scoring.scoreInstrument(phq, [0, 0, 0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(rFlag.flags, ["crisis"]);
  const rNoFlag = Scoring.scoreInstrument(phq, [1, 1, 1, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(rNoFlag.flags, []);
});

// ---------------------------------------------------------------- GAD-7
test("GAD-7: ambang 0-4/5-9/10-14/15-21", () => {
  const gad = byId.gad7;
  const mk = (total) => {
    const a = zeros(7);
    let left = total;
    for (let i = 0; i < 7 && left > 0; i++) {
      const v = Math.min(3, left);
      a[i] = v;
      left -= v;
    }
    return a;
  };
  assert.equal(Scoring.scoreInstrument(gad, mk(4)).band.label, "Ansietas minimal");
  assert.equal(Scoring.scoreInstrument(gad, mk(9)).band.label, "Ansietas ringan");
  assert.equal(Scoring.scoreInstrument(gad, mk(10)).band.label, "Ansietas sedang");
  assert.equal(Scoring.scoreInstrument(gad, mk(15)).band.label, "Ansietas berat");
  assert.equal(Scoring.scoreInstrument(gad, maxes(gad)).raw, 21);
});

// ---------------------------------------------------------------- DASS-21
test("DASS-21: subskala D/A/S dijumlah lalu dikali 2, band per subskala", () => {
  const dass = byId.dass21;
  // Semua 0 → semua subskala Normal.
  const r0 = Scoring.scoreInstrument(dass, zeros(21));
  assert.deepEqual(r0.subscales.map((s) => s.band.label), ["Normal", "Normal", "Normal"]);

  // Semua 3 → tiap subskala 7×3=21 → ×2 = 42 → Sangat berat.
  const rMax = Scoring.scoreInstrument(dass, maxes(dass));
  rMax.subscales.forEach((s) => {
    assert.equal(s.raw, 21);
    assert.equal(s.score, 42);
    assert.equal(s.band.label, "Sangat berat");
  });

  // Hanya butir Depresi dijawab 2 → D raw 14 → ×2 = 28 → Sangat berat;
  // Ansietas dijawab 1 → raw 7 → ×2 = 14 → Sedang; Stres 0 → Normal.
  const a = zeros(21);
  dass.items.forEach((it, i) => {
    if (it.subscale === "D") a[i] = 2;
    if (it.subscale === "A") a[i] = 1;
  });
  const rMix = Scoring.scoreInstrument(dass, a);
  const get = (k) => rMix.subscales.find((s) => s.key === k);
  assert.equal(get("D").score, 28);
  assert.equal(get("D").band.label, "Sangat berat");
  assert.equal(get("A").score, 14);
  assert.equal(get("A").band.label, "Sedang");
  assert.equal(get("S").score, 0);
  assert.equal(get("S").band.label, "Normal");
  // Subskala Depresi DASS-21 memuat tepat 7 butir.
  assert.equal(dass.items.filter((i) => i.subscale === "D").length, 7);
  assert.equal(dass.items.filter((i) => i.subscale === "A").length, 7);
  assert.equal(dass.items.filter((i) => i.subscale === "S").length, 7);
});

// ---------------------------------------------------------------- WHO-5
test("WHO-5: raw 0-25 ×4 = 0-100, ambang kesejahteraan rendah ≤50", () => {
  const who = byId.who5;
  const rMax = Scoring.scoreInstrument(who, maxes(who));
  assert.equal(rMax.score, 100);
  assert.equal(rMax.band.label, "Kesejahteraan tinggi");
  const r0 = Scoring.scoreInstrument(who, zeros(5));
  assert.equal(r0.score, 0);
  assert.equal(r0.band.label, "Kesejahteraan rendah");
  assert.deepEqual(r0.flags, ["low_wellbeing"]);
  // raw 12 → 48% → rendah; raw 13 → 52% → sedang.
  const r12 = Scoring.scoreInstrument(who, [3, 3, 2, 2, 2]);
  assert.equal(r12.raw, 12);
  assert.equal(r12.score, 48);
  assert.equal(r12.band.label, "Kesejahteraan rendah");
  const r13 = Scoring.scoreInstrument(who, [3, 3, 3, 2, 2]);
  assert.equal(r13.raw, 13);
  assert.equal(r13.score, 52);
  assert.equal(r13.band.label, "Kesejahteraan sedang");
});

// ---------------------------------------------------------------- validasi & indeks
test("Validasi jawaban: panjang salah dan nilai di luar rentang harus gagal", () => {
  assert.throws(() => Scoring.scoreInstrument(byId.gad7, zeros(6)), /jumlah butir/i);
  assert.throws(() => Scoring.scoreInstrument(byId.gad7, zeros(7).map(() => 9)), /tidak valid/i);
  assert.throws(() => Scoring.scoreInstrument(byId.who5, [-1, 0, 0, 0, 0]), /tidak valid/i);
});

test("overallIndex: pakai WHO-5 bila ada; rata-rata (1-fraction) bila tidak", () => {
  const who = byId.who5;
  const rWho = Scoring.scoreInstrument(who, maxes(who));
  assert.equal(Scoring.overallIndex([rWho]), 100);
  const phq = Scoring.scoreInstrument(byId.phq9, maxes(byId.phq9));
  const gad = Scoring.scoreInstrument(byId.gad7, maxes(byId.gad7));
  assert.equal(Scoring.overallIndex([phq, gad]), 0); // semua maksimum → kesejahteraan 0
  const mid = Scoring.scoreInstrument(byId.gad7, [1, 1, 1, 1, 1, 1, 1]); // 7/21
  assert.equal(Scoring.overallIndex([mid]), Math.round((1 - 7 / 21) * 100));
});
