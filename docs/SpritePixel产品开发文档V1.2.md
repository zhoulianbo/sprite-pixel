# SpritePixel 产品开发文档 V1.2（中文术语说明版）

## 0. 文档摘要

**产品名称：** SpritePixel  
**域名：** `spritepixel.com`  
**核心用户：** 全球 Solo / Indie Game Developers  
**产品类别：** Project-based AI Game Asset Studio（基于项目的 AI 游戏资产工作室）  
**首页首要 SEO 关键词：** `ai sprite generator`  
**MVP 核心能力：** Sprite、Animation / Sprite Sheet、Batch Game Icons（批量游戏图标）、Project Context（项目上下文）、Asset Vault（资产仓库）  
**长期方向：** 从 Sprite-first（精灵图优先） → Batch-first（批量优先） → Asset-set-first（资产套装优先），逐步扩展为 2D AI Game Asset Platform（2D AI 游戏资产平台）。

### 一句话定义

> **SpritePixel is a project-based AI game asset studio for indie developers that helps them create consistent sprites, animations and matching asset sets in minutes.**
>
> 中文：SpritePixel 是一款面向独立游戏开发者、以游戏项目为核心的 AI 游戏资产工作室，可在几分钟内生成风格一致的精灵图、动画和配套资产套装。

### 核心产品逻辑

```text
Create Project
↓
Define Project Style / Context
↓
Generate Sprites / Animations / Icon Sets
↓
Save Assets into Vault
↓
Reuse Existing Context and Assets
↓
Generate More Consistent Assets
```

### MVP 最重要的三个产品支柱

1. **AI Sprite Generator（AI 精灵图生成器）**：承担首页主关键词、首次体验和角色资产生成。
2. **Batch Game Asset Generation（批量游戏资产生成）**：从 Batch Game Icons（批量游戏图标） 切入，形成真正的差异化。
3. **Project Context（项目上下文） + Asset Vault（资产仓库）**：解决一致性、重复输入和长期资产管理问题。

---

## 0.1 英文专业术语阅读说明

为了方便后续产品、设计和开发时理解，本版采用以下规则：

- **品牌、产品和技术专有名词**保留原文，例如 SpritePixel、Unity、Godot、Cloudflare、Next.js、PostHog 等。
- **产品、商业、设计、SEO、AI 和开发领域的英文专业术语**统一补充中文含义。
- **URL、SEO 关键词、数据库字段名、数据埋点事件名**保持英文原值，避免开发时复制错误；对应章节会补充中文说明。
- 同一术语重复出现时，正文以“英文（中文）”为主；界面文案和代码示意保持原英文，并在旁边或下方解释中文含义。

### 常用产品与商业术语

| 英文术语 | 中文说明 |
|---|---|
| MVP | Minimum Viable Product，最小可行产品；用最小功能集合验证产品是否成立 |
| P0 | 最高优先级；MVP 首发必须完成的功能 |
| P1 | 高优先级；首发后优先迭代的功能 |
| Solo / Indie Game Developer | 个人 / 独立游戏开发者 |
| Solo Founder | 单人创始人 / 独立开发者 |
| Project-first | 项目优先；核心资产先归属于一个游戏项目，再持续生成和管理 |
| Batch-first | 批量优先；优先一次生成一组资产，而不是一张一张生成 |
| Asset-set-first | 资产套装优先；长期从单个资产升级为完整资产集合 |
| Consistency-first | 一致性优先；优先保证同一项目资产风格统一，而不是不断增加功能 |
| Customer Segments | 客户细分；产品优先服务的用户群体 |
| JTBD / Jobs To Be Done | 用户待完成任务；用户真正想解决的问题，而不是表面上使用某个功能 |
| Value Proposition | 价值主张；用户为什么应该选择这个产品 |
| Channels | 获客渠道；用户通过什么方式发现产品 |
| Customer Relationships | 客户关系；产品如何持续服务和留住用户 |
| Revenue Streams | 收入来源 |
| Key Resources | 核心资源 |
| Key Activities | 关键活动 |
| Product-led Growth | 产品驱动增长；通过产品体验本身完成获客、激活和转化 |
| Self-service SaaS | 自助式软件服务；用户无需销售或人工服务即可完成使用和付费 |
| Subscription | 订阅制 |
| Credit Pack | 一次性积分包 |
| Credits | 积分 / 生成额度 |
| Gross Margin | 毛利率 |
| Acquisition | 获客 |
| Activation | 激活；用户真正体验到产品核心价值 |
| Engagement | 使用深度 / 参与度 |
| Retention | 留存；用户是否持续回来使用 |
| Revenue | 收入 |
| ARPPU | Average Revenue Per Paying User，平均每个付费用户收入 |
| Funnel | 漏斗；从访问、使用到付费的一系列转化步骤 |
| Flywheel | 飞轮；能够持续自我强化的增长或产品循环 |
| Roadmap | 产品路线图 |

### 常用产品功能术语

| 英文术语 | 中文说明 |
|---|---|
| Sprite | 精灵图；游戏中的角色、物体等 2D 图像资产 |
| Sprite Sheet | 精灵图表 / 精灵图集；把多帧动画按网格排列到同一张图片中 |
| Animation | 动画 |
| Icon | 图标；例如武器、技能、药水、物品图标 |
| Icon Set | 图标套装 |
| Asset | 游戏资产 / 素材 |
| Asset Type | 资产类型 |
| Asset Set | 资产套装 / 一组同类资产 |
| Asset Board | 资产看板；用于规划、批量生成和管理一组待生成资产的工作区 |
| Asset Vault / Vault | 资产仓库；按项目长期保存和管理已确认资产 |
| Project Context | 项目上下文；项目风格、视角、尺寸、参考图等可被后续生成复用的信息 |
| Basic Project Context | 基础项目上下文；MVP 必须保存的核心风格和参考信息 |
| Project Style | 项目风格设置 |
| Reference / Reference Image | 参考图；用于约束生成结果的角色、风格或视觉素材 |
| Prompt | 提示词；告诉 AI 要生成什么的文字指令 |
| Motion Prompt | 动作提示词；描述动画应该怎样运动 |
| Negative Prompt | 负面提示词；明确不希望出现的内容或特征 |
| Perspective | 视角，例如俯视、侧视、等距视角 |
| Palette | 色板 / 配色方案 |
| Outline | 描边 |
| Resolution / Size | 分辨率 / 尺寸 |
| Variation | 变体；基于已有资产生成相近但不同的新版本 |
| Preview | 预览 |
| Timeline | 时间轴；按顺序查看和调整动画帧 |
| Inventory | 游戏物品栏；也用于形容资产按格子排列的视觉方式 |
| Canvas | 画布 / 可视化操作区域 |
| Grid | 网格布局 |
| Arena / Test Arena | 测试场；把生成角色放进简单游戏环境中测试动作效果 |
| Generator | 生成器 |
| Batch Generation | 批量生成 |
| Regenerate | 重新生成 |
| Retry | 重试 |
| Export | 导出 |
| Transparent Background | 透明背景 |
| Commercial Use | 商业使用 / 商用授权 |
| Commercial Use Allowed | 允许商业使用 |
| Private Assets | 私有资产 |
| FPS | Frames Per Second，每秒播放帧数 |
| Loop | 循环播放 |
| Idle / Walk / Attack / Jump | 待机 / 行走 / 攻击 / 跳跃 |
| Frames | 动画帧 |
| Columns / Rows | 列数 / 行数 |
| Padding | 间距 / 内边距 |
| Offset | 偏移量 |
| Forge | 锻造台；SpritePixel 用来表达“生成资产”的品牌视觉隐喻 |
| Arena | 测试场；用于测试精灵图和动画 |
| Coming Soon | 即将上线 |

### 常用游戏类型术语

| 英文术语 | 中文说明 |
|---|---|
| RPG | Role-Playing Game，角色扮演游戏 |
| Roguelike | 类 Rogue 游戏；通常强调随机地图、重复挑战和局外成长等机制 |
| Platformer | 平台跳跃游戏 |
| Cozy Game | 治愈 / 轻松休闲类游戏 |
| Card Game | 卡牌游戏 |
| Game Jam | 限时游戏开发活动 / 比赛 |
| Prototype | 原型；用于快速验证玩法和视觉方向的早期版本 |
| NPC | Non-Player Character，非玩家角色 |
| AAA | 3A 大型商业游戏；通常指预算和制作规模很大的游戏项目 |
| Pixel Art | 像素艺术 / 像素画 |
| Top-down | 俯视视角 |
| Side View | 侧视视角 |
| Isometric | 等距视角 |
| Dark Fantasy | 暗黑奇幻风格 |

### 常用网站、设计与增长术语

| 英文术语 | 中文说明 |
|---|---|
| SEO | Search Engine Optimization，搜索引擎优化 |
| Landing Page | 落地页；针对某个搜索词或具体需求设计的入口页面 |
| Keyword Cluster | 关键词集群；围绕同一搜索主题组织的一组关键词和页面 |
| Search Intent | 搜索意图；用户搜索某个关键词时真正想完成的事情 |
| Primary Keyword | 主关键词 |
| Secondary Keyword / Intent | 次级关键词 / 次级搜索意图 |
| CTA | Call To Action，行动按钮 / 引导用户下一步操作的按钮 |
| Primary CTA | 主行动按钮 |
| Secondary CTA | 次行动按钮 |
| Hero | 首屏核心展示区域 |
| Eyebrow | 标题上方的小标签 / 辅助标题 |
| Title | 页面标题 / SEO 标题 |
| Meta Description | 搜索结果中的页面描述 |
| H1 / H2 | 页面一级标题 / 模块二级标题 |
| UI | User Interface，用户界面 |
| UX | User Experience，用户体验 |
| Sidebar | 侧边栏 |
| Dashboard | 仪表盘 / 控制台首页 |
| Wizard | 分步向导；按步骤引导用户完成设置 |
| Card | 卡片式信息模块 |
| Hover | 鼠标悬停状态 |
| Active State | 当前选中 / 激活状态 |
| Fallback | 备用方案；主内容加载失败时使用的替代内容 |
| Poster | 视频未播放前显示的封面图 |
| Game-like UX | 游戏感用户体验；界面和反馈像游戏工具，但不等同于积分、等级等游戏化机制 |
| Gamification | 游戏化机制；通过等级、积分、成就、任务等奖励系统增加参与度 |
| Logo Wall | 品牌 Logo 展示墙 |
| Feature Card | 功能卡片 |
| Showcase | 案例展示 |
| Public Gallery | 公开作品库 |
| Examples | 案例页 |
| Pricing | 价格页 |

### 常用界面导航术语

| 英文界面名称 | 中文说明 |
|---|---|
| Product | 产品 |
| Free Tools | 免费工具 |
| Sign In / Sign Up | 登录 / 注册 |
| Create Project | 创建项目 |
| Workspace | 工作区 |
| Overview | 项目概览 |
| Generate | 生成 |
| Vault | 资产仓库 |
| Project Style | 项目风格设置 |
| Tools | 工具 |
| Account | 账户 |
| Credits | 积分 |
| Billing | 账单 / 订阅管理 |
| Settings | 设置 |
| Current Project | 当前项目 |
| Recent Assets | 最近资产 |
| Recent Generations | 最近生成记录 |
| Quick Create | 快速创建 |

### 常用 AI 与技术术语

