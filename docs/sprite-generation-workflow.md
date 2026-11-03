# 精灵图生成 Workflow

## 运行边界

- Cloudflare Workflow 只持久化 `generationId`、状态、进度和错误码，不保存图片、视频或帧数据。
- Minimax H3 生成视频；Workflow 轮询供应商任务。
- 常规动作视频默认 2 秒，跳跃、死亡等需要完整起落/倒地过程的动作使用 3 秒；时长由服务端按动作类型决定，不由浏览器任意放大。
- 旧动画任务仍按自动后处理流程运行。新任务记录 `params.animationReview=true`：供应商视频成功后结算生成积分并停在 `video_ready`，首页由用户点击“生成精灵图”后（角色工作台仍是独立的保存视频操作），站内服务将原视频归档到 R2 的 `videos/YYYY-MM/{aiTaskId}.mp4`（年月按任务创建时间的 UTC 月份），将对象 key 保存在 `ai_task.task_info.sourceVideoKey`，随后用签名下载地址交给 Python 选帧、逐帧抠图、对齐和拼表。Python 将精灵图和 manifest 写入 R2。新任务的视频归档或抽帧失败保留可重试状态，不重启模型、不退回已完成视频生成费用。
- 默认 Grsai 链路仍使用 `customStorage: false`，由站内服务统一管理视频路径。重复执行复用已存在的对象；仅重试媒体处理时沿用原视频 key，包括跨月重试。旧任务仍保留供应商 URL，部署此改动不会自动补存历史视频。
- 动画输出路径为 `projects/{projectId}/animation/{generationTaskId}.png` 和同名 `.json`；公开地址为 R2 公共域名加对象路径。`/admin/assets/animations` 通过精灵图文件关联的具体任务读取视频，优先展示已归档的 R2 地址；旧记录兼容供应商 URL。支持原视频放大播放及与最终逐帧动画并排对比，不会任意选取其他方向或重试的视频。
- 角色图片生成成功时只保留供应商预览地址；用户点击“保存角色”后才下载并写入 R2、创建 Vault 资产。
- 浏览器只读取模型生成状态，关闭页面不会中断 Workflow。角色工作台维持独立保存视频、抽帧草稿、选帧和保存版本；首页 Hero 使用一次“生成精灵图”完成视频归档、抽帧与自动入库。首页重新抽帧先确认，再以新文件更新同一个动画版本，事务提交后删除旧 PNG 和 manifest；失败保留可用结果。旧文件若被编辑版本引用，则拒绝删除以保护编辑成果。
- 开发环境的视频替换开关见 `src/config/generation/animation-video.ts`；只替换供应商视频，其余积分、R2、Python 与入库流程均真实执行。生产环境不会启用测试视频。

## 首页 Hero 四步交互（2026-11-01）

- 上传先进入保存弹框，确认保存成功才替换当前角色；取消不会改变角色。角色区为正方形，缩放/重置按钮及构图提示在画布外。
- 开始生成立即切换视频布局并计时，Hero 内其他操作锁定。预览视频居中裁成正方形，只提供播放/暂停；“重新生成动画”确认后仅退回动作设置，下一次开始生成才扣分。
- “生成精灵图”调用 `generate-sheet`，其 `requestId` 用于抽帧与入库幂等。首次自动入库，重抽保留版本 ID、替换文件引用与帧坐标。旧文件删除失败时显示清理重试入口，重试不再次抽帧。
- 支持智能、预设及自定义帧数。前端按实际视频时长 × 24 限制（2 秒 48、3 秒 72），服务端再次验证。配套 Python 的 `strict_frames` 模式读取原始帧并探测视频时长，以实际帧数和时长上限中的较小值为准；播放 FPS 不改变取帧数量，不复制不足的帧。
- 精灵图默认播放，悬停或键盘聚焦时展示完整图表和查看/下载按钮；编辑链接沿用 `/editor/animations/{versionId}`。
- 配套 Python 文件位于 `script-mind-server/routes/sprite.py` 和 `src/services/sprite_media_service.py`。须同步部署其更新才能使用新的严格抽帧模式；本次只修改本地代码，没有部署。
- 独立交互演示页现已移除；角色工作台交互未在本轮调整。

### 本轮验证

39 项 TypeScript 相关测试和 9 项 Python 测试通过，TypeScript 类型检查、针对性格式检查与差异检查通过。实际本地测试视频为 2.333333 秒、24 FPS、56 帧，使用原生帧提取后确认 56 帧可用、57 帧被拒绝，且播放 FPS 为 1 时仍保留全部原生帧。

