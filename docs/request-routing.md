# 未知路径与 404

Cloudflare Static Assets 优先返回实际存在的静态资源。其余请求进入 `worker.ts`，在调用 OpenNext 前，使用同一次 Next.js 构建生成的 `routes-manifest.json`、`app-path-routes-manifest.json` 与 `prerender-manifest.json` 匹配路径。

- 不维护扫描文件名黑名单，也不手动列举页面或画廊 ID。
- Pages Router 与 App Router 的静态路由、动态参数、API Route Handler、重写和自定义重定向来自 Next 构建清单。
- 多语言路径支持显式语言前缀与默认语言无前缀形式；查询参数不参与路径匹配。
- `dynamicParams = false` 的路由只允许已预渲染参数，避免内容页 catch-all 将所有扫描地址放行。
- 没有匹配路由时，GET/HEAD 先交给 ASSETS 检查实际资源与静态重定向；资源也不存在就返回轻量 404，不进入 OpenNext、多语言布局、会话读取或业务数据库。
- 匹配到真实动态路由时，仍由现有处理器鉴权、查询记录并按需调用原生 `notFound()`。路由匹配不是权限校验。
- 未知路径的 404 不做负缓存，避免新增页面发布后继续命中旧 404。

## 新增功能

正常新增 `page.tsx`、`route.ts`、内容 MDX 或 public 文件，并使用现有 `pnpm cf:deploy` / `pnpm cf:upload` 构建流程即可。Next 路由清单会自动更新，不需要改入口匹配规则。新增 `/gallery/[slug]` 等动态页面会自动按路由模式接受任意 slug，由页面验证记录。

构建产物必须配套：不能把旧 `.next` 清单与另一次 `.open-next` 构建混用。缺失清单会使 Worker 打包失败，而不是悄悄发布空放行表。`--skipNextBuild` 仅用于复用刚刚完成的同一版本 Next 构建。

## 验证与边界

构建后运行：

```sh
node --import tsx --test tests/worker-request-guard.test.ts
```

测试覆盖当前构建的全部路由、内容参数、五种语言、画廊动态 ID、未来新增页面与资源、重写、HEAD/POST，以及随机扫描不会调用 OpenNext。

这是尽早结束未知路径的方案，不承诺所有 404 都不调用 Worker：Cloudflare 未匹配静态资源的请求仍可能进入 Worker；合法动态路由中的不存在 ID 仍需业务处理。扫描真实接口或泛动态路由的流量，需要在 Cloudflare 上游使用 WAF/限流控制，不能靠路径判断永久消除。当前改动没有修改线上 WAF、限流或部署配置。
