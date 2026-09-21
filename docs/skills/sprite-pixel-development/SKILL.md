---
name: sprite-pixel-development
description: Apply SpritePixel product scope, directory conventions and UI standards when implementing project features, navigation, game-asset workflows or styles in this repository.
---

# SpritePixel development

本技能仅约束 SpritePixel 项目开发，按当前用户需求选择相关标准，不扩大任务或自动部署。

- 开始功能前读取 [project-brief.md](../../standards/project-brief.md)，确认用户任务、P0/P1 与演示/业务边界。
- 修改文件前读取 [directory-standard.md](../../standards/directory-standard.md)，按现有架构落位，样式优先 Tailwind，独立样式只在 src/config/style。源码、测试和主题区块文件名用功能职责，不用品牌名。用户可见文案走 locale 消息文件，不在组件内维护中英文字典。
- 涉及 UI 时读取 [ui-ux-design-system.md](../../standards/ui-ux-design-system.md)，沿用颜色职责、直角与纵向标题层级。
- 如遇尚未覆盖的业务细节，查阅 [产品文档 V1.2](../../SpritePixel产品开发文档V1.2.md) 相应章节。推荐技术栈不覆盖仓库实际技术选择。
- 用户明确的新要求优先；调整标准时同步修正相关映射，不改变不相关产品决策。
- 交付说明实现范围与已执行验证。首页动画不等于真实异步生成/存储，迁移脚本不等于已执行迁移。
