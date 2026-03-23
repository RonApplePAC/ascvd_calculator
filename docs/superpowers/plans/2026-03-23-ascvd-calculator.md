# ASCVD 10-Year Risk Calculator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single offline HTML file that calculates 10-year ASCVD risk using the Pooled Cohort Equations and shows statin benefit estimates when the patient is not on a statin.

**Architecture:** A single `index.html` file containing all HTML, CSS, and JS. The PCE calculation engine lives in `src/pce.js` (testable via Node.js); its content is inlined verbatim into `index.html`'s `<script>` section. The UI is a 4-tab wizard with no frameworks or CDN dependencies — everything works offline.

**Tech Stack:** Vanilla HTML/CSS/JavaScript. Node.js (for running tests only — not required to use the app). No npm, no bundler, no frameworks.

---

## File Map

| File | Purpose |
|------|---------|
| `index.html` | Complete single-file application (HTML + CSS + JS inlined) |
| `src/pce.js` | Pure PCE calculation functions — source of truth, testable in Node.js |
| `tests/test_pce.js` | Node.js unit tests for PCE engine (uses built-in `assert` — no framework) |

---

## Reference Values

Before writing tests you need ground-truth expected values. Use the ACC/AHA online calculator to look up exact results for the test inputs defined in Task 1:

**ACC/AHA ASCVD Risk Estimator:** https://tools.acc.org/ASCVD-risk-estimator-plus/

Record the returned 10-year risk % for each test case before writing any code.

---

## Task 1: PCE Calculation Engine

**Files:**
- Create: `src/pce.js`
- Create: `tests/test_pce.js`

- [ ] **Step 1.1 — Look up reference values**

Before writing a single line of code, go to the ACC/AHA ASCVD Risk Estimator and record the 10-year risk % for these exact inputs. Write the values in the comments at the top of `tests/test_pce.js`. Do not proceed to Step 1.2 until all six values are filled in.

| # | Age | Sex | Race | TC | HDL | SBP | Treated | Smoker | DM | Expected % |
|---|-----|-----|------|----|-----|-----|---------|--------|----|------------|
| 1 | 55 | M | White | 213 | 50 | 120 | No | Never | No | _______ |
| 2 | 55 | F | White | 213 | 50 | 120 | No | Never | No | _______ |
| 3 | 55 | M | AA | 213 | 50 | 120 | No | Never | No | _______ |
| 4 | 55 | F | AA | 213 | 50 | 120 | No | Never | No | _______ |
| 5 | 60 | M | White | 240 | 40 | 150 | Yes | Current | Yes | _______ |
| 6 | 65 | F | AA | 180 | 55 | 130 | Yes | Former | No | _______ |

- [ ] **Step 1.2 — Write the failing tests**

Create `tests/test_pce.js` with the reference values you just looked up:

```js
// tests/test_pce.js
// Reference values from ACC/AHA ASCVD Risk Estimator (tools.acc.org)
// Verified: [DATE YOU CHECKED]
const assert = require('assert');
const { calculateRisk } = require('../src/pce');

// Helper: assert risk is within 0.1 percentage points of expected
function assertRisk(label, result, expected) {
  const diff = Math.abs(result - expected);
  assert(diff <= 0.1, `${label}: expected ${expected}%, got ${result.toFixed(1)}% (diff ${diff.toFixed(2)})`);
}

// Test case 1: White male, low risk
assertRisk('WM baseline',
  calculateRisk({ age: 55, sex: 'male', race: 'white', totalChol: 213, hdl: 50, sbp: 120, bpTreated: false, smoker: 'never', diabetes: false }),
  /* FILL IN */ 0
);

// Test case 2: White female, low risk
assertRisk('WF baseline',
  calculateRisk({ age: 55, sex: 'female', race: 'white', totalChol: 213, hdl: 50, sbp: 120, bpTreated: false, smoker: 'never', diabetes: false }),
  /* FILL IN */ 0
);

// Test case 3: AA male, low risk
assertRisk('AAM baseline',
  calculateRisk({ age: 55, sex: 'male', race: 'african_american', totalChol: 213, hdl: 50, sbp: 120, bpTreated: false, smoker: 'never', diabetes: false }),
  /* FILL IN */ 0
);

// Test case 4: AA female, low risk
assertRisk('AAF baseline',
  calculateRisk({ age: 55, sex: 'female', race: 'african_american', totalChol: 213, hdl: 50, sbp: 120, bpTreated: false, smoker: 'never', diabetes: false }),
  /* FILL IN */ 0
);

// Test case 5: White male, high risk
assertRisk('WM high risk',
  calculateRisk({ age: 60, sex: 'male', race: 'white', totalChol: 240, hdl: 40, sbp: 150, bpTreated: true, smoker: 'current', diabetes: true }),
  /* FILL IN */ 0
);

// Test case 6: AA female, treated HTN
assertRisk('AAF treated HTN',
  calculateRisk({ age: 65, sex: 'female', race: 'african_american', totalChol: 180, hdl: 55, sbp: 130, bpTreated: true, smoker: 'former', diabetes: false }),
  /* FILL IN */ 0
);

console.log('All PCE tests passed.');
```