| 英文术语 | 中文说明 |
|---|---|
| AI | Artificial Intelligence，人工智能 |
| AI Agent | AI 智能体；能够基于目标自主执行多步任务的 AI 系统 |
| API | Application Programming Interface，应用程序编程接口 |
| AI Provider / Provider | AI 服务提供商；实际提供模型调用能力的平台 |
| Managed Service | 托管服务；由第三方维护基础设施，开发者直接使用 |
| Self-hosted | 自托管；自己部署并维护服务 |
| Model Router | 模型路由；根据资产类型、风格、成本等选择不同模型 |
| Generation Pipeline | 生成流程管线；从输入参数、调用模型到后处理和存储的完整流程 |
| Generation Service | 生成服务；负责提交、查询和处理 AI 生成任务的服务层 |
| Generation Contract | 统一生成任务数据结构 / 接口约定 |
| Prompt Template | 提示词模板 |
| Reference Strategy | 参考图使用策略 |
| Post-processing | 后处理；模型生成完成后的去背景、尺寸处理、格式转换等步骤 |
| Async API | 异步接口；提交任务后稍后查询结果，而不是一直等待接口返回 |
| Polling | 轮询；定期查询异步任务是否完成 |
| Auth | Authentication，身份认证 / 登录鉴权 |
| Frontend | 前端 |
| Database | 数据库 |
| Storage | 文件存储 |
| Analytics | 数据分析 |
| Payment | 支付 |
| Hosting | 网站 / 服务部署托管 |
| Ledger | 流水账；逐笔记录积分增加和扣减 |
| Refund | 退还；这里主要指生成失败后返还积分 |
| Queue | 队列；用于排队处理异步任务 |
| Microservices | 微服务架构；把系统拆成多个独立服务 |
| GPU Cluster | GPU 集群；由多台 GPU 机器组成的计算资源集群 |
| JSON | 常用结构化数据格式 |
| ZIP | 压缩文件格式 |
| Cost Tracking | 成本追踪 |
| Provider Cost | AI 服务提供商实际成本 |


# 1. 商业模式画布

## 1.1 客户细分（Custom（自定义）er Segments）

### 核心用户：Solo / Indie Game Developers（个人 / 独立游戏开发者）

典型特征：

- 1–5 人开发游戏，以个人开发者和极小团队为主。
- 缺少专职游戏美术、动画师或 UI 设计师。
- 常使用 Unity、Godot、GameMaker 等引擎。
- 主要开发 2D RPG（角色扮演游戏）、Platformer（平台跳跃游戏）、Roguelike（类 Rogue 游戏）、Cozy Game（治愈 / 轻松休闲游戏）、Card Game 等中小型项目。
- 对资产数量、风格一致性和快速迭代有真实需求。
- 愿意使用 AI 加快原型和正式开发。
- 对价格敏感，但愿意为明显节省时间的生产工具付费。

他们真正的问题不是：

> “如何生成一张漂亮图片？”

而是：

> **“没有完整美术团队，我怎样快速做出一套真正能够用于游戏的视觉资产？”**

### 次级用户

- Game Jam（限时游戏开发活动） 开发者。
- 小型独立游戏工作室。
- 游戏原型开发者。
- 学生游戏开发者。

### MVP 不优先服务

- AAA（3A 大型商业游戏） 工作室。
- 大型专业美术团队。
- 企业级游戏制作流水线。
- 3D 游戏团队。

所有功能决策首先回答：

> **这个功能是否明显帮助一个独立游戏开发者更快完成游戏？**

---

## 1.2 用户核心任务（JTBD / Jobs To Be Done，用户待完成任务）

### 用户任务 1（Job 1）：从没有美术资产开始制作游戏

用户已经有游戏想法，但没有角色、物品、技能 Icon 等资产。

目标：

> 快速得到第一套可用视觉资产。

### 用户任务 2（Job 2）：批量制作大量重复资产

真实游戏通常需要：

- 20 个武器。
- 30 个物品。
- 15 个技能。
- 10 个 NPC（非玩家角色）。
- 多套角色动作和状态。

因此 SpritePixel 不应沿用普通 AI 图片工具的单图逻辑。

核心原则：

> **Generate sets, not just images.**
>
> 中文：生成的是一整套资产，而不只是单张图片。

### 用户任务 3（Job 3）：保持同一个游戏的视觉一致性

AI 资产最常见的问题是每次生成都可能改变：

- 风格。
- 比例。
- 色彩。
- Perspective（视角）。
- Outline（描边）。
- 角色特征。

目标：

> 后续生成的资产看起来仍然属于同一个游戏世界。

### 用户任务 4（Job 4）：用户不知道应该准备哪些资产

很多 Solo Developer（个人开发者） 同时承担程序、美术和策划职责。

例如用户只知道：

> “我要做一个 Cozy Farming RPG。”

但不知道 Inventory（游戏物品栏） 里需要哪些 Icon。

SpritePixel 应支持：

```text
Plan → Organize → Generate
```

但 MVP 不做复杂 AI Agent（AI 智能体） 或聊天工作流，而是在 Asset Board（资产看板） 中提供轻量的 **Suggest with AI（AI 推荐）**。

---

## 1.3 核心痛点与解决方案

| 用户痛点 | SpritePixel 方案 |
|---|---|
| 不会画游戏素材 | AI Asset Generation |
| 外包成本高、周期长 | 快速 AI Generation（AI 生成） |
| 普通 AI 一次生成一张 | Batch Generation |
| 不知道需要哪些资产 | AI-assisted Asset Planning（资产规划） |
| 多次生成风格不一致 | Project Context（项目上下文） + References |
| 每次重复输入 Prompt（提示词） | Project-first |
| 生成素材散落 | Asset Vault（资产仓库） |
| Sprite 动画制作困难 | Sprite Animation（精灵动画） / Sprite Sheet |
| 专业工具太复杂 | 简化的游戏资产工作台 |
| 不确定资产放进游戏里的效果 | Preview（预览） / Test Arena（测试场） |

---

## 1.4 价值主张（Value Proposition）

SpritePixel 的总价值主张：

> **Plan, generate and organize consistent game assets around one project.**
>
> 中文：围绕同一个游戏项目，规划、生成并管理风格一致的游戏资产。

具体由四层组成。

### Project-first（项目优先）

> **SpritePixel understands your game.**
>
> 中文：SpritePixel 会记住并理解你的游戏项目设定。

先建立 Game Project，再持续生成资产。

Project 保存：

- Game Type / Genre（游戏类型 / 题材）。
- Visual Style（视觉风格）。
- Perspective（视角）。
- Sprite Resolution（精灵图分辨率）。
- Palette（色板）。
- Outline（描边）。
- Detail Level（细节等级）。
- Reference Images（参考图）。
- Negative Prompt（负面提示词） / Constraints。

用户不需要每次重新说明“我的游戏是什么样子”。

### Batch-first（批量优先）

> **Generate sets, not just images.**
>
> 中文：生成的是一整套资产，而不只是单张图片。

优先解决具有明显批量需求的游戏资产。

### Asset Board（资产看板）

> **Know what you need, or let AI help you plan it.**
>
> 中文：你可以明确列出所需资产，也可以让 AI 帮你规划资产清单。

用户可以：

- 手工添加资产名称。
- 批量粘贴列表。
- 让 AI 根据 Project Context（项目上下文） 建议资产列表。
- 选择部分或全部批量生成。

### Vault Context（资产仓库上下文）

> **The more you build, the better SpritePixel understands your game.**
>
> 中文：项目积累的资产越多，SpritePixel 就越能复用已有上下文，帮助后续生成保持一致。

生成资产进入 Vault，后续可作为：

- Reference（参考）。
- Project Context（项目上下文）。
- Variation Source（变体来源）。
- Style Consistency Input（风格一致性输入）。

这是 SpritePixel 长期留存的核心，而不是签到、XP、Badge。

---

## 1.5 获取渠道（Channels）

早期采用：

> **SEO + Product-led Growth**
>
> 中文：以搜索引擎优化获客，并依靠产品体验本身推动注册、使用和付费转化。

优先级：

1. Google SEO。
2. Free Developer Tools（免费开发者工具）。
3. Reddit / itch.io / X / Discord / Game Jam（限时游戏开发活动） 社区。
4. Showcase（案例展示） / 分享生成结果。
5. 后期 Public Gallery（公开作品库）。

### 获客飞轮（Acquisition Flywheel）

```text
SEO Keyword
↓
Landing Page / Free Tool
↓
Understand Product Value
↓
Create Project
↓
First Successful Asset
↓
Paid Conversion
```

---

## 1.6 客户关系（Custom（自定义）er Relationships）

产品采用：

> **Self-service SaaS**
>
> 中文：采用自助式 SaaS，用户无需销售或人工服务即可自行注册、使用和付费。

主要关系来自：

- Project。
- Vault。
- Project Context（项目上下文）。
- 持续生成的资产集合。

产品飞轮：

```text
Create Project
↓
Generate Assets
↓
Build Vault
↓
More Project Context
↓
Better / Faster Generation
↓
Generate More Assets
```

---

## 1.7 收入来源（Revenue Streams）

商业模式：

> **Subscription + Credit Packs**
>
> 中文：订阅套餐 + 一次性积分包。

AI 推理存在实际边际成本，因此 MVP 不提供 Unlimited Generation。

### 初步订阅结构

| Plan | Price | Credits | 主要用户 |
|---|---:|---:|---|
| Free | $0 | 30 注册赠送 | 产品体验 |
| Indie | $12/月 | 300/月 | Solo Developer（个人开发者） |
| Pro | $24/月 | 750/月 | 高频开发者 |

价格属于 MVP 初始假设，上线后根据真实模型成本、使用频率和转化调整。

### Credit Pack（一次性积分包）

可提供：

- 100 Credits：$5。
- 300 Credits：$12。

一次性 Credits 不过期。

### Credits 原则

消耗 Credits：

- AI Generation（AI 生成）。
- Animation Generation（动画生成）。
- Regenerate（重新生成） / Variation（变体）。

不消耗 Credits：

- Download。
- Export。
- 基础 Vault Storage（文件存储）。
- 浏览器端 Sprite Sheet Packing / Splitter 等免费工具。

失败生成：

> 自动 Refund Credits。

商业目标：

> **Gross Margin > 70%**
>
> 中文：目标毛利率高于 70%。

---

## 1.8 核心资源（Key Resources）

按重要性排序：

1. Product UX：Project-first（项目优先）、Asset Board（资产看板）、Batch Generation（批量生成）、Vault。
2. Project Context（项目上下文） 数据结构。
3. Generation Pipeline（生成流程管线）：Prompt Template（提示词模板）、Reference Strategy（参考图使用策略）、Model Routing（模型路由）、Post-processing（后处理）。
4. SEO Assets：Landing Pages（落地页）、Free Tools（免费工具）、Content、Internal Links（站内链接）。
5. Brand：从 AI Image Generator（AI 图片生成器） 建立成 AI Game Asset Studio（AI 游戏资产工作室）。

---

## 1.9 关键活动（Key Activities）

早期只集中在：

1. 产品开发。
2. 生成质量优化。
3. AI Provider（服务提供商） 的质量 / 成本 / 延迟优化。
4. SEO。
5. 用户行为和生成经济性分析。

未来资产类型由真实数据决定，不跟随竞品 Feature List（功能列表） 机械扩张。

