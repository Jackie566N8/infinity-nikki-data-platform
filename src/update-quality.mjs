// Run beside index.html in the source package, or from dist/ in the workspace.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const site=path.dirname(fileURLToPath(import.meta.url)),platform=path.resolve(site,'../scripts/platform');
const readGlobal=(file,key)=>{const s=fs.readFileSync(path.join(site,file),'utf8'),prefix='window.'+key+'=';if(!s.startsWith(prefix))throw Error('Unexpected data format: '+file);return JSON.parse(s.slice(prefix.length).replace(/;\s*$/,''));};
const catalog=readGlobal('data.js','NIKKI_DATA'),locales=readGlobal('locales.js','NIKKI_LOCALES'),input=path.resolve(platform,'../../data/input');
fs.writeFileSync(path.join(input,'catalog.json'),JSON.stringify(catalog,null,2));fs.writeFileSync(path.join(input,'display-locales.json'),JSON.stringify(locales));
for(const r of catalog.records){if(!r.image||/^https?:/.test(r.image))continue;
 const from=path.resolve(site,r.image),root=path.resolve(input,'local-images'),to=path.resolve(root,r.image);
 if(!from.startsWith(path.resolve(site,'assets')+path.sep)||!to.startsWith(root+path.sep))throw Error('Unsupported image path: '+r.image);
 fs.mkdirSync(path.dirname(to),{recursive:true});if(fs.existsSync(from))fs.copyFileSync(from,to);else if(fs.existsSync(to))fs.unlinkSync(to);
}
execFileSync(process.execPath,[path.join(platform,'build.mjs')],{stdio:'inherit',windowsHide:true});
fs.copyFileSync(path.join(platform,'../../data/dataset/quality-data.js'),path.join(site,'quality-data.js'));
execFileSync(process.execPath,[path.join(platform,'build-analytics.mjs')],{stdio:'inherit',windowsHide:true});
fs.copyFileSync(path.join(platform,'../../data/dataset/analytics/analytics-data.js'),path.join(site,'analytics-data.js'));
fs.copyFileSync(path.join(platform,'analytics-model.cjs'),path.join(site,'analytics-model.js'));
execFileSync(process.execPath,[path.join(platform,'build-preferences.mjs')],{stdio:'inherit',windowsHide:true});
fs.copyFileSync(path.join(platform,'../../data/dataset/preferences/preferences-data.js'),path.join(site,'preferences-data.js'));
for(const [from,to] of [['wardrobe-model.cjs','wardrobe-model.js'],['preferences-schema.cjs','preferences-schema.js']])fs.copyFileSync(path.join(platform,from),path.join(site,to));
execFileSync(process.execPath,[path.join(platform,'build-planning.mjs')],{stdio:'inherit',windowsHide:true});
fs.copyFileSync(path.join(platform,'../../data/dataset/planning/planning-data.js'),path.join(site,'planning-data.js'));
fs.copyFileSync(path.join(platform,'planning-model.cjs'),path.join(site,'planning-model.js'));
console.log('Planning, quality, analytics and public preferences refreshed.');

if(fs.existsSync(path.join(platform,'../../data/dataset/search/manifest.json'))){
 execFileSync(process.execPath,[path.join(platform,'search/build-site.mjs')],{stdio:'inherit',windowsHide:true});
 fs.copyFileSync(path.join(platform,'../../data/dataset/search/search-eval-data.js'),path.join(site,'search-eval-data.js'));
 fs.copyFileSync(path.join(platform,'search/search-model.cjs'),path.join(site,'search-model.js'));
}

if(fs.existsSync(path.join(platform,'../../data/dataset/search-improved/release-lock.json'))){
 execFileSync(process.execPath,[path.join(platform,'search-improved/build-site.mjs')],{stdio:'inherit',windowsHide:true});
 for(const [from,to] of [['../../data/dataset/search-improved/smart-search-data.js','smart-search-data.js'],['search-improved/improved-model.cjs','smart-search-model.js'],['search-improved/vendor/opencc-js.cjs','smart-vendor-opencc.js'],['search-improved/vendor/pinyin-pro.cjs','smart-vendor-pinyin.js']])fs.copyFileSync(path.join(platform,from),path.join(site,to));
}

execFileSync(process.execPath,[path.join(platform,'advanced/build.mjs')],{stdio:'inherit',windowsHide:true});
fs.copyFileSync(path.join(platform,'../../data/dataset/advanced/advanced-data.js'),path.join(site,'advanced-data.js'));
fs.copyFileSync(path.join(platform,'advanced/advanced-model.cjs'),path.join(site,'advanced-model.js'));