- [ ] **Step 1.3 — Run tests to confirm they all fail**

```bash
node tests/test_pce.js
```

Expected: error like `Cannot find module '../src/pce'`

- [ ] **Step 1.4 — Create `src/pce.js` with the PCE engine**

```js
// src/pce.js
// Pooled Cohort Equations — Goff et al. 2014, Circulation 129(25 Suppl 2):S49-73, Table B

'use strict';

// Coefficient sets keyed by 'race_sex'
// Each entry: { coeffs, mean, baseline }
// coeffs is a function(inputs) returning the individual sum
const GROUPS = {

  white_female: {
    mean: 26.1931,
    baseline: 0.9665,
    sum(p) {
      const lnA = Math.log(p.age);
      const lnC = Math.log(p.totalChol);
      const lnH = Math.log(p.hdl);
      const lnS = Math.log(p.sbp);
      return -29.799 * lnA
           +   4.884 * lnA * lnA
           +  13.540 * lnC
           +  -3.114 * lnA * lnC
           + -13.578 * lnH
           +   3.149 * lnA * lnH
           + (p.bpTreated ? 2.019 : 1.957) * lnS
           +   7.574 * p.currentSmoker
           +  -1.665 * lnA * p.currentSmoker
           +   0.661 * p.diabetes;
    }
  },

  african_american_female: {
    mean: 86.6081,
    baseline: 0.9533,
    sum(p) {
      const lnA = Math.log(p.age);
      const lnC = Math.log(p.totalChol);
      const lnH = Math.log(p.hdl);
      const lnS = Math.log(p.sbp);
      return  17.1141 * lnA
           +   0.9396 * lnC
           + -18.9196 * lnH
           +   4.4748 * lnA * lnH
           + (p.bpTreated
               ? 29.2907 * lnS + -6.4321 * lnA * lnS
               : 27.8197 * lnS + -6.0873 * lnA * lnS)
           +   0.8738 * p.currentSmoker
           +   0.8738 * p.diabetes;
    }
  },

  white_male: {
    mean: 61.18,
    baseline: 0.9144,
    sum(p) {
      const lnA = Math.log(p.age);
      const lnC = Math.log(p.totalChol);
      const lnH = Math.log(p.hdl);
      const lnS = Math.log(p.sbp);
      return  12.344 * lnA
           +  11.853 * lnC
           +  -2.664 * lnA * lnC
           +  -7.990 * lnH
           +   1.769 * lnA * lnH
           +   1.764 * lnS          // treated and untreated same for white men
           +   7.837 * p.currentSmoker
           +  -1.795 * lnA * p.currentSmoker
           +   0.658 * p.diabetes;
    }
  },

  african_american_male: {
    mean: 19.54,
    baseline: 0.8954,
    sum(p) {
      const lnA = Math.log(p.age);
      const lnC = Math.log(p.totalChol);
      const lnH = Math.log(p.hdl);
      const lnS = Math.log(p.sbp);
      return  2.469 * lnA
           +  0.302 * lnC
           + -0.307 * lnH
           + (p.bpTreated ? 1.916 : 1.809) * lnS
           +  0.549 * p.currentSmoker
           +  0.645 * p.diabetes;
    }
  }
};

/**
 * Calculate 10-year ASCVD risk using the Pooled Cohort Equations.
 *
 * @param {object} p
 * @param {number}  p.age          - years (40-79)
 * @param {string}  p.sex          - 'male' | 'female'
 * @param {string}  p.race         - 'white' | 'african_american' | 'other'
 * @param {number}  p.totalChol    - mg/dL
 * @param {number}  p.hdl          - mg/dL
 * @param {number}  p.sbp          - mmHg (systolic)
 * @param {boolean} p.bpTreated    - on antihypertensive medication
 * @param {string}  p.smoker       - 'current' | 'former' | 'never'
 * @param {boolean} p.diabetes     - history of diabetes
 * @returns {number} 10-year risk as a percentage (e.g. 12.4)
 */
function calculateRisk(p) {
  // 'other' race uses white equations per ACC/AHA guidance
  const raceKey = p.race === 'african_american' ? 'african_american' : 'white';
  const groupKey = `${raceKey}_${p.sex}`;
  const group = GROUPS[groupKey];
  if (!group) throw new Error(`Unknown group: ${groupKey}`);

  const params = {
    age: p.age,
    totalChol: p.totalChol,
    hdl: p.hdl,
    sbp: p.sbp,
    bpTreated: p.bpTreated,
    currentSmoker: p.smoker === 'current' ? 1 : 0,
    diabetes: p.diabetes ? 1 : 0
  };

  const individualSum = group.sum(params);
  const risk = 1 - Math.pow(group.baseline, Math.exp(individualSum - group.mean));
  return Math.round(risk * 1000) / 10; // one decimal place
}

/**
 * Estimate statin benefit by reducing LDL and recalculating risk.
 * Total cholesterol is adjusted by the LDL delta; HDL is held constant.
 *
 * @param {object} baseInputs  - same shape as calculateRisk param
 * @param {number} ldl         - current LDL mg/dL
 * @param {number} reduction   - fractional reduction (e.g. 0.30 for 30%)
 * @returns {{ newLdl, newTotalChol, newRisk, absoluteReduction }}
 */
function calculateStatinBenefit(baseInputs, ldl, reduction) {
  const newLdl = ldl * (1 - reduction);
  const ldlDelta = ldl - newLdl;
  const newTotalChol = baseInputs.totalChol - ldlDelta;
  const adjustedInputs = { ...baseInputs, totalChol: newTotalChol };
  const baseRisk = calculateRisk(baseInputs);
  const newRisk = calculateRisk(adjustedInputs);
  return {
    newLdl: Math.round(newLdl),
    newTotalChol: Math.round(newTotalChol),
    newRisk,
    absoluteReduction: Math.round((baseRisk - newRisk) * 10) / 10
  };
}

// Allow Node.js require() for testing without breaking browser use
if (typeof module !== 'undefined') {
  module.exports = { calculateRisk, calculateStatinBenefit };
}
```