---

## 1.10 关键伙伴与成本结构

### 伙伴

- AI Provider（服务提供商）：fal / Replicate / Runware / 其他适合的托管 API。
- Infrastructure：Cloudflare / Database Provider（服务提供商）。
- Payment：Creem / Stripe。
- Analytics（数据分析）：PostHog。

### 成本

- AI Generation（AI 生成）：最大可变成本。
- Storage（文件存储）：Reference、生成图、Sprite Sheet。
- Database：Project、Asset、Generation。
- Hosting / API。
- Payment Fees。
- Analytics（数据分析） / Email 等 SaaS。

最关键的成本指标：

> **Cost per Successful Generation**
>
> 中文：每一次成功生成资产所产生的实际成本。

---

# 2. 市场与竞争判断

## 2.1 市场机会

SpritePixel 的机会不在 AAA（3A 大型商业游戏） 或大型专业美术团队，而在缺少完整美术资源、需要快速做原型和正式资产的 Solo / Indie Developer（独立游戏开发者）。

这个市场的真实需求不是“AI 能不能生成漂亮图片”，而是：

- 能否快速得到游戏可用资产。
- 能否一次生成一组，而不是一张。
- 能否保持同一个游戏里的视觉一致性。
- 能否把角色、动画、Icon 等资产组织在一个持续存在的 Project 中。
- 能否降低学习成本，不要求开发者掌握专业美术工作流。

因此，SpritePixel 的产品判断必须从“游戏资产生产效率”出发，而不是从“模型能力展示”出发。

---

## 2.2 竞争格局

现有竞争者大致可分为三类。

| 类型 | 代表产品 | 主要竞争点 | SpritePixel 的应对 |
|---|---|---|---|
| Sprite Utility | SpriteSheetMaker | Sprite Sheet 转换、打包、拆分 | 用 Free Tools（免费工具） 获取高意图 SEO 流量 |
| AI Sprite 专用 | Sprite Flow、AutoSprite、SpriteAI | Character、Animation、Sprite Sheet、Preview（预览） | 不拼功能深度，强调 Project + Batch + Simplicity |
| AI Game Asset Platform（AI 游戏资产平台） | Ludo 等 | Sprites、Icons、UI、3D、Audio 等全资产覆盖 | 不做“小号 Ludo”，先把 2D 核心资产做深 |

---

## 2.3 主要竞品启示

### SpriteSheetMaker

它验证了 `sprite sheet maker` 等开发者工具关键词具有明确搜索意图。

SpritePixel 应学习：

> **免费开发者 Utility Tool 可以负责获客，AI Core Product 负责转化。**

### Sprite Flow / SpriteAI

它们验证了 Character → Animation → Sprite Sheet 是明确且可理解的用户路径。

SpritePixel 不应仅把“动画预览”或“测试角色”当成唯一差异化，因为市场已经存在类似能力。

### AutoSprite

它代表专业能力不断变深的路线，包括更多 Animation、Batch、API、Engine Extension 等。

SpritePixel 不正面跟进：

- API（应用程序编程接口）。
- MCP（模型上下文协议，用于让 AI 工具连接外部能力）。
- Unity / Godot Plugin。
- Cutscene。
- Audio。
- 3D。

这些方向对 Solo Founder（独立开发者 / 单人创始人） 的维护成本过高。

### Ludo

它验证了“AI Game Asset Platform（AI 游戏资产平台）”方向本身已经存在成熟竞争者。

因此：

> **“以后支持所有游戏资产”不能成为 SpritePixel 的核心差异化。**

SpritePixel 必须在更具体的体验上建立记忆：

- Project-first（项目优先）。
- Batch-first（批量优先）。
- Consistency-first（一致性优先）。
- Simple workflow（简单工作流）。
- Asset Vault（资产仓库）。
- Free Tools（免费工具） + SEO。

---

## 2.4 竞争策略结论

SpritePixel 不进入 Feature Race（功能竞赛）。

不以“支持更多模型、更多资产种类、更多插件”作为早期竞争方式。

首阶段只围绕三个高价值场景：

1. **Create Sprites**。
2. **Animate Characters**。
3. **Build Matching Asset Sets（资产套装）**。

最终竞争目标不是“功能最多”，而是：

> **让一个独立开发者用最简单的方式，快速获得一套风格一致、真正可以继续用于游戏制作的 2D 资产。**

---

# 3. 产品定位与战略

## 3.1 产品定位

SpritePixel 不是：

> Another AI image generator for game developers.

而是：

> **A project-based AI game asset studio for indie developers.**
>
> 中文：面向独立游戏开发者、以游戏项目为核心的 AI 游戏资产工作室。

首页面向搜索用户的具体定位：

> **AI Sprite Generator for Game Developers**
>
> 中文：面向游戏开发者的 AI 精灵图生成器。

品牌级定位：

> **AI Game Asset Studio for Indie Developers**
>
> 中文：面向独立游戏开发者的 AI 游戏资产工作室。

---

## 3.2 核心竞争逻辑

SpritePixel 不通过“功能更多”竞争，而通过以下五点建立差异：

### 1. Project-first（项目优先）

核心 AI 资产属于 Project，不是互相孤立的 Generator。

### 2. Batch-first（批量优先）

不是一张一张生成，而是生成一个可用资产集合。

### 3. Consistency-first（一致性优先）

优先提高同项目内资产的一致性，而不是增加第十种资产类型。

### 4. Game-like UX（游戏感用户体验）

使用 Workshop / Inventory（游戏物品栏） / Forge 的视觉语言，但不开发 XP、等级、签到等游戏化系统。

### 5. Free Tools（免费工具） + SEO

免费开发者工具负责长期自然流量，AI Core Product（核心产品） 负责转化和留存。

---

## 3.3 产品战略边界

### SpritePixel 要成为

> **Project → Assets → Vault**

### SpritePixel 不成为

- 通用 AI 图片生成器。
- Photoshop / Aseprite 替代品。
- 游戏引擎或 Level Editor。
- 企业级内容审批平台。
- 互不相关的 AI 工具集合站。
- 一开始就覆盖 3D / Music / SFX / Video 的大型平台。

---

## 3.4 产品开发原则

### 原则 1：Indie Developer First（独立开发者优先）

优先解决 Solo / Indie Developer（独立游戏开发者） 真实问题。

### 原则 2：Project First（项目优先）

所有核心 AI 资产默认属于 Project；SEO Free Tools（免费工具） 除外。

### 原则 3：Set Before Single（优先资产套装，而非单图）

存在批量场景时优先设计 Asset Set。

### 原则 4：Consistency Before Feature Count（先保证一致性，再增加功能数量）

优先把 Sprite / Animation / Icons 做稳定、统一、可用。

### 原则 5：Simple Before Powerful（先保证简单易用，再追求复杂能力）

3 步能完成，不设计成 8 步 Workflow。

### 原则 6：Managed Before Self-hosted（优先托管服务，再考虑自建）

早期优先托管 AI、数据库、存储，不自建 GPU / Kubernetes / Microservices（微服务）。

### 原则 7：Usage Data Before Roadmap（先看真实使用数据，再决定路线图）

真实使用数据决定下一步资产类型。

### 原则 8：SEO Tool 与 Core Product（核心产品） 分离

免费工具可直接使用；核心 AI 产品围绕 Project。

---

## 3.5 功能优先级评分

每项 1–5 分：

| 指标 | 权重 |
|---|---:|
| Indie Developer（独立游戏开发者） 需求强度 | 30% |
| 是否增强 Project Context（项目上下文） | 20% |
| 是否提高留存 | 15% |
| 是否提高付费 | 15% |
| SEO 获客价值 | 10% |
| 开发与维护成本 | -10% |

优先：

> **高用户价值 + 高 Project Context（项目上下文）价值 + 可复用现有能力 + 低维护成本。**

---

# 4. MVP 产品范围

## 4.1 P0：首发必须完成

| 模块 | 说明 |
|---|---|
| Account / Auth（账户 / 身份认证） | 注册、登录、用户状态 |
| Projects（项目） | 创建、切换、编辑、删除 Project（项目） |
| Basic Project Context（基础项目上下文） | Style（风格）、Perspective（视角）、Resolution（分辨率）、Palette（色板）、Reference（参考图） |
| AI Sprite Generator（AI 精灵图生成器） | Prompt（提示词） / Reference → Sprite |
| Sprite Animation（精灵动画） | Sprite → Idle（待机） / Walk（行走） / Attack（攻击） 等动画 |
| Sprite Sheet Export（精灵图表导出） | 动画帧 → Sprite Sheet（精灵图表） / Sequence（帧序列） |
| Batch Game Icon Generator（批量游戏图标生成器） | 列表 → 一致风格 Icon Set（图标套装） |
| Asset Board（资产看板） | 批量资产规划、状态和生成管理 |
| Asset Vault（资产仓库） | 保存、筛选、下载、Variation（变体）、Delete（删除） |
| Credits（积分） | 余额、消费、Refund Ledger（退款流水） |
| Payment（支付） | Subscription（订阅） + Credit Pack（一次性积分包） |
| Sprite Sheet Maker（精灵图表制作工具） | 免费 SEO 工具 |
| Storage（文件存储） | Reference（参考图）、Asset（资产）、Export（导出）文件 |
| Analytics（数据分析） | 核心漏斗和成本指标 |

### 关键调整

旧方案中的 Project Style（项目风格设置） 不能整体放到 P1。

MVP 必须有 **Basic Project Context（基础项目上下文）**，否则 Project-first（项目优先） 和 Consistency-first（一致性优先） 无法成立。

P1 再增加：

- 更细 Style Controls（风格控制项）。
- 多组 Reference 管理。
- Project Presets（项目预设）。
- 高级 Palette（色板） / Outline（描边） 约束。

---

## 4.2 P1：首发后优先迭代

- Sprite Test Arena（测试场）。
- Sprite Sheet Splitter（精灵图表拆分工具）。
- Character Variations（角色变体）。
- AI Suggest Asset List（AI 资产清单推荐） 增强。
- 更强 Reference Consistency（参考图一致性）。
- More Animation Presets（更多动画预设）。
- Export Metadata / JSON（导出元数据 / JSON）。
- 静态 Examples / Showcase（案例展示） 页面完善。

---

## 4.3 MVP 明确不做

- Pixel Editor。
- Tileset Generator（地图瓦片集生成器）。
- Map Generator（地图生成器）。
- Music / SFX。
- 3D。
- API（应用程序编程接口）。
- MCP（模型上下文协议，用于让 AI 工具连接外部能力）。
- Unity Plugin。
- Godot Plugin。
- Team Collaboration（团队协作）。
- Custom Model Training（自定义模型训练）。
- Community / Social Feed（社区 / 社交动态）。
- Daily Reward / XP / Level / Badge / Leaderboard（每日奖励 / 经验值 / 等级 / 徽章 / 排行榜）。

---

# 5. 信息架构与导航

SpritePixel 需要区分：

1. **营销网站 / SEO 层**：帮助陌生用户理解、搜索和开始使用。
2. **Core App（核心应用） 层**：围绕 Project 持续生产和管理资产。

二者不能使用完全相同的信息架构。

---

## 5.1 未登录网站顶部导航（MVP）

推荐最终结构：

