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
