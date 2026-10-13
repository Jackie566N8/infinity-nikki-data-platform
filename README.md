# Infinity Nikki Data Analytics & Intelligent Search Platform

**An evidence-traceable platform for exploring Infinity Nikki data, planning materials, and evaluating multilingual search.**

[Chinese README](README.zh-CN.md) · [Local demo](index.html) · [Deployment guide](docs/DEPLOYMENT.md) · [Three-minute demo script](docs/DEMO_SCRIPT.md)

## Project Overview

Players search for clothing by official names, community nicknames, and names in different languages. They also need to track missing pieces and combine material requirements across outfits. Conflicting sources, conflated base and evolution forms, and incomplete recipes make a simple catalog unreliable. This independent portfolio project follows a complete **source collection → relational modeling → quality assurance → analytics → search modeling → human-reviewed evaluation** workflow, bringing Data Analytics and Data Science methods to a practical player tool.

## Key Highlights

- **Data engineering:** 32 related tables, stable IDs, separate base/evolution/renewal records, and retained source evidence, conflicts, and snapshots.
- **Actionable analytics:** version, rarity, and style charts; wardrobe gaps; multi-outfit material demand and inventory deductions; CSV exports.
- **Explainable retrieval:** five-language official names, community nicknames, typos, pinyin, and attribute keywords, with match explanations, pagination, strict filters, and abstention.
- **Quantitative evaluation:** six methods (A–F) and 50 user-returned, human-reviewed Gold Standard labels. The original F method reached **97.73% Hit@1 (43/44)** and **100% correct rejection (6/6)**; a later regression fix is reported separately.
- **Scientific limits:** Python/DuckDB association analysis, clustering sensitivity, and grouped uncertainty. Missing observations are not treated as zero, and limited community samples are not generalized to all players.

## Live Demo

