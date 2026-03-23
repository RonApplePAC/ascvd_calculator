// src/pce.js
// Pooled Cohort Equations — Goff et al. 2014, Circulation 129(25 Suppl 2):S49-73, Table B

'use strict';

const GROUPS = {

  white_female: {
    mean: -29.1817,
    baseline: 0.96652,
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
    baseline: 0.95334,
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
           +   0.6908 * p.currentSmoker
           +   0.8738 * p.diabetes;
    }
  },

  white_male: {
    mean: 61.1816,
    baseline: 0.91436,
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
           + (p.bpTreated ? 1.797 : 1.764) * lnS
           +   7.837 * p.currentSmoker
           +  -1.795 * lnA * p.currentSmoker
           +   0.658 * p.diabetes;
    }
  },

  african_american_male: {
    mean: 19.5425,
    baseline: 0.89536,
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
  return Math.round(risk * 1000) / 10;
}

/**
 * Estimate statin benefit by reducing LDL and recalculating risk.
 * Total cholesterol is adjusted by the LDL delta; HDL is held constant.
 * @param {object} baseInputs  - same shape as calculateRisk param
 * @param {number} ldl         - current LDL mg/dL
 * @param {number} reduction   - fractional reduction (e.g. 0.30 for 30%)
 * @returns {{ newLdl, newTotalChol, newRisk, absoluteReduction }}
 */
function calculateStatinBenefit(baseInputs, ldl, reduction) {
  const newLdl = ldl * (1 - reduction);
  const ldlDelta = ldl - newLdl;
  const newTotalChol = baseInputs.totalChol - ldlDelta;
  const clampedTC = Math.max(newTotalChol, 100); // never below 100 mg/dL
  const adjustedInputs = { ...baseInputs, totalChol: clampedTC };
  const baseRisk = calculateRisk(baseInputs);
  const newRisk = calculateRisk(adjustedInputs);
  return {
    newLdl: Math.round(newLdl),
    newTotalChol: Math.round(newTotalChol),
    newRisk,
    absoluteReduction: Math.round((baseRisk - newRisk) * 10) / 10
  };
}

if (typeof module !== 'undefined') {
  module.exports = { calculateRisk, calculateStatinBenefit };
}
