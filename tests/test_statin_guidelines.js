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
