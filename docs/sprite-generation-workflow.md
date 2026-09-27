# 精灵图生成 Workflow

## 运行边界

- Cloudflare Workflow 只持久化 `generationId`、状态、进度和错误码，不保存图片、视频或帧数据。
- Minimax H3 生成视频；Workflow 轮询供应商任务。
- 常规动作视频默认 2 秒，跳跃、死亡等需要完整起落/倒地过程的动作使用 3 秒；时长由服务端按动作类型决定，不由浏览器任意放大。
- Python 媒体处理器下载视频，完成选帧、逐帧抠图、对齐和拼表，并把原视频、精灵图和 manifest 直接写入 R2。
- 角色图片生成成功时只保留供应商预览地址；用户点击“保存角色”后才下载并写入 R2、创建 Vault 资产。
- 浏览器只读取生成状态，关闭页面不会中断 Workflow。

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

动画任务如果供应商视频已经成功、仅媒体处理失败，retry 会复用原视频 URL，从媒体处理阶段继续，不会再次请求 Minimax。重试会重新冻结对应积分，媒体处理成功后结算，失败则再次解冻。

## 积分状态

开始生成时创建 `frozen` 消费流水并立即占用余额；角色图片在供应商生成成功后结算，是否保存到 Vault 不影响已经发生的生成费用；动画则在供应商与媒体处理全部成功、精灵图已写入 R2 后结算。供应商失败、媒体处理失败或 Workflow 终止时恢复原 grant 余额并把消费流水标记为 `deleted`。这些操作均按 credit id 幂等执行。

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