```text
[SpritePixel Logo]

Product ▼
  AI Sprite Generator
  Sprite Sheet Generator
  AI Game Icon Generator

Free Tools ▼
  Sprite Sheet Maker
  Sprite Sheet Splitter        (P1 可先隐藏)

Examples
Pricing

Sign In
[Create Project]
```

### 导航说明

#### Logo

点击返回首页 `/`。

#### Product（产品）

只展示当前真实可用的核心能力，不展示 Coming Soon（即将上线） 大菜单。

- **AI Sprite Generator（AI 精灵图生成器）** → `/` 的 Generator / Create Sprites 区域。
- **Sprite Sheet Generator（精灵图表生成器）** → `/sprite-sheet-generator`。
- **AI Game Icon Generator（AI 游戏图标生成器）** → `/ai-game-icon-generator`。

MVP **不单独创建 `/batch-game-icon-generator`**。

原因：

- AI Game Icon Generator（AI 游戏图标生成器） 本身就以批量生成作为核心差异。
- 两个页面意图高度重叠，首发容易造成产品和 SEO 重复。
- 后续只有 Search Console / Keyword Data（关键词数据） 明确证明 Batch Keyword 值得单独承接时再拆页。

#### Free Tools（免费工具）

免费工具不要求先创建 Project。

- Sprite Sheet Maker（精灵图表制作工具） → `/sprite-sheet-maker`。
- Sprite Sheet Splitter（精灵图表拆分工具） → `/sprite-sheet-splitter`。

#### Examples（案例）

MVP 使用静态精选案例，不开发 Public Gallery（公开作品库） 社区系统。

可使用 `/examples`。

#### Pricing（价格）

`/pricing`。

#### Create Project（创建项目）

全站主 CTA。

未登录：进入 Sign In / Sign Up，再继续 Project Wizard（分步向导）。

已登录：直接进入 Create Project Wizard（分步向导）。

---

## 5.2 登录后 App 全局导航

桌面端推荐左侧 Sidebar（侧边栏）。

```text
SPRITEPIXEL

[Current Project ▼]

WORKSPACE
  Overview
  Generate
    Sprite
    Animation
    Icon Set
  Vault
  Project Style

TOOLS
  Sprite Sheet Maker

ACCOUNT
  Credits
  Billing
  Settings
```

### 不建议把 Forge / Vault / Arena 全部直接作为一级品牌术语

原因：首次使用会增加理解成本。

建议：

- 信息架构使用清楚的功能名。
- 在页面视觉、状态和标题中使用游戏化语言。

例如：

```text
Generate Sprite
小标签：FORGE

Asset Vault
小标签：VAULT

Test Animation
小标签：ARENA
```

这样既保留品牌体验，又不影响可用性。

---

## 5.3 Project 内导航与页面职责

### Overview（项目概览）

Project 首页。

包含：

- Project Style（项目风格设置） Summary。
- Quick Create（快速创建）：Sprite / Animation / Icon Set（图标套装）。
- Recent Assets（最近资产）。
- Asset Counts。
- Recent Generations（最近生成记录）。
- Credits Balance（积分余额）。

### Generate（生成） → Sprite（精灵图）

生成角色或静态 Sprite。

### Generate（生成） → Animation（动画）

基于已有 Sprite 生成动作和 Sprite Sheet。

### Generate → Icon Set（图标套装）

打开 Asset Board（资产看板），批量规划和生成 Icons / Items / Skills。

### Vault

管理当前 Project 全部资产。

### Project Style（项目风格设置）

编辑项目上下文和默认生成参数。

### Arena

不放一级导航。

从 Sprite / Animation Asset 的：

> **Test in Arena**

进入。

原因：Arena 是资产后续动作，不是独立的核心工作区。

---

# 6. 核心用户流程

## 6.1 首次访问 → 创建 Project

### 首页 Hero（首屏）

用户输入：

```text
A small fire knight with a red cape
```

点击：

> **Start Creating**
>
> 中文：开始创作。

### 未登录用户

流程：

```text
Hero Prompt
↓
Sign In / Sign Up
↓
Create Project Wizard
↓
Prompt 自动带入 Sprite Generator
↓
Generate
```

不要让用户登录后重新输入首页内容。

### 已登录用户

```text
Hero Prompt
↓
Create Project Wizard
↓
Sprite Generator
↓
Generate
```

---

## 6.2 创建项目分步向导（Create Project Wizard）

MVP 控制在 2 个步骤，不做复杂 onboarding。

### 步骤 1（Step 1）— 项目基础信息（Project Basics）

字段：

- Project Name *。
- Game Type / Genre（游戏类型 / 题材）。
- Short Description（可选）。

示例：

```text
Project Name
Tiny Dungeon

Game Type
Roguelike RPG

Description
A small dark fantasy dungeon crawler.
```

CTA：

> Continue

### 步骤 2（Step 2）— 视觉风格（Visual Style）

字段：

- Style：Pixel Art（像素艺术） / Cartoon（卡通风格） / Hand-painted（手绘风格） / Anime 2D（2D 动漫风格） / Other。
- Perspective（视角）：Side View / Top-down（俯视视角） / Isometric / Front。
- Default Size（默认尺寸）：32×32 / 64×64 / 128×128 / Custom（自定义）。
- Palette（色板）：Default / Dark Fantasy（暗黑奇幻） / Cozy / Vibrant / Custom（自定义）。
- Reference Images（参考图）：最多 3 张，可跳过。

CTA：

> **Create Project**

创建后进入：

`/app/projects/{projectId}`

### 原则

Project Wizard（分步向导） 只收集对后续生成真正有价值的信息。

高级参数全部放到 Project Style（项目风格设置） 页面，不在首次流程里阻塞用户。

---

## 6.3 AI Sprite Generator（AI 精灵图生成器）流程

```text
Project
↓
Generate → Sprite
↓
Prompt / Optional Reference
↓
Generate 4 Variations
↓
Select One
↓
Save to Vault
↓
Animate / Create Variation / Download
```

页面结构：

### 左侧 Controls（参数控制区）

- Describe your sprite（描述你的精灵图）。
- Reference Image（参考图）。
- Style：默认继承 Project。
- Perspective（视角）：默认继承 Project。
- Size：默认继承 Project。
- Variations（变体）：默认 4。
- Advanced：折叠。

### 右侧 Results（结果区）

4 个结果 Grid。

每个结果：

- Select。
- Save to Vault。
- Create Variation（变体）。
- Download。

主操作：

> **Use This Sprite**

选择后显示后续动作：

- Animate Sprite（生成精灵动画）。
- Create Variation（变体）。
- Test in Arena（P1）。

---

## 6.4 Sprite Animation / Sprite Sheet（精灵动画 / 精灵图表）流程

```text
Select Character
↓
Choose Animation
↓
Generate Frames
↓
Preview Animation
↓
Adjust FPS / Frames
↓
Save Animation
↓
Export Sprite Sheet
```

### 输入

- Character。
- Animation Preset（动画预设）：Idle（待机） / Walk（行走） / Run / Attack（攻击） / Jump（跳跃）。
- Direction（方向）：Left / Right（左 / 右），后续增加 4 / 8 Direction（4 / 8 方向）。
- Frame Count。
- Motion Prompt（动作提示词，可选）。

### 输出

- Animated Preview（预览）。
- Timeline（时间轴）。
- Sprite Sheet Preview（预览）。

### Timeline（时间轴） 允许

- Remove Frame。
- Reorder。
- FPS（每秒帧数）。
- Loop On（开启循环） / Off。

MVP 不做逐像素编辑。

### Export

- Sprite Sheet PNG。
- PNG Frame Sequence ZIP（PNG 动画帧序列压缩包）。
- GIF（如果实现成本低可 P1）。

Export 不消费 Credits。

---

## 6.5 Batch Game Icon Generator / Asset Board（批量游戏图标生成器 / 资产看板）流程

这是 MVP 最重要的差异化流程。

```text
Project
↓
Generate → Icon Set
↓
Create / Paste / AI Suggest Asset List
↓
Review Asset Board
↓
Select Assets
↓
Generate Set
↓
Review / Regenerate Individual Assets
↓
Save to Vault
↓
Download ZIP
```

### 页面整体布局

采用 **Asset Board（资产看板）**，不是无限 Canvas（画布）。

桌面端：

```text
┌──────────────────────────────┬───────────────────────────────┐
│ Asset List / Planning        │ Generated Asset Grid          │
│                              │                               │
│ Sword                Ready   │ [img] [img] [img] [img]       │
│ Shield               Ready   │ [img] [img] [img] [img]       │
│ Health Potion        Queue   │                               │
│ Mana Potion          Draft   │ Selected asset detail         │
│                              │                               │
│ + Add Item                   │                               │
│ Paste List                   │                               │
│ Suggest with AI              │                               │
└──────────────────────────────┴───────────────────────────────┘
```

### Asset List（资产列表）

支持三种创建方式。

#### 方式 A：手工添加

`+ Add Item`

字段：Name / Type / Optional Description（名称 / 类型 / 可选描述）。

#### 方式 B：Paste List

```text
Iron Sword
Golden Sword
Wood Shield
Health Potion
Mana Potion
Magic Ring
```

自动生成 6 条资产记录。

#### 方式 C：Suggest with AI（AI 推荐）

用户选择：

```text
What do you need?
Inventory Items

How many?
20
```

系统结合 Project Context（项目上下文） 返回建议。

用户确认后才进入 Board（看板），不自动消耗生成 Credits。

### Board（看板） 状态

每个 Asset：

- Draft。
- Queued。
- Generating。
- Ready。
- Failed（失败）。

### 批量操作

- Select All。
- Generate Selected（生成选中项）。
- Regenerate Selected（重新生成选中项）。
- Delete Selected（删除选中项）。
- Download Selected（下载选中项）。

### 单个 Asset 操作

- Regenerate（重新生成）。
- Variation（变体）。
- Download。
- Favorite。
- Delete。

### 生成规则

同一个 Asset Set 强制共享：

- Project Style（项目风格设置）。
- Perspective（视角）。
- Palette（色板）。
- Background（背景）。
- Icon Size。
- Prompt Template（提示词模板）。

这是“Matching Icon Set（图标套装）”而不是“同时生成很多随机图片”的关键。

### 下载

> **Download Icon Pack**

导出：

```text
/project-name-icons.zip
  iron-sword.png
  golden-sword.png
  wood-shield.png
  health-potion.png
  ...
```

后期可加 metadata.json。

---

## 6.6 Asset Vault（资产仓库）流程

Vault 是 Project 的资产仓库，不是 Generation History。

页面：

```text
Tiny Dungeon / Vault

All | Characters | Animations | Icons | Items | Skills

[Search] [Filter] [Sort]

Asset Grid
```

Asset Card：

- Preview（预览）。
- Name。
- Asset Type（资产类型）。
- Size。
- Created Time。

Hover / Menu：

- Download。
- Favorite。
- Create Variation（变体）。
- Animate（Sprite）。
- Test in Arena（Animation，P1）。
- Delete。

Vault 默认只显示 **已保存的用户资产**。

失败生成和未选择的临时 Variation（变体） 放在 Generation Record，不污染 Vault。

---

# 7. 首页设计规范与逐模块内容

## 7.1 首页目标

首页同时承担四个任务：

