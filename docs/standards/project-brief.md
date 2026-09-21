# SpritePixel 项目简报

依据：产品文档 V1.2（../SpritePixel产品开发文档V1.2.md），以及用户截至 2026-09-06 的明确设计要求。用户的新要求优先于本文；产品目标与已实现能力必须分别核对，本文不是上线清单。

## 定位与价值

- 品牌：SpritePixel；域名：spritepixel.com；联系邮箱：support@spritepixel.com。
- 用户：1–5 人的独立 2D 游戏团队、Solo Developer、Game Jam 与原型开发者。
- 定位：基于项目的 AI 游戏资产工作室，帮助用户制作风格一致的精灵图、动画和配套资产套装。
- 核心支柱：AI Sprite Generator；批量游戏图标；Project Context + Asset Vault。
- 每项功能需说明：帮助哪个用户任务、减少哪些重复操作、如何复用项目上下文。优先一致性和资产套装，不以功能数量或单张图片质量作为唯一标准。

## 核心流程与业务约束

创建项目 → 定义风格/视角/尺寸/色板/参考图 → 生成角色、动画或图标集 → 确认保存至 Vault → 复用上下文继续生成。

- 首页允许先输入 Prompt；登录/注册后保留 Prompt，继续创建项目。仅跳转 dashboard 不等于已实现项目向导。
- 核心 AI 资产必须关联项目，并验证项目归属。免费浏览器工具不依赖项目，不消费生成积分。
- Project Context 在后续生成中继承；生成请求保存当时上下文快照，不能让修改项目风格覆盖历史任务参数。
- Vault 保存用户认可的资产；生成历史与 Vault 分开表达。首页演示的“Saved”不代表真实持久化。
- Asset Board 是有限列表/网格，支持逐项状态和失败重试；成功项不能因部分失败被重复计费。
- 积分只用于 AI 生成，下载和导出免费。扣减、失败退款、回调必须可幂等并有流水；并发请求不能透支。
- 文件、任务、项目查询和下载都要验证所有权；不得向客户端暴露 Provider 密钥。

## 范围

| 阶段     | 内容                                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 目标  | 账户、项目、基础上下文、Sprite、Idle/Walk/Attack 动画、Sprite Sheet/帧序列导出、批量图标与 Asset Board、Vault、积分退款、订阅/积分包、Storage、Sprite Sheet Maker |
| P1       | Test Arena、Sprite Sheet Splitter、高级风格/参考约束、更多动作、JSON 元数据、案例完善                                                                             |
| MVP 不做 | 像素编辑器、Tileset/地图、音效/音乐、3D、对外 API/MCP、引擎插件、自训练模型、团队协作、社区、每日奖励/等级/排行榜                                                 |

分析指标是产品规划；未经具体任务授权，不添加追踪脚本或第三方服务。价格、额度、商业使用承诺以真实配置和服务条款为准，不将文档假设当作已验证承诺。

## 网站导航与路由

| 菜单                               | 导航路由                |
| ---------------------------------- | ----------------------- |
| Home                               | /                       |
| Features                           | /#features              |
| Tools → AI Game Icon Generator     | /ai-game-icon-generator |
| Tools → Sprite Sheet Maker         | /sprite-sheet-maker     |
| Tools → Sprite Sheet Cutter        | /sprite-sheet-cutter    |
| Gallery                            | /gallery                |
| Pricing                            | /pricing                |
| Footer → AI Sprite Generator       | /#hero                  |

Dashboard 侧边栏（登录后工作台）：

| 菜单           | 导航路由                         |
| -------------- | -------------------------------- |
| 我的项目       | /dashboard                       |
| 我的资产 → 角色 | /dashboard/assets/characters     |
| 我的资产 → 动画 | /dashboard/assets/animations     |
| 我的资产 → 图标 | /dashboard/assets/icons          |
| 我的资产 → 精灵图 | /dashboard/assets/sheets       |

以上路径是页头与页脚的导航契约；链接存在不代表对应页面已经完成，页面实现与可用性必须单独验证。MVP 不建 /batch-game-icon-generator，避免与图标生成页重复。中英文导航内容语义一致，通过现有 i18n Link 保留语言。

2026-09-07：按用户本轮要求，Maker 与原列 P1 的 Splitter 已实现浏览器本地免费工具及中英文落地页，包含 GIF 输入、PNG/JSON/ZIP 导出与工具间素材交接。公开路由为 `/sprite-sheet-cutter`（旧 `/sprite-sheet-splitter` 301 跳转）。实现和本地验收见 [Free Tools 验收记录](../free-tools-qa.md)，不代表已部署；其他阶段目标不因此视为完成。

## 技术基线与完成判据

以代码库实际依赖为准：Next.js App Router、TypeScript、Tailwind CSS 4、shadcn/Radix、next-intl、Better Auth、Drizzle、Cloudflare/D1/R2 集成。V1.2 中 PostgreSQL/Supabase/Auth.js 是推荐选项，不构成替换现有架构的指令。用户可见文案走 `src/config/locale/messages/{en,zh}`，不在组件内维护中英文字典；选项 ID 与默认值放 `src/config`。

交付必须区分代码实现、演示、浏览器验证、构建验证、数据库迁移和线上部署。生成链路完成需覆盖提交、处理中、成功、失败/退款、刷新恢复；UI 演示不证明这些业务能力。只运行与改动相关的验证，并准确记录未通过或未执行项。