浏览器验证了真实首页的正方形上传区与下方入口，并通过临时挂载的实际组件验证生成中禁用、计时、视频方形裁剪/无原生控制条、播放切换、自定义上限、返回动作设置、大图、编辑/下载链接、中英文与 390px 无横向溢出；临时检查页已删除。文件选择自动化受 Chrome 扩展本地文件权限限制，上传保存弹框需手动复验。未调用模型、未消费实际积分、未写入或删除实际 R2 数据、未执行远端 Python 全链路、未运行生产构建或部署。

## 生成质量修复（本地实现，2026-11-01）

- 仅真透明底图自动选择背景：在裁切透明边距前检查 Alpha，要求透明像素占比及边缘覆盖；整体 Alpha 252/253、实色底和 RGB 棋盘格不启用。有底图片沿用灰色参考画布和中性灰提示词，不新增预抠图。
- 首页方向旁提供可清空的背景色选择，默认不选；支持预设及原生自定义取色器。手动颜色覆盖自动选色，并用于构图预览、参考图导出及视频提示词；仍检查与角色的颜色距离，避免强行启用不安全的颜色抠图。有底图片不自动去背景。视频左上角显示当前可选帧数上限，收到源帧数后取其与时长限制的较小值。
- 从饱和候选色中选择与全部可见颜色的最小距离最大的颜色，少量武器/配饰颜色也参与。参考 PNG、视频提示词、任务参数和重抽请求共享 `backgroundColor`。颜色不足以安全区分、或角色有明显半透明材质时，`backgroundKeySafe=false`，仍使用分割模型。
- Python v3 验证所选视频帧的背景均匀度与预期色是否一致。匹配时全动画共用背景色和阈值，只删除与画布边缘连通的近色区域；不对主体内部同色区域无差别清除，不进行形态学开运算或默认模糊。预期背景不匹配时使用分割路径并标注帧。
- rembg 关闭默认 alpha matting/侵蚀和 mask 后清理；失败记录算法及异常类型，只允许在可靠纯色底上回退到边缘连通算法。无法可靠抠图或输出近乎整帧不透明时返回错误，保留视频及上一次精灵图。
- 对前景面积骤减、透明度骤减、内部孔洞增加和贴边做启发式检查，返回帧编号并在首页提醒复核。它们是疑似异常提示，不是对武器/披风是否由模型生成的语义判断。Manifest 保存算法、背景色、处理版本和参数指纹，参数变化不会复用旧缓存。
- 只有来源生成记录或项目明确标记 `pixel-art` 时才采用最近邻缩放及整段统一 64 色 RGB 色板；透明通道保留，不把烟雾/光效一律硬阈值化。普通插画保留原缩放分支。用户构图输出保留整幅坐标，横版源视频通过方形补边保全内容，不根据每段运动重新居中。
- Web 请求需要 Python `processing_version >= 3` 才接受新背景/像素/构图结果。须同步部署 `script-mind-server/routes/sprite.py` 与 `src/services/sprite_media_service.py`；旧视频无法通过改提示词变成新底色，只能使用新版后处理。
- 这批不包含手工蒙版画笔、自动像素网格重建或生成角色的重绘分支，不承诺任意插画经缩放即可成为严格像素画。

验证：19 项 TypeScript 检查（包含真实临时 SQLite 的重抽与参数保存）、17 项 Python 检查（包含离线拼表及 manifest）通过。浏览器实测菜单 150px、输入框 84px、确认按钮 32px，超限仍回填 56 并短暂标红；真实透明素材导出已使用自动选定底色。未调用模型、未写真实 R2、未部署；线上视频和 rembg 实际模型的最终质量仍需部署后复验。

## Cloudflare 配置

生产环境需要设置三个 Secret/变量：

```bash
pnpm exec wrangler secret put WORKFLOW_INTERNAL_TOKEN
pnpm exec wrangler secret put SPRITE_MEDIA_PROCESSOR_SECRET
pnpm exec wrangler secret put SPRITE_MEDIA_PROCESSOR_URL
```

`WORKFLOW_INTERNAL_TOKEN` 只用于 Workflow 调用站内私有推进接口；`SPRITE_MEDIA_PROCESSOR_SECRET` 必须与 Python 服务的 `API_SECRET` 一致。

日常本地开发直接使用：

```bash
pnpm dev
```

Next.js 在 `http://localhost:8787` 提供热更新，数据库继续读取 `.env.development` 的 `DATABASE_URL`。`wrangler.next-dev.toml` 只负责把 `.dev.vars` 中的普通变量和密钥提供给 Next.js，不包含 D1、Workflow 或 R2 binding，也不持久化 Miniflare 状态。开发环境没有 Cloudflare Workflow binding 时，服务端会启动同样的推进、重试和失败回收循环；该循环不依赖浏览器，但开发服务器停止后也会停止。

需要验证真实 Workers Runtime、Workflow binding 和本地 Cloudflare 资源时，再使用 OpenNext/Wrangler。先复制示例并填写本地值：

