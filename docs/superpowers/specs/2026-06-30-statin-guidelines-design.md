# Statin Therapy Guidelines — Design Spec

**Date:** 2026-06-30
**Author:** Ron Applebey (PA-C), via brainstorming session
**Project:** `/root/projects/ascvd_calculator/`
**Builds on:** `2026-03-23-ascvd-calculator-design.md`

---

## Overview

Add ACC/AHA-aligned statin therapy guideline recommendations to the ASCVD calculator results tab. The feature covers **primary prevention only** — adults without established ASCVD and without diabetes. Risk category + LDL + risk enhancers drive a plain-language recommendation and determine which statin intensity column is highlighted.

Source algorithm: UpToDate "Approach to ASCVD risk assessment for primary prevention in adults without diabetes" (Graphic 114544, using PCE risk thresholds).

---

## New Inputs (History & Meds tab, Step 2)

Two toggle fields added to the right column, below the existing toggles:

| Field | Type | Default | Hint |
|-------|------|---------|------|
| Existing ASCVD / CVD | Yes / No toggle | No | — |
| Family Hx: Premature ASCVD | Yes / No toggle | No | First-degree relative: CVD event before age 55 (male) or 65 (female) |

Both fields reset to No on "New Patient."

---

## Guideline Recommendation Logic

A new function `getStatinRecommendation(inputs)` returns:
```
{ intensity, headline, detail, enhancers[], outOfScope }
```

### Out-of-scope conditions (show muted banner, no recommendation)
- `existingASCVD === true` → "Secondary prevention guidelines are outside this tool's scope."
- `diabetes === true` → "Statin guidelines for patients with diabetes are outside this tool's scope."

### LDL ≥ 190 override (evaluated before risk category)
- Intensity: `high`
- Headline: "LDL ≥ 190 mg/dL — evaluate for familial hypercholesterolemia."
- Detail: "High-intensity statin therapy indicated regardless of calculated 10-year risk."

### Risk enhancers (detected automatically from inputs)
- `familyHxPrematureASCVD === true`
- `ldl >= 160 && ldl < 190`

### Low risk (< 5%)
| Enhancers present? | Intensity | Headline |
|-------------------|-----------|---------|
| None | none | "Lifestyle modifications recommended. Statin generally not indicated. Reassess ASCVD risk in 4–6 years." |
| LDL 160–189 or family Hx | low | "Risk enhancer(s) present — consider statin discussion. Some experts suggest moderate-intensity statin." |

### Borderline risk (5% – 7.4%)
| Enhancers present? | Intensity | Headline |
|-------------------|-----------|---------|
| None | none | "Benefit from statin therapy is generally small. Individualize risk–benefit discussion. Lifestyle modifications are primary." |
| LDL 160–189 or family Hx | low | "Risk enhancer(s) present — consider statin discussion." |

### Intermediate risk (7.5% – 19.9%)
| Enhancers present? | Intensity | Headline |
|-------------------|-----------|---------|
| None | moderate | "Moderate-intensity statin therapy recommended." |
| Family Hx | moderate | "Moderate-intensity statin recommended; high-intensity also reasonable (family history of premature ASCVD)." |

Footer note for intermediate risk: "CAC scoring can help reclassify risk if clinical uncertainty exists."

### High risk (≥ 20%)
- Intensity: `high`
- Headline: "High-intensity statin therapy recommended."

---

## Results Tab — UI Changes

### Patients NOT on statin

**Guideline header (new):** A colored banner above the intensity columns. Color matches risk level. Shows:
- Recommendation headline
- Detected enhancers listed inline (e.g., "Risk enhancers: Family history of premature ASCVD · LDL 172 mg/dL")

**Column highlight (changed):** The highlighted column is now driven by `intensity` from `getStatinRecommendation()` rather than always highlighting Moderate. The badge on the highlighted column reads "Guideline rec." A column with `intensity === none` means no column is highlighted.

**When intensity === none:** The three columns are hidden. Only the banner displays.

### Patients ON statin

The three LDL-projection columns are replaced by a single adequacy card:
- Recommended intensity for their risk level
- **Green check:** "Current statin therapy is consistent with guidelines for this risk level."
- **Yellow flag:** "Guidelines suggest considering [higher]-intensity therapy for this risk level."

Adequacy logic:
- `intensity === none` or `low` → any statin = adequate (green)
- `intensity === moderate` → adequate if patient is on statin (we don't collect current intensity, so show: "Confirm moderate-intensity statin is in use.")
- `intensity === high` → show yellow flag: "Guidelines recommend high-intensity statin — confirm therapy is optimized."

> Note: We do not currently collect the statin's specific intensity/drug from the patient. The adequacy card acknowledges this with "confirm" language rather than making a definitive judgment.

### Out-of-scope cases

A single muted gray banner replaces the entire statin section. No columns, no adequacy card.

---

## Data Flow

```
getFormInputs() → inputs
    ↓
getStatinRecommendation(inputs) → { intensity, headline, detail, enhancers, outOfScope }
    ↓
calculate() → renders:
    - riskBox (unchanged)
    - statinSection:
        - if outOfScope: out-of-scope banner
        - if onStatin: adequacy card
        - else: guideline header + intensity columns (or banner-only if intensity=none)
```

---

## Implementation Constraints

- Single `index.html` file — no build step, no external dependencies
- `getStatinRecommendation()` added inline in the `<script>` block
- `src/pce.js` is not modified (it contains only the PCE math)
- All new CSS added to the existing `<style>` block
- Reset (`resetForm()`) clears both new toggles to default No

---

## Success Criteria

1. Existing ASCVD = Yes or Diabetes = Yes → out-of-scope banner, no recommendation
2. LDL ≥ 190 → High-intensity recommendation regardless of risk score
3. Low risk + no enhancers → no statin recommendation, columns hidden
4. Intermediate risk → Moderate highlighted with "Guideline rec." badge
5. High risk → High highlighted
6. On statin + high risk → yellow flag card
7. Both new toggles reset to No on "New Patient"
8. Borderline risk + enhancer present → Low column highlighted with "Guideline rec." badge
9. No regression to existing PCE calculation or statin benefit math
