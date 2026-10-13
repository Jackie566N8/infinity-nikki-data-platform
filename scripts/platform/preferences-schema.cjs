(function(root){'use strict';
const metrics=['preference','pull_intent','approval','collection_rate','mean_completion','revenue'];
function validate(data,catalog){const errors=[],add=s=>errors.push(s),isText=v=>typeof v==='string'&&v.trim().length>0,finite=v=>typeof v==='number'&&Number.isFinite(v),url=v=>typeof v==='string'&&/^https:\/\/[^\s]+$/.test(v),date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!data||data.schema_version!==1||!Array.isArray(data.sources)||!Array.isArray(data.studies))return ['schema_version=1，sources/studies 必须为数组'];
 if(data.sources.length>500||data.studies.length>1000)return ['一次最多 500 个来源、1000 份研究'];
 if(!isText(data.update_note))add('update_note 必须说明本次更新内容');
 const ids=new Set(),unique=(id,kind)=>{if(!isText(id)||! /^[a-zA-Z0-9:_-]{1,100}$/.test(id))add(kind+' ID 非法');if(ids.has(id))add('重复 ID: '+id);ids.add(id);};
 const sources=new Map(),outfits=new Map(catalog.outfits.map(o=>[o.id,o])),versions=new Set(catalog.versions.map(v=>v.version_id)),sourceUrls=new Set(),studyKeys=new Set();
 for(const s of data.sources){unique(s.source_id,'source');sources.set(s.source_id,s);for(const k of ['platform','title','sample_scope','data_type','assessment'])if(!isText(s[k]))add(s.source_id+' 缺少 '+k);if(!url(s.url))add(s.source_id+' 来源需 HTTPS URL');if(!isText(s.collected_at)||!/^\d{4}-\d\d-\d\dT/.test(s.collected_at)||Number.isNaN(Date.parse(s.collected_at)))add(s.source_id+' 采集时间非法');if(s.sample_size!==null&&(!Number.isInteger(s.sample_size)||s.sample_size<1))add(s.source_id+' 未知样本量请用 null');if(!['usable','pending','excluded'].includes(s.status))add(s.source_id+' 状态非法');if(!['indexed_page','direct_page','manual'].includes(s.access_method))add(s.source_id+' 读取方式非法');}
 for(const s of data.sources){if(sourceUrls.has(s.url))add('同一来源 URL 应复用 source_id: '+s.url);sourceUrls.add(s.url);}
 for(const s of data.studies){unique(s.study_id,'study');const prefix=s.study_id+' ';if(!sources.has(s.source_id))add(prefix+'来源关联不存在');if(!['ready','pending'].includes(s.status))add(prefix+'状态非法');if(!metrics.includes(s.metric))add(prefix+'指标非法');if(!['family','base','form'].includes(s.form_scope))add(prefix+'形态口径非法');
  if(!Array.isArray(s.candidate_ids)||!Array.isArray(s.options)||!Array.isArray(s.observations)){add(prefix+'candidate_ids/options/observations 需为数组');continue;}
  if(new Set(s.candidate_ids).size!==s.candidate_ids.length)add(prefix+'候选对象重复');for(const id of s.candidate_ids){const o=outfits.get(id);if(!o)add(prefix+'套装不存在 '+id);else if(['base','family'].includes(s.form_scope)&&!o.is_base)add(prefix+'家族/原色必须关联原色 ID');}
  for(const k of ['title','question','population','measure_note','mapping_note'])if(!isText(s[k]))add(prefix+'缺少 '+k);
  for(const k of ['published_date','period_start','period_end'])if(s[k]!==null&&!date(s[k]))add(prefix+k+' 日期非法或应为 null');
  if(Boolean(s.period_start)!==Boolean(s.period_end)||s.period_start&&s.period_end<s.period_start)add(prefix+'采样时间范围不完整或倒置');
  if(s.period_version_id!==null&&!versions.has(s.period_version_id))add(prefix+'采样版本不存在');
  for(const o of s.options){unique(o.option_id,'option');if(!isText(o.label)||!Array.isArray(o.outfit_ids)){add(prefix+'选项结构非法');continue;}if(new Set(o.outfit_ids).size!==o.outfit_ids.length)add(prefix+'选项对象重复');for(const id of o.outfit_ids)if(!s.candidate_ids.includes(id))add(prefix+'选项关联不在候选内');if(o.percent!==null&&(!finite(o.percent)||o.percent<0||o.percent>100))add(prefix+'选项比例非法');if(o.vote_count!==null&&(!Number.isInteger(o.vote_count)||o.vote_count<0))add(prefix+'票数非法');}
  const observationIds=new Set();for(const o of s.observations){if(observationIds.has(o.outfit_id))add(prefix+'观测对象重复');observationIds.add(o.outfit_id);if(!s.candidate_ids.includes(o.outfit_id)||!finite(o.value)||o.value<0||!isText(o.definition))add(prefix+'观测值、对象或定义非法');}
  if(s.status!=='ready')continue;
  const identity=JSON.stringify([s.source_id,s.question,s.metric,s.form_scope,[...s.candidate_ids].sort(),s.period_start,s.period_end]);if(studyKeys.has(identity))add(prefix+'同一研究重复录入，请沿用 study_id 更新');studyKeys.add(identity);
  if(sources.get(s.source_id)?.status!=='usable')add(prefix+'可分析研究必须有 usable 来源');if(s.metric!=='revenue'){if(!Number.isInteger(s.sample_size)||s.sample_size<1)add(prefix+'可分析研究必须有明确样本量');if(s.sample_unit!=='participants')add(prefix+'当前比例统计只接受明确的参与者样本量');if(s.unit!=='percent')add(prefix+'比例指标单位必须为 percent');}else {if(!/^[A-Z]{3}$/.test(s.unit))add(prefix+'金额单位需为三位货币代码');if(!['participants','accounts','transactions','not_reported'].includes(s.sample_unit))add(prefix+'收入样本单位非法');if(s.sample_size!==null&&(!Number.isInteger(s.sample_size)||s.sample_size<1))add(prefix+'收入样本量非法');if(!s.period_start||!s.period_end)add(prefix+'收入需要明确观察时段');}
  if(!s.candidate_ids.length)add(prefix+'候选对象不能为空');
  if(['preference','pull_intent','approval'].includes(s.metric)){
   if(s.selection_mode!=='single')add(prefix+'当前投票模型只接受互斥单选选项，双方都选可映射两个对象');if(!s.options.length)add(prefix+'缺少投票选项');let sum=0;const mapped=new Set();
   for(const o of s.options){if(!isText(o.label))add(prefix+'选项缺名称');if(!finite(o.percent)||o.percent<0||o.percent>100)add(prefix+'选项比例超出 0–100');else sum+=o.percent;if(!Array.isArray(o.outfit_ids)){add(prefix+'选项 outfit_ids 非数组');continue;}for(const id of o.outfit_ids)mapped.add(id);if(o.vote_count!==null&&(!Number.isInteger(o.vote_count)||o.vote_count<0||o.vote_count>s.sample_size))add(prefix+'票数非法');if(o.vote_count!==null&&Math.abs(100*o.vote_count/s.sample_size-o.percent)>.11)add(prefix+'票数与比例不一致');}
   if(Math.abs(sum-100)>.3)add(prefix+'单选选项占比合计应约为 100%');for(const id of s.candidate_ids)if(!mapped.has(id))add(prefix+'候选缺少明确支持选项 '+id);if(s.options.every(o=>o.vote_count!==null)&&s.options.reduce((n,o)=>n+o.vote_count,0)!==s.sample_size)add(prefix+'票数总计与样本量不符');
  }else {const seen=new Set();for(const o of s.observations){if(seen.has(o.outfit_id))add(prefix+'观测对象重复');seen.add(o.outfit_id);if(!s.candidate_ids.includes(o.outfit_id))add(prefix+'观测对象不在候选内');if(!finite(o.value)||o.value<0||(s.metric!=='revenue'&&o.value>100))add(prefix+'观测值超出合法范围');if(!isText(o.definition))add(prefix+'观测缺少定义');}for(const id of s.candidate_ids)if(!seen.has(id))add(prefix+'缺少观测 '+id);}
 }
 return errors;
}
root.NikkiPreferencesSchema={validate,metrics};if(typeof module!=='undefined'&&module.exports)module.exports={validate,metrics};
})(globalThis);