1. 覆盖 `ai sprite generator` 主关键词。
2. 5 秒内说明 SpritePixel 是给谁用、解决什么问题。
3. 让用户直接开始一次真实工作，而不是只看产品介绍。
4. 把“Project-first（项目优先） + Batch-first（批量优先） + Consistency”讲清楚。

首页不是功能大全，也不是普通 AI SaaS 紫色渐变落地页。

---

## 7.2 首页 SEO

### URL

`/`

### 页面标题（Title）

**AI Sprite Generator – Create Game Sprites & Asset Sets | SpritePixel**

中文：AI 精灵图生成器——创建游戏精灵图与配套资产套装 | SpritePixel

### 搜索结果描述（Meta Description）

**Create game-ready sprites, animations and matching game icon sets with AI. Build consistent 2D game assets around one project with SpritePixel.**

中文：使用 AI 创建可用于游戏的精灵图、动画和风格一致的游戏图标套装，并围绕同一个项目持续构建统一的 2D 游戏资产。

### H1（页面一级标题）

**AI Sprite Generator for Game Developers**

中文：面向游戏开发者的 AI 精灵图生成器。

不要再创建 `/ai-sprite-generator`，避免与首页竞争同一核心关键词。

---

## 7.3 首页视觉方向

### 视觉定位

> **Dark Game Workshop × Modern SaaS**
>
> 中文：深色游戏工坊风格 × 现代 SaaS 产品界面。

要像“制作游戏资产的工作台”，而不是典型 AI 工具站。

### Hero 背景

首屏高度：`100vh`。

使用原创的循环游戏场景视频或实时轻动画，例如：

- Pixel Platformer（平台跳跃游戏） 角色奔跑、跳跃、攻击。
- Top-down RPG（俯视视角角色扮演游戏） 角色移动并拾取道具。
- 同一角色从 Idle（待机） → Walk（行走） → Attack（攻击） 的连续演示。

不要直接使用 Super Mario 等受版权保护游戏素材。

视频要求：

- 8–15 秒无缝循环。
- 静音自动播放。
- Desktop 视频，Mobile 使用压缩版视频或静态 Poster。
- 上方增加深色渐变遮罩保证文字可读性。
- 页面加载失败时有静态 fallback。

### 品牌配色

不再以紫色作为主视觉。

推荐：

| Design Token（设计变量） | Color（颜色） | 用途 |
|---|---|---|
| Background（背景） | ` #0F1526` | 页面主背景 |
| Surface（表面层） | ` #111827` | Card / Panel（卡片 / 面板） |
| Elevated（高层级表面） | ` #182235` | Hover / Elevated Panel（悬停 / 高层级面板） |
| Primary / Forge Gold（主色 / 锻造金） | ` #F6C453` | Primary CTA（主行动按钮） / 品牌高亮 / Credits（积分） / 稀有资产状态 |
| Secondary / Mana Cyan（辅助色 / 法力青） | ` #35C2FF` | Selection / Active / Link（选中 / 激活 / 链接） / Canvas 操作高亮 |
| Text Primary（主要文字） | ` #F8FAFC` | 标题、正文重点、主要信息 |
| Text Secondary（次要文字） | ` #7E8CA5` | 描述、Label（标签）、辅助信息 |
| Border（边框） | ` #283449` | Card / Panel / Input（卡片 / 面板 / 输入框）边框 |
| Success（成功状态） | ` #7CFF8A` | Ready / Success / Saved（就绪 / 成功 / 已保存） |
| Danger（危险 / 错误状态） | ` #EF4444` | Error / Delete / Failed（错误 / 删除 / 失败） |

### 品牌颜色使用原则

- `Forge Gold #F6C453`：SpritePixel 的核心品牌色，主要用于主行动按钮、重要高亮、积分和高价值状态。
- `Mana Cyan #35C2FF`：主要用于交互反馈，包括选中状态、激活状态、链接、Canvas 节点和资产选择边框。
- `Success Green #7CFF8A`：仅用于生成成功、Asset Ready（资产就绪）、Saved to Vault（已保存到资产仓库）等成功状态，不作为主品牌色大面积使用。
- `Vault Navy #0B1020`：作为整体深色视觉基础，建立游戏资产工作台和宝库的品牌氛围。
- `Steel Gray #7E8CA5`：用于次级文字和弱化信息，避免与主要内容争夺视觉层级。
- 页面高亮颜色遵循：**Gold = 品牌与主操作，Cyan = 交互与选中，Green = 成功状态。**

### 字体

- Heading（标题字体）：Space Grotesk。
- Body / UI（正文 / 界面字体）：Inter。
- 少量游戏化状态标签可使用 Pixel Font（像素字体），但不能用于正文和长标题。

---

## 7.4 模块 1（Module 1）— Full-screen Hero（全屏首屏）

### 目标

第一屏同时完成：定位、产品展示、启动流程。

### 布局（Layout（布局））

```text
Transparent / Dark Nav

[Background gameplay loop]

AI GAME ASSET STUDIO FOR INDIE DEVELOPERS

AI Sprite Generator for Game Developers

Create sprites, animations and matching game asset sets
around one project — without drawing every frame by hand.

[ Describe the character or game you want to build...          ]
[ Start Creating ]   [ View Examples ]

Project-first · Matching styles · Commercial use
```

### 最终文案（Exact Copy）

Eyebrow：

> **AI GAME ASSET STUDIO FOR INDIE DEVELOPERS**
>
> 中文：面向独立游戏开发者的 AI 游戏资产工作室。

H1：

> **AI Sprite Generator for Game Developers**
>
> 中文：面向游戏开发者的 AI 精灵图生成器。

Description：

> **Create sprites, animations and matching game asset sets around one project — without drawing every frame by hand.**
>
> 中文：围绕同一个游戏项目创建精灵图、动画和配套资产套装，无需手工绘制每一帧。

Prompt placeholder（提示词占位文案）：

> `A small fire knight with a red cape...`

Primary CTA（主行动按钮）：

> **Start Creating**
>
> 中文：开始创作。

Secondary CTA（次行动按钮）：

> **View Examples**
>
> 中文：查看案例。

Helper（辅助说明）：

> **Project-first · Matching styles · Commercial use**
>
> 中文：项目优先 · 风格一致 · 支持商业使用。

### 交互（Interaction）

用户在 Prompt（提示词） 输入内容并点击 Start Creating：

- 未登录 → Auth → Create Project Wizard（分步向导）。
- 已登录 → Create Project Wizard（分步向导）。
- Prompt（提示词） 必须自动带入后续 Sprite Generator。

不能点击后跳转到一个空 Dashboard（控制台首页）。

---

## 7.5 模块 2（Module 2）— Product Promise Strip（产品价值条）

Hero 下方紧接一条简洁价值条，不做 Logo Wall（品牌 Logo 展示墙）。

内容：

```text
CREATE SPRITES     ANIMATE CHARACTERS     GENERATE ICON SETS     KEEP ONE GAME STYLE
```

小描述：

- Text / Reference → Sprite（文字 / 参考图 → 精灵图）。
- Idle（待机） / Walk（行走） / Attack（攻击） → Sprite Sheet。
- Generate 10–50 matching game icons at once（一次生成 10–50 个风格一致的游戏图标）。
- Every asset inherits your Project Context（每个资产自动继承项目上下文）。

目的：让用户在滚动 1 屏内理解完整价值链。

---

## 7.6 模块 3（Module 3）— From One Project to a Complete Asset Set

### H2（模块主标题）

> **Build assets for a game, not isolated images.**
>
> 中文：为一个完整游戏制作资产，而不是生成彼此孤立的单张图片。

### 描述文案（Description）

> **Create one project, define its visual direction once, then keep generating assets that belong to the same game world.**
>
> 中文：只需创建一次项目并确定视觉方向，之后持续生成属于同一游戏世界的资产。

### 视觉展示（Visual）

展示 Project Card：

```text
TINY DUNGEON
Roguelike RPG

Pixel Art
Top-down
64×64
Dark Fantasy

Characters   6
Animations  12
Items       34
Skills      16
```

右侧展示同一项目下角色、武器、药水、技能 Icon。

### CTA

> **Create a Project**
>
> 中文：创建项目。

这一区块负责把 SpritePixel 和普通 Prompt（提示词） → Image 工具区分开。

---

## 7.7 模块 4（Module 4）— Create Game-ready Sprites

### H2（模块主标题）

> **Create game-ready character sprites with AI.**
>
> 中文：使用 AI 生成可用于游戏开发的角色精灵图。

### 描述文案（Description）

> **Describe a character or upload a reference. SpritePixel uses your project style, perspective and resolution to generate usable sprite variations.**
>
> 中文：描述角色或上传参考图，SpritePixel 会继承项目的风格、视角和分辨率来生成可用的精灵图变体。

### 视觉展示（Visual）

左：简化 Generate Panel（生成参数面板）。

右：4 个 Sprite Variations（精灵图变体）。

示例：

```text
Prompt
A tiny dungeon knight carrying a round shield

Style        Pixel Art
Perspective  Top-down
Size         64×64
```

### 辅助卖点（Supporting Points）

- Text or reference image（文字或参考图）。
- Project style inherited automatically（自动继承项目风格）。
- Multiple variations（多个生成变体）。
- Transparent-background output where supported（模型支持时输出透明背景）。

### CTA

> **Create a Sprite**
>
> 中文：创建精灵图。

---

## 7.8 模块 5（Module 5）— Animate Without Drawing Every Frame

### H2（模块主标题）

> **Turn one character into a playable animation.**
>
> 中文：把一个角色转换成可以在游戏中使用的动画。

### 描述文案（Description）

> **Generate idle, walk and attack animations, preview the motion, then export the frames as a sprite sheet.**
>
> 中文：生成待机、行走和攻击动画，预览动作效果，并将动画帧导出为精灵图表。

### 视觉展示（Visual）

中心显示角色动画。

底部：

```text
Idle | Walk | Attack

[1][2][3][4][5][6][7][8]

8 FPS   Loop On
```

旁边展示 Sprite Sheet PNG。

### CTA

> **Generate a Sprite Sheet**
>
> 中文：生成精灵图表。

---

## 7.9 模块 6（Module 6）— Batch Game Icons（批量游戏图标） / 核心差异化模块

这是首页最重要的产品展示之一，视觉面积应大于普通 Feature Card（功能卡片）。

### 辅助标签（Eyebrow）

> **GENERATE SETS, NOT JUST IMAGES**
>
> 中文：生成整套资产，而不只是单张图片。

### H2（模块主标题）

> **Generate an entire game icon set at once.**
>
> 中文：一次生成完整的游戏图标套装。

### 描述文案（Description）

> **Paste your item list or let AI suggest what your game needs. Generate matching weapons, potions, skills and inventory items in one shared style.**
>
> 中文：粘贴物品列表，或让 AI 根据游戏项目推荐需要的资产，并用统一风格批量生成武器、药水、技能和物品栏图标。

### 视觉展示（Visual）

左侧 Asset List（资产列表）：

```text
Iron Sword
Golden Sword
Wood Shield
Health Potion
Mana Potion
Magic Ring
Silver Key
Blue Gem
```

右侧 4×4 Inventory（游戏物品栏） Grid（物品栏网格），展示统一风格 Icon。

### 产品点

- Paste a list（粘贴资产列表）。
- Suggest with AI（让 AI 推荐资产清单）。
- Generate selected / all（生成选中项 / 全部资产）。
- Regenerate one item without 重做全部（只重新生成单个项目，无需重做整组）。
- Download complete pack（下载完整资产包）。

