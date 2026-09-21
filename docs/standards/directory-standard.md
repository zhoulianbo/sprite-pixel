# 目录与开发标准

## 文件归属

| 路径                               | 责任                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| src/app/[locale]                   | App Router 页面、layout、路由入口；保留现有分组，不复制业务逻辑               |
| src/app/api                        | 请求验证、鉴权与响应边界；调用现有服务层                                      |
| src/themes/default/blocks          | 页面区块与展示组件（TSX），不存放 CSS/SCSS 文件                               |
| src/themes/default/pages、layouts  | 主题页面编排与布局                                                            |
| src/shared/components/ui           | 通用 UI 原语；修改需考虑所有调用方                                            |
| src/shared/blocks                  | 跨页面业务展示组件，如 Logo、语言切换                                         |
| src/shared/services、models        | 服务编排、数据访问；先查找现有同类实现再扩展                                  |
| src/core                           | DB、Auth、i18n、主题等基础设施                                                |
| src/config/style                   | 所有独立 CSS/SCSS/CSS Module；theme.css 管理语义变量，global.css 管理基础样式 |
| src/config/locale/messages/{en,zh} | 导航、页面及通用翻译；对应命名空间保持语义一致                                |
| src/config/generation              | 生成参数选项常量（风格、视角、尺寸、动作等）；展示文案走 locale/messages/generation.json |
| src/config/db                      | schema 与迁移文件；遵循当前 D1/Drizzle 目录和编号                             |
| public/imgs/demo                   | 网站实际引用的自有静态资产；版本化命名，不引用工作区外生成路径                |
| docs/standards                     | 产品、目录、设计与验收标准                                                    |
| docs/skills                        | 本项目技能入口，通过根 AGENTS.md 指向                                         |

## 文件命名

源码、测试、主题区块和 i18n 消息文件用功能职责命名，不要用品牌名（SpritePixel、sprite-pixel、spritepixel）作为文件名。例如生成方向与画幅规则用 `sprite.ts`，模型路由用 `model-routes.ts`，工作台文案用 `workspace.json`，演示图用 `public/imgs/demo`。导出名称与主题区块 `block` 字段跟文件名一致。

产品文档、技能目录和 package.json 可以使用产品名。已应用的数据库迁移文件（如 `0001_sprite_assets.sql`）和默认项目 UUID 盐值保留历史标识，避免破坏已有数据。

## 样式策略

1. 新代码优先在 JSX 用 Tailwind 组合布局、间距、字体、颜色、状态、断点；使用 cn 组合条件类、复用现有 Button 等组件。
2. 不动态拼接 Tailwind 的部分 token（例如 bg-${color}），使用完整类名映射。
3. 复杂嵌套结构、动画关键帧或第三方覆盖确需独立 CSS 时，放在 src/config/style，并限定作用域。禁止在 themes/blocks 或 shared 目录新增样式文件。
4. 首页布局用 Tailwind 组合；颜色只使用 theme.css 语义变量。不再为首页维护独立 CSS Module。
5. 公共色值统一来源于 theme.css。Canvas 绘制可保留专用场景色板，但新增页面/按钮不得另建一套 primary/accent 定义。
6. 不为移动文件顺带修改无关业务、依赖、lockfile、CI 或部署配置。

## 组件与数据边界

- 默认 Server Component；交互、Canvas、浏览器 API 和 hooks 才使用 Client Component。
- 数据和权限在服务端校验；共享展示组件不直接持有 Provider 密钥或数据库连接。
- 长页面可拆成职责单一的组件；只有真实重复才提取抽象。
- 本地化路由使用 src/core/i18n/navigation，避免丢失中文路径。新增客户端翻译要核对消息提供范围。

## 文案与多语言

用户可见文案（标题、按钮、占位符、选项标签、FAQ、定价说明等）不得写在 `themes/blocks`、`shared/blocks` 或其他组件源码里。禁止组件内维护中英文字典，例如 `content = { en, zh }`、`isZh ? '中文' : 'English'`、硬编码中英对照数组。

- 展示文案统一放入 `src/config/locale/messages/{en,zh}` 对应命名空间，通过 `useTranslations` / `getTranslations` 读取；中英文键名保持一致。
- 选项 ID、默认值等非展示常量放 `src/config`（如 `src/config/generation`）；选项展示文案走 locale，不在组件里写死。
- Client Component 新增翻译命名空间时，同步登记 `src/core/i18n/client-messages.ts` 的 `CLIENT_MESSAGE_PATHS`。
- 仅路由前缀可用 `locale === 'zh'` 这类判断；不得用它切换文案。后期同类文案都按此实现。
- 数据变更要提供与当前 schema 匹配的迁移及用途说明。迁移文件存在不等于已应用，远程迁移必须单独获得授权。

## 提交前检查

- 检查 git diff，保留已有用户修改，不创建未经请求的提交。
- 格式检查仅覆盖改动文件；TypeScript 使用 pnpm exec tsc --noEmit；按需检查相关交互。
- 不默认运行全量 build；涉及路由、框架、部署、大幅改动或轻量检查发现构建问题时再执行。
- 检查样式引用路径与静态文件存在；UI 修改检查桌面、移动端、菜单打开、焦点和选中状态。
