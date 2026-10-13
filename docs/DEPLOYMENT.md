# GitHub Pages与本地运行

未执行上传或部署。预填URL：https://jackie566n8.github.io/infinity-nikki-data-platform/ ，开启Pages并实际部署成功后才生效。

## 从分支部署（推荐）

1. 解压源码ZIP，进入infinity-nikki-data-platform文件夹；把里面的文件上传到Jackie566N8/infinity-nikki-data-platform仓库根目录，不再套一层同名目录。
2. 保留根index.html、.nojekyll、src/及隐藏配置。不要上传ZIP、浏览器缓存、库存、虚拟环境或生成数据库。
3. Settings → Pages → Build and deployment → Source → Deploy from a branch。
4. 分支main，文件夹/(root)，Save。/docs是文档目录，不选它。
5. 等待Pages/Actions实际成功，查看记录。打开预填地址验证首页、五语、搜索、材料规划和九区域图片。

依据 [GitHub官方配置说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。真实账号方案/部署结果以GitHub显示为准。

根index.html相对跳转./src/index.html并保留锚点/参数。所有本地资源相对引用、正斜杠，.nojekyll防止静态文件被额外处理。不能仅上传根入口；不需在线安装Node/Python，不需API密钥。外部游戏素材/字体依旧需要网络，有优雅回退。

## 备选Actions

Source选择GitHub Actions，手动运行仓库自带Publish static demo (manual)工作流；它上传预构建src/，用其index.html。与分支方案选其一。提供工作流不等于CI/部署已远程成功。

## 本地

完整解压双击根index.html，或根目录python -m http.server 8000后访问http://localhost:8000/ 。核心数据为预构建JS，直接file打开不依赖JSON fetch。

可选node scripts/standalone.mjs生成约86MB单文件，便于另行离线携带；该文件没有放入GitHub源码包，避免重复嵌入五语数据/报告/图片。源码、冻结评估及数据视图共同保留，文件清单解释各自用途。

## 仓库展示

仓库名：infinity-nikki-data-platform

Description：Provenance-aware Infinity Nikki analytics with 32 relational tables, multilingual hybrid search, human-reviewed evaluation, and local wardrobe/material planning.

Topics：data-science、data-analytics、information-retrieval、search-evaluation、data-quality、duckdb、python、javascript、infinity-nikki。

上传前填写LICENSE留空的年份与作者。游戏图片/第三方资料不纳入MIT。没有执行任何git操作，上传与发布由作者自行完成。