- [ ] **Step 1.5 — Fill in expected values in tests, run tests**

Replace each `/* FILL IN */ 0` in `tests/test_pce.js` with the reference values you recorded in Step 1.1.

```bash
node tests/test_pce.js
```

Expected: `All PCE tests passed.`

If a test fails by more than 0.1%, re-check the reference value from the ACC/AHA calculator and verify the coefficient for that group. The most common source of error is the White Women ln(Age)² term — double-check it is applied as `lnA * lnA`, not `Math.pow(lnA, 2)` (they are equivalent, but verify the coefficient 4.884 is present).

- [ ] **Step 1.6 — Commit**

```bash
git add src/pce.js tests/test_pce.js docs/
git commit -m "feat: PCE calculation engine with passing tests"
```

---

## Task 2: HTML Skeleton + Tab Navigation

**Files:**
- Create: `index.html`

- [ ] **Step 2.1 — Create `index.html` with tab structure**

Create `index.html` with the following structure. This task only covers the skeleton — inputs come in Tasks 3–5.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ASCVD Risk Calculator</title>
<style>
/* ── Reset & Base ─────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
       background: #f1f3f5; min-height: 100vh; display: flex;
       align-items: flex-start; justify-content: center; padding: 24px 16px; }
.app { width: 100%; max-width: 640px; }
h1  { font-size: 18px; font-weight: 700; color: #1864ab; margin-bottom: 20px;
      letter-spacing: -0.3px; }

/* ── Tabs ─────────────────────────────────────────── */
.tabs { display: flex; }
.tab  { flex: 1; padding: 10px 8px; font-size: 12px; font-weight: 600;
        text-align: center; background: #e9ecef; color: #868e96;
        border: 1px solid #dee2e6; border-bottom: none; cursor: pointer;
        transition: background 0.15s; user-select: none; }
