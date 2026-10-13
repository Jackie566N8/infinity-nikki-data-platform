# GitHub Pages与本地运行

作者已将项目上传到 [Jackie566N8/infinity-nikki-data-platform](https://github.com/Jackie566N8/infinity-nikki-data-platform)。预填URL：https://jackie566n8.github.io/infinity-nikki-data-platform/ 。目前尚未核实 Pages 设置和线上部署结果；只有发布成功后才可访问。

## 从分支部署（推荐）

1. 在仓库 **Code** 页面确认 `main` 分支根目录有小写 `index.html`、`.nojekyll` 和 `src/`；`src/` 里还有真正的网站入口 `index.html`。根入口会相对跳转至 `./src/index.html`。
2. 如缺少这些文件，将项目文件夹**里面的内容**上传仓库根目录，不要再套一层同名目录。不要上传ZIP、浏览器缓存、库存、虚拟环境或生成数据库。
3. Settings → Pages → Build and deployment → Source → Deploy from a branch。
4. 分支main，文件夹/(root)，Save。/docs是文档目录，不选它。
5. 在 **Actions** 查看 `pages build and deployment` 是否成功。GitHub 说明发布通常可能需要最多约10分钟；成功后在 **Settings → Pages → Visit site** 打开网站，再验证首页、五语、搜索、材料规划和九区域图片。

依据 [GitHub官方配置说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。真实账号方案/部署结果以GitHub显示为准。

根index.html相对跳转./src/index.html并保留锚点/参数。所有本地资源相对引用、正斜杠，.nojekyll防止静态文件被额外处理。不能仅上传根入口；不需在线安装Node/Python，不需API密钥。外部游戏素材/字体依旧需要网络，有优雅回退。

## 仍显示404时

1. 核对 **Settings → Pages** 的 Source 是否为 **Deploy from a branch**、Branch 是否为 **main**、Folder 是否为 **/(root)**，并确认已点击 **Save**。
2. 打开仓库 **Code → main**，检查根目录的文件名恰为小写 `index.html`，且 `src/index.html` 存在；如果全部文件被放在第二层 `infinity-nikki-data-platform/` 下，需要移到仓库根目录。
3. 在 **Actions** 查找最近一次 `pages build and deployment` 的红色失败信息；若选择 GitHub Actions 作为 Source，则需手动运行仓库中的 `Publish static demo (manual)` 工作流，二者不要混用。
4. 核对仓库是否为 Public；GitHub Free 可发布公开仓库。确认 **Settings → Pages → Custom domain** 没有误填域名、仓库没有意外的 `CNAME`。本项目交付包没有 `CNAME`。
5. 部署显示成功后，优先使用 Pages 设置页的 **Visit site**。再检查准确地址 `https://jackie566n8.github.io/infinity-nikki-data-platform/`；如有缓存，开无痕窗口复查。若只有根地址失败，可试 `https://jackie566n8.github.io/infinity-nikki-data-platform/src/index.html` 以区分入口与部署问题。

GitHub 官方还要求入口文件位于发布源的顶层，并且名称大小写准确。参见 [404 排查文档](https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites)。

## 备选Actions

Source选择GitHub Actions，手动运行仓库自带Publish static demo (manual)工作流；它上传预构建src/，用其index.html。与分支方案选其一。提供工作流不等于CI/部署已远程成功。

## 本地

完整解压双击根index.html，或根目录python -m http.server 8000后访问http://localhost:8000/ 。核心数据为预构建JS，直接file打开不依赖JSON fetch。

可选node scripts/standalone.mjs生成约86MB单文件，便于另行离线携带；该文件没有放入GitHub源码包，避免重复嵌入五语数据/报告/图片。源码、冻结评估及数据视图共同保留，文件清单解释各自用途。

## 仓库展示

仓库名：infinity-nikki-data-platform

Description：Provenance-aware Infinity Nikki analytics with 32 relational tables, multilingual hybrid search, human-reviewed evaluation, and local wardrobe/material planning.

Topics：data-science、data-analytics、information-retrieval、search-evaluation、data-quality、duckdb、python、javascript、infinity-nikki。

请作者确认 LICENSE 中的年份与作者字段；游戏图片/第三方资料不纳入 MIT。本文档更新没有执行任何 git 操作，Pages 设置与发布由作者自行完成。
