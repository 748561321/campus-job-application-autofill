const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const code=fs.readFileSync(__dirname+'/content.js','utf8');
const start=code.indexOf('  function feishuStructuredMatch');
const end=code.indexOf('  function matchElement',start);
const box={R:{matchField:()=>null}};
vm.createContext(box); vm.runInContext(code.slice(start,end),box);
function input(kind,title,suffix,placeholder='') {
 const row={classList:{contains:c=>c==='resumeEditForm-award'&&kind==='award'},querySelector:()=>({value:title})};
 return {id:kind==='award'&&suffix==='date'?'':`${kind}[0].${suffix}`,placeholder,matches:()=>false,
 closest:s=>s==='.resumeEditForm-item'?row:{querySelector:()=>({textContent:kind==='award'?'获奖时间':'项目角色'})}};
}
const profile={projects:[{name:'Example project',role:'Developer',link:''},{name:'Another',role:'Researcher'}],awardDetails:[{name:'Example award',date:'2025-10'}]};
const a=box.feishuStructuredMatch(input('project','Another','role'));
assert.equal(box.feishuProfileValue(profile,a.path),'Researcher'); // Row 0 is not profile index 0.
assert.equal(box.feishuProfileValue(profile,box.feishuStructuredMatch(input('project','Unknown','role')).path),undefined);
assert.equal(box.feishuProfileValue(profile,box.feishuStructuredMatch(input('project','Example project','link')).path),'');
assert.equal(box.feishuProfileValue(profile,box.feishuStructuredMatch(input('award','Example award','date')).path),'2025-10');
assert.equal(box.feishuStructuredMatch({...input('project','Another','role'),matches:()=>true}),null);
assert.equal(box.feishuProfileValue({...profile,projects:[profile.projects[0],profile.projects[0]]},box.feishuStructuredMatch(input('project','Example project','role')).path),undefined);
console.log('Feishu: title-based rows, award date, unknown/duplicate title and empty-link guards passed');