🔗 [Open the demo](https://jackie566n8.github.io/infinity-nikki-data-platform/)

The URL is reserved for this repository. The site becomes available after GitHub Pages is enabled and a deployment succeeds; publication has not been independently verified. The source is also available as a local static site.

## Features

| Feature | What it answers | Scope and limits |
|---|---|---|
| Catalog and multilingual search | Find outfits by formal names, nicknames such as `神女套`, or pinyin; switch among Simplified Chinese, English, Japanese, Korean, and Traditional Chinese. | Nickname provenance is retained; catalog coverage is incomplete. |
| Analytics center | Compare rarity, style, clothing category, acquisition method, and version trends; filter and export CSV. | Missing release dates remain marked as pending; collection dates are never substituted for game release dates. |
| Personal wardrobe | Measure completion, style and clothing-slot coverage, nearly complete outfits, and missing pieces for a target outfit. | Owned and favorite markers are distinct; calculations stay in the browser. |
| Material planning | Merge requirements for multiple outfits, subtract local inventory, identify shared materials, and summarize gathering regions. | Only complete resource lists are calculated; quantities with different units are not combined; routes are regional rather than exact. |
| Intelligent search | Compare A–F methods, inspect 50 human-reviewed queries, see match explanations, and reuse search in the Nikki companion. | Semantic matching uses weighted attribute keywords, not a hosted large language model. |
| Data quality | Inspect field completeness, ID/foreign-key/enum checks, source conflicts, and snapshots. | Every metric states its denominator; an image URL does not establish that an image loads. |
| Extended research | Explore explainable similar-outfit recommendations, community sample analysis, and nickname research. | Limited community samples do not represent the entire player population. |

The interface uses a purple palette and Noto Serif SC headings. A Momo cursor toggle sits at the top, and the Nikki companion stays in the lower-right corner. All nine region banners have distinct local images; failed image loads fall back to region-specific SVG and CSS themes.

## Tech Stack

| Technology | Reason for using it |
|---|---|
| HTML/CSS/JavaScript | A prebuilt static application works without a backend or installation and keeps personal data in the browser. |
| Node.js 24 / built-in SQLite | Offline builds, relational constraints, shared search models, and hash-based regression checks without runtime npm dependencies. |
| Python 3.12 / Pandas / NumPy | Data joins and cleaning, independent metric recomputation, permutation tests, and clustering sensitivity analysis. |
| DuckDB | Lightweight embedded analytical SQL over CSV, JSON, and Python data without a database server. |
| Exact, fuzzy, semantic, and hybrid search | Reproducible, explainable methods with development-set tuning and grouped evaluation. |
| GitHub Pages | Static hosting for prebuilt assets without a server or API keys. |

Method E uses source-backed weighted attribute keywords; it does not use dense embeddings or a large language model. The research implements medoid clustering directly and does not require scikit-learn. Exact Python dependencies are listed in [requirements.txt](requirements.txt); a notebook editor is optional.

## Data Science Highlights

| Measure | Current value | Definition |
|---|---:|---|
| Outfit forms | 775 | 310 base + 274 evolution + 191 renewal forms; these are not 775 independent outfits. |
| Clothing pieces | 8,213 | Includes cataloged variants; outfit–piece relationships are stored separately. |
| Searchable objects | 11,469 | Includes outfits, pieces, makeup, Eurekas, materials, and other items. |
| Complete base crafting recipes | **66/71 = 92.96%** | Crafting-eligible base forms; 239 directly acquired base forms are excluded from the denominator. |
| Complete evolution resource lists | **93/274 = 33.94%** | Per-evolution resource consumption; ownership prerequisites are tracked separately. |
| Calculable forms | 350 | 66 base + 93 evolution + 191 renewal forms. |
| Human-reviewed queries | 50/100 | User-returned labels from one reviewer, with predictions visible. |
| Original F Hit@1 / Hit@5 / MRR | **97.73% / 97.73% / 0.9773** | 44 answerable queries; 43 rank-first hits. |
| Original F correct rejection | **100% (6/6)** | Only six unanswerable queries. |
| F_v2 regression fix | 44/44; rejection 6/6 | One additional development hit; test remains 12/12, a gain of 0. |
| Structural validation | 0 errors / 1 warning | 80 out-of-catalog blueprint targets are intentionally not linked as dangling records. |
| Region banners | 9/9 local primary images load | Eight official assets plus one restored, user-provided screenshot. |

Reviewer: **human_reviewer_A**. Review date: **2026-10-12 (UTC+1, day-level precision)**. The 50 queries comprise 44 answerable and six unanswerable cases, split 35 development / 15 test by outfit family and answer intent. Predictions were visible and only one reviewer participated; per-item screenshots or URLs were not supplied, so this is **human-reviewed evaluation, not an independent blind audit**. The [human-reviewed search report](docs/search_evaluation_report.md) contains the full A–F and D_v2/F_v2 comparison and 144 grouped metric rows.

Across the reviewed set, original F → F_v2 improved by **2.27 percentage points** because a known development-set homophone miss was fixed; the untouched test set showed **no gain**. The earlier AI-assisted candidate test covered only four positive outfit families. F exceeded C by 50 percentage points there, but the family-grouped test gave **p=0.125**. Results from different corpora and review sets are not directly comparable. Rarity × style association was weak (Cramér’s V=0.114; permutation p=0.4254), and clustering largely recovered known style labels rather than new player segments. See the [research report](docs/reports/EXPLORATORY_RESEARCH.md).

## Getting Started

### Option 1: Open locally without installing anything

Extract the full project, then double-click the root `index.html`. It redirects relatively to `./src/index.html` while preserving query parameters and hash fragments. **Keep the `src/` directory alongside the root entry file.** Core data is prebuilt into local JavaScript, so the site does not need a startup JSON request or server-side inference. External game art, fonts, and community map links require internet access and have fallbacks.

### Option 2: Run a local server

From the repository root:

```sh
python -m http.server 8000
```

Open `http://localhost:8000/`. Browser storage is separate for `file://`, `localhost`, and the Pages domain; wardrobe and inventory data are not automatically synchronized across them.

### Option 3: Publish with GitHub Pages

1. Upload the **contents** of the extracted project directory to the root of `Jackie566N8/infinity-nikki-data-platform`, including `index.html`, `.nojekyll`, and `src/`.
2. In the repository, open **Settings → Pages → Build and deployment** and set **Source** to **Deploy from a branch**.
3. Select **main** and **/(root)**, then click **Save**. `/docs` contains documentation, not this project's branch-publishing entry point.
4. Check the Pages deployment in **Actions** and open the [demo URL](https://jackie566n8.github.io/infinity-nikki-data-platform/) after it succeeds.

See [GitHub's publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and this project's [deployment guide](docs/DEPLOYMENT.md).

### Reproduce the research and evaluation

No dependencies are needed to view the website. Rebuilding and rerunning the analysis require Node.js 24 and Python 3.12:

```sh
python -m pip install -r requirements.txt
node scripts/build.mjs
python analysis/data_quality_check.py
python analysis/search_evaluation.py
node scripts/analyze.mjs
node scripts/check.mjs
node scripts/test.mjs
node scripts/test-step12.mjs
node scripts/python.mjs analysis/test_research.py
node scripts/reproduce-search.mjs
```

The Python search entry point first reruns the shared model, then independently computes full-ranking metrics. Reproduction checks 400 method/query rankings from the human review while preserving the original timings; the older 600 candidate Top5 results are reproduced separately. Latency is measured on a warm model and excludes network, index construction, and page rendering. Tiny timing differences are not evidence of a speed advantage.

Use `python scripts/update_data.py` for updates and `python scripts/quality_check.py` for quality checks. These commands do not fetch new internet data, retune the model, or deploy. Optionally, `node scripts/standalone.mjs` writes an approximately 86 MB single-file `outputs/奇迹旅册.html`. Five-language catalog data, analytics, and local map assets explain its size; the GitHub project instead uses a small root entry and separate assets. Run `npm ci` only if the optional pinned formatter is needed.

## Data Sources

- Curated snapshots of the in-game catalog, multilingual records from gongeo.us, and community BWIKI. Third-party and community wikis are not presented as official wikis.
- Official announcements and game-site location/event art for checked version dates and region presentation.
- Community recipes, guides, and public research samples with recorded URLs, review dates, confidence, sample scope, and conflicts.
- The user-returned 50-query review and the user-provided Memorial Mountains screenshot, each labeled by source type.

The base catalog snapshot is dated **2026-09-16**; later additions retain their item-level dates. This package was prepared on **2026-10-13**. A page version label does not prove complete coverage of later game updates, and a build or collection date is not a game release date. See the [data dictionary](data/data_dictionary.md), [quality report](docs/data_quality_report.md), and [maintenance guide](docs/maintenance_guide.md).

## Known Limitations

- **Base recipe coverage is 66/71 (92.96%).** Five named records—`梦隙灵语`, `霓光游星`, `一帘烟雨`, `无拘绿野`, and `海风的召唤`—lack confirmed complete quantities. Their absence does not establish that all are event-only or officially unpublished.
- **Evolution coverage is 93/274 (33.94%).** The remaining 181 records include partial evidence and items awaiting entry. Equal-level before/after attributes still require verification.
- **Human review covers 50/100 queries.** Labels come from one reviewer who could see predictions, and the sample favors cataloged nicknames and attribute templates. Independent natural-language queries and multiple reviewers are needed.
- **Exact gathering routes are pending.** Verified coordinates, teleport points, and traversable paths are unavailable; the current planner provides regional suggestions and a data-entry template.
- Descriptive search and recommendations depend on sourced labels. Color and visual-element coverage is limited; labels are not inferred from names alone.
- Community preference data comes from small, platform-specific samples and cannot represent all players. The official version calendar is too incomplete for a reliable time-series forecast.
- External images are only spot-checked and can fail later. URL coverage, availability of local region banners, and live external-image success are separate metrics.

## Project Structure

```text
infinity-nikki-data-platform/
├── index.html / .nojekyll       # Root entry and Pages configuration
├── README.md / LICENSE         # Project overview and MIT source-code license
├── .gitignore / requirements.txt / package.json
├── src/                        # HTML, CSS, JavaScript, and assets/
├── data/
│   ├── outfits.csv / clothing.csv / materials.csv
│   ├── recipes.csv / aliases.csv / data_dictionary.md
│   ├── input/                  # Curated source snapshots and additions
│   ├── dataset/                # Authoritative 32-table CSV/JSON exports and frozen experiments
│   ├── review/                 # Frozen corpus, human labels, and returned reviews
│   └── routes/                 # Regional index and field-verification templates
├── analysis/
│   ├── search_evaluation.py / data_quality_check.py
│   ├── research.py / queries.sql
│   └── notebooks/ / results/
├── docs/                       # Reports, guides, screenshots, and review templates
├── scripts/                    # Builds, models, regression checks, and update entry points
│   ├── update_data.py / quality_check.py
│   └── platform/
└── .github/workflows/           # CI and manually triggered Pages workflow
```

`src/` retains the existing flat CSS/JavaScript layout to preserve relative references and dynamic loading; `assets/` groups local images. Root-level CSVs are linked views, while the 32 normalized tables remain authoritative. The source package excludes large duplicate database files, caches, personal inventory, and browser profiles. See the [file inventory](docs/FILE_INVENTORY.md).

## Roadmap

- Verify crafting eligibility and recipes for the five remaining base outfits, plus 181 evolution steps, against current in-game evidence.
- Complete human review for all 100 queries; create a new unseen natural-query holdout, blind the prediction display during review, and measure inter-rater agreement.
- Improve the existing similar-outfit recommender with sourced color/element labels, offline recommendation evaluation, and cold-start handling.
- Measure gathering coordinates, teleport points, and traversability before attempting actionable route optimization.
- Extend the version calendar and community samples before studying temporal forecasts.

## License

The source code is released under the [MIT License](LICENSE). The copyright year and holder fields were deliberately left for the repository owner to fill in. **Game artwork, third-party data, and dependencies retain their original rights and are not relicensed under MIT.** See [third-party notices](THIRD_PARTY_NOTICES.md). This is an independent portfolio project, not an official game service.

## Screenshots

Replace these four slots with your own captures. Region-image repair evidence is available in [screenshots](docs/screenshots/).

- **Screenshot slot: catalog and five-language intelligent search**
- **Screenshot slot: rarity, style, and version analytics center**
- **Screenshot slot: personal wardrobe and multi-outfit material planning**
- **Screenshot slot: human-reviewed search evaluation and data quality**

[Short project pitch](docs/ELEVATOR_PITCH.md) · [Three-minute demo](docs/DEMO_SCRIPT.md) · [Final project status](docs/FINAL_STATUS.md)
