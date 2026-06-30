# Statin Guidelines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ACC/AHA-aligned statin therapy guideline recommendations to the ASCVD calculator results tab for primary prevention patients.

**Architecture:** A new pure function `getStatinRecommendation({ risk, ldl, diabetes, existingASCVD, familyHxPrematureASCVD })` encapsulates all guideline logic and returns a recommendation object. The existing `calculate()` in `index.html` calls this function and renders a guideline banner + column highlight (or adequacy card for on-statin patients) inside the existing `#statinSection` div. The function lives in both `src/statin-guidelines.js` (for Node.js testing) and inline in `index.html`'s `<script>` block (for the browser).

**Tech Stack:** Vanilla HTML/CSS/JS. Node.js for tests. No build step.

## Global Constraints

- Single `index.html` file — all HTML, CSS, JS inline; no external dependencies
- `src/pce.js` is NOT modified
- Tests run with: `node tests/test_statin_guidelines.js`
- All CSS added inside the existing `<style>` block in `index.html`
- `getStatinRecommendation()` is a pure function — it does not call `calculateRisk()`; `risk` is passed in as a pre-computed value
- Reset (`resetForm()`) must clear both new toggles to `'no'`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/statin-guidelines.js` | Create | `getStatinRecommendation()` with `module.exports` for testing |
| `tests/test_statin_guidelines.js` | Create | 12 assertion tests covering all branches |
| `index.html` | Modify | New toggles in Step 2; `getFormInputs()`; `resetForm()`; inline `getStatinRecommendation()`; updated `calculate()`; new CSS |

---

### Task 1: `getStatinRecommendation()` — logic module and tests

**Files:**
- Create: `src/statin-guidelines.js`
- Create: `tests/test_statin_guidelines.js`

**Interfaces:**
- Produces: `getStatinRecommendation({ risk, ldl, diabetes, existingASCVD, familyHxPrematureASCVD })` → `{ outOfScope, outOfScopeMsg?, intensity, headline, detail, enhancers, footerNote }`
  - `outOfScope`: boolean
  - `outOfScopeMsg`: string (only when `outOfScope === true`)
  - `intensity`: `'none' | 'low' | 'moderate' | 'high'` (absent when `outOfScope`)
  - `headline`: string
  - `detail`: string (may be empty)
  - `enhancers`: string[] (detected enhancers, e.g. `['Family history of premature ASCVD']`)
  - `footerNote`: string | null

- [ ] **Step 1: Write the failing tests**

Create `tests/test_statin_guidelines.js`:

```javascript
'use strict';
const assert = require('assert');
const { getStatinRecommendation } = require('../src/statin-guidelines');

function base(overrides) {
  return Object.assign({ risk: 10, ldl: 130, diabetes: false, existingASCVD: false, familyHxPrematureASCVD: false }, overrides);
}

// Out of scope: existing ASCVD
const r1 = getStatinRecommendation(base({ existingASCVD: true }));
assert(r1.outOfScope === true, 'existingASCVD: outOfScope should be true');
assert(r1.outOfScopeMsg.includes('Secondary prevention'), 'existingASCVD: msg should mention secondary prevention');

// Out of scope: diabetes
const r2 = getStatinRecommendation(base({ diabetes: true }));
assert(r2.outOfScope === true, 'diabetes: outOfScope should be true');
assert(r2.outOfScopeMsg.includes('diabetes'), 'diabetes: msg should mention diabetes');

// LDL >= 190 override (low background risk)
const r3 = getStatinRecommendation(base({ risk: 3, ldl: 195 }));
assert(r3.outOfScope === false, 'ldl190: not out of scope');
assert(r3.intensity === 'high', 'ldl190: intensity should be high');
assert(r3.headline.includes('≥ 190'), 'ldl190: headline should mention >= 190');

// Low risk, no enhancers
const r4 = getStatinRecommendation(base({ risk: 3, ldl: 130 }));
assert(r4.intensity === 'none', 'low-no-enhancer: intensity should be none');
assert(r4.enhancers.length === 0, 'low-no-enhancer: no enhancers');

