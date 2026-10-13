// Readable joins for portfolio users; normalized tables remain authoritative.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'data/dataset/json',name+'.json'),'utf8'));
const objects=new Map(load('objects').map(row=>[row.object_id,row]));
const sources=new Map(load('sources').map(row=>[row.source_id,row]));
const names=load('object_names');
const standards=new Map();
for(const row of names)if(row.name_type==='standard'){
  if(!standards.has(row.object_id))standards.set(row.object_id,{});
  standards.get(row.object_id)[row.locale]=row.name;
}
const languageColumns=['zh-CN','en','ja','ko','zh-TW'];
const common=id=>{
  const row=objects.get(id);
  return {display_name:row.display_name,...Object.fromEntries(languageColumns.map(locale=>['name_'+locale,standards.get(id)?.[locale]??''])),rarity:row.rarity,style:row.style,category:row.category,obtain_text:row.obtain_text,obtain_status:row.obtain_status,image_ref:row.image_ref,source_id:row.source_id,source_url:sources.get(row.source_id)?.url??'',source_date:row.snapshot_source_date};
};
const statuses=new Map(load('outfit_recipe_status').map(row=>[row.outfit_id,row]));
const specs={};
function csv(filename,rows,description){
  const columns=[...new Set(rows.flatMap(row=>Object.keys(row)))];
  const escape=value=>{
    const text=value===null||value===undefined?'':typeof value==='object'?JSON.stringify(value):String(value);
    return /[",\r\n]/.test(text)?'"'+text.replaceAll('"','""')+'"':text;
  };
  fs.writeFileSync(path.join(root,'data',filename), '\ufeff'+[columns.join(','),...rows.map(row=>columns.map(col=>escape(row[col])).join(','))].join('\r\n')+'\r\n');
  specs[filename]={description,row_count:rows.length,columns};
}
csv('outfits.csv',load('outfits').map(row=>({...row,...common(row.outfit_id),recipe_status:statuses.get(row.outfit_id)?.status,needs_recipe:statuses.get(row.outfit_id)?.needs_recipe,recipe_id:statuses.get(row.outfit_id)?.recipe_id,recipe_gap_reason:statuses.get(row.outfit_id)?.reason})), 'One row per outfit form; base, evolution and glow-up have different IDs.');
csv('clothing.csv',load('clothing').map(row=>({...row,...common(row.clothing_id)})), 'One row per clothing object/variant; outfit membership remains in outfit_clothing.');
csv('materials.csv',load('materials').map(row=>({...row,...common(row.material_id)})), 'Materials and other inventory objects; not all rows are gatherable.');
const grouped=new Map();
for(const row of load('recipe_ingredients')){if(!grouped.has(row.recipe_id))grouped.set(row.recipe_id,[]);grouped.get(row.recipe_id).push(row);}
csv('recipes.csv',load('recipes').flatMap(row=>(grouped.get(row.recipe_id)||[{}]).map(ingredient=>({...row,target_name:objects.get(row.target_id)?.display_name??'',recipe_source_url:sources.get(row.source_id)?.url??'',material_id:ingredient.material_id??'',material_name:objects.get(ingredient.material_id)?.display_name??'',quantity:ingredient.quantity??'',unit:ingredient.unit??'',ingredient_source_id:ingredient.source_id??'',ingredient_source_url:sources.get(ingredient.source_id)?.url??''}))), 'One row per recipe ingredient; incomplete/design-only recipes retained with blank ingredients. Filter status=complete and scope before computing.');
const extra=new Map();
for(const row of load('name_sources')){if(!extra.has(row.name_id))extra.set(row.name_id,[]);extra.get(row.name_id).push(row.source_id);}
csv('aliases.csv',names.map(row=>({...row,object_kind:objects.get(row.object_id)?.kind,object_display_name:objects.get(row.object_id)?.display_name,source_url:sources.get(row.source_id)?.url??'',additional_source_ids:extra.get(row.name_id)??[],additional_source_urls:(extra.get(row.name_id)??[]).map(id=>sources.get(id)?.url??'')})), 'Formal multilingual names and sourced aliases together; use name_type to distinguish.');
const dictionary=fs.readFileSync(path.join(root,'docs/DATA_DICTIONARY.md'),'utf8').replaceAll('(REGION_BANNER_STATUS.md)','(../docs/REGION_BANNER_STATUS.md)');
const appendix='\n\n## Readable joined exports\n\nThese UTF-8 BOM CSV views are derived by `node scripts/export-final-data.mjs`; no IDs, quantities or evidence are invented. Empty cells mean unknown/not applicable, not zero. The 32 normalized tables in `dataset/csv/` are authoritative.\n\n'+Object.entries(specs).map(([file,s])=>'### '+file+'\n\n'+s.description+' Rows: '+s.row_count+'.\n\nFields: `'+s.columns.join('`, `')+'`.\n\nInherited fields retain the types, nullability and source definitions of the tables above. `name_*` and `*_name` are TEXT joins from object_names/objects. `source_url` and `*_source_url` are TEXT joins from sources. `recipe_status`, `needs_recipe`, `recipe_gap_reason` come from outfit_recipe_status. `additional_source_ids` and `additional_source_urls` are JSON arrays of secondary name_sources evidence; no evidence means `[]`.\n').join('\n');
fs.writeFileSync(path.join(root,'data/data_dictionary.md'),dictionary+appendix);
fs.writeFileSync(path.join(root,'data/export_manifest.json'),JSON.stringify({snapshot_id:JSON.parse(fs.readFileSync(path.join(root,'data/dataset/manifest.json'))).snapshot_id,source:'data/dataset/json/',generated_by:'scripts/export-final-data.mjs',views:specs},null,2)+'\n');
console.log('PASS readable CSV exports: '+Object.entries(specs).map(([file,s])=>file+'='+s.row_count).join(', '));
