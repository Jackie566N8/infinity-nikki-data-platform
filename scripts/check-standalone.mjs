import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync('outputs/奇迹旅册.html','utf8'),scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
assert.ok(scripts.length>=30,'Expected all embedded modules');
for(const [index,m]of scripts.entries()){assert.ok(!/\bsrc=/.test(m[1]),'External script dependency');new vm.Script(m[2],{filename:'embedded-'+index+'.js'});}
for(const file of ['i18n.js','smart-search-model.js','smart-search-homophone-model.js','human-search.js','search-model.js','analytics-model.js','planning-model.js']){const source=fs.readFileSync('src/'+file,'utf8').replaceAll('</script','<\\/script');assert.ok(scripts.some(m=>m[2]===source),'Embedded code changed unexpectedly: '+file);}
assert.equal((html.match(/<\/body>/gi)||[]).length,1,'Replacement metacharacters must not inject closing body tags');console.log('PASS embedded JavaScript syntax, byte-preserved model/i18n code and no external script dependencies.');
