# Exploratory catalog analysis and search uncertainty

## Questions

Do rarity and primary style associate in the currently indexed base catalog? Does feature clustering reveal structure beyond the source's primary styles? What does the frozen candidate search comparison actually establish?

## Data and reproducibility

310 distinct base outfits; core snapshot snapshot:40476599ebb8f4049129085c. Python 3.12.14; NumPy 2.3.5, Pandas 3.0.1, DuckDB 1.5.6. Run npm run analyze and npm run test:research. SQL examples: analysis/queries.sql. Frozen search comparison is reused without retuning or altering its labels/predictions.

## Rarity × style association

Pearson contingency χ²=8.1212, Cramér's V=0.1144. With 4999 label permutations and seed 20261010, exploratory p=0.4254; minimum expected cell=6.80. This is weak association with no compelling permutation evidence in this catalog. It does not establish that rarity causes a style, nor a player-preference relationship. The directory is not a random sample of an unknown full-game population.

## Clustering and sensitivity

Weighted block cosine distance: style .40, IDF tags .30, rarity .10, acquisition channel .15, with unknown blocks excluded from the denominator. Outfit-level color/element/difficulty are absent and unused. Alternating medoid updates, k=2–8, 5 initializations, at most 30 updates per run. Choose maximum same-data silhouette, then smaller k. This is exploratory model selection, not external predictive validation.

|k|Silhouette|Objective|Converged|
|---|---:|---:|---|
|2|0.1382|194.763|true|
|3|0.2181|168.364|true|
|4|0.3369|147.481|true|
|5|0.4657|129.531|true|
|6|0.3870|125.762|true|
|7|0.3456|120.551|true|
|8|0.3115|114.248|true|

Selected k=5, silhouette=0.4657. Each group is dominated by an already defined primary style. Removing acquisition channel gives ARI=1.000, and removing tags gives ARI=1.000 against the main assignment. This largely recovers the declared style taxonomy; it is **not evidence of a new latent player segment**. The result suggests that visual labeling and a less style-dominated representation would be needed before claiming new structural discoveries. Stable IDs, medoids and every member are exported to cluster-membership.csv.

## Frozen search comparison

Annotation: provisional_not_human_reviewed; external human approvals=0. Development/test split 70/30 by family and no-answer intent. Test positives 24 (four families), negatives 6.

|Method|Hit@1|Hit@5|MRR|No-answer|Saved warm model latency (ms)|
|---|---:|---:|---:|---:|---:|
|A|33.33%|33.33%|0.3333|100.00%|0.000521|
|B|16.67%|16.67%|0.1667|100.00%|0.000597|
|C|50.00%|50.00%|0.5000|100.00%|0.000482|
|D|83.33%|83.33%|0.8333|100.00%|0.136811|
|E|66.67%|66.67%|0.6667|100.00%|0.135561|
|F|100.00%|100.00%|1.0000|100.00%|0.136901|
|L|66.67%|66.67%|0.6667|100.00%|0.918620|

F−C Hit@1 is +50 percentage points on these candidates. At the **family** unit, four differences are [0.5,0.5,0.5,0.5]; exact two-sided sign-flip p=0.125. F−D is +16.67 points and F−E/L +33.33 points; the group p is also 0.125. Thus the small correlated test does not establish statistically significant generalization. Fully repeated patterns across the four families underline the narrow query-template coverage.

Wilson 95% intervals under a query-iid assumption: F positive 24/24 approximately 86.2%–100%; rejection 6/6 approximately 61.0%–100%. Queries within a family are related, violating iid; these are diagnostic intervals, not population confidence claims. Grouped testing is preferred, but just four families remains inadequate.

No new search weights were selected from this audit. The previous F release was chosen on development data; current values are saved first-run warm in-memory timings, excluding page load/network/DOM, with cold index construction separately recorded. They are not current end-to-end browser timings. No independent human or visual-description success is claimed. See HUMAN_REVIEW.md for a new external holdout.

## Practical value and limits

- Rarity alone gives little reason to infer style preference; browse by actual style/tag fields.
- Feature grouping provides traceable navigation/prototypes but currently adds little beyond primary style.
- Search improves controlled aliases/pinyin/prefix/feature constraints while the evidence supports a limited candidate experiment only.
- No version forecast is produced from incomplete historical coverage; no revenues or player ownership are fabricated.
- All personal stock/ownership remains local; this offline research reads only the public catalog and saved candidate experiment.
