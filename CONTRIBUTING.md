# Contributing and maintaining data

## Before a change

Read [data scope](docs/DATA_SCOPE.md) and the applicable data dictionary. Use Node.js 24; for the optional Python research pipeline, use Python 3.12 and `pip install -r requirements.txt`.

## Evidence-first data update

1. Add source facts to `data/input/`. Preserve the URL, exact object/form ID, observed quantity **and unit**, source publication date when known, actual verification timestamp, and extraction method. An inaccessible page means retrieval failed, not "data unpublished".
2. Use a stable game ID; a changed display name does not create a new object. For slug-only materials, maintain explicit identity mappings. Never match ambiguous names automatically.
3. Distinguish a base outfit, evolution and glow-up. A singleton source group is not enough to call a record an independent base outfit: check form evidence and parent membership.
4. Do not default an omitted quantity to 1, a missing date to the collection day, a missing translation to English, or a missing visual feature to a color guessed from a name. Verified unit inheritance must record its supporting source without rescaling quantities.
5. Keep conflicting source assertions and unresolved member-count differences. Local collection analytics must not silently treat an uncertain member list as complete.
6. Run `npm run build`, `npm run analyze`, `npm run verify`. Inspect the data quality page and generated change log. Publish small source facts and derived site data; keep large history/databases in release artifacts rather than Git.

## Search experiments

The existing Step 5/6 query set and algorithm release are frozen. Files under `dataset/search` and the release-locked model, features, dependency bytes and predictions must not be edited to improve old test scores. New tags or ranking methods require a new experiment/version and an independent holdout. Merely rerunning the saved report is not a new evaluation.

Human reviewers must use the review template, supply actual reviewer metadata, independently confirm object IDs and record disagreement/adjudication. AI-assisted proposals remain provisional. Contributors may not certify their own generated labels as external human Gold.

## Privacy and sources

Do not import a user's local wardrobe, inventory or companion conversations into a public dataset. Search logging is design-only. Public polls need population, platform, sample size, extraction time, question, selection rules and limitations; never combine incompatible percentages as all-player popularity.

## Pull requests

Describe the concrete corrected fact/behavior, supporting source, affected forms and metric changes. Include the checks run and unresolved uncertainty. Keep review artifacts out of source inputs. Original code is MIT; third-party content retains its notices.
