const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(`${__dirname}/field-rules.js`, 'utf8'), context);
const rules = context.window.JobAutofillRules;

const cases = [
  ['请输入真实姓名 | name | 姓名', 'personal.name'],
  ['candidateName | 姓名', 'personal.name'],
  ['请输入 | infoSourceName | 招聘信息来源', null],
  ['请输入 | phone | 紧急联系电话', 'personal.phone'], // safety guard vetoes this.
  ['personal.email | 电子邮箱', 'personal.email'],
  ['是否拥有外国国籍', 'personal.foreignNationality'],
  ['是否为主要经历', 'experience.isPrimary'],
  ['非全日制 | 全日制 | 教育类型', 'education.master.educationType'],
  ['工作性质', 'experience.workType'],
  ['所属行业', 'experience.industry'],
  ['个人优势', 'selfEvaluation.default']
];
for (const [label, expected] of cases) {
  assert.equal(rules.matchField(label)?.path || null, expected, label);
}
for (const [type, label] of [
  ['text', '请输入 | phone | 紧急联系电话'],
  ['text', '请输入 | infoSourceName | 招聘信息来源'],
  ['text', '当前薪资（年薪）'],
  ['radio', '是否愿意按照交行应聘职位标准执行'],
  ['checkbox', '本人承诺']
]) assert.equal(rules.shouldNeverAutofill(type, label), true, label);
assert.equal(rules.shouldNeverAutofill('text', '请输入真实姓名 | name | 姓名'), false);
assert.equal(rules.shouldNeverAutofill('radio', '是否拥有外国国籍、国（境）外永久居留权'), false);
assert.equal(rules.shouldNeverAutofill('radio', '全日制 | 非全日制 | 教育类型'), false);
for (const [type, label, category] of [
  ['search', 'empType | 生源类型', 'missing'],
  ['text', '请输入 | phone | 紧急联系电话', 'missing'],
  ['text', '请输入 | infoSourceName | 招聘信息来源', 'missing'],
  ['text', '请输入 | currentSalary | 当前薪资（年薪）', 'manual'],
  ['text', '请输入 | hopeSalary | 个人年薪期望值', 'manual'],
  ['radio', '是否为社招应聘者', 'manual'],
  ['checkbox', '本人承诺', 'manual'],
  ['text', '未知新字段', 'unknown']
]) assert.equal(rules.classifyUnmatchedField(type, label).category, category, label);
console.log('Bankcomm field-rule regression cases passed');
