// tests/test_pce.js
// Reference values verified against Cerner ASCVD reference implementation (Goff et al. 2014)
// Verified: 2026-03-23
const assert = require('assert');
const { calculateRisk, calculateStatinBenefit } = require('../src/pce');

function assertRisk(label, result, expected) {
  const diff = Math.abs(result - expected);
  assert(diff <= 0.1, `${label}: expected ${expected}%, got ${result.toFixed(1)}% (diff ${diff.toFixed(2)})`);
}

assertRisk('WM baseline',
  calculateRisk({ age: 55, sex: 'male', race: 'white', totalChol: 213, hdl: 50, sbp: 120, bpTreated: false, smoker: 'never', diabetes: false }),
  5.4
);
assertRisk('WF baseline',
  calculateRisk({ age: 55, sex: 'female', race: 'white', totalChol: 213, hdl: 50, sbp: 120, bpTreated: false, smoker: 'never', diabetes: false }),
  2.1
);
assertRisk('AAM baseline',
  calculateRisk({ age: 55, sex: 'male', race: 'african_american', totalChol: 213, hdl: 50, sbp: 120, bpTreated: false, smoker: 'never', diabetes: false }),
  6.1
);
assertRisk('AAF baseline',
  calculateRisk({ age: 55, sex: 'female', race: 'african_american', totalChol: 213, hdl: 50, sbp: 120, bpTreated: false, smoker: 'never', diabetes: false }),
  3.0
);
assertRisk('WM high risk',
  calculateRisk({ age: 60, sex: 'male', race: 'white', totalChol: 240, hdl: 40, sbp: 150, bpTreated: true, smoker: 'current', diabetes: true }),
  46.2
);
assertRisk('AAF treated HTN',
  calculateRisk({ age: 65, sex: 'female', race: 'african_american', totalChol: 180, hdl: 55, sbp: 130, bpTreated: true, smoker: 'former', diabetes: false }),
  8.6
);

// Test calculateStatinBenefit
const base = { age: 55, sex: 'male', race: 'white', totalChol: 213, hdl: 50, sbp: 120, bpTreated: false, smoker: 'never', diabetes: false };
const ldl = 140;

const low = calculateStatinBenefit(base, ldl, 0.30);
assert(low.newLdl === 98, `low newLdl: expected 98, got ${low.newLdl}`);
assert(low.newTotalChol === 171, `low newTC: expected 171, got ${low.newTotalChol}`);
assert(low.newRisk < calculateRisk(base), 'low statin should reduce risk');
assert(low.absoluteReduction > 0, 'low statin should have positive absolute reduction');

const high = calculateStatinBenefit(base, ldl, 0.50);
assert(high.newRisk < low.newRisk, 'high statin should reduce risk more than low');
assert(high.absoluteReduction > low.absoluteReduction, 'high statin should have larger absolute reduction');

// Guard: reduction=0 should return same risk
const none = calculateStatinBenefit(base, ldl, 0);
assert(none.absoluteReduction === 0, 'zero reduction should give zero absolute reduction');

console.log('All PCE tests passed.');
