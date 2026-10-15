# 四个免费工具页：实现与验收

日期：2026-10-14。代码保留在当前工作区，未创建提交、未部署应用，未更改现有环境文件或 Python 服务配置。经用户单独确认，已为 R2 CORS 增加 If-None-Match。

## 实现范围

- 新增 `/gif-to-sprite-sheet`、`/video-to-sprite-sheet`、`/transparent-background-maker`、`/gif-background-remover`，英文、简体中文共八页。
- 复用 Maker 的页面结构与 GIF 工作台；GIF tab 成为保留语言的页面链接，有素材时保留替换确认。
- 中英文 Tools 菜单共七项、每行两列；六项免费工具带 Free／免费标记，AI Game Icon Generator 标记积分。更新相关工具、页脚、metadata、canonical、JSON-LD 和 sitemap。
- 新页只为 en/zh 设置可索引与 hreflang；其他语言英文回退、noindex、canonical 指向英文。
- 视频参数由前后端共同校验。匿名签发短期上传凭据、预签名 PUT；服务端检查真实容器和大小，固定 uploads 路径，不接受任意输入 URL／输出路径。条件 PUT 防止已经验证的对象被覆盖。
- 同一视频复用上传凭据；四项参数参与任务 ID，失败重试 ID 稳定。调用现有 Python `/api/sprite/process`，不传项目 ID。按固定格式存储：原视频为 `uploads/YYYY-MM/{上传标识}.mp4|webm|mov`，精灵图和 manifest 为同一年月目录下的 `{参数任务ID}.png`、`{参数任务ID}.json`；跨月重试沿用原视频目录。此路径调整仅完成本地检查，表中真实联调记录对应调整前版本。
- 视频结果复用 Cutter 的帧选择、动画预览和导出，使用准确帧数排除填充格，增加完整精灵图下载。服务端失败保留旧结果。
- 两个抠图页复用 IS-Net Worker、单线程 WASM、带校验的版本化模型缓存，用户开始处理才加载模型。没有用户素材上传与服务端抠图回退分支。
- 图片每张 10 MiB、最多 20 张，串行处理、逐项状态和重试、透明 PNG／成功结果 ZIP。GIF 限制 10 MiB、256 帧、3200 万解码像素，复用原解码器的 disposal 处理与时序，完整结果才能导出 GIF／精灵图／PNG ZIP。

## 已通过

| 层级              | 当前证据                                                                                                                                                                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 单元／契约测试    | `node --import tsx --test tests/sprite-tools/*.test.ts`：24 项通过，包含 GIF 编解码、透明度、布局、上传凭据、参数边界与任务 ID、Python 参数映射、ZIP 完整性和取消。                                                                                                                                                   |
| TypeScript        | `pnpm exec tsc --noEmit` 通过。                                                                                                                                                                                                                                                                                       |
| 格式              | 本次修改的 TS/TSX/JSON、脚本与新增测试通过 Prettier 检查。未对仓库执行全量格式化。                                                                                                                                                                                                                                    |
| 生产构建          | `pnpm build` 成功；四个路由完成静态页面生成，API 与 Worker 打包通过。存在原有 reactCompiler 配置提示及 next-intl 缓存依赖解析警告，未改动构建配置。                                                                                                                                                                   |
| SEO／文案         | `node scripts/verify-free-tools.mjs`：en/zh 键名、占位符、七项导航、sitemap、标题与八页关键词密度通过。                                                                                                                                                                                                               |
| 页面浏览器检查    | 1440px 桌面与 390px 手机检查八页：单一 H1、无横向溢出、未发现坏图。检查菜单两列、当前页状态、ArrowDown／Escape 与中文路由。日文回退页实际输出英文 H1、noindex 和 en/zh-Hans/x-default alternates。                                                                                                                    |
| 本地 IS-Net       | 浏览器真实推理完成单图和三帧游戏 GIF；输出为原始 305×310 尺寸，PNG 存在完整 alpha，模型在 Worker 中运行。                                                                                                                                                                                                             |
| 批处理            | 浏览器拒绝 21 张、接受 20 张；中途取消保留成功项，继续时只处理剩余 5 张，最终 ZIP 实际包含 20 张 PNG。                                                                                                                                                                                                                |
| GIF 导出          | 实际下载透明精灵图 610×620、3 张 PNG 的 ZIP、305×310 的三帧透明 GIF。导出 GIF 三帧均为 200ms，与源文件一致；对比滑块和共用帧滑块可操作。                                                                                                                                                                              |
| Maker/Cutter 回归 | Maker 两图合成、独立 GIF 页三帧解码；实际下载包含 PNG、JSON Hash、JSON Array、CSS、XML、GIF 的完整 ZIP。Cutter 导入真实 Python 的 2×2 图表，自动不选透明填充格并预览 3 帧。                                                                                                                                           |
| 视频服务真实联调  | Node 调用本地工具 API，上传一次自有 27,596-byte MP4；同一 PUT 覆盖返回 412。复用凭据请求 2 帧与 3 帧（64px、8 FPS、不循环），真实 Python 分别返回 2×1、2×2 图表和准确帧数，输出与 manifest 路径位于 uploads。两个 PNG 已实际下载。CORS 更新后，在本地启动生产构建产物、为测试进程提供现有 R2 配置，再次完整复测成功。 |
| 模型资源发布      | 已向现有 R2 发布固定 IS-Net 权重与 1.24.3 WASM/MJS。公网 HEAD 200、大小正确，并允许生产域名读取。仅发布这三项模型资源，不等于应用部署。                                                                                                                                                                               |
| 端口／清理        | UI 测试通过 `dev-verify` 显式使用 3100；验证会话已结束，`lsof -nP -iTCP:3100 -sTCP:LISTEN` 无输出。临时同源模型路由与 public symlink 全部移除。                                                                                                                                                                       |

