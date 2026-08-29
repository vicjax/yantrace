# 砚迹（YanTrace）

本地运行、零依赖的打字练习工具。


## 功能

- 文章练习（中文·英文）
- 词组练习（中文·英文）
- 文章管理 · 历史记录
- 多主题 · 音效 · 多用户


## 技术栈

原生 JavaScript (ES Module) · CSS 模块化 · localStorage · 零依赖


## 快速开始

Live Server → `index.html`


## 数据存储

| Key | 内容 |
|-----|------|
| `yantrace_articles` | 文章 |
| `yantrace_phrases` | 词组 |
| `yantrace_users` | 用户 |
| `yantrace_history` | 历史 |
| `yantrace_settings` | 设置 |


## 开发规范

### 命名
| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | 小写 | `practice.js` |
| 类名 | PascalCase | `PracticeEngine` |
| 方法/函数 | camelCase | `getArticles()` |
| 常量 | UPPER_SNAKE_CASE | `STORAGE_KEY` |
| 导出 | 主类默认导出，工具函数具名导出 | `export default` / `export function` |

### 模板与 DOM
- 所有练习页面共用模板，通过参数区分
- DOM ID 统一不加前缀

### 模块通信
- 模块间通过事件或接口通信，不直接操作内部状态
- 新增内容类型走策略模式，不改引擎核心


## 文档

- [架构设计](./ARCHITECTURE.md)
- [版本状态](./CHANGELOG.md)