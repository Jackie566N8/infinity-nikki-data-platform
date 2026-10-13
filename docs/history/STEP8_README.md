# Infinity Nikki Intelligence and Data Analytics Platform

**A provenance-aware catalog that turns multilingual game information into reproducible analytics, material plans and evaluated search.**

[中文介绍](README.zh-CN.md) · [Data dictionary](docs/DATA_DICTIONARY.md) · [Step 8 report](docs/reports/STEP8_FINAL_REPORT.md) · [Demo script](docs/DEMO_SCRIPT.md)

## Why this project

Players search unofficial nicknames across languages, track incomplete wardrobes and combine overlapping crafting requirements. These tasks need more than a gallery: they require stable identities, reliable relationships, explicit missing-data handling and measurable retrieval. This independent portfolio project follows the chain **source evidence → relational modeling → quality checks → analytics → model comparison → honest limitations**. It is not an official game service.

## What it delivers

- A 32-table SQLite/CSV/JSON data foundation with source assertions, version dates and snapshots; original, evolution and glow-up forms have separate IDs.
- Style, rarity, category, acquisition and version dashboards with filters and CSV export.
- Local-only wardrobe completion, missing-piece analysis and inventory-aware multi-outfit material planning.
- Five-language exact/nickname/fuzzy/pinyin/feature retrieval, explainable hybrid ranking and explicit no-answer handling.
- Explainable similarity recommendations; Python/DuckDB catalog association, medoid clustering, sensitivity and grouped search uncertainty.
- Public community study metadata with platform/sample boundaries, regional gathering suggestions and human review templates. Search telemetry is disabled.

## Scope and findings

| Current snapshot | Value |
|---|---:|
| Catalog forms / independent base outfits | 775 / 310 |
| Evolution / glow-up forms | 274 / 191 |
| Clothing pieces / materials and other inventory objects | 8213 / 1771 |
| Complete candidate base recipes | 60/71 (84.51%) |
| Sourced single-step evolution resource lists | 17/274 (6.2%) |
| Calculable forms, including glow-up and evolution | 268/775 |
| Structural errors / exact gathering points | 0 / 0 |
| Human-approved search labels | 0 |

Rarity × primary style has weak catalog association (Cramér’s V=0.114, permutation p=0.4254). Five feature clusters mainly reproduce existing styles; sensitivity checks do not support a claim of newly discovered player segments. The frozen F method gains 50 percentage points over C on the candidate test positives, but only four positive families are represented (paired group test p=0.125). These are portfolio-scale exploratory results, not population or causal claims.

## Screenshots and demo

![Research dashboard](docs/screenshots/research-desktop.png)

![Material planning](docs/screenshots/materials-desktop.png)

<!-- Add your own 30–60 second recording at docs/screenshots/demo.gif and embed it here. -->

**GIF / hosted-demo slot:** pending your recording and deployment. No live deployment has been claimed. Follow [the 8-minute demo script](docs/DEMO_SCRIPT.md).

## Technology and choices

| Technology | Reason |
|---|---|
| HTML/CSS/JavaScript | Static, portable five-language UI; browser-only personal data; no installation needed to view |
| Node.js 24 built-ins | Deterministic offline data builds, SQLite constraints, schema tests, hash-locked search evaluation; no runtime npm packages |
| Python 3.12, NumPy, Pandas | Reproducible analysis, numeric fixtures, permutation inference and clustering sensitivity |
| DuckDB | Small local SQL research mart, reconciled against normalized SQLite; not a replacement for source provenance |
| SQLite + CSV/JSON | Relational integrity, inspectable datasets and convenient frontend export |
| GitHub Actions | Reproducible CI configuration; remote execution is pending upload |

## Quick start

**Website, zero installation:** double-click `src/index.html`. The delivered single-file `outputs/奇迹旅册.html` also works. Core UI/data run locally; external art, optional fonts and source/map links require internet. Offline image placeholders are expected for external art.

