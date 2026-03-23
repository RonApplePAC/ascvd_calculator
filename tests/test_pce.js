// tests/test_pce.js
// Reference values verified against Cerner ASCVD reference implementation (Goff et al. 2014)
const assert = require('assert');
const { calculateRisk } = require('../src/pce');

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

console.log('All PCE tests passed.');