```bash
cp -n .dev.vars.example .dev.vars
```

`.dev.vars` 至少需要：

```dotenv
NEXTJS_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:8787"
AUTH_SECRET="一段仅供本地使用的随机字符串（可用 openssl rand -base64 32 生成）"
WORKFLOW_INTERNAL_TOKEN="一段仅供本地使用的随机字符串"
SPRITE_MEDIA_PROCESSOR_URL="http://127.0.0.1:8000"
SPRITE_MEDIA_PROCESSOR_SECRET="与 Python 服务 API_SECRET 相同的值"
```

`.dev.vars` 是 Wrangler/OpenNext 本地 Worker 的变量文件，不等同于 Next.js 的 `.env.development`。项目存在 `.dev.vars` 时，Wrangler 不会再把普通 `.env` 直接注入 Worker；OpenNext 会根据 `NEXTJS_ENV=development` 加载 Next.js 开发环境变量，但 `.dev.vars` 与 `wrangler.toml` 中已有的同名值优先。`NEXT_PUBLIC_*` 会在构建时写入前端包，因此本地 8787 预览应在执行 OpenNext build 前就设置好上述 `NEXT_PUBLIC_APP_URL`。

首次使用或本地 D1 为空时，先应用本地迁移；这只作用于 `.wrangler/state`，不会修改线上 D1：

```bash
pnpm exec wrangler d1 migrations apply DB --local
```

迁移只创建表，不会自动复制其他本地数据库中的用户、项目或后台配置。需要在当前 Wrangler 本地站点重新登录，并在后台配置 Grsai、Waffo 等生成所需设置。

完成 OpenNext 构建后，通过 Wrangler 启动整套 Worker：

```bash
pnpm exec opennextjs-cloudflare build
pnpm exec wrangler dev --port 8787
```

Wrangler 会监视已经生成的 Worker 文件，但不会替你重新执行 Next.js/OpenNext 构建。修改 Next.js 源码后需要重新运行 `pnpm exec opennextjs-cloudflare build` 并重启 Wrangler；高频页面开发仍使用 `pnpm dev`，完成后再用 8787 做 Workflow 与 Cloudflare binding 的集成验证。

浏览器访问 `http://localhost:8787`。这个模式使用真实 `SPRITE_GENERATION_WORKFLOW` binding；日常 `pnpm dev` 则使用开发环境异步推进器，两者不会同时启动。

本地媒体处理器可以使用 `http://127.0.0.1:8000`；线上 Worker 无法访问你电脑的回环地址，生产配置必须换成 VPS 可访问的 HTTPS 地址。

Wrangler 运行期间可在另一个终端确认本地 Workflow：

```bash
pnpm exec wrangler workflows list --local --port 8787
pnpm exec wrangler workflows trigger sprite-generation-workflow '{"generationId":"有效的生成记录 ID"}' --local --port 8787
pnpm exec wrangler workflows instances list sprite-generation-workflow --local --port 8787
```

生成记录必须来自同一个本地 D1。此前在 `pnpm dev` 下因 `WORKFLOW_NOT_CONFIGURED` 失败的记录，其子任务已被标记失败；应在 Wrangler 页面重新提交，或调用该记录的 retry 接口创建新任务，而不是直接触发旧实例。

旧流程的动画任务如果供应商视频已经成功、仅媒体处理失败，retry 会复用原视频 URL，从媒体处理阶段继续，不会再次请求 Minimax。重试会重新冻结对应积分，媒体处理成功后结算，失败则再次解冻。

## 积分状态

开始生成时创建 `frozen` 消费流水并立即占用余额；角色图片在供应商生成成功后结算，是否保存到 Vault 不影响已经发生的生成费用；旧动画任务在供应商与媒体处理全部成功后结算；新动画任务在视频生成成功时结算，后续保存和重复抽帧不收费。供应商失败时恢复原 grant 余额并把消费流水标记为 `deleted`；已交付视频的后续媒体操作失败不退款，也不重复收费。这些操作均按 credit id 幂等执行。

## 日志定位

Cloudflare 结构化日志事件包括：

- `sprite_workflow_progress`
- `sprite_provider_dispatch_failed`
- `sprite_generation_task_failed`
- `sprite_credit_settlement_failed`
- `sprite_workflow_terminal_error`
- `content_safety_prompt_review_bypassed`
- `content_safety_prompt_blocked`
- `content_safety_scan_failed`

Workflow 日志带 `generationId`、`generationTaskId`、`aiTaskId` 和阶段信息；临时签名 URL 的查询参数会被脱敏。内容安全日志只记录 `reasonCode`、`matchedCategories`、`requestId` 等审核结果，不记录完整提示词。