// Low risk, LDL 160-189
const r5 = getStatinRecommendation(base({ risk: 3, ldl: 172 }));
assert(r5.intensity === 'low', 'low-ldl160: intensity should be low');
assert(r5.enhancers.length === 1, 'low-ldl160: one enhancer');

// Low risk, family Hx
const r6 = getStatinRecommendation(base({ risk: 3, ldl: 130, familyHxPrematureASCVD: true }));
assert(r6.intensity === 'low', 'low-famhx: intensity should be low');
assert(r6.enhancers.length === 1, 'low-famhx: one enhancer');

// Borderline, no enhancers
const r7 = getStatinRecommendation(base({ risk: 6, ldl: 130 }));
assert(r7.intensity === 'none', 'borderline-no-enhancer: intensity should be none');

// Borderline, family Hx
const r8 = getStatinRecommendation(base({ risk: 6, ldl: 130, familyHxPrematureASCVD: true }));
assert(r8.intensity === 'low', 'borderline-famhx: intensity should be low');

// Intermediate, no enhancers
const r9 = getStatinRecommendation(base({ risk: 12, ldl: 130 }));
assert(r9.intensity === 'moderate', 'intermediate: intensity should be moderate');
assert(r9.footerNote !== null, 'intermediate: footerNote should mention CAC');

// Intermediate, family Hx → still moderate, headline mentions high
const r10 = getStatinRecommendation(base({ risk: 12, ldl: 130, familyHxPrematureASCVD: true }));
assert(r10.intensity === 'moderate', 'intermediate-famhx: intensity should be moderate');
assert(r10.headline.includes('high-intensity also reasonable'), 'intermediate-famhx: headline should mention high');

// High risk
const r11 = getStatinRecommendation(base({ risk: 25, ldl: 130 }));
assert(r11.intensity === 'high', 'high: intensity should be high');

// Both enhancers (family Hx + LDL 160-189)
const r12 = getStatinRecommendation(base({ risk: 6, ldl: 172, familyHxPrematureASCVD: true }));
assert(r12.enhancers.length === 2, 'both-enhancers: should detect two enhancers');

console.log('All statin guidelines tests passed.');
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node tests/test_statin_guidelines.js
```

Expected: `Error: Cannot find module '../src/statin-guidelines'`

- [ ] **Step 3: Implement `src/statin-guidelines.js`**

Create `src/statin-guidelines.js`:

```javascript
'use strict';

function getStatinRecommendation({ risk, ldl, diabetes, existingASCVD, familyHxPrematureASCVD }) {
  if (existingASCVD) {
    return { outOfScope: true, outOfScopeMsg: 'Secondary prevention guidelines are outside this tool\'s scope.' };
  }
  if (diabetes) {
    return { outOfScope: true, outOfScopeMsg: 'Statin guidelines for patients with diabetes are outside this tool\'s scope.' };
  }

  const enhancers = [];
  if (familyHxPrematureASCVD) enhancers.push('Family history of premature ASCVD');
  if (ldl !== null && ldl >= 160 && ldl < 190) enhancers.push(`LDL ${ldl} mg/dL (160–189 range)`);
  const hasEnhancer = enhancers.length > 0;

  if (ldl !== null && ldl >= 190) {
    return {
      outOfScope: false, intensity: 'high',
      headline: 'LDL ≥ 190 mg/dL — evaluate for familial hypercholesterolemia.',
      detail: 'High-intensity statin therapy indicated regardless of calculated 10-year risk.',
      enhancers: [], footerNote: null
    };
  }

  if (risk < 5) {
    if (!hasEnhancer) {
      return {
        outOfScope: false, intensity: 'none',
        headline: 'Lifestyle modifications recommended. Statin generally not indicated.',
        detail: 'Reassess ASCVD risk in 4–6 years.', enhancers: [], footerNote: null
      };
    }
    return {
      outOfScope: false, intensity: 'low',
      headline: 'Risk enhancer(s) present — consider statin discussion.',
      detail: 'Some experts suggest moderate-intensity statin. Reassess in 4–6 years.',
      enhancers, footerNote: null
    };
  }

  if (risk < 7.5) {
    if (!hasEnhancer) {
      return {
        outOfScope: false, intensity: 'none',
        headline: 'Benefit from statin therapy is generally small.',
        detail: 'Individualize risk–benefit discussion. Lifestyle modifications are primary.',
        enhancers: [], footerNote: null
      };
    }
    return {
      outOfScope: false, intensity: 'low',
      headline: 'Risk enhancer(s) present — consider statin discussion.',
      detail: 'Risk–benefit discussion recommended.', enhancers, footerNote: null
    };
  }

  if (risk < 20) {
    return {
      outOfScope: false, intensity: 'moderate',
      headline: familyHxPrematureASCVD
        ? 'Moderate-intensity statin recommended; high-intensity also reasonable.'
        : 'Moderate-intensity statin therapy recommended.',
      detail: '', enhancers,
      footerNote: 'CAC scoring can help reclassify risk if clinical uncertainty exists.'
    };
  }

  return {
    outOfScope: false, intensity: 'high',
    headline: 'High-intensity statin therapy recommended.',
    detail: '', enhancers, footerNote: null
  };
}