**Optional local server:** from the repository root, run `python -m http.server 8000 --directory src`, then open [localhost](http://localhost:8000). Or run `node scripts/serve.mjs` (port 4173).

**Rebuild and reproduce**, with Node.js 24+ and Python 3.12+:

```sh
python -m pip install -r requirements.txt
node scripts/build.mjs
node scripts/analyze.mjs
node scripts/check.mjs
node scripts/test.mjs
node scripts/python.mjs analysis/test_research.py
node scripts/reproduce-search.mjs
node scripts/release-docs.mjs
node scripts/standalone.mjs
```

Set `PYTHON` only if the installed Python executable needs explicit selection. Browser QA is optional: set `BROWSER_PATH` to Chrome/Chromium and run `node scripts/browser-qa.mjs`. It tests offline file opening, five languages, four widths and fresh local storage. `npm ci` is only needed for the optional pinned formatter. Every maintained path is repository-relative.

## Search evaluation

100 source-checked **AI-assisted candidate queries**, 70 development / 30 test, grouped by family and no-answer intent. **Human Gold review is pending.** Test accuracy averages 24 answerable queries; rejection averages six negative queries. F was selected and frozen on development before the first test run. This release independently reproduces all 600 A–F top-five predictions without rewriting that report. Timings cover warmed in-memory models, not page/network latency.

| Method | Hit@1 | Hit@5 | MRR | No-answer | Warm model ms |
|---|---:|---:|---:|---:|---:|
| A | 33.33% | 33.33% | 0.3333 | 100.00% | 0.0005 |
| B | 16.67% | 16.67% | 0.1667 | 100.00% | 0.0006 |
| C | 50.00% | 50.00% | 0.5000 | 100.00% | 0.0005 |
| D | 83.33% | 83.33% | 0.8333 | 100.00% | 0.1446 |
| E | 66.67% | 66.67% | 0.6667 | 100.00% | 0.1338 |
| F | 100.00% | 100.00% | 1.0000 | 100.00% | 0.1426 |

[Original comparison](data/dataset/search-improved/comparison.json) · [Reproduction](review/step8/search-reproduction.json) · [Scientific limitations](docs/reports/EXPLORATORY_RESEARCH.md). Frozen model/vendor bytes and experiment inputs are retained. Expanded live-catalog search is not certified by the smaller frozen benchmark.

## Data sources and maintenance

[Infold official news](https://infinitynikki.infoldgames.com/en/news/591) and publisher Steam announcements support selected schedules. [Gongeo](https://gongeo.us/) provides catalog IDs/names; [BWIKI](https://wiki.biligame.com/wxnn/套装图鉴) is a community source; [TH.GL](https://infinitynikki.th.gl/db) provides public piece/material facts. Fandom indexed craft-usage records and attributed guides supply corroboration. Community nickname/poll sources retain their own platform and sample scope. These sources are not interchangeable with official in-game measurement.

Source URLs, review timestamps, nullable publication dates and derivations are stored in `data/input` and normalized source tables. Collection date is never used as release date. Some recipe evidence was reviewed from previously captured public pages; it is not a claim of fresh HTTP retrieval or current in-game measurement. Source conflicts remain visible. [CONTRIBUTING](CONTRIBUTING.md) covers updates; [human review](docs/HUMAN_REVIEW.md) and [route entry](docs/ROUTE_DATA_ENTRY.md) explain the remaining work.

## Known limitations and roadmap

- **11 craftable bases** lack reliable quantities; **257 evolution forms** lack complete resource lists. Known source amounts are not yet verified in-game at the current version. Copy ownership requirements are separate from resources; actual copy deduction is unknown.
- Equal-level evolution attribute deltas remain unverified (0/274); unknown levels must not be subtracted. No measured paths or exact gathering coordinates are available.
- Five outfit membership conflicts, 80 source sketch targets outside the indexed clothing scope and 1897 source difference candidates remain for review. Full-game/version completeness is not established. The 71-base candidate scope includes one activity outfit whose sketch eligibility still needs confirmation.
- Image availability is checked on a small stated sample; visual semantic tags and outfit-level color/element/difficulty coverage are limited. Community samples do not represent all players.
- Next: independent human Gold audit → versioned new holdout → better sourced visual tags → remaining recipes/evolution panels → measured route graph. Add a recorded demo and deploy only after your own review.

## Repository structure

```text
.
├── src/                  # Prebuilt static website and maintained UI code
├── data/
│   ├── input/            # Curated source facts, catalog and provenance
│   ├── dataset/          # Relational CSV/JSON, frozen experiments, generated databases
│   ├── routes/           # Regional index; measured graph remains pending
│   └── review/           # Review manifest; human approvals remain zero
├── analysis/             # Python, SQL and optional exploratory notebook
├── docs/                 # Dictionary, reports, screenshots and review/route templates
├── scripts/              # Build, verification, collection and review utilities
│   └── platform/         # Schema, models and analytical mart builders
├── .github/workflows/    # CI configuration; manual Pages deployment workflow
├── README.md
├── LICENSE
├── requirements.txt
└── package.json
```

## License

Source code uses [MIT](LICENSE). Game art, third-party text/data and vendored dependencies retain their original rights; see [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md).
