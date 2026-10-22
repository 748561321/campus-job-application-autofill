const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(`${__dirname}/field-rules.js`,'utf8'),context);
const match=context.window.JobAutofillBydMatch;
for(const [label,section,degree,path] of [
 ['微信号','','','personal.wechat'],['家庭住址','','','personal.address'],
 ['证件类别','','','personal.idType'],['意向职位类别一','','',null],
 ['最高学历的挂科门数','','',null],['特殊情况说明','教育经历-2','本科',null],
 ['专业','教育经历-2','本科','education.bachelor.major'],
 ['专业','教育经历-1','',null],
 ['是否境外教育','教育经历-1','硕士','education.master.overseasEducation'],
 ['工作地点','工作/实习经历-1','','experience.city'],
 ['语言等级','语言技能-1','','language.certificate']
]) assert.equal(match(label,section,degree)?.path||null,path,label);
assert.equal(match('起止时间','教育经历-2','本科','开始').path,'education.bachelor.startDate');
assert.equal(match('起止时间','教育经历-2','本科','结束').path,'education.bachelor.endDate');
console.log('BYD field-rule regression cases passed');
