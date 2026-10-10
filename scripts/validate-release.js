const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const required=['manifest.json','popup.html','popup.js','options.html','options.js','content.js','field-rules.js','page-bridge.js','profile.example.json','PRIVACY.md','PRIVACY.en.md','README.md','README.en.md','TESTING.md','STORE_LISTING.md','STORE_LISTING.en.md','_locales/zh_CN/messages.json','_locales/en/messages.json','DISCLAIMER.md','icons/icon-128.png','store-assets/screenshot-1.png'];
const failures=[];
for(const file of required)if(!fs.existsSync(path.join(root,file)))failures.push(`缺少文件: ${file}`);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8').replace(/^\uFEFF/,''));
if(manifest.version!=='1.1.1')failures.push('公开版版本必须为1.1.1');
if(manifest.default_locale!=='zh_CN')failures.push('缺少默认语言设置');
if(manifest.manifest_version!==3)failures.push('必须使用Manifest V3');
if(manifest.host_permissions?.length)failures.push('公开版不应声明常驻host_permissions');
if(manifest.content_scripts?.length)failures.push('公开版不应声明自动注入content_scripts');
if(fs.existsSync(path.join(root,'private')))failures.push('存在private目录');
const banned=[['周','心','同'],['1835','1638275'],['320505','200110152014'],['748561321','@qq.com'],['522024','330133'],['龙惠','花苑'],['138613','36723'],['156951','21475'],['A5FU9','V75C0C5921K'],['A18ML','PHEJ064LAH1']].map(parts=>parts.join(''));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='.git'||e.name==='dist'?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(root)){if(!/\.(js|json|html|css|md|txt|ps1|gitignore)$/i.test(file))continue;const text=fs.readFileSync(file,'utf8');for(const token of banned)if(text.includes(token))failures.push(`发现私人内容 ${token}：${path.relative(root,file)}`);}
for(const file of ['popup.js','options.js','content.js','field-rules.js','page-bridge.js'])try{cp.execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});}catch(error){failures.push(`${file} 语法检查失败：${String(error.stderr||error.message)}`);}
for(const test of ['test-bankcomm-rules.js','test-english-rules.js'])try{cp.execFileSync(process.execPath,[path.join(root,test)],{stdio:'pipe'});}catch(error){failures.push(`${test} regression test failed: ${String(error.stderr||error.message)}`);}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}console.log('Release validation passed.');
