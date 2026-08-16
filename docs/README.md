# 砚迹（YanTrace）

> 本地运行、开箱即用的打字练习软件

## 项目简介

砚迹是一款纯前端、本地运行的中英文打字练习工具。打开浏览器即可使用，所有数据存储在本地，无需网络，无需安装，无广告。

## 功能概览

- 🀄 中文打字练习
- 🔤 英文打字练习
- 📄 文章管理
- 📊 历史记录
- ⚙️ 设置（弹窗）
- 👤 用户管理（下拉菜单）

## 技术栈

| 项目 | 选型                        |
| ---- | --------------------------- |
| 语言 | 原生 JavaScript (ES Module) |
| 样式 | 原生 CSS                    |
| 存储 | localStorage                |
| 框架 | 无                          |
| 依赖 | 无                          |

## 快速开始

### 方式一：VS Code Live Server（推荐）

1. 安装 Live Server 插件
2. 右键 `index.html` → Open with Live Server

### 方式二：直接打开

双击 `index.html` 用浏览器打开（部分功能可能受限）

## 数据存储

所有数据存储在浏览器 localStorage 中，不经过任何服务器。

| Key                 | 存储内容     |
| ------------------- | ------------ |
| `yantrace_articles` | 所有文章     |
| `yantrace_users`    | 所有用户     |
| `yantrace_history`  | 所有历史记录 |
| `yantrace_settings` | 所有用户设置 |

## 文档

- 详细设计：[ARCHITECTURE.md](./ARCHITECTURE.md)
- 版本状态：[CHANGELOG.md](./CHANGELOG.md)