.tab:first-child { border-radius: 6px 0 0 0; }
.tab:last-child  { border-radius: 0 6px 0 0; }
.tab:not(:first-child) { border-left: none; }
.tab.active { background: #1971c2; color: #fff; border-color: #1971c2; }
.tab.done   { background: #d3f9d8; color: #2b8a3e; border-color: #b2f2bb; cursor: pointer; }

/* ── Panel ────────────────────────────────────────── */
.panel { background: #fff; border: 1px solid #dee2e6;
         border-radius: 0 0 8px 8px; padding: 24px; }
.step  { display: none; }
.step.active { display: block; }

/* ── Form elements ────────────────────────────────── */
.field        { margin-bottom: 16px; }
.field label  { display: block; font-size: 12px; font-weight: 600;
                color: #495057; margin-bottom: 5px; }
.field input  { width: 100%; padding: 8px 10px; border: 1px solid #ced4da;
                border-radius: 5px; font-size: 14px; color: #212529;
                outline: none; transition: border-color 0.15s; }
.field input:focus { border-color: #74c0fc; }
.field input.error { border-color: #fa5252; }
.field .hint  { font-size: 11px; color: #adb5bd; margin-top: 3px; }
.field .err   { font-size: 11px; color: #fa5252; margin-top: 3px; display: none; }
.field .err.show { display: block; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* ── Toggle buttons ───────────────────────────────── */
.toggle-group   { display: flex; gap: 6px; }
.toggle-btn     { flex: 1; padding: 8px; border: 1px solid #dee2e6;
                  border-radius: 5px; font-size: 13px; text-align: center;
                  cursor: pointer; background: #f8f9fa; color: #495057;
                  transition: all 0.15s; user-select: none; }
.toggle-btn.selected { background: #d0ebff; border-color: #74c0fc;
                        color: #1864ab; font-weight: 600; }

/* ── Radio group (smoking) ────────────────────────── */
.radio-group     { display: flex; flex-direction: column; gap: 5px; }
.radio-opt       { display: flex; align-items: center; gap: 8px;
                   padding: 7px 10px; border: 1px solid #dee2e6;
                   border-radius: 5px; cursor: pointer; font-size: 13px;
                   background: #f8f9fa; color: #495057; transition: all 0.15s; }
.radio-opt.selected { background: #d0ebff; border-color: #74c0fc;
                       color: #1864ab; font-weight: 600; }
.radio-opt input[type=radio] { display: none; }

/* ── Warning banner ───────────────────────────────── */
.warning { background: #fff3cd; border: 1px solid #ffc107;
           border-radius: 5px; padding: 10px 14px; font-size: 12px;
           color: #856404; margin-bottom: 16px; display: none; }
.warning.show { display: block; }

/* ── Nav buttons ──────────────────────────────────── */
.nav { display: flex; justify-content: space-between; margin-top: 24px; }
.btn { padding: 10px 22px; border-radius: 5px; font-size: 13px;
       font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
.btn-primary  { background: #1971c2; color: #fff; }
.btn-primary:hover  { background: #1864ab; }
.btn-success  { background: #2f9e44; color: #fff; }
.btn-success:hover  { background: #2b8a3e; }
.btn-ghost    { background: #f1f3f5; color: #495057;
                border: 1px solid #dee2e6; }
.btn-ghost:hover    { background: #e9ecef; }

/* ── Results ──────────────────────────────────────── */
.risk-box      { text-align: center; border-radius: 8px; padding: 20px;
                 margin-bottom: 20px; border: 2px solid; }
.risk-box .pct { font-size: 52px; font-weight: 900; line-height: 1; }
.risk-box .lbl { font-size: 13px; font-weight: 600; margin-top: 6px; }
.risk-low      { background: #ebfbee; border-color: #8ce99a; color: #2b8a3e; }
.risk-borderline { background: #fff9db; border-color: #ffe066; color: #e67700; }
.risk-intermediate { background: #fff4e6; border-color: #ffa94d; color: #d9480f; }
.risk-high     { background: #fff5f5; border-color: #ffa8a8; color: #c92a2a; }

.statin-section { background: #f4fce3; border: 1px solid #94d82d;
                  border-radius: 8px; padding: 20px; }
.statin-title   { font-size: 12px; font-weight: 700; color: #5c940d;
                  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
.statin-grid    { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.statin-col     { background: #fff; border: 1px solid #c0eb75;
                  border-radius: 6px; padding: 12px; text-align: center; }
.statin-col.highlight { border: 2px solid #2f9e44; }
.statin-col .intensity { font-size: 10px; font-weight: 700; color: #5c940d;
                          text-transform: uppercase; margin-bottom: 6px; }
.statin-col .ldl-new   { font-size: 13px; color: #495057; margin-bottom: 2px; }
.statin-col .risk-new  { font-size: 16px; font-weight: 800; color: #2f9e44; }
.statin-col .abs-red   { font-size: 11px; color: #74b816; margin-top: 4px; }
.statin-note    { font-size: 10px; color: #74b816; margin-top: 10px; }

.result-nav { display: flex; justify-content: space-between; margin-top: 20px; }
</style>
</head>
<body>
<div class="app">
  <h1>ASCVD 10-Year Risk Calculator</h1>

  <!-- Tab bar -->
  <div class="tabs" id="tabBar">
    <div class="tab active" data-step="0">1 · Demographics</div>
    <div class="tab"        data-step="1">2 · Labs</div>
    <div class="tab"        data-step="2">3 · History &amp; Meds</div>
    <div class="tab"        data-step="3">4 · Results</div>
  </div>

  <div class="panel">

    <!-- Step 0: Demographics -->
    <div class="step active" id="step0">
      <!-- fields added in Task 3 -->
      <div class="nav">
        <span></span>
        <button class="btn btn-primary" onclick="nextStep()">Next: Labs →</button>
      </div>
    </div>

    <!-- Step 1: Labs -->
    <div class="step" id="step1">
      <!-- fields added in Task 3 -->
      <div class="nav">
        <button class="btn btn-ghost" onclick="prevStep()">← Back</button>
        <button class="btn btn-primary" onclick="nextStep()">Next: History →</button>
      </div>
    </div>

    <!-- Step 2: History & Meds -->
    <div class="step" id="step2">
      <!-- fields added in Task 4 -->
      <div class="nav">
        <button class="btn btn-ghost" onclick="prevStep()">← Back</button>
        <button class="btn btn-success" onclick="calculate()">Calculate Risk →</button>
      </div>
    </div>

    <!-- Step 3: Results -->
    <div class="step" id="step3">
      <!-- populated by calculate() in Task 5 -->
      <div id="ageWarning" class="warning"></div>
      <div id="riskBox" class="risk-box"></div>
      <div id="statinSection" class="statin-section" style="display:none"></div>
      <div class="result-nav">
        <button class="btn btn-ghost" onclick="goToStep(2)">← Edit Inputs</button>
        <button class="btn btn-ghost" onclick="resetForm()">↺ New Patient</button>
      </div>
    </div>

  </div>
</div>

<script>
// ── Navigation state ───────────────────────────────────────
let currentStep = 0;

function goToStep(n) {
  document.querySelectorAll('.step').forEach((el, i) => {
    el.classList.toggle('active', i === n);
  });
  document.querySelectorAll('.tab').forEach((el, i) => {
    el.classList.toggle('active', i === n);
  });
  currentStep = n;
}

function nextStep() {
  if (!validateStep(currentStep)) return;
  goToStep(currentStep + 1);
}

function prevStep() {
  goToStep(currentStep - 1);
}

function validateStep(step) {
  // Validation logic added in Task 3 and 4
  return true;
}

function calculate() {
  if (!validateStep(2)) return;
  // Calculation logic added in Task 5
  goToStep(3);
}

function resetForm() {
  // Reset logic added in Task 6
  goToStep(0);
}

// Tab click-to-jump (only for completed tabs)
document.querySelectorAll('.tab').forEach((tab, i) => {
  tab.addEventListener('click', () => {
    if (i < currentStep || i === currentStep) goToStep(i);
  });
});

// PCE engine will be inlined here in Task 6
</script>
</body>
</html>
```

- [ ] **Step 2.2 — Open in browser and verify tab skeleton works**

Open `index.html` in Edge or Chrome (double-click or File → Open).

Verify:
- Tab 1 is highlighted blue
- "Next: Labs →" button advances to tab 2
- "← Back" button on tab 2 returns to tab 1
- Tabs 1 and 2 are clickable to jump between visited steps

- [ ] **Step 2.3 — Commit**

```bash
git add index.html
git commit -m "feat: HTML skeleton with 4-tab navigation"
```

---

## Task 3: Demographics Tab (Tab 1) + Labs Tab (Tab 2)

**Files:**
- Modify: `index.html` — replace placeholder content in `#step0` and `#step1`

- [ ] **Step 3.1 — Replace `#step0` content with demographics fields**

Replace the comment `<!-- fields added in Task 3 -->` inside `#step0` with:

```html
<div id="ageWarningBanner" class="warning"></div>

<div class="grid-2">
  <div class="field">
    <label for="age">Age (years)</label>
    <input type="number" id="age" placeholder="40–79" min="18" max="100">
    <div class="err" id="ageErr">Required (40–79)</div>
  </div>
  <div class="field">
    <label>Sex</label>
    <div class="toggle-group">
      <div class="toggle-btn selected" data-group="sex" data-value="male" onclick="selectToggle(this)">Male</div>
      <div class="toggle-btn"          data-group="sex" data-value="female" onclick="selectToggle(this)">Female</div>
    </div>
  </div>
</div>

<div class="field">
  <label for="race">Race / Ethnicity</label>
  <select id="race" style="width:100%;padding:8px 10px;border:1px solid #ced4da;border-radius:5px;font-size:14px;">
    <option value="white">White</option>
    <option value="african_american">African American</option>
    <option value="other">Other (uses White equation)</option>
  </select>
</div>
```

- [ ] **Step 3.2 — Replace `#step1` content with lab fields**

Replace the comment `<!-- fields added in Task 3 -->` inside `#step1` with:

```html
<div class="grid-2">
  <div class="field">
    <label for="sbp">Systolic BP (mmHg)</label>
    <input type="number" id="sbp" placeholder="e.g. 128">
    <div class="err" id="sbpErr">Required (70–250)</div>
  </div>
  <div class="field">
    <label for="dbp">Diastolic BP (mmHg)</label>
    <input type="number" id="dbp" placeholder="e.g. 82">
    <div class="hint">Collected for context</div>
  </div>
  <div class="field">
    <label for="totalChol">Total Cholesterol (mg/dL)</label>
    <input type="number" id="totalChol" placeholder="e.g. 200">
    <div class="err" id="totalCholErr">Required (100–400)</div>
  </div>
  <div class="field">
    <label for="hdl">HDL (mg/dL)</label>
    <input type="number" id="hdl" placeholder="e.g. 50">
    <div class="err" id="hdlErr">Required (20–150)</div>
  </div>
  <div class="field">
    <label for="ldl">LDL (mg/dL)</label>
    <input type="number" id="ldl" placeholder="e.g. 120">
    <div class="hint">Used for statin benefit estimate</div>
    <div class="err" id="ldlErr">Required when not on statin (10–300)</div>
  </div>
</div>
```

- [ ] **Step 3.3 — Add `selectToggle` helper to the `<script>` block**

Add this function to the script section (before the closing `</script>`):

```js
function selectToggle(el) {
  const group = el.dataset.group;
  document.querySelectorAll(`[data-group="${group}"]`).forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function getToggle(group) {
  const sel = document.querySelector(`[data-group="${group}"].selected`);
  return sel ? sel.dataset.value : null;
}
```

- [ ] **Step 3.4 — Implement `validateStep` for steps 0 and 1**

Replace the stub `validateStep` function in the script:

```js
function validateStep(step) {
  let valid = true;

  function require(id, errId, condition) {
    const el = document.getElementById(id);
    const err = document.getElementById(errId);
    if (!condition(el.value)) {
      el.classList.add('error');
      if (err) err.classList.add('show');
      valid = false;
    } else {
      el.classList.remove('error');
      if (err) err.classList.remove('show');
    }
  }

  if (step === 0) {
    const ageVal = parseFloat(document.getElementById('age').value);
    require('age', 'ageErr', v => v !== '' && !isNaN(v) && v >= 18 && v <= 110);
    // Show warning but do not block if age outside 40-79
    const banner = document.getElementById('ageWarningBanner');
    if (!isNaN(ageVal) && (ageVal < 40 || ageVal > 79)) {
      banner.textContent = `Age ${ageVal} is outside the validated range (40–79). Risk estimate may be less accurate.`;
      banner.classList.add('show');
    } else {
      banner.classList.remove('show');
    }
  }

  if (step === 1) {
    require('sbp', 'sbpErr', v => v !== '' && +v >= 70 && +v <= 250);
    require('totalChol', 'totalCholErr', v => v !== '' && +v >= 100 && +v <= 400);
    require('hdl', 'hdlErr', v => v !== '' && +v >= 20 && +v <= 150);
    // LDL required only when patient not on statin (checked in step 2 — skip here)
  }

  return valid;
}
```

- [ ] **Step 3.5 — Open in browser, test validation**

- Enter age 30 → should show warning but allow advancing
- Leave age blank → should block with error
- Leave SBP blank on tab 2 → should block with error

- [ ] **Step 3.6 — Commit**

```bash
git add index.html
git commit -m "feat: demographics and labs tabs with validation"
```

---

## Task 4: History & Meds Tab (Tab 3)

**Files:**
- Modify: `index.html` — replace placeholder content in `#step2`

- [ ] **Step 4.1 — Replace `#step2` content with history/meds fields**

Replace the comment `<!-- fields added in Task 4 -->` inside `#step2` with:

```html
<div class="grid-2">
  <div class="field">
    <label>Smoking Status</label>
    <div class="radio-group">
      <label class="radio-opt selected" data-group="smoker" data-value="never">
        <input type="radio" name="smoker" value="never" checked> Never
      </label>
      <label class="radio-opt" data-group="smoker" data-value="former">
        <input type="radio" name="smoker" value="former"> Former
      </label>
      <label class="radio-opt" data-group="smoker" data-value="current">
        <input type="radio" name="smoker" value="current"> Current
      </label>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:12px;">
    <div class="field">
      <label>Diabetes (Hx)</label>
      <div class="toggle-group">
        <div class="toggle-btn" data-group="diabetes" data-value="yes" onclick="selectToggle(this)">Yes</div>
        <div class="toggle-btn selected" data-group="diabetes" data-value="no" onclick="selectToggle(this)">No</div>
      </div>
    </div>
    <div class="field">
      <label>On HTN Treatment</label>
      <div class="toggle-group">
        <div class="toggle-btn" data-group="bpTreated" data-value="yes" onclick="selectToggle(this)">Yes</div>
        <div class="toggle-btn selected" data-group="bpTreated" data-value="no" onclick="selectToggle(this)">No</div>
      </div>
    </div>
    <div class="field">
      <label>On Statin</label>
      <div class="toggle-group">
        <div class="toggle-btn" data-group="onStatin" data-value="yes" onclick="selectToggle(this)">Yes</div>
        <div class="toggle-btn selected" data-group="onStatin" data-value="no" onclick="selectToggle(this)">No</div>
      </div>
    </div>
    <div class="field">
      <label>On Aspirin</label>
      <div class="toggle-group">
        <div class="toggle-btn" data-group="onAspirin" data-value="yes" onclick="selectToggle(this)">Yes</div>
        <div class="toggle-btn selected" data-group="onAspirin" data-value="no" onclick="selectToggle(this)">No</div>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 4.2 — Wire up radio-opt click handler**

Add to the script section (alongside `selectToggle`):

```js
document.querySelectorAll('.radio-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    const group = opt.dataset.group;
    document.querySelectorAll(`[data-group="${group}"]`).forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.querySelector('input[type=radio]').checked = true;
  });
});

function getRadio(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}
```

- [ ] **Step 4.3 — Add step 2 validation to `validateStep`**

In `validateStep`, add after the `step === 1` block:

```js
  if (step === 2) {
    // If patient is not on statin, LDL is required for statin benefit calculation
    const notOnStatin = getToggle('onStatin') === 'no';
    if (notOnStatin) {
      require('ldl', 'ldlErr', v => v !== '' && +v >= 10 && +v <= 300);
    }
  }
```

- [ ] **Step 4.4 — Open in browser, verify**

- Toggle all Yes/No buttons — only one should be highlighted per group
- Select each smoking status — should highlight selected option
- Switch "On Statin" to No, leave LDL blank, click Calculate → should show LDL error

- [ ] **Step 4.5 — Commit**

```bash
git add index.html
git commit -m "feat: history and meds tab with statin-conditional LDL validation"
```

---

## Task 5: Results Tab — Risk Display + Statin Benefit Panel

**Files:**
- Modify: `index.html` — implement `calculate()` and render functions

- [ ] **Step 5.1 — Inline `src/pce.js` into `index.html`**

Copy the full contents of `src/pce.js` and paste it into the `<script>` block in `index.html`, immediately before the `// ── Navigation state` comment. Remove the `'use strict';` line if present (already strict in a module context) — or keep it, either is fine.

Note: `src/pce.js` remains the source of truth. If you ever need to fix a calculation bug, edit `src/pce.js`, re-run the Node tests, then re-copy its contents into `index.html`.

- [ ] **Step 5.2 — Implement `getRiskClass` helper**

Add to the script section:

```js
function getRiskClass(pct) {
  if (pct < 5)   return { cls: 'risk-low',          label: 'Low Risk (< 5%)' };
  if (pct < 7.5) return { cls: 'risk-borderline',   label: 'Borderline Risk (5% – 7.4%)' };
  if (pct < 20)  return { cls: 'risk-intermediate', label: 'Intermediate Risk (7.5% – 20%)' };
  return             { cls: 'risk-high',             label: 'High Risk (≥ 20%)' };
}
```

- [ ] **Step 5.3 — Implement `getFormInputs` helper**

Add to the script section:

```js
function getFormInputs() {
  return {
    age:       parseFloat(document.getElementById('age').value),
    sex:       getToggle('sex'),
    race:      document.getElementById('race').value,
    totalChol: parseFloat(document.getElementById('totalChol').value),
    hdl:       parseFloat(document.getElementById('hdl').value),
    sbp:       parseFloat(document.getElementById('sbp').value),
    bpTreated: getToggle('bpTreated') === 'yes',
    smoker:    getRadio('smoker'),
    diabetes:  getToggle('diabetes') === 'yes',
    onStatin:  getToggle('onStatin') === 'yes',
    ldl:       parseFloat(document.getElementById('ldl').value) || null
  };
}
```

- [ ] **Step 5.4 — Implement `calculate()` function**

Replace the stub `calculate()` function:

```js
function calculate() {
  if (!validateStep(2)) return;

  const p = getFormInputs();
  const risk = calculateRisk(p);
  const { cls, label } = getRiskClass(risk);

  // Age warning on results tab
  const ageWarn = document.getElementById('ageWarning');
  if (p.age < 40 || p.age > 79) {
    ageWarn.textContent = `Age ${p.age} is outside the validated range (40–79). Estimate may be less accurate.`;
    ageWarn.classList.add('show');
  } else {
    ageWarn.classList.remove('show');
  }

  // Risk box
  const riskBox = document.getElementById('riskBox');
  riskBox.className = `risk-box ${cls}`;
  riskBox.innerHTML = `
    <div class="pct">${risk.toFixed(1)}%</div>
    <div class="lbl">${label}</div>
  `;

  // Statin benefit
  const statinSection = document.getElementById('statinSection');
  if (!p.onStatin && p.ldl) {
    const intensities = [
      { label: 'Low',      pct: 0.30, highlight: false },
      { label: 'Moderate', pct: 0.40, highlight: true  },
      { label: 'High',     pct: 0.50, highlight: false }
    ];
    const cols = intensities.map(({ label, pct, highlight }) => {
      const b = calculateStatinBenefit(p, p.ldl, pct);
      return `
        <div class="statin-col ${highlight ? 'highlight' : ''}">
          <div class="intensity">${label}${highlight ? ' ★' : ''}</div>
          <div class="ldl-new">LDL ↓ ${Math.round(pct*100)}% → ${b.newLdl} mg/dL</div>
          <div class="risk-new">${b.newRisk.toFixed(1)}%</div>
          <div class="abs-red">↓ ${b.absoluteReduction} pts</div>
        </div>`;
    }).join('');

    statinSection.innerHTML = `
      <div class="statin-title">Estimated Statin Benefit (patient not on statin)</div>
      <div class="statin-grid">${cols}</div>
      <div class="statin-note">
        Risk recalculated using Pooled Cohort Equations with adjusted total cholesterol.
        HDL held constant. LDL reduction based on published statin intensity data.
      </div>`;
    statinSection.style.display = 'block';
  } else {
    statinSection.style.display = 'none';
  }

  goToStep(3);
}
```

- [ ] **Step 5.5 — Open in browser, run end-to-end test**

Enter the values from test case 1 (Task 1, Step 1.1) manually into the form:
- Age 55, Male, White, TC 213, HDL 50, SBP 120, untreated, never smoker, no DM, not on statin, LDL 140

Click Calculate. Verify:
- Risk % matches the reference value (±0.1%)
- Risk category label is correct
- Statin benefit panel shows three columns
- "Low" and "High" columns show smaller and larger LDL reductions respectively
- "Moderate" column has the highlighted border

For the statin columns: verify visually that Low shows ~30% LDL reduction, Moderate ~40%, High ~50%, and that the recalculated risk numbers decrease progressively. Exact statin benefit values are deterministic from the PCE — if the base risk is correct and the math in `calculateStatinBenefit` matches the spec, the columns will be correct.

Then test with "On Statin = Yes" — statin benefit panel should disappear.

- [ ] **Step 5.6 — Commit**

```bash
git add index.html
git commit -m "feat: results tab with PCE risk display and statin benefit panel"
```

---

## Task 6: Reset, Final Polish, and Packaging

**Files:**
- Modify: `index.html`

- [ ] **Step 6.1 — Implement `resetForm()`**

Replace the stub `resetForm()` function:

```js
function resetForm() {
  // Clear all number inputs
  document.querySelectorAll('input[type=number]').forEach(el => {
    el.value = '';
    el.classList.remove('error');
  });
  // Clear all error messages
  document.querySelectorAll('.err').forEach(el => el.classList.remove('show'));
  // Clear warnings
  document.querySelectorAll('.warning').forEach(el => el.classList.remove('show'));
  // Reset toggles to defaults
  [['sex','male'], ['diabetes','no'], ['bpTreated','no'], ['onStatin','no'], ['onAspirin','no']].forEach(([group, defaultVal]) => {
    document.querySelectorAll(`[data-group="${group}"]`).forEach(b => {
      b.classList.toggle('selected', b.dataset.value === defaultVal);
    });
  });
  // Reset smoking to Never
  document.querySelectorAll('[data-group="smoker"]').forEach(o => {
    const isNever = o.dataset.value === 'never';
    o.classList.toggle('selected', isNever);
    const radio = o.querySelector('input[type=radio]');
    if (radio) radio.checked = isNever;
  });
  goToStep(0);
}
```

- [ ] **Step 6.2 — Mark completed tabs**

Update `goToStep` to mark visited tabs with the `done` class:

```js
function goToStep(n) {
  document.querySelectorAll('.step').forEach((el, i) => el.classList.toggle('active', i === n));
  document.querySelectorAll('.tab').forEach((el, i) => {
    el.classList.toggle('active', i === n);
    el.classList.toggle('done', i < n);
  });
  currentStep = n;
}
```

- [ ] **Step 6.3 — Verify file works 100% offline**

1. Disconnect from the internet (disable WiFi or unplug ethernet)
2. Open `index.html` directly by double-clicking in Windows Explorer
3. Complete a full calculation — verify results appear correctly
4. Reconnect internet

- [ ] **Step 6.4 — Run Node.js tests one final time**

```bash
node tests/test_pce.js
```

Expected: `All PCE tests passed.`

- [ ] **Step 6.5 — Final commit**

```bash
git add index.html
git commit -m "feat: reset logic, tab done-state styling, verified offline"
```

---

## Done

The deliverable is `index.html` — a single file that:
- Opens in Edge/Chrome/Firefox on Windows with no installation
- Works with no internet connection
- Calculates 10-year ASCVD risk using the 2013 ACC/AHA Pooled Cohort Equations
- Shows statin benefit estimates (low/moderate/high intensity) when patient is not on statin
- Validates all required inputs before advancing tabs
- Resets fully for the next patient
