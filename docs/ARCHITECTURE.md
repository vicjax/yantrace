# 砚迹（YanTrace）- 架构设计


## 一、页面设计

### 1.1 页面关系

````
首页（page-home）
│
├── 中文打字练习（page-practice-cn） ← 独立页面
├── 英文打字练习（page-practice-en） ← 独立页面
├── 文章管理（page-article） ← 独立页面
├── 历史记录（page-history） ← 独立页面
│
├── 设置 ← 弹窗（顶部栏齿轮触发）
└── 用户管理 ← 下拉菜单（顶部栏用户名触发）
````

### 1.2 页面清单

| 页面         | ID               | 说明                           | 状态       |
| ------------ | ---------------- | ------------------------------ | ---------- |
| 首页         | page-home        | 两个练习卡片 + 两个管理卡片    | ✅ 独立页面 |
| 中文打字练习 | page-practice-cn | 文章区 + 统计面板 + 进度条     | ✅ 独立页面 |
| 英文打字练习 | page-practice-en | 文章区 + 统计面板 + 进度条     | ✅ 独立页面 |
| 文章管理     | page-article     | 左侧列表 + 右侧内容 + 底部操作 | ✅ 独立页面 |
| 历史记录     | page-history     | 左侧列表 + 右侧详情            | ✅ 独立页面 |
| 设置         | -                | 弹窗                           | ✅ 弹窗     |
| 用户管理     | -                | 下拉菜单                       | ✅ 下拉菜单 |


## 二、数据设计

### 2.1 数据结构

**文章（Article）**

```json
{
  "id": "cn-1",
  "title": "荷塘月色",
  "content": "...",
  "type": "chinese" | "english"
}
```

**用户（User）**

```json
{
  "id": "user-xxx",
  "name": "张三",
  "createdAt": 1234567890
}
```

**历史记录（History）**

```json
{
  "id": "rec-xxx",
  "userId": "user-xxx",
  "mode": "practice-cn" | "practice-en",
  "articleTitle": "荷塘月色",
  "stats": {
    "correct": 180,
    "errors": 15,
    "fixed": 3,
    "backspaces": 8,
    "keystrokes": 260,
    "elapsed": 240
  },
  "createdAt": 1234567890
}
```

**设置（Settings）**

```json
{
  "userId": "user-xxx",
  "fontSize": 22,
  "pageHeight": 550,
  "theme": "dark",
  "sound": "off"
}
```

### 2.2 localStorage Key

| Key               | 存储内容     |
| :---------------- | :----------- |
| yantrace_articles | 所有文章     |
| yantrace_users    | 所有用户     |
| yantrace_history  | 所有历史记录 |
| yantrace_settings | 所有用户设置 |

### 2.3 数据关系

```text
用户（User）
│
├── 设置（Settings）─── 强依赖（1:1）
│
├── 历史记录（History）─── 强依赖（1:N）
│   │
│   └── 文章（Article）─── 弱关联（通过 articleId）
│
└── 文章（Article）─── 全局共享
```

## 三、模块设计

### 3.1 导航模块

**职责**：页面切换（首页 ↔ 各功能页面）

**流程图**：

```text
用户点击按钮 / 调用 goTo
    │
    ▼
navigator.goTo(pageId)
    │
    ├── 检查页面是否存在
    ├── 隐藏所有页面（移除 active 类）
    ├── 显示目标页面（添加 active 类）
    ├── 更新 currentPage
    ├── 触发 onPageChange 回调
    └── 返回 true
```

**页面切换回调**（app.js）：

```text
onPageChange(pageId)
    │
    ├── 离开当前页面（_leavePage）
    │   ├── 练习页 → practiceEngine.leave()
    │   └── 文章管理 → articlePresenter.destroy()
    │
    └── 进入目标页面（_enterPage）
        ├── 练习页 → practiceEngine.enter()
        ├── 文章管理 → articlePresenter.render()
        └── 历史记录 → recordsPresenter.render()
```