### CTA

> **Build an Icon Set**
>
> 中文：创建一套游戏图标。

---

## 7.10 模块 7（Module 7）— Consistency / Project Style（项目风格设置）

### H2（模块主标题）

> **Define the style once. Reuse it everywhere.**
>
> 中文：只需定义一次项目风格，之后在所有生成任务中复用。

### 描述文案（Description）

> **SpritePixel remembers how your game should look — style, palette, perspective, sprite size and references are inherited across future generations.**
>
> 中文：SpritePixel 会记住游戏的视觉规则，后续生成会自动继承风格、色板、视角、精灵图尺寸和参考图。

### 视觉展示（Visual）

左侧 Project Style（项目风格设置）：

```text
Style        Pixel Art
Palette      Dark Fantasy
Perspective  Top-down
Outline      Dark / 1px
Size         64×64
References   3
```

右侧展示：

- Character。
- Sword。
- Potion。
- Skill Icon。

强调“同一世界”的视觉一致性。

### CTA

> **See Project Style**
>
> 中文：查看项目风格设置。

---

## 7.11 模块 8（Module 8）— Asset Vault（资产仓库）

### H2（模块主标题）

> **Keep every game asset in one Vault.**
>
> 中文：把一个游戏项目的所有资产集中保存在同一个资产仓库中。

### 描述文案（Description）

> **Stop losing generated files across downloads and folders. Every approved asset is organized inside its project and ready for reuse, variation or export.**
>
> 中文：不再让生成文件散落在下载目录中，确认后的资产统一归档到项目内，可继续复用、生成变体或导出。

### 视觉展示（Visual）

类似游戏 Inventory（游戏物品栏）：

```text
Tiny Dungeon / Vault

All 68
Characters 6
Animations 12
Items 34
Skills 16

[Asset Grid]
```

### 辅助卖点（Supporting Points）

- Organized by Project and Asset Type（按项目和资产类型整理）。
- Search / Filter（搜索 / 筛选）。
- Download / Favorite（下载 / 收藏）。
- Variation（变体） / Animate。
- Reuse as reference（作为参考图复用）。

### CTA

> **Build Your Vault**
>
> 中文：建立你的游戏资产仓库。

---

## 7.12 模块 9（Module 9）— Test in Game Context（P1 可展示 Coming Soon（即将上线） 或上线后开放）

如果 MVP 首发没有 Arena，该模块不要提前宣传成已可用。

上线后使用：

### H2（模块主标题）

> **See how your sprite feels before you export it.**
>
> 中文：导出前先看看精灵图放进游戏环境中的实际效果。

### 描述文案（Description）

> **Drop your generated character into a lightweight test arena and preview movement, jump and attack animations in context.**
>
> 中文：把生成角色放入轻量测试场景，预览移动、跳跃和攻击动画在真实游戏环境中的表现。

### 视觉展示（Visual）

小型 Platformer（平台跳跃游戏） / Dungeon Canvas（画布）。

操作：

```text
← → Move
Space Jump
J Attack
```

CTA：

> **Test a Sprite**
>
> 中文：测试精灵图。

---

## 7.13 模块 10（Module 10）— How It Works

只保留 3 步。

### H2（模块主标题）

> **From game idea to usable assets in three steps.**
>
> 中文：从游戏想法到可用游戏资产，只需要三个步骤。

#### 01 — Create a Project

> Define your game style, perspective and asset direction once.

#### 02 — Generate Asset Sets（资产套装）

> Create sprites, animations and matching icons with shared project context.

#### 03 — Save, Refine and Export

> Keep approved assets in your Vault, create variations and export them for your game.

CTA：

> **Create Your First Project**
>
> 中文：创建你的第一个项目。

---

## 7.14 模块 11（Module 11）— Use Cases（使用场景）

### H2（模块主标题）

> **Built for the way indie games are actually made.**
>
> 中文：按照独立游戏真实的制作方式来设计。

使用 4 个卡片：

#### RPG（角色扮演游戏） / Roguelike（类 Rogue 游戏）

Characters, weapons, potions, skills and inventory items.

中文：角色、武器、药水、技能和物品栏道具。

#### Platformer（平台跳跃游戏）

Character sprites, movement animations and game props.

中文：角色精灵图、移动动画和游戏道具。

#### Cozy Game（治愈 / 轻松休闲游戏）

Items, crops, tools, decorations and UI icons.

中文：物品、作物、工具、装饰物和 UI 图标。

#### Game Jam（限时游戏开发活动） / Prototype

Build a playable visual direction without waiting for a full art pipeline.

中文：无需等待完整美术制作流程，就能快速建立可玩的视觉方向。

避免在 MVP 展示尚未支持的 Map / 3D / Audio。

---

## 7.15 模块 12（Module 12）— Free Sprite Tools

### H2（模块主标题）

> **Free sprite tools for everyday game development.**
>
> 中文：面向日常游戏开发需求的免费精灵图工具。

### 描述文案（Description）

> **Use simple browser-based tools for common sprite tasks — no credits required.**
>
> 中文：常见精灵图处理任务可直接在浏览器完成，不消耗积分。

MVP 卡片：

#### Sprite Sheet Maker（精灵图表制作工具）

> Pack animation frames into a sprite sheet in your browser.

CTA：`Open Tool`

#### Sprite Sheet Splitter（精灵图表拆分工具）

如果 P1 未上线：不展示。

上线后：

> Split an existing sprite sheet into individual animation frames.

后续：

- GIF to Sprite Sheet（GIF 转精灵图表）。
- Sprite Sheet to GIF（精灵图表转 GIF）。
- Pixel Art（像素艺术） Resizer。
- Palette（色板） Extractor。

---

## 7.16 模块 13（Module 13）— Pricing Preview（价格预览）

首页不展示完整复杂权益表。

### H2（模块主标题）

> **Start free. Pay when you need more generations.**
>
> 中文：免费开始，需要更多 AI 生成额度时再付费。

三张简卡：

- Free — $0。
- Indie — $12/mo。
- Pro — $24/mo。

统一说明：

> **Credits are used for AI generation. Downloads and exports are free.**
>
> 中文：积分只用于 AI 生成，下载和导出不消耗积分。

CTA：

> **View Pricing**
>
> 中文：查看价格。

---

## 7.17 模块 14（Module 14）— FAQ

MVP 建议 7 个问题。

### What can I create with SpritePixel?（我可以用 SpritePixel 创建什么？）

Sprites, sprite animations / sheets and matching game icon sets in the first version.

中文：首个版本支持精灵图、精灵动画 / 精灵图表，以及风格一致的游戏图标套装。

### Do I need to create a project first?（我需要先创建项目吗？）

Yes. Core AI assets belong to a project so SpritePixel can reuse the same style, perspective and references across generations.

中文：需要。核心 AI 资产都归属于项目，这样才能在后续生成中复用相同的风格、视角和参考图。

### Can I use generated assets in a commercial game?（生成资产可以用于商业游戏吗？）

Yes, subject to the Terms and the rights of any material you upload.

中文：可以，但需要遵守服务条款，并确保你对上传的参考素材拥有合法使用权。

### Do downloads use credits?（下载会消耗积分吗？）

No. Credits are used for AI generation, not downloads or exports.

中文：不会。积分仅在 AI 生成时消耗，下载和导出不扣积分。

### What happens if a generation fails?（如果生成失败会怎样？）

Credits are automatically returned for provider or system failures.

中文：如果因为 AI 服务商或系统错误导致生成失败，积分会自动退还。

### Can I upload reference images?（可以上传参考图吗？）

Yes. References can be attached to a project or used for a specific generation.

中文：可以。参考图既可以保存到整个项目，也可以只用于某一次生成。

### Is SpritePixel only for pixel art?（SpritePixel 只支持像素画吗？）

No. Pixel art is an important use case, but the product should also support suitable 2D cartoon / illustrated game styles as providers allow.

中文：不是。像素画是重要场景，但只要模型能力允许，也应支持合适的 2D 卡通和插画游戏风格。

---

## 7.18 模块 15（Module 15）— Final CTA（最终行动区）

背景重新使用 Hero 世界观，但不重复大段内容。

### H2（模块主标题）

> **Build your game world, one consistent asset set at a time.**
>
> 中文：通过一套套风格一致的资产，逐步构建完整游戏世界。

Description：

> **Create a project and start with your first sprite.**
>
> 中文：创建一个项目，并从第一张精灵图开始。

Primary CTA（主行动按钮）：

> **Create a Free Project**
>
> 中文：免费创建项目。

Secondary（次级关键词）：

> **Explore Examples**
>
> 中文：浏览案例。

---

## 7.19 Footer（页脚）

推荐：

```text
PRODUCT
AI Sprite Generator
Sprite Sheet Generator
AI Game Icon Generator
Pricing

FREE TOOLS
Sprite Sheet Maker
Sprite Sheet Splitter

RESOURCES
Examples
Blog
Game Dev Guides

COMPANY
About
Contact

LEGAL
Terms
Privacy
Commercial Use

Language ▼
© SpritePixel
```

未上线页面不要提前放空链接。

---

# 8. 核心页面定义

## 8.1 Homepage（首页） / AI Sprite Generator（AI 精灵图生成器）

URL：`/`

Primary Keyword（主关键词）：`ai sprite generator`

产品职责：

- SEO 主入口。
- 定位。
- Project 启动入口。
- Sprite 能力展示。

不再单独建立 `/ai-sprite-generator`。

---

## 8.2 Sprite Sheet Generator（精灵图表生成器）

URL：`/sprite-sheet-generator`

Primary Keyword（主关键词）：`sprite sheet generator`

注意：这里是 **AI Animation → Sprite Sheet**。

不是免费 Sprite Sheet Maker（精灵图表制作工具）。

页面核心：

```text
Character
Animation Preset / Prompt
Frames
Direction
↓
Animation Preview
Sprite Sheet Preview
```

CTA：

> **Generate Sprite Sheet**

---

## 8.3 AI Game Icon Generator（AI 游戏图标生成器）

URL：`/ai-game-icon-generator`

Primary Keyword（主关键词）：`ai game icon generator`

Secondary（次级关键词）：

- game icon generator。
- batch game icon generator。
- game icon set generator。
- rpg icon generator。

核心卖点：

> **Create matching game icons, not random images.**

产品默认就是 Batch-first（批量优先）。

首发不要再拆 `/batch-game-icon-generator`。

---

## 8.4 Sprite Sheet Maker（精灵图表制作工具）

URL：`/sprite-sheet-maker`

免费、无需登录、无需 Project。

用途：把现有 Frames（动画帧） 打包为 Sprite Sheet。

输入：

- Upload Frames（上传动画帧）。
- Columns（列数）。
- Padding。
- Background（背景）。
- Layout（布局）。

输出：

- Real-time Grid Preview（预览）。
- PNG Download。

全部浏览器端处理优先。

---

## 8.5 Sprite Sheet Splitter（精灵图表拆分工具）

URL：`/sprite-sheet-splitter`

P1。

用户上传 Sprite Sheet。

Canvas（画布） / Preview（预览） 显示 Grid Overlay。

设置：

- Frame Width（帧宽度）。
- Frame Height（帧高度）。
- Rows（行数）。
- Columns（列数）。
- Offset（偏移量）。

