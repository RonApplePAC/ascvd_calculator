# ASCVD 10-Year Risk Calculator — Design Spec

**Date:** 2026-03-23
**Author:** Ron Applebey (PA-C), via brainstorming session
**Project:** `/root/projects/ascvd_calculator/`

---

## Overview

A single-file offline ASCVD 10-year cardiovascular risk calculator for use by a primary care provider on a managed Windows work computer. No installation required — opens in any browser (Edge, Chrome, Firefox). Fully functional without internet access.

---

## Delivery Format

- **Single `.html` file** — all HTML, CSS, and JavaScript in one file
- Runs by double-clicking in Windows Explorer or pinning to taskbar
- No server, no dependencies, no install
- Shareable via email, USB, or network share

---

## Algorithm

**Pooled Cohort Equations (PCE)** — 2013 ACC/AHA Guideline on the Assessment of Cardiovascular Risk.

Four separate coefficient sets:
- White men
- White women
- African American men
- African American women

Race "Other" uses the White equation (consistent with ACC/AHA guidance).

Valid age range: **40–79 years**.

### PCE Formula

For each race/sex group, the 10-year risk is calculated as:

```
IndividualSum = sum of (coefficient × ln(variable)) for each predictor
BaselineSum   = group-specific baseline survival coefficient
Risk          = 1 - BaselineSum^exp(IndividualSum - MeanCoeffSum)
```

Predictors used (natural log transformed):
- Age
- Total cholesterol
- HDL cholesterol
- Systolic blood pressure (with separate coefficients for treated vs untreated)
- Diabetes (binary)
- Current smoker (binary)

Note: Diastolic BP and LDL are collected for clinical context but are not inputs to the PCE formula itself (PCE uses systolic BP + treatment status + total chol + HDL).

---

## Inputs

### Tab 1 — Demographics
| Field | Type | Values |
|-------|------|--------|
| Age | Number | 40–79 years |
| Sex | Toggle | Male / Female |
| Race | Dropdown | White · African American · Other |

### Tab 2 — Labs
| Field | Type | Unit |
|-------|------|------|
| Systolic BP | Number | mmHg |
| Diastolic BP | Number | mmHg (collected, not used in PCE) |
| Total Cholesterol | Number | mg/dL |
| HDL | Number | mg/dL |
| LDL | Number | mg/dL (collected; used in statin benefit calc) |

### Tab 3 — History & Medications
| Field | Type | Values |
|-------|------|--------|
| Smoking Status | Radio | Never / Former / Current |
| Diabetes | Toggle | Yes / No |
| On HTN Treatment | Toggle | Yes / No |
| On Statin | Toggle | Yes / No |
| On Aspirin | Toggle | Yes / No |

---

## Outputs

### Tab 4 — Results

#### 10-Year Risk Score
- Displayed as a large percentage (e.g., **14.2%**)
- Risk category label:
  - Low: < 5%
  - Borderline: 5% – 7.4%
  - Intermediate: 7.5% – 20%
  - High: ≥ 20%
- Color-coded by category (green / yellow / orange / red)

#### Statin Benefit Panel
Shown **only when "On Statin" = No**.

Three columns — Low, Moderate, High intensity — each showing:
- Estimated LDL reduction percentage
- Projected LDL after treatment (mg/dL)
- Recalculated total cholesterol (LDL reduction applied proportionally)
- Recalculated 10-year PCE risk with new lipid values
- Absolute risk reduction (percentage points)

| Intensity | LDL Reduction |
|-----------|--------------|
| Low | ~30% |
| Moderate | ~40% |
| High | ~50% |

**Statin math:** New LDL = LDL × (1 - reduction). Total cholesterol adjusted: new TC = TC - (LDL - newLDL). PCE re-run with new TC value, all other inputs unchanged.

Moderate intensity is highlighted as the standard recommendation.

#### Navigation
- "← Edit Inputs" returns to Tab 3
- "↺ New Patient" clears all fields and returns to Tab 1

---

## UI & UX

- **4-tab wizard** — Demographics → Labs → History & Meds → Results
- Tab navigation: Next / Back buttons; tabs also clickable to jump
- Input validation before advancing (required fields, numeric ranges)
- No scrolling required on standard screen sizes
- Clean, clinical aesthetic — not consumer-facing
- Works in Edge (default on managed Windows), Chrome, Firefox

---

## Out of Scope

- No data persistence — each session is stateless
- No print/export function (v1)
- No authentication
- No network calls of any kind
- No support for ages outside 40–79 (display a warning if entered)
- No ASCVD risk enhancers (CAC score, hsCRP, etc.) — v1 only

---

## File Structure

```
ascvd_calculator/
├── index.html          # The entire application (single file)
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-03-23-ascvd-calculator-design.md
└── .gitignore
```

---

## Success Criteria

1. Correct PCE risk output matching ACC/AHA reference values for known test cases
2. Statin benefit panel appears iff "On Statin = No"
3. File opens and runs correctly in Edge on Windows with no internet connection
4. All fields validate before allowing tab advancement
5. "New Patient" fully resets the form