### 3.2 打字引擎

**职责**：管理打字练习的核心逻辑（状态管理、统计计算、流程控制）

**核心状态**：

| 属性                     | 说明                             |
| :----------------------- | :------------------------------- |
| chars                    | 字符数组，含 status 和 keepColor |
| correct / errors / fixed | 正确/错误/改正计数               |
| backspaces / keystrokes  | 退格/击键计数                    |
| startTime                | 开始时间戳                       |
| isFinished               | 是否完成                         |
| currentCharIndex         | 当前字符索引                     |
| currentMode              | 'chinese' 或 'english'           |

**字符状态**：

| 状态    | 颜色 | 说明       |
| :------ | :--- | :--------- |
| PENDING | 默认 | 未输入     |
| CORRECT | 绿色 | 第一次输对 |
| ERROR   | 红色 | 输错       |
| FIXED   | 黄色 | 错误后改正 |

**状态流转**：

````text
输入正确：
  PENDING → CORRECT
  ERROR → FIXED
  FIXED → FIXED（保持）
  CORRECT → CORRECT（保持）

输入错误：
  PENDING → ERROR
  CORRECT → ERROR
  FIXED → ERROR
  ERROR → ERROR（保持）

退格：
  任何状态 → PENDING（保留颜色标记）
````

**输入策略**：

| 模式 | 策略            | 输入方式                          |
| :--- | :-------------- | :-------------------------------- |
| 中文 | ChineseStrategy | compositionstart/end + 浮动输入框 |
| 英文 | EnglishStrategy | keydown 直接监听                  |

**计时器管理**：

```text
首次按键 → _startTimer()
    │
    ├── 启动计时器
    └── 每秒刷新统计

失焦/切标签页/点击外部 → _stopTimer()
    │
    ├── 暂停计时
    └── 保存累计时间

恢复 → 继续计时（累计）
```

**统计指标**：

| 指标   | 中文   | 英文   | 说明                  |
| :----- | :----- | :----- | :-------------------- |
| 速度   | CPM    | WPM    | 正确字符/分钟         |
| 净速度 | netCPM | netWPM | 速度 × 准确率         |
| KPM    | KPM    | KPM    | 击键/分钟             |
| KSPC   | KSPC   | KSPC   | 击键/正确字符         |
| 准确率 | %      | %      | 正确/(正确+错误+改正) |
| 峰值   | ⚡      | ⚡      | 净速度峰值            |

**音效**（v0.6.0 新增）：

| 设置值   | 说明     |
| :------- | :------- |
| off      | 关闭     |
| clicky   | 青轴     |
| tactile  | 茶轴     |
| speed    | 银轴     |
| silent   | 静音红轴 |
| membrane | 薄膜     |

### 3.3 文章管理（含录入功能）

**职责**：文章的增删改查，包含录入功能

**流程图**：

```text
加载文章
    │
    ▼
articleService.loadAll()
    │
    ├── 检查 _loaded
    │   ├── 已加载 → 直接返回
    │   └── 未加载 → 从 localStorage 读取
    │       ├── 有数据 → 使用读取数据
    │       └── 无数据 → 使用内置默认文章
    │
    └── 保存到 localStorage
```

```text
创建文章
    │
    ▼
articleService.create(title, content, type)
    │
    ├── 生成 ID
    ├── 构造文章对象
    ├── 推入 this.articles
    └── 保存到 localStorage
```

```text
删除文章
    │
    ▼
articleService.delete(id)
    │
    ├── 查找文章索引
    ├── 从数组中移除
    └── 保存到 localStorage
```

### 3.4 用户管理

**职责**：用户的增删改查、切换（下拉菜单 + 弹窗交互）

**流程图**：