正文与 FAQ 统计口径：短语出现次数／单词数；英文按单词，中文使用 `Intl.Segmenter('zh', { granularity: 'word' })` 的 isWordLike 分词。排除导航、页脚、工作台状态以及未渲染的配置字段。

| 页面                         |  英文 | 简体中文 |
| ---------------------------- | ----: | -------: |
| GIF to Sprite Sheet          | 1.60% |    1.61% |
| Video to Sprite Sheet        | 1.66% |    1.65% |
| Transparent Background Maker | 1.62% |    1.69% |
| GIF Background Remover       | 1.62% |    1.69% |

## 上线前剩余配置与验证边界

**R2 CORS 已经用户确认后应用并复验。** 修改前生产 Origin 的预签名 PUT 预检返回 403，现有 allowed headers 缺少条件上传使用的 `If-None-Match`。应用 [最小 CORS 配置](./free-tools-r2-cors.json) 前后均读取远程规则确认：保留三个 Origin、GET/PUT/HEAD、ETag 与 3600 秒缓存，仅增加该请求头。

复验结果：Origin 为 `https://spritepixel.com` 的 OPTIONS 返回 **204**，允许 `content-type, if-none-match`；实际 PUT 返回 **200** 且带正确 Allow-Origin；覆盖同一对象返回 **412**。这是携带生产 Origin 的 HTTP 级验证，不是已部署新页面的浏览器 E2E。

- localhost:3100 不在现有 R2 CORS 中。抠图浏览器测试使用临时同源模型及匹配运行时，已验证真实推理；没有为测试修改线上 CORS。生产 R2 模型读取只完成 HEAD/CORS 检查，尚未在已部署的新页面运行。
- 直接本地 `next start` 初次上传签发返回 502；为独立验证进程提供现有本地数据库中的 R2 配置后，生产构建产物的上传与两次抽帧 API 均通过。此验证没有修改环境文件或数据库，也不能替代 Cloudflare Worker 部署后的配置与浏览器联调。
- 本地 `.env.development` 的 Python 地址指向未启动的 127.0.0.1:8000；真实视频联调仅对验证进程临时使用仓库 wrangler.toml 已配置的生产地址，没有修改环境文件。
- 视频完整浏览器直传流程仍需部署后复验；localhost:3100 没有新增到允许域名。生产 Origin 的 HTTP 预检已通过，Node API 联调成功不等于部署后的浏览器联调成功。视频界面已检查默认参数、非法帧数和四项控制；失败保留旧结果通过代码路径核对，尚未完成带旧结果的浏览器故障注入。
- 未对每帧推理失败、浏览器禁用 Cache API／存储配额不足、最大 256 帧、各类 MOV/WebM 编码逐一进行真实浏览器故障注入。相关错误、重试、限制和缓存降级分支已实现。
- 素材不上传结论依据实现边界与本地推理路径核对；没有保存完整网络 HAR。未对所有浏览器／移动设备执行性能或内存压力测试。
- 每 IP 每接口 10 分钟 10 次沿用进程内限流，不是跨实例全局配额；未新增 R2 生命周期自动清理规则，因此不承诺具体保留期限。

## 资源与示例来源

- 原图：项目已有 `public/imgs/features/sprite-sheet-maker/character-action-loop-v2.webp` 的三张游戏角色帧，裁取后保存到 `public/imgs/features/background-removal/before*.png`。
- After：对以上源帧运行相同 IS-Net 权重与单线程 ONNX WASM 得到的实际分割结果，不是手工绘制或伪造示意。
- 固定版本、文件大小、SHA-256 位于 `src/config/tools/background-model.ts`；发布脚本会核对本地模型与运行时，默认仅 dry-run。
- IS-Net：`models/isnet/60920e99/isnet-general-use.onnx`，178,648,008 bytes，SHA-256 `60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a`。
- Runtime：`models/onnxruntime/1.24.3/ort-wasm-simd-threaded.mjs`（24,274 bytes）与 `.wasm`（12,361,745 bytes）。
