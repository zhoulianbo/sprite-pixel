# 四个免费工具：繁中、日语、韩语本地化

日期：2026-10-16。范围为四个工具的 12 个语言版本；英文和简体中文文案保留当前工作区内容。

## 关键词先行

先查看本地语言搜索结果、工具页面和官方术语，再确定页面主词。下面是编辑选词，不代表经过搜索量、竞争度或排名验证。正文按各语言习惯重新组织，保留功能、文件上限、隐私边界和格式限制；不套用第三方工具的功能承诺。

| 页面                            | 繁體中文     | 日本語                   | 한국어                      |
| ------------------------------- | ------------ | ------------------------ | --------------------------- |
| `/gif-to-sprite-sheet`          | GIF 轉精靈圖 | GIF スプライトシート変換 | GIF 스프라이트 시트 변환    |
| `/video-to-sprite-sheet`        | 影片轉精靈圖 | 動画スプライトシート変換 | 동영상 스프라이트 시트 변환 |
| `/transparent-background-maker` | 圖片去背     | 画像背景透過             | 이미지 배경 제거            |
| `/gif-background-remover`       | GIF 去背     | GIF 背景透過             | GIF 배경 제거               |

选词依据与相关词：

- 繁中采用「去背、影格、影片、快取」，避免直接沿用简体的「抠图、帧、视频、缓存」。「精靈圖」与 Sprite Sheet 搭配解释，相关词包括「透明 PNG、批次去背、影格擷取」。可见 [remove.bg 繁中](https://www.remove.bg/zh-tw/f/background-removal)、[游戏精灵图去背页面](https://removegifbg.com/zh-tw/game-sprites) 的当地术语。「影片轉精靈圖」是根据视频转图集意图与这些术语组合的长尾词，不声称它有最高搜索量。
- 日语以「背景透過」承接透明背景需求，以「スプライトシート変換」承接游戏图集转换需求。相关词包括「透過 PNG、切り抜き、フレーム抽出」。参考 [Adobe 日本背景透过](https://www.adobe.com/jp/express/feature/image/remove-background/transparent)、[日语 GIF 转换工具](https://imageonline.io/ja/gif-to-sprite-sheet/)、[Google Cloud 日语视频图集文档](https://docs.cloud.google.com/transcoder/docs/how-to/generate-spritesheet?hl=ja)、[日语 GIF 背景透过工具](https://backgroundremover.video/ja/gif-background-remover)。正文使用完整句子描述操作，不逐字翻译英文名中的 Maker / Remover。
- 韩语使用「배경 제거、스프라이트 시트、동영상」，相关词包括「투명 PNG、누끼 따기、프레임 추출」。参考 [韩语 GIF 图集转换](https://imageonline.io/ko/gif-to-sprite-sheet/)、[Google Cloud 韩语视频图集文档](https://docs.cloud.google.com/transcoder/docs/how-to/generate-spritesheet?hl=ko)、[VEED 韩语 GIF 背景移除](https://www.veed.io/ko-KR/tools/video-background-remover/gif-background-remover)。主词选择说明功能的「배경 제거」，不把口语「누끼」硬塞进标题或反复重复。

## 实现范围

- 三种语言的 H1、metadata、Hero、三步操作、功能介绍、游戏用途、参数指南、FAQ、CTA、相关工具、Before/After 标签。
- 完整的 `ui.freeTools`：选择文件、模型下载与缓存、取消、失败重试、逐项状态、参数解释、导出和错误提示。逐键检查英文基准结构与占位符。
- 页头七项工具菜单及页脚六项免费工具均补齐本地化。免费标记沿用当地语言；AI 图标工具沿用当前英文版的无 badge 展示，不改变积分规则。
- 长工具名允许换行；韩语菜单按词换行，避免日语和韩语多个工具被截成相同前缀。维持两列菜单和当前页状态。
- 移除四页原有仅 en/zh 的 SEO 特例，复用全站五语言 metadata 逻辑。每页使用自身 canonical、五语言 hreflang 与 x-default；三种新增语言可索引。sitemap 新增 12 个 URL，20 个语言页面互相列出完整 alternates。

## 检查

`node scripts/verify-free-tools.mjs` 检查五语言结构、逐字段占位符、H1/metadata 主词、导航/页脚和 sitemap 双向映射。英文按单词，其余语言用 `Intl.Segmenter` 的 isWordLike 分词；统计可见正文及展开后的 FAQ，排除导航、页脚、工作台状态、metadata 和未渲染配置。

| 页面       | 繁中密度 | 日语密度 | 韩语密度 |
| ---------- | -------: | -------: | -------: |
| GIF 转图集 |    1.56% |    1.20% |    1.86% |
| 视频转图集 |    1.57% |    1.23% |    1.90% |
| 图片去背   |    1.90% |    1.37% |    2.22% |
| GIF 去背   |    1.80% |    1.33% |    2.09% |

- TypeScript、改动文件 Prettier、`git diff --check` 通过。
- Chrome 本地检查全部 12 页的 390px 手机与 1440px 桌面布局：单一当地语言 H1、没有横向溢出；结构化数据名称与 inLanguage 匹配。
- 页面 robots 为 index/follow，canonical 含自身语言前缀，hreflang 包含 en、zh-Hans、zh-Hant、ja、ko、x-default。本地 URL 根域使用现有 `.env.development` 的 localhost:8787，未修改环境配置；生产根域由现有 app_url 配置决定。
- 韩语桌面和手机菜单检查七项、当前页高亮与完整标题；桌面 Escape 可关闭菜单。日语与繁中手机菜单也核对本地化名称和布局。
- 开发浏览器出现 Radix ID 的 hydration mismatch 提示，英文页也可复现；没有把这次检查报告为无控制台警告。该提示未造成此次菜单与页面操作失败，未在本地化任务中重构全站 Header。
- 用户已完成工具功能测试；本次不重复上传视频、下载模型或运行推理。未运行全量生产构建：本次为 locale、SEO metadata、sitemap 与菜单换行调整，使用 TypeScript、专项脚本和实际 Next 开发页面验证。未提交或部署。
- 3100 原有进程属于 reel-morph，未停止它。验证使用 `PORT=3200 TIMEOUT=900 bash ~/bin/dev-verify "pnpm exec next dev --turbopack -p 3200"`，结束后确认本次 3200 端口释放。
