import fs from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const file = "data/review/step10/live-predictions.json";
const ledger = JSON.parse(fs.readFileSync(file));
const ledger_hash = createHash("sha256")
  .update(fs.readFileSync(file))
  .digest("hex");
const labels = {
  formal: "正式名",
  nickname: "昵称",
  typo_pinyin: "错字 / 拼音",
  description: "描述性",
  multilingual: "多语言",
};
const esc = (s) => String(s).replaceAll("|", "\\|").replaceAll("\n", " ");
const prediction = (r, n) =>
  r.ranked[n] ? `${r.ranked[n].name_zh} · ${r.ranked[n].id}` : "—";
assert.equal(ledger.rows.length, 50);
for (const type of Object.keys(labels))
  assert.equal(ledger.rows.filter((r) => r.type === type).length, 10);
const template = {
  schema_version: 1,
  cohort: "step10-human-50",
  snapshot_id: ledger.snapshot_id,
  prediction_ledger_sha256: ledger_hash,
  instructions:
    "Leave pending/uncertain entries with correct_ids and answerable null. Approved positives need valid IDs; approved no-answer needs [] and false. Do not edit query IDs or original splits. Evidence is a URL or a concrete in-game screenshot reference; negatives must state the catalog scope checked.",
  reviews: ledger.rows.map((q) => ({
    query_id: q.query_id,
    query: q.query,
    status: "pending",
    correct_ids: null,
    answerable: null,
    reviewer: "",
    reviewed_at: "",
    evidence: "",
    notes: "",
  })),
};
fs.mkdirSync("docs/templates", { recursive: true });
// Review answers must live in a copied file; this command only refreshes blank templates.
fs.writeFileSync(
  "docs/templates/HUMAN_REVIEW_50_RETURN.json",
  JSON.stringify(template, null, 2) + "\n",
);
const lines = [
  "# 50 条真人搜索审核表",
  "",
  `网站当前 F 模型 · ${ledger.document_count} 对象 · 快照 \`${ledger.snapshot_id}\`。正式名、昵称、错字/拼音、描述性、多语言各 10 条；沿用原划分：开发 35、测试 15。部分名称可能与旧候选标签不同，正是需要核对的项目。`,
  "",
  "**当前真人通过数：0。此表是审核工作表，不是已认证 Gold。** 正确答案栏故意留空；预测不足 3 条显示“—”，完全无结果显示 3 个“—”。完整预测排序另存，用于 Hit@5 与全排序 MRR。",
  "",
  "## 填写说明",
  "",
  "1. 先按查询意思独立判断，再看 Top3；可暂时遮住预测列，减少模型诱导。此轮仍属于模型辅助审核，不能宣称盲审。",
  "2. 优先核对当前游戏图鉴/面板、来源链接与网站对象 ID。区分原色、进化及同名部件；写正确 ID（可有多个真正相关对象），不要仅写排序位置。",
  "3. 确认网站快照范围内无对应资料：正确答案填 `[]`、answerable 填 `false`；这不意味着游戏中绝对不存在。存疑写“uncertain + 原因”，答案留空，不能算错误或无答案。",
  "4. 每条写审核人代号、带时区日期、核对来源/截图编号与判断说明。复制 JSON 回传模板填写结构化结果，或把本表已填写内容回传；不必公开真实姓名。",
  "5. 测试条目只用于评估，不改原划分、不调权重；此 50 条不替代全部 100 条 Gold。",
  "",
  "| ID | 类型 | 原划分 | 查询词 | Top1 | Top2 | Top3 | 正确答案（留空） | 备注 |",
  "|---|---|---|---|---|---|---|---|---|",
];
for (const q of ledger.rows)
  lines.push(
    `| ${q.query_id} | ${labels[q.type]} | ${q.split} | ${esc(q.query)} | ${esc(prediction(q, 0))} | ${esc(prediction(q, 1))} | ${esc(prediction(q, 2))} |  |  |`,
  );
lines.push(
  "",
  "[审核回传说明](../HUMAN_REVIEW_50.md) · [空白 JSON 回传模板](HUMAN_REVIEW_50_RETURN.json)",
  "",
);
fs.writeFileSync("docs/templates/HUMAN_REVIEW_50.md", lines.join("\n"));
console.log(
  "Prepared 50-row Markdown review and blank JSON return template. Correct answers remain unset.",
);
