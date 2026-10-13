# Third-party materials and license boundaries

The MIT license applies only to original project software/documentation that the project contributors have the right to license. It does not relicense game artwork, characters, game names, third-party data, translated strings or vendored code.

|Material|Source and scope|Rights/notice|
|---|---|---|
|Infinity Nikki artwork, names, character references|Infold Games / Papergames and the source pages linked in each record|Rights remain with their owners; no additional artwork license is granted by this repository.|
|Community catalog metadata and multilingual names|[gongeo.us](https://gongeo.us), [BWIKI](https://wiki.biligame.com/wxnn/首页), [TH.GL](https://infinitynikki.th.gl/db)|Retain item-level attribution, acquisition dates and source IDs. Data is a community snapshot, not an official feed or a claim to own the source content.|
|Wiki-derived recipe facts|[Infinity Nikki Wiki](https://infinity-nikki.fandom.com), original linked pages and versions|Retain original attribution and applicable CC BY-SA terms where identified by the source. Review source terms before redistributing larger derived collections. These data are not covered by the project's MIT code license.|
|Public poll aggregates|Four linked TapTap studies|Only public aggregate outcomes are recorded. No individual profiles; results are platform-specific, not representative of all players.|
|pinyin-pro 3.29.5|[upstream](https://github.com/zh-lx/pinyin-pro), `scripts/platform/search-improved/vendor/`|MIT; original license and hashes included.|
|opencc-js 1.4.2 and its data|[upstream](https://github.com/nk2028/opencc-js), same vendor directory|Original MIT / Apache-2.0 notices are preserved.|
|Noto Serif SC web font|Google Fonts / Noto|Loaded externally by the existing site; not relicensed as MIT. Offline rendering uses the declared serif fallback.|

Full raw official announcement bodies, research browser profiles, credentials, installed packages and operating-system caches are excluded from the GitHub handoff. Curated facts retain source URLs; timestamps distinguish announcement, release, verification and snapshot generation.

Optional formatting uses Prettier 3.9.10 (MIT), locked by registry integrity in package-lock.json. Installed formatter/runtime files are excluded from the handoff.

Region banner images are saved locally from the Infold official homepage and regional announcements. Eight originals retain Infold Games / Papergames rights; they are not relicensed by this project's MIT license. Exact pages, resource URLs, retrieval times and wider-area scope are recorded in `data/input/region-banners.json` and [the status register](docs/REGION_BANNER_STATUS.md). The nine abstract SVG fallback themes are original project graphics, not game screenshots or geographic maps. Memorial Mountains currently uses such an explicitly labeled placeholder.

Update 2026-10-13: Memorial Mountains now uses a user-supplied game screenshot restored/cropped with the built-in image tool; the original is retained in `data/assets/region-banners/`. It is not classified as officially sourced promotional artwork and is not relicensed as MIT. Its SVG remains a failure fallback. [Processing/provenance](docs/MEMORIAL_BANNER_UPDATE.md).
