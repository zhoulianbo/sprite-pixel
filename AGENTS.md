# SpritePixel 项目开发约定

本项目后续开发先读取 [项目开发技能](docs/skills/sprite-pixel-development/SKILL.md)，并按任务范围读取：

- [项目简报](docs/standards/project-brief.md)：定位、范围、业务边界和导航路由。
- [目录标准](docs/standards/directory-standard.md)：文件归属、样式与组件开发约定。
- [UI / UX 设计系统](docs/standards/ui-ux-design-system.md)：颜色、直角、布局、导航状态与验证。

用户当前明确指令优先。保留已有修改和项目架构，最小化改动；使用 pnpm，不顺带修改依赖、锁文件、部署配置或 Git 历史。

样式优先 Tailwind 类组合；独立样式文件只能放 src/config/style，不在页面区块旁新增 CSS Module。用户可见文案统一放 `src/config/locale/messages/{en,zh}`，不在组件里写死中英文。普通功能不默认执行全量 build，优先相关轻量验证；如验证受阻，明确报告。