```text
创建用户
    │
    ▼
userService.create(name)
    │
    ├── 校验：名称不能为空
    ├── 校验：不能有同名用户
    ├── 生成 ID
    ├── 构造用户对象
    ├── 推入 this.users
    ├── 保存到 localStorage
    └── 自动设为当前用户（v0.7.0 新增）
```

```text
切换用户
    │
    ▼
userService.setCurrent(userId)
    │
    ├── 根据 id 查找用户
    ├── 不存在 → 返回 false
    └── 存在 → 更新 currentUserId + 保存
```

```text
删除用户
    │
    ▼
userService.delete(id)
    │
    ├── 检查用户总数（至少保留一个）
    ├── 检查是否有历史记录（v0.7.0 新增）
    │   ├── 有 → 提示"请先清空历史记录"
    │   └── 无 → 继续删除
    ├── 从数组中移除用户
    ├── 保存到 localStorage
    └── 如果删除的是当前用户 → 切换到第一个
```

### 3.5 历史记录

**职责**：历史记录的查看、导出、清空、单条删除

**流程图**：

```text
加载历史记录
    │
    ▼
historyService.getRecentByUser(userId, limit=50)
    │
    ├── 获取该用户所有记录
    ├── 按时间降序排序
    └── 截取前 50 条
```

```text
渲染历史记录
    │
    ▼
RecordsView.render(records, selectedId)
    │
    ├── 左侧列表：显示所有记录
    │   ├── 文章标题
    │   ├── 速度
    │   └── 日期
    │
    └── 右侧详情：显示选中记录
        ├── 速度（主指标）
        ├── 准确率、KPM、峰值
        ├── 基础指标（正确/错误/改正/退格/击键/用时）
        ├── 效率指标（KSPC/退格率/净击键）
        └── 近10次对比
```

````text
导出 CSV
    │
    ▼
historyService.exportCSV(userId)
    │
    ├── 获取该用户所有记录
    ├── 格式化为 CSV
    └── 下载文件
````

### 3.6 设置

**职责**：用户偏好设置（弹窗交互）

**设置项**：

| 设置项   | 控件     | 默认值 | 说明                                        |
| :------- | :------- | :----- | :------------------------------------------ |
| 主题     | 按钮切换 | dark   | 暗色 / 亮色                                 |
| 字体大小 | 滑块     | 22px   | 14-36px                                     |
| 页面高度 | 滑块     | 550px  | 400-800px                                   |
| 按键音效 | 下拉选择 | off    | 关闭 / 青轴 / 茶轴 / 银轴 / 静音红轴 / 薄膜 |

**流程图**：

```text
打开设置弹窗
    │
    ▼
settingsService.get(userId)
    │
    ├── 加载所有设置
    ├── 获取该用户设置
    └── 合并默认设置 + 用户设置
```

```text
保存设置
    │
    ▼
settingsService.update(userId, updates)
    │
    ├── 加载所有设置
    ├── 初始化用户设置（若不存在）
    ├── 合并更新
    ├── 保存到 localStorage
    └── 应用到页面（applySettings）
```

```
恢复默认
    │
    ▼
settingsService.reset(userId)
    │
    ├── 重置为 DEFAULT_SETTINGS
    ├── 保存到 localStorage
    └── 应用到页面
```

### 3.7 结果管理

**职责**：练习完成后显示结果弹窗，自动保存历史

**流程图**：

````
练习完成 → resultManager.show(stats, mode, articleTitle)
    │
    ├── 保存历史
    │   ├── 获取当前用户
    │   ├── 去重检查
    │   └── historyService.add()
    │
    ├── 设置弹窗标题
    │   ├── 中文 → '🎉 中文练习完成！'
    │   └── 英文 → '🎉 English Practice Complete!'
    │
    ├── 设置主速度
    │   ├── 中文 → CPM
    │   └── 英文 → WPM
    │
    ├── 构建统计网格（3×3）
    │   ├── 速度 | 净速度 | KPM
    │   ├── 正确率 | 退格率 | 用时
    │   └── KSPC | 正确数 | 错误数
    │
    └── 显示弹窗