CTA：

> **Extract Frames**

免费、无需 Project。

---

## 8.6 Pricing（价格页）

URL：`/pricing`

必须明确：

- 每个 Plan 的 Credits。
- Credits 用于什么。
- Download / Export 免费。
- Commercial Use（商业使用）。
- Credit Pack（一次性积分包）。
- Failed Generation Refund（生成失败退款 / 退积分）。

不要只写模糊的“更多生成次数”。

---

## 8.7 Examples（案例页）

URL：`/examples`

MVP 使用官方精选静态案例。

分类：

- Sprites。
- Animations。
- Icon Sets。

每个 Case（案例） 最好展示：

```text
Project Style
→ Prompt / Asset List
→ Generated Result
```

让用户理解一致性和批量能力。

MVP 不需要用户上传、Like（点赞）、Follow（关注） 等社区功能。

---

# 9. SEO 信息架构

## 9.1 MVP 首发页面

| 页面 | Priority |
|---|---|
| Homepage / AI Sprite Generator（AI 精灵图生成器） | P0 |
| Sprite Sheet Generator（精灵图表生成器） | P0 |
| AI Game Icon Generator（AI 游戏图标生成器） | P0 |
| Sprite Sheet Maker（精灵图表制作工具） | P0 |
| Pricing | P0 |
| Examples | P0 / Content |
| Sprite Sheet Splitter（精灵图表拆分工具） | P1 |

首发只做真正有工具和结果的页面。

---

## 9.2 Sprite Keyword Cluster（关键词集群）

首页：

- ai sprite generator。

后续：

- sprite sheet generator。
- sprite animation generator。
- character sprite generator。
- rpg sprite generator。
- pixel sprite generator。

---

## 9.3 Game Icon Cluster（游戏图标关键词集群）

MVP：

- ai game icon generator。
- batch game icon generator 作为同页 Secondary Intent（次级搜索意图）。

后续根据搜索数据考虑：

- rpg icon generator。
- game item generator。
- skill icon generator。
- pixel game icon generator。

原则：不为了关键词制造多个功能完全相同的薄页面。

---

## 9.4 Free Tool Cluster（免费工具关键词集群）

```text
/sprite-sheet-maker
/sprite-sheet-splitter
/gif-to-sprite-sheet
/sprite-sheet-to-gif
/pixel-art-resizer
/pixel-art-palette-extractor
```

增长逻辑：

```text
Google Search
↓
Free Tool
↓
Solve Immediate Problem
↓
Discover Core AI Product
↓
Create Project
```

---

## 9.5 Game Asset Cluster（后期）

只有真实功能扩展后再建立：

- ai game asset generator。
- 2d game asset generator。
- game ui generator。
- game item generator。
- game vfx generator。

`/ai-game-asset-generator` 后期可以作为 Asset Hub（资产中心），而不是首发做一个空的“万能生成器”。

---

## 9.6 多语言

技术架构从第一天支持 i18n。

默认：English。

建议 UI 语言：

- English。
- Japanese。
- Korean。
- Spanish。
- German。
- French。
- Portuguese。
- Simplified Chinese。

但内容策略：

> **English First**

优先把英语核心页面做完整，再对真实有搜索潜力的页面做本地化。

---

# 10. 游戏化体验规范

SpritePixel 需要的是 **Game-like UX（游戏感用户体验）**，不是 Gamification（游戏化机制）。

## 10.1 可以做

### Generation State（生成状态）

普通：

`Generating...`

SpritePixel：

```text
FORGING ASSETS

Creating base sprite
■■■■■■■■□□

Removing background
■■■■■■□□□□

Preparing export
■■■■□□□□□□
```

完成：

> **ASSET READY**

### 视觉隐喻（Visual Metaphors）

- Forge：生成。
- Vault：资产管理。
- Arena：测试。
- Inventory（游戏物品栏） Grid（物品栏网格）：Icon Set（图标套装）。

这些主要用于页面气质、状态和视觉，而不是强迫用户学习一套新术语。

## 10.2 不做

- Daily Reward。
- XP。
- Level。
- Badge。
- Achievement。
- Leaderboard。
- Quest System。

这些不直接提高资产生产效率和一致性。

---

# 11. AI 与技术架构

## 11.1 技术原则

MVP：

- 不部署 GPU。
- 不训练模型。
- 不建立 Kubernetes。
- 不做复杂微服务。
- 优先 Managed AI APIs（托管 AI 接口）。

---

## 11.2 AI Model Router（AI 模型路由）

根据 Asset Type（资产类型） / Style 路由不同 Provider（服务提供商）。

```text
Frontend
↓
Next.js API
↓
Generation Service
↓
Model Router
├── Pixel Sprite / Pixel Icon Model
├── General 2D Image Model
└── Animation Model
↓
Post-processing
↓
R2 Storage
↓
Database
```

不要把产品 UI 与某个 Provider（服务提供商） 绑定。

数据库保存的是统一 Generation Contract（统一生成任务数据结构）。

---

## 11.3 推荐技术栈

```text
Frontend
Next.js

UI
Tailwind CSS + shadcn/ui

Auth
Auth.js / Clerk

Database
PostgreSQL / Supabase

Storage
Cloudflare R2

AI
fal / Replicate / Runware / suitable managed APIs

Async
Provider async API + polling
必要时再增加 Queue

Payment
Creem / Stripe

Analytics
PostHog

Hosting
Cloudflare / Vercel
```

首发不引入：

- Kubernetes。
- RabbitMQ。
- 自建 GPU Cluster（GPU 集群）。
- 多服务拆分。

---

# 12. 核心数据模型

## 12.1 User（用户）

```text
id               // 唯一 ID
email            // 邮箱
name             // 名称
plan             // 订阅套餐
createdAt        // 创建时间
```

## 12.2 Project（项目）

```text
id               // 唯一 ID
userId           // 用户 ID
name             // 名称
gameType         // 游戏类型
description      // 描述
style            // 视觉风格
perspective      // 视角
defaultSize      // 默认尺寸
palette          // 色板
outline          // 描边
detailLevel      // 细节等级
negativePrompt   // 负面提示词
createdAt        // 创建时间
updatedAt        // 更新时间
```

## 12.3 ProjectReference（项目参考素材）

```text
id               // 唯一 ID
projectId        // 项目 ID
fileUrl          // 文件地址
type             // 类型
sortOrder        // 排序顺序
```

## 12.4 AssetSet（资产套装）

用于批量资产或动画集合。

```text
id               // 唯一 ID
projectId        // 项目 ID
type             // 类型：图标套装 / 动画套装
name             // 名称
status           // 状态
createdAt        // 创建时间
```

## 12.5 Asset（资产）

```text
id               // 唯一 ID
projectId        // 项目 ID
assetSetId?      // 资产套装 ID（可为空）
assetType        // 资产类型：精灵图 / 动画 / 图标 / 物品 / 技能
name             // 名称
fileUrl          // 文件地址
thumbnailUrl     // 缩略图地址
width            // 宽度
height           // 高度
status           // 状态
favorite         // 是否收藏
sourceAssetId?   // 来源资产 ID（可为空）
createdAt        // 创建时间
```

## 12.6 Generation（生成任务）

```text
id               // 唯一 ID
userId           // 用户 ID
projectId        // 项目 ID
assetType        // 资产类型
prompt           // 提示词
paramsJson       // 生成参数 JSON
provider         // 服务提供商
model            // 模型
providerJobId    // 服务商任务 ID
status           // 状态
creditsCost      // 消耗积分
providerCost     // 实际服务商成本
failureReason    // 失败原因
createdAt        // 创建时间
completedAt      // 完成时间
```

## 12.7 CreditLedger（积分流水账）

```text
id               // 唯一 ID
userId           // 用户 ID
type             // 流水类型：赠送 / 购买 / 生成消耗 / 退款
amount           // 积分变动数量
balanceAfter     // 变动后余额
referenceId      // 关联业务 ID
createdAt        // 创建时间
```

所有 Credits 变化必须通过 Ledger（流水账），不能只修改 users.balance。

---


# 13. Credits 与失败处理

## 13.1 初始 Credits（积分）假设

| 操作 | Credits |
|---|---:|
| Game Icon（游戏图标） | 3 |
| Static Sprite（静态精灵图） | 4 |
| 4 Variations（4 个变体） | 12 |
| Sprite Animation（精灵动画） | 10–20 |
| Background Remove（背景移除） | 0 |
| Download | 0 |
| Export | 0 |

最终值必须根据真实 Provider Cost（服务提供商成本） 调整。

---

## 13.2 失败生成

如果 Provider（服务提供商） / 系统失败：

1. Generation 标记 Failed（失败）。
2. 自动 Refund Credits（退还积分）。
3. UI 显示：

```text
Generation failed.
Your credits have been returned.
```

4. 提供 Retry（重试）。

如果生成成功但用户主观不满意：

- Regenerate（重新生成） 正常收费。
- 不提供无限 Free Retry（免费重试）。

---

# 14. 商用授权与信任信息

Generator（生成器）、Pricing（价格页）、FAQ（常见问题） 都必须明确：

> **Commercial Use Allowed**
>
> 中文：允许将符合条款的生成资产用于商业游戏。

同时说明：

- 用户对上传内容拥有合法使用权。
- 用户不得上传无权使用的版权素材。
- 不保证 AI 输出与第三方作品绝对不存在相似性。
- 用户上传的 Private Assets（私有资产） 默认不用于训练，前提是实际服务条款与 Provider（服务提供商） 能支持这一承诺。

“能否商用”不能只藏在 Terms 页面。

---

# 15. 数据埋点与核心指标

## 15.1 核心漏斗

```text

homepage_view                # 首页访问
hero_prompt_submit           # 首屏提示词提交
signup                       # 注册
project_create_start         # 开始创建项目
project_create_success       # 项目创建成功

generator_view               # 生成器页面访问
generation_submit            # 提交生成
generation_success           # 生成成功
generation_failed            # 生成失败
asset_select                 # 选择资产
vault_save                   # 保存到资产仓库
asset_download               # 下载资产

animation_submit             # 提交动画生成
animation_success            # 动画生成成功

icon_board_view              # 进入图标资产看板
asset_list_created           # 创建资产列表
ai_asset_suggest_click       # 点击 AI 推荐资产列表
batch_generate_submit        # 提交批量生成
batch_generate_success       # 批量生成成功

credit_paywall_view          # 积分不足付费提示曝光
pricing_view                 # 价格页访问
checkout_start               # 开始结账
purchase_success             # 购买成功
```

---

## 15.2 Activation（激活）

不要把注册作为 Activation（激活）。

推荐定义：

> **用户创建 Project，并成功生成 + 保存或下载至少 1 个资产。**

可以拆：

- Project Creation Rate（项目创建率）。
- First Generation Rate（首次生成率）。
- First Useful Asset Rate（首个可用资产完成率）。
- First Download Rate（首次下载率）。

---

## 15.3 指标体系

### Acquisition（获客）

- Organic Visits（自然搜索访问量）。
- Landing Page Traffic（落地页流量）。
- Free Tool Traffic（免费工具流量）。
- Visitor → Project Start Rate（访客到开始创建项目转化率）。

### Activation（激活）

- Project Creation Rate（项目创建率）。
- First Generation Rate（首次生成率）。
- First Useful Asset Rate（首个可用资产完成率）。
- First Download Rate（首次下载率）。