if (typeof module !== 'undefined') {
  module.exports = { getStatinRecommendation };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node tests/test_statin_guidelines.js
```

Expected: `All statin guidelines tests passed.`

- [ ] **Step 5: Commit**

```bash
git add src/statin-guidelines.js tests/test_statin_guidelines.js
git commit -m "feat: add getStatinRecommendation logic module with tests"
```

---

### Task 2: New form inputs

**Files:**
- Modify: `index.html` (Step 2 HTML, `getFormInputs()`, `resetForm()`)

**Interfaces:**
- Consumes: nothing from Task 1 (UI only)
- Produces: `getFormInputs()` now returns `existingASCVD: boolean` and `familyHxPrematureASCVD: boolean`

- [ ] **Step 1: Add two toggle fields to the History & Meds right column**

In `index.html`, find the closing `</div>` of the right column in Step 2 (after the `On Aspirin` field). The right column ends at:
```html
          <div class="field">
            <label>On Aspirin</label>
            <div class="toggle-group">
              <div class="toggle-btn" data-group="onAspirin" data-value="yes" onclick="selectToggle(this)">Yes</div>
              <div class="toggle-btn selected" data-group="onAspirin" data-value="no" onclick="selectToggle(this)">No</div>
            </div>
          </div>
        </div>
```

Replace it with:
```html
          <div class="field">
            <label>On Aspirin</label>
            <div class="toggle-group">
              <div class="toggle-btn" data-group="onAspirin" data-value="yes" onclick="selectToggle(this)">Yes</div>
              <div class="toggle-btn selected" data-group="onAspirin" data-value="no" onclick="selectToggle(this)">No</div>
            </div>
          </div>
          <div class="field">
            <label>Existing ASCVD / CVD</label>
            <div class="toggle-group">
              <div class="toggle-btn" data-group="existingASCVD" data-value="yes" onclick="selectToggle(this)">Yes</div>
              <div class="toggle-btn selected" data-group="existingASCVD" data-value="no" onclick="selectToggle(this)">No</div>
            </div>
          </div>
          <div class="field">
            <label>Family Hx: Premature ASCVD</label>
            <div class="toggle-group">
              <div class="toggle-btn" data-group="familyHx" data-value="yes" onclick="selectToggle(this)">Yes</div>
              <div class="toggle-btn selected" data-group="familyHx" data-value="no" onclick="selectToggle(this)">No</div>
            </div>
            <div class="hint">1st-degree relative: CVD event &lt;55 (male) or &lt;65 (female)</div>
          </div>
        </div>
```

- [ ] **Step 2: Update `getFormInputs()` to include the new fields**

Find in `index.html`:
```javascript
    onStatin:  getToggle('onStatin') === 'yes',
    ldl:       parseFloat(document.getElementById('ldl').value) || null
```

Replace with:
```javascript
    onStatin:           getToggle('onStatin') === 'yes',
    ldl:                parseFloat(document.getElementById('ldl').value) || null,
    existingASCVD:      getToggle('existingASCVD') === 'yes',
    familyHxPrematureASCVD: getToggle('familyHx') === 'yes'
```

- [ ] **Step 3: Update `resetForm()` to reset the new toggles**

Find in `index.html`:
```javascript
  [['sex','male'], ['diabetes','no'], ['bpTreated','no'], ['onStatin','no'], ['onAspirin','no']].forEach(([group, defaultVal]) => {
```

Replace with:
```javascript
  [['sex','male'], ['diabetes','no'], ['bpTreated','no'], ['onStatin','no'], ['onAspirin','no'], ['existingASCVD','no'], ['familyHx','no']].forEach(([group, defaultVal]) => {
```

- [ ] **Step 4: Verify in browser**

Open `index.html` in a browser. On the History & Meds tab:
- Confirm "Existing ASCVD / CVD" toggle appears with Yes/No, defaulting to No
- Confirm "Family Hx: Premature ASCVD" toggle appears with hint text
- Click "↺ New Patient" from the Results tab — confirm both toggles reset to No

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add Existing ASCVD and Family Hx toggles to History & Meds tab"
```

---

### Task 3: Guideline rendering in `calculate()` and CSS

**Files:**
- Modify: `index.html` (`<style>` block, inline `getStatinRecommendation()`, `calculate()`)

**Interfaces:**
- Consumes: `getStatinRecommendation()` from Task 1 (copy verbatim from `src/statin-guidelines.js`, minus the `module.exports` guard)
- Consumes: `getFormInputs()` from Task 2 (now includes `existingASCVD`, `familyHxPrematureASCVD`)

- [ ] **Step 1: Add new CSS classes to the `<style>` block**

In `index.html`, find the end of the `.statin-note` rule:
```css
.statin-note    { font-size: 10px; color: #74b816; margin-top: 10px; }
```

Replace it with:
```css
.statin-note    { font-size: 10px; color: #74b816; margin-top: 10px; }

/* ── Guideline banner ─────────────────────────────── */
.guideline-banner { border-radius: 6px; padding: 12px 14px; margin-bottom: 12px;
                    border: 1px solid; }
.guideline-banner.risk-low          { background: #ebfbee; border-color: #8ce99a; color: #2b8a3e; }
.guideline-banner.risk-borderline   { background: #fff9db; border-color: #ffe066; color: #e67700; }
.guideline-banner.risk-intermediate { background: #fff4e6; border-color: #ffa94d; color: #d9480f; }
.guideline-banner.risk-high         { background: #fff5f5; border-color: #ffa8a8; color: #c92a2a; }
.guideline-banner.out-of-scope      { background: #f8f9fa; border-color: #dee2e6; color: #868e96; }
.guideline-headline  { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
.guideline-detail    { font-size: 12px; margin-top: 3px; }
.guideline-enhancers { font-size: 11px; margin-top: 5px; font-style: italic; }

/* ── Adequacy card ────────────────────────────────── */
.adequacy-card         { border-radius: 6px; padding: 12px 14px; font-size: 13px;
                         font-weight: 600; margin-top: 0; border: 1px solid; }
.adequacy-card.adequate { background: #ebfbee; border-color: #8ce99a; color: #2b8a3e; }
.adequacy-card.confirm  { background: #fff9db; border-color: #ffe066; color: #e67700; }
.adequacy-card.review   { background: #fff4e6; border-color: #ffa94d; color: #d9480f; }

/* ── Guideline badge on statin column ─────────────── */
.guideline-badge { font-size: 9px; font-weight: 700; text-transform: uppercase;
                   color: #2f9e44; letter-spacing: 0.3px; margin-bottom: 4px; }
```

Also update `.statin-section` to remove the green background (it's now a neutral container):

Find:
```css
.statin-section { background: #f4fce3; border: 1px solid #94d82d;
                  border-radius: 8px; padding: 20px; }
```

Replace with:
```css
.statin-section { background: #fff; border: 1px solid #dee2e6;
                  border-radius: 8px; padding: 20px; }
```

- [ ] **Step 2: Inline `getStatinRecommendation()` in the `<script>` block**

In `index.html`, find the line `// src/pce.js` at the top of the `<script>` block. Add the following **before** that comment (at the very start of the script block, after `<script>`):

```javascript
// src/statin-guidelines.js
function getStatinRecommendation({ risk, ldl, diabetes, existingASCVD, familyHxPrematureASCVD }) {
  if (existingASCVD) {
    return { outOfScope: true, outOfScopeMsg: 'Secondary prevention guidelines are outside this tool\'s scope.' };
  }
  if (diabetes) {
    return { outOfScope: true, outOfScopeMsg: 'Statin guidelines for patients with diabetes are outside this tool\'s scope.' };
  }

  const enhancers = [];
  if (familyHxPrematureASCVD) enhancers.push('Family history of premature ASCVD');
  if (ldl !== null && ldl >= 160 && ldl < 190) enhancers.push(`LDL ${ldl} mg/dL (160–189 range)`);
  const hasEnhancer = enhancers.length > 0;

  if (ldl !== null && ldl >= 190) {
    return {
      outOfScope: false, intensity: 'high',
      headline: 'LDL ≥ 190 mg/dL — evaluate for familial hypercholesterolemia.',
      detail: 'High-intensity statin therapy indicated regardless of calculated 10-year risk.',
      enhancers: [], footerNote: null
    };
  }

  if (risk < 5) {
    if (!hasEnhancer) {
      return {
        outOfScope: false, intensity: 'none',
        headline: 'Lifestyle modifications recommended. Statin generally not indicated.',
        detail: 'Reassess ASCVD risk in 4–6 years.', enhancers: [], footerNote: null
      };
    }
    return {
      outOfScope: false, intensity: 'low',
      headline: 'Risk enhancer(s) present — consider statin discussion.',
      detail: 'Some experts suggest moderate-intensity statin. Reassess in 4–6 years.',
      enhancers, footerNote: null
    };
  }

  if (risk < 7.5) {
    if (!hasEnhancer) {
      return {
        outOfScope: false, intensity: 'none',
        headline: 'Benefit from statin therapy is generally small.',
        detail: 'Individualize risk–benefit discussion. Lifestyle modifications are primary.',
        enhancers: [], footerNote: null
      };
    }
    return {
      outOfScope: false, intensity: 'low',
      headline: 'Risk enhancer(s) present — consider statin discussion.',
      detail: 'Risk–benefit discussion recommended.', enhancers, footerNote: null
    };
  }

  if (risk < 20) {
    return {
      outOfScope: false, intensity: 'moderate',
      headline: familyHxPrematureASCVD
        ? 'Moderate-intensity statin recommended; high-intensity also reasonable.'
        : 'Moderate-intensity statin therapy recommended.',
      detail: '', enhancers,
      footerNote: 'CAC scoring can help reclassify risk if clinical uncertainty exists.'
    };
  }

  return {
    outOfScope: false, intensity: 'high',
    headline: 'High-intensity statin therapy recommended.',
    detail: '', enhancers, footerNote: null
  };
}

```

- [ ] **Step 3: Replace `calculate()` with the guideline-aware version**

Find the entire `function calculate() { ... }` block (from `function calculate() {` through its closing `}`). Replace the whole function with:

```javascript
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

  // Guideline recommendation
  const rec = getStatinRecommendation({
    risk,
    ldl: p.ldl,
    diabetes: p.diabetes,
    existingASCVD: p.existingASCVD,
    familyHxPrematureASCVD: p.familyHxPrematureASCVD
  });

  const statinSection = document.getElementById('statinSection');

  function bannerHtml(rec, cls) {
    const { headline, detail, enhancers } = rec;
    return `<div class="guideline-banner ${cls}">
      <div class="guideline-headline">${headline}</div>
      ${detail ? `<div class="guideline-detail">${detail}</div>` : ''}
      ${enhancers && enhancers.length ? `<div class="guideline-enhancers">Risk enhancers: ${enhancers.join(' · ')}</div>` : ''}
    </div>`;
  }

  if (rec.outOfScope) {
    statinSection.innerHTML = `<div class="guideline-banner out-of-scope"><div class="guideline-headline">${rec.outOfScopeMsg}</div></div>`;
    statinSection.style.display = 'block';
  } else if (p.onStatin) {
    const { intensity, footerNote } = rec;
    const adequacyClass = (intensity === 'none' || intensity === 'low') ? 'adequate'
                        : intensity === 'moderate' ? 'confirm' : 'review';
    const adequacyText = adequacyClass === 'adequate'
      ? '✓ Current statin therapy is consistent with guidelines for this risk level.'
      : adequacyClass === 'confirm'
      ? 'Guidelines recommend moderate-intensity statin therapy — confirm this is in use.'
      : '⚠ Guidelines recommend high-intensity statin — confirm therapy is optimized for this risk level.';
    statinSection.innerHTML = `
      ${bannerHtml(rec, cls)}
      <div class="adequacy-card ${adequacyClass}">${adequacyText}</div>
      ${footerNote ? `<div class="statin-note">${footerNote}</div>` : ''}`;
    statinSection.style.display = 'block';
  } else if (p.ldl) {
    const { intensity, footerNote } = rec;
    const intensityMap = { low: 0, moderate: 1, high: 2 };
    const highlightIdx = intensity in intensityMap ? intensityMap[intensity] : -1;
    const intensityDefs = [
      { label: 'Low',      pct: 0.30 },
      { label: 'Moderate', pct: 0.40 },
      { label: 'High',     pct: 0.50 }
    ];

    if (intensity === 'none') {
      statinSection.innerHTML = bannerHtml(rec, cls);
    } else {
      const cols = intensityDefs.map(({ label, pct }, i) => {
        const highlight = i === highlightIdx;
        const b = calculateStatinBenefit(p, p.ldl, pct);
        return `<div class="statin-col ${highlight ? 'highlight' : ''}">
          ${highlight ? '<div class="guideline-badge">Guideline rec.</div>' : ''}
          <div class="intensity">${label}</div>
          <div class="ldl-new">LDL ↓ ${Math.round(pct * 100)}% → ${b.newLdl} mg/dL</div>
          <div class="ldl-new">Total Chol → ${b.newTotalChol} mg/dL</div>
          <div class="risk-new">${b.newRisk.toFixed(1)}%</div>
          <div class="abs-red">↓ ${b.absoluteReduction} pts</div>
        </div>`;
      }).join('');
      statinSection.innerHTML = `
        ${bannerHtml(rec, cls)}
        <div class="statin-title">Estimated Statin Benefit (patient not on statin)</div>
        <div class="statin-grid">${cols}</div>
        <div class="statin-note">Risk recalculated using Pooled Cohort Equations with adjusted total cholesterol.
          HDL held constant. LDL reduction based on published statin intensity data.
          ${footerNote ? `<br>${footerNote}` : ''}</div>`;
    }
    statinSection.style.display = 'block';
  } else {
    statinSection.style.display = 'none';
  }

  goToStep(3);
}
```

- [ ] **Step 4: Verify all success criteria in browser**

Open `index.html`. Walk through each scenario:

| Scenario | Inputs | Expected result |
|----------|--------|----------------|
| Out of scope: ASCVD | Any risk, Existing ASCVD = Yes | Gray "Secondary prevention" banner, no columns |
| Out of scope: Diabetes | Any risk, Diabetes = Yes | Gray "diabetes" banner, no columns |
| LDL ≥ 190 override | LDL = 195, any low risk | High-intensity highlighted, FH headline |
| Low risk, no enhancers | Age 50, WF, TC 180, HDL 60, SBP 110, never/no/no, LDL 120 | Green banner, no statin recommended, no columns |
| Low risk, LDL 160–189 | Same but LDL = 172 | Green banner, Low column highlighted, "Guideline rec." badge |
| Intermediate | Age 55, WM, TC 240, HDL 40, SBP 140 | Orange banner, Moderate column highlighted |
| High risk | Age 60, WM, TC 260, HDL 35, SBP 160 + treated, current smoker | Red banner, High column highlighted |
| On statin, high risk | Same as high risk but On Statin = Yes | Red banner + ⚠ yellow flag card, no columns |
| On statin, low risk | Low-risk inputs + On Statin = Yes | Green banner + ✓ green adequacy card |
| New Patient reset | After any calculation, click ↺ | Existing ASCVD and Family Hx both reset to No |

- [ ] **Step 5: Run existing PCE tests to verify no regression**

```bash
node tests/test_pce.js
```

Expected: `All PCE tests passed.`

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: statin therapy guideline recommendations with guideline-aware results tab"
```