````

**弹窗按钮**：

| 按钮           | 行为                         |
| :------------- | :--------------------------- |
| 🔄 再来一次     | 重新加载当前文章             |
| 📊 查看详细数据 | 跳转到历史记录并选中当前记录 |
| 🏠 返回首页     | 回到首页                     |

## 四、技术架构

### 4.1 目录结构

```
yantrace/
├── app.js                    # 主应用入口（Controller）
├── index.html                # 入口页面
├── style.css                 # 全局样式
│
├── core/
│   └── BasePresenter.js      # Presenter 基类
│
├── config/
│   └── menu.js               # 首页菜单配置
│
├── features/                 # 功能模块（MVP）
│   ├── article/              # 文章管理
│   │   ├── ArticleModel.js
│   │   ├── ArticlePresenter.js
│   │   └── ArticleView.js
│   ├── records/              # 历史记录
│   │   ├── RecordsModel.js
│   │   ├── RecordsPresenter.js
│   │   └── RecordsView.js
│   ├── settings/             # 设置
│   │   ├── SettingsModel.js
│   │   ├── SettingsPresenter.js
│   │   └── SettingsView.js
│   └── user/                 # 用户管理
│       ├── UserModel.js
│       ├── UserPresenter.js
│       └── UserView.js
│
├── modules/                  # 核心模块
│   ├── navigator.js          # 导航
│   ├── PageTemplates.js      # 页面模板
│   ├── ResultToast.js        # 结果弹窗
│   └── practice/             # 打字引擎
│       ├── PracticeEngine.js
│       ├── ChineseStrategy.js
│       └── EnglishStrategy.js
│
├── utils/                    # 工具层
│   ├── helpers.js            # 通用工具
│   ├── stats.js              # 统计计算
│   └── storage.js            # localStorage 封装
│
├── assets/
│   └── sounds/               # 音效文件
│       ├── clicky.mp3
│       ├── tactile.mp3
│       ├── speed.mp3
│       ├── silent.mp3
│       └── membrane.mp3
│
└── docs/                     # 文档
    ├── README.md
    ├── ARCHITECTURE.md
    └── CHANGELOG.md
```

### 4.2 MVP 分层

| 层级       | 职责                   | 位置                    |
| :--------- | :--------------------- | :---------------------- |
| View       | 纯 DOM 渲染，事件转发  | features/*/View.js      |
| Presenter  | 业务逻辑，协调 M 和 V  | features/*/Presenter.js |
| Model      | 数据读写，localStorage | features/*/Model.js     |
| Controller | 路由协调，模块注册     | app.js                  |

### 4.3 数据流向

```
用户输入 → 策略层 → 引擎层 → 统计 → 完成弹窗 → 保存历史 → localStorage
```

### 4.4 模块依赖

```
app.js
  │
  ├── navigator.js（无依赖）
  │
  ├── practice/
  │   ├── PracticeEngine.js → article.js, stats.js
  │   ├── ChineseStrategy.js → PracticeEngine
  │   └── EnglishStrategy.js → PracticeEngine
  │
  ├── ResultToast.js → history.js, user.js
  │
  ├── features/article/ → storage.js
  ├── features/user/ → storage.js
  ├── features/records/ → storage.js
  ├── features/settings/ → storage.js
  │
  └── stats.js（无依赖）
```

## 五、编码规范

| 规范   | 说明                                           | 示例             |
| :----- | :--------------------------------------------- | :--------------- |
| 文件名 | 小写                                           | `practice.js`    |
| 类名   | PascalCase                                     | `PracticeEngine` |
| 函数名 | camelCase                                      | `getArticles()`  |
| 常量   | UPPER_SNAKE_CASE                               | `STORAGE_KEY`    |
| 注释   | 每个文件顶部说明职责，关键函数写注释           |                  |
| 导出   | 每个模块 export default 主类，工具函数具名导出 |                  |