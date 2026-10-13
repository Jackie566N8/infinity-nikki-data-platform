// Metrics are conditional on human-approved entries. Pending entries never become zeros.
export function summarize(rows) {
  const positive = rows.filter((r) => r.answerable),
    negative = rows.filter((r) => !r.answerable);
  const mean = (a, key) =>
    a.length ? a.reduce((sum, r) => sum + r[key], 0) / a.length : null;
  return {
    reviewed: rows.length,
    answerable: positive.length,
    no_answer: negative.length,
    hit_at_1: mean(positive, "hit1"),
    hit_at_5: mean(positive, "hit5"),
    mrr: mean(positive, "reciprocal_rank"),
    no_answer_identification: mean(negative, "rejected"),
  };
}
export function score(answers, ranking) {
  const rank = ranking.findIndex((r) =>
    answers.includes(typeof r === "string" ? r : r.id),
  );
  return {
    hit1: Number(rank === 0),
    hit5: Number(rank >= 0 && rank < 5),
    reciprocal_rank: rank >= 0 ? 1 / (rank + 1) : 0,
    rejected: Number(ranking.length === 0),
  };
}
