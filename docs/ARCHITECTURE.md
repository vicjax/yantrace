# 砚迹（YanTrace）- 架构设计


## 页面

| 页面 | ID |
|------|-----|
| 首页 | page-home |
| 中文文章 | page-practice-cn |
| 英文文章 | page-practice-en |
| 中文词组 | page-practice-phrase-cn |
| 英文词组 | page-practice-phrase-en |
| 文章管理 | page-article |
| 历史记录 | page-history |
| 设置 | 弹窗 |
| 用户管理 | 下拉菜单 |


## 数据

| 结构 | 存储 Key |
|------|----------|
| 文章 | `yantrace_articles` |
| 词组 | `yantrace_phrases` |
| 用户 | `yantrace_users` |
| 历史记录 | `yantrace_history` |
| 设置 | `yantrace_settings` |


## 打字引擎
```
PracticeEngine（门面）
│
▼
PracticePresenter（业务协调）
│
├── PracticeState（状态）
├── StatsEngine（统计）
├── PracticeView（渲染）
├── TimerController（计时 → tick）
├── InputController（输入）
└── ContentFactory（策略工厂）
├── ArticleStrategy → ArticleModel
└── PhraseStrategy → PhraseModel
```

## 模块职责

| 模块                | 职责                       |
| ------------------- | -------------------------- |
| `PracticeEngine`    | 门面，对外接口             |
| `PracticePresenter` | 业务逻辑协调               |
| `PracticeState`     | 运行时状态管理             |
| `StatsEngine`       | 统计计算（纯函数）         |
| `PracticeView`      | DOM 渲染                   |
| `TimerController`   | 计时管理，发送 `tick` 事件 |
| `InputController`   | 输入处理 + 峰值采样        |
| `ContentStrategy`   | 内容策略接口               |
| `ArticleStrategy`   | 文章适配                   |
| `PhraseStrategy`    | 词组适配                   |
| `ContentFactory`    | 策略工厂                   |
| `ChineseStrategy`   | 中文输入策略               |
| `EnglishStrategy`   | 英文输入策略               |


## 模块间通信

| 方向                   | 方式     | 说明                                        |
| ---------------------- | -------- | ------------------------------------------- |
| Presenter → View       | 方法调用 | `view.renderChars()`                        |
| Presenter → Controller | 方法调用 | `timer.start()`                             |
| Controller → Presenter | 事件     | `timer.onTick()` → `_refreshStatsDisplay()` |
| Presenter → Strategy   | 接口调用 | `contentStrategy.getChars()`                |
| Strategy → Model       | 方法调用 | `phraseService.getById()`                   |


## 新增内容类型

1. `features/xxx/` 创建数据模型
2. `strategies/XxxStrategy.js` 实现 `ContentStrategy`
3. `ContentFactory` 注册新类型

## 目录结构

```
yantrace/
├── app.js
├── config/menu.js
├── features/
│ ├── article/
│ ├── phrase/
│ ├── records/
│ ├── settings/
│ └── user/
├── modules/
│ ├── Modal.js
│ ├── navigator.js
│ ├── PageTemplates.js
│ ├── ResultToast.js
│ └── practice/
│ ├── PracticeEngine.js
│ ├── core/
│ ├── model/
│ ├── view/
│ ├── controller/
│ ├── input/
│ └── strategies/
├── utils/
└── assets/
```

## 编码规范

详见 [README.md](./README.md#开发规范)