### Engagement（使用深度）

- Assets Generated / User（每用户生成资产数）。
- Assets Saved / Project（每项目保存资产数）。
- Batch Generation Rate（批量生成使用率）。
- Animation Creation Rate（动画创建率）。

### Retention（留存）

- 7-Day Returning Creator Rate（7 日创作者回访率）。
- Projects with second generation session（发生第二次生成会话的项目比例）。
- Vault Reuse Rate（资产仓库复用率）。

### Revenue（收入）

- Free → Paid Conversion（免费转付费转化率）。
- ARPPU。
- Credit Pack Purchase Rate（积分包购买率）。

### AI Economics（AI 成本经济性）

- Cost / Generation（单次生成成本）。
- Cost / Successful Generation（单次成功生成成本）。
- Cost / Paid User（单个付费用户成本）。
- Gross Margin（毛利率）。

目标：

> **Gross Margin > 70%**
>
> 中文：目标毛利率高于 70%。

---

# 16. 增长策略

## 16.1 SEO

最高优先级。

只围绕真实工具意图建设页面。

---

## 16.2 Free Tools（免费工具）

核心价值：

- 无 AI 成本或极低成本。
- 高搜索意图。
- 可以长期获得自然流量。
- 与 SpritePixel 核心用户高度相关。

---

## 16.3 Showcase（案例展示）

Sprite / Animation / Icon Set（图标套装） 天然适合视觉传播。

内容主题：

> “I generated a complete 32×32 RPG inventory set with AI.”

重点展示结果和过程，不发布“我又做了一个 AI SaaS”。

渠道：

- Reddit。
- X。
- Pinterest。
- Instagram。
- itch.io。

---

## 16.4 Game Jam（限时游戏开发活动）

可以提供：

- Game Jam（限时游戏开发活动） Free Credits（免费积分）。
- Free Asset Pack（免费资产包）。
- SpritePixel Free Tools Collection（免费工具集合）。

比早期做大型品牌合作更适合 Solo Founder（独立开发者 / 单人创始人）。

---

## 16.5 内容 SEO

优先写开发者任务，而不是泛 AI 内容。

例如：

- How to Create a Sprite Sheet for Unity（如何为 Unity 创建精灵图表）。
- How to Make Pixel Art Sprites with AI（如何用 AI 制作像素精灵图）。
- How to Generate RPG（角色扮演游戏） Item Icons。
- How to Create Consistent Game Icons（如何创建风格一致的游戏图标）。
- How to Animate a Character Sprite（如何制作角色精灵动画）。
- Sprite Sheet Size Guide（精灵图表尺寸指南）。
- 32x32 vs 64x64 Pixel Art（32×32 与 64×64 像素画对比）。
- How to Import Sprite Sheets into Godot（如何把精灵图表导入 Godot）。

每篇自然链接真实工具。

---

# 17. 产品路线图

## 阶段 1（Phase 1） — MVP：Sprite + Animation + Icon Sets

目标：做出一个真正能完成资产生产闭环的产品。

包含：

- Projects。
- Basic Project Context（基础项目上下文）。
- AI Sprite Generator（AI 精灵图生成器）。
- Sprite Animation（精灵动画）。
- Sprite Sheet Export（精灵图表导出）。
- Batch Game Icon Generator（批量游戏图标生成器）。
- Asset Board（资产看板）。
- Vault。
- Credits / Payment。
- Sprite Sheet Maker（精灵图表制作工具）。

核心验证：

1. 用户是否愿意创建 Project。
2. Sprite 的生成质量是否可用。
3. Batch Icon 是否明显提高使用深度。
4. Project Context（项目上下文） 是否改善重复生成体验。
5. 用户是否会返回同一个 Project 继续生产资产。

---

## 阶段 2（Phase 2） — Asset Sets（资产套装）

根据数据优先增加：

- Character Variations（角色变体）。
- NPC（非玩家角色） Sets。
- Item Sets。
- Skill Sets。
- UI Icons。
- Portraits。
- More Animation Directions（更多动画方向）。
- Sprite Test Arena（测试场）。

核心仍然是：

> **Asset Sets + Consistency**

---

## 阶段 3（Phase 3） — 2D Game Asset Studio（2D 游戏资产工作室）

在真实需求证明后扩展：

- Tilesets。
- Backgrounds（背景）。
- UI Assets。
- VFX。

形成完整的：

> **2D AI Game Asset Studio**

---

## 阶段 4（Phase 4） — Optional Expansion（可选扩展）

是否扩展：

- Music。
- SFX。
- 3D。
- API / MCP。
- Engine Plugins（游戏引擎插件）。

完全由用户数据、收入和维护能力决定，不写成必须完成的路线图。

---

# 18. 30 / 60 / 90 天执行计划

## 0–30 天：完成核心闭环

### 产品

- Auth。
- Projects。
- Basic Project Context（基础项目上下文）。
- AI Sprite Generator（AI 精灵图生成器）。
- Batch Game Icon Generator（批量游戏图标生成器） + Asset Board（资产看板）。
- Basic Vault。
- Credits。
- Payment。
- R2 Storage（文件存储）。
- Generation Failure Refund（生成失败退还积分）。

### SEO / Website

- Homepage。
- Sprite Sheet Generator（精灵图表生成器） 页面框架。
- AI Game Icon Generator（AI 游戏图标生成器）。
- Sprite Sheet Maker（精灵图表制作工具）。
- Pricing。
- Examples。

### 技术

- i18n 架构。
- Model Router（模型路由） 抽象。
- Analytics（数据分析）。
- Cost Tracking（成本追踪）。

---

## 32–60 天：动画与一致性

- Sprite Animation（精灵动画）。
- Sprite Sheet Export（精灵图表导出）。
- More Project Style（项目风格设置） Controls（参数控制区）。
- Reference Image（参考图） 强化。
- Sprite Sheet Splitter（精灵图表拆分工具）。
- Asset Variation（变体）。
- 首批多语言 UI。
- 发布 Reddit / itch.io / X 生成案例。

---

## 62–90 天：根据数据选方向

### 如果 Sprite 使用最高

优先：

- Animation Consistency（动画一致性）。
- 4 / 8 Direction（4 / 8 方向）。
- Character Variations（角色变体）。

### 如果 Batch Icon 使用最高

优先：

- Items。
- Skills。
- Weapons。
- UI Icon Sets。
- Asset Planning（资产规划）。

### 如果 Free Tool SEO 增长最快

优先：

- GIF → Sprite Sheet。
- Sprite Sheet → GIF。
- Pixel Resizer（像素图尺寸调整工具）。
- Palette（色板） Extractor。

原则：

> **Search Data + Usage Data 决定下一步，而不是按路线图机械开发。**

---

# 19. 上线前检查清单

## 定位

- [ ] 首页 5 秒内能看懂“给游戏开发者生成什么”。
- [ ] 没有把 SpritePixel 表达成通用 AI Image Generator（AI 图片生成器）。
- [ ] Batch-first（批量优先） 和 Project-first（项目优先） 都有真实产品体现。

## Project

- [ ] 核心 AI 生成必须属于 Project。
- [ ] Project Context（项目上下文） 能被所有 Generator 自动继承。
- [ ] Reference 可以被复用。

## Sprite

- [ ] 可从 Prompt（提示词） / Reference 生成。
- [ ] 结果可 Save / Download / Variation（变体）。
- [ ] Transparent Background（透明背景） 策略明确。

## Animation

- [ ] 可选 Character 和 Animation Preset（动画预设）。
- [ ] 有 Preview（预览） / Timeline（时间轴）。
- [ ] 可 Export Sprite Sheet（导出精灵图表）。

## Icon Set（图标套装）

- [ ] 支持 Add / Paste List（添加 / 粘贴列表）。
- [ ] 支持 Batch Generate（批量生成）。
- [ ] 单个 Icon 可单独 Regenerate（重新生成）。
- [ ] 同组共享 Project Context（项目上下文）。
- [ ] 可 ZIP Download。

## Vault

- [ ] 只保存用户认可资产。
- [ ] 可按类型筛选。
- [ ] 可 Download / Variation（变体） / Delete。

## Credits

- [ ] Generation 扣费。
- [ ] Download / Export 不扣费。
- [ ] Failed Generation（失败生成） 自动 Refund。
- [ ] 有 Ledger（流水账）。

## Website

- [ ] Hero 为全屏游戏场景视觉。
- [ ] 首页主关键词为 `ai sprite generator`。
- [ ] 没有独立 `/ai-sprite-generator` 页面。
- [ ] AI Game Icon Generator（AI 游戏图标生成器） 不与 Batch 页面首发重复。
- [ ] Free Tools（免费工具） 可以无需 Project 使用。

## Legal / Trust

- [ ] Pricing / FAQ / Generator 明确 Commercial Use（商业使用）。
- [ ] Reference 上传版权责任说明。
- [ ] Provider（服务提供商） 数据处理规则与隐私文案一致。

## Metrics

- [ ] 能计算 First Useful Asset Rate（首个可用资产完成率）。
- [ ] 能计算 Batch Generation Rate（批量生成使用率）。
- [ ] 能记录 Provider Cost（服务提供商成本）。
- [ ] 能计算 Cost per Successful Generation（每次成功生成成本）。
- [ ] 能计算 Gross Margin（毛利率）。

---

# 20. 最终产品决策摘要

如果后续开发出现分歧，以以下规则作为最终依据。

### 1. 核心产品必须 Project-first（项目优先）

用户不是来生成一次图片，而是在制作一个游戏。

### 2. 首页可以直接输入 Prompt（提示词），但点击后进入 Create Project 流程

既保留低门槛开始体验，也保证核心数据结构从第一步就围绕 Project。

### 3. Batch Game Icon Generator（批量游戏图标生成器） 是 MVP 的关键差异化

它不是附属工具，而是“Generate Sets, Not Images”的第一种产品实现。

### 4. Asset Board（资产看板） 是有限结构的工作区，不做无限 Canvas（画布）

只提供资产规划、批量状态、选择和结果管理，不演变成 Figma。

### 5. Basic Project Context（基础项目上下文） 必须 P0

高级 Project Style（项目风格设置） 可以 P1，但核心 Style / Perspective（视角） / Size / Reference 必须从 MVP 存在。

### 6. Vault 是用户认可资产库，不是生成历史

History 和 Vault 必须在数据意义上区分。

### 7. 首页不再使用典型 AI 紫色渐变视觉

采用 Dark Game Workshop + Forge Gold + Mana Cyan，形成更明确的 SpritePixel 品牌识别。

### 8. SEO 页面必须与真实产品能力对应

首页负责 `ai sprite generator`；AI Game Icon Generator（AI 游戏图标生成器） 首发承载 Batch 能力；Free Tools（免费工具） 独立。

### 9. 不进入 Feature Race（功能竞赛）

不因为 Ludo / AutoSprite 等竞品增加 API、Audio、3D、Plugin，就立即跟进。

### 10. 长期路径

```text
Sprite-first
↓
Batch-first
↓
Asset-set-first
↓
Project Context + Vault
↓
2D AI Game Asset Studio
```

SpritePixel 最终要解决的不是“能生成多少种图片”，而是：

> **让一个没有完整美术团队的独立开发者，以尽可能低的成本，从游戏想法快速走到一套一致、可用、可持续扩展的游戏资产。**
