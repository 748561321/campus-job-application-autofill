const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(`${__dirname}/field-rules.js`, 'utf8'), context);
const rules = context.window.JobAutofillRules;
const cases = [
  ['Full name', 'personal.name'],
  ['Nationality', 'personal.nationality'],
  ['Ethnic group', 'personal.ethnicity'],
  ['Marital status', 'personal.maritalStatus'],
  ['Mailing address', 'personal.address'],
  ['Institution name', 'education.master.school'],
  ['Field of study', 'education.master.major'],
  ['Expected graduation date', 'education.master.endDate'],
  ['Research focus', 'education.master.researchDirection'],
  ['Language certificate', 'language.certificate'],
  ['Employment start date', 'experience.startDate'],
  ['Job description', 'experience.description200'],
  ['Professional summary', 'selfEvaluation.default'],
  ['Preferred location', 'intention.city']
];
for (const [label, expected] of cases) assert.equal(rules.matchField(label)?.path || null, expected, label);
for (const label of ['Emergency contact phone', 'Family member name', 'Expected salary']) {
  assert.equal(rules.shouldNeverAutofill('text', label), true, label);
}
console.log('English field-rule regression cases passed');
