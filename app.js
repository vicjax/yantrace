/**
 * 砚迹（YanTrace）- 主应用入口
 * 职责：初始化所有模块，启动应用
 */

// ============================================
// 模块导入
// ============================================

import Storage from "./utils/storage.js";
import * as Helpers from "./utils/helpers.js";

import Navigator from "./modules/navigator.js";
import PracticeEngine from "./modules/practice/index.js";
import ResultManager from "./modules/result.js";
import DataDisplay from "./modules/DataDisplay.js";

// Model 层
import { Model as UserModel } from "./features/user/index.js";
import { Model as ArticleModel } from "./features/article/index.js";
import { Model as HistoryModel } from "./features/history/index.js";
import { Model as SettingsModel } from "./features/settings/index.js";

// Presenter 层
import UserPresenter from "./features/user/index.js";
import ArticlePresenter from "./features/article/index.js";
import HistoryPresenter from "./features/history/index.js";
import SettingsPresenter from "./features/settings/index.js";

// ============================================
// 应用类
// ============================================

class App {
  constructor() {
    // 服务实例（按需初始化）
    this.articleService = null;
    this.userService = null;
    this.historyService = null;
    this.settingsService = null;

    // 功能模块实例（按需初始化）
    this.navigator = null;
    this.practiceEngine = null;
    this.resultManager = null;
    this.dataDisplay = null;

    // Presenter 实例（按需初始化）
    this.userPresenter = null;
    this.articlePresenter = null;
    this.historyPresenter = null;
    this.settingsPresenter = null;

    // 状态
    this.currentUser = null;
    this.isInitialized = false;
    this.currentPageId = "home";
  }

  // ============================================
  // 初始化
  // ============================================

  async init() {
    if (this.isInitialized) return;

    console.log("🖊️ 砚迹（YanTrace）启动中...");

    this._initStorage();
    this._initServices();
    this._initModules();
    this._initDefaultData();
    this._bindEvents();

    this._applyUserSettings();
    this._renderPage("home");

    this.isInitialized = true;
    console.log("✅ 砚迹（YanTrace）启动完成");
  }

  // ============================================
  // 存储与数据
  // ============================================

  _initStorage() {
    if (!Storage.isAvailable()) {
      alert("⚠️ localStorage 不可用，请检查浏览器设置");
      throw new Error("localStorage is not available");
    }
    console.log("📦 存储初始化完成");
  }

  _initServices() {
    this.articleService = new ArticleModel();
    this.userService = new UserModel();
    this.historyService = new HistoryModel();
    this.settingsService = new SettingsModel();
    console.log("📚 服务层初始化完成");
  }

  _initDefaultData() {
    const users = this.userService.getAll();
    if (users.length === 0) {
      this.userService.create("砚客");
      console.log("👤 创建默认用户：砚客");
    }

    const articles = this.articleService.getAll();
    if (articles.length === 0) {
      this.articleService.loadAll();
      console.log("📄 加载内置文章");
    }

    this.currentUser = this.userService.getCurrent();
    if (!this.currentUser) {
      this.currentUser = this.userService.getFirst();
    }

    console.log("📦 默认数据初始化完成");
  }

  // ============================================
  // 功能模块
  // ============================================

  _initModules() {
    // 导航（立即初始化，所有页面都需要）
    this.navigator = new Navigator({
      onPageChange: (pageId) => this._onPageChange(pageId),
    });

    // 打字引擎（立即初始化，但内部按需加载）
    this.practiceEngine = new PracticeEngine({
      articleService: this.articleService,
      onComplete: (stats) => this._onPracticeComplete(stats),
      getSettings: () => this._getCurrentSettings(),
    });

    // ⭐ 创建全局唯一的 DataDisplay
    this.dataDisplay = new DataDisplay();
    this.dataDisplay.onRestart(() => this._onResultRestart());

    // ⭐ 注入 dataDisplay 到 ResultManager
    this.resultManager = new ResultManager({
      historyService: this.historyService,
      userService: this.userService,
      onRestart: () => this._onResultRestart(),
      dataDisplay: this.dataDisplay, // 依赖注入
    });
    console.log("🧩 功能模块初始化完成");
  }

  // ============================================
  // Presenter 工厂方法（按需创建）
  // ============================================

  _getUserPresenter() {
    if (!this.userPresenter) {
      this.userPresenter = new UserPresenter({
        userService: this.userService,
        settingsService: this.settingsService,
        onUserChanged: () => {
          this.currentUser = this.userService.getCurrent();
          this.userPresenter?.updateTopbar();
        },
      });
    }
    return this.userPresenter;
  }

  _getArticlePresenter() {
    if (!this.articlePresenter) {
      this.articlePresenter = new ArticlePresenter({
        articleService: this.articleService,
        historyService: this.historyService,
        userService: this.userService,
      });
    }
    return this.articlePresenter;
  }

  _getHistoryPresenter() {
    if (!this.historyPresenter) {
      this.historyPresenter = new HistoryPresenter({
        historyService: this.historyService,
        userService: this.userService,
        dataDisplay: this.dataDisplay, // ⭐ 注入
      });
    }
    return this.historyPresenter;
  }

  _getSettingsPresenter() {
    if (!this.settingsPresenter) {
      this.settingsPresenter = new SettingsPresenter({
        settingsService: this.settingsService,
        userService: this.userService,
        onSettingsChanged: (settings) => {
          this._applySettings(settings);
        },
      });
    }
    return this.settingsPresenter;
  }

  // ============================================
  // 设置管理
  // ============================================

  _getCurrentSettings() {
    if (!this.currentUser) return null;
    return this.settingsService.get(this.currentUser.id);
  }

  _applyUserSettings() {
    const settings = this._getCurrentSettings();
    if (!settings) return;
    this._applySettings(settings);
  }

  _applySettings(settings) {
    const fontSize = settings.fontSize || 22;
    const pageHeight = settings.pageHeight || 550;
    const theme = settings.theme || "dark";

    document.documentElement.style.setProperty("--font-size", fontSize + "px");

    const fixedHeight = 166;
    const textBoxHeight = Math.max(pageHeight - fixedHeight, 200);

    document.querySelectorAll(".text-box").forEach((el) => {
      el.style.fontSize = fontSize + "px";
      el.style.minHeight = textBoxHeight + "px";
      el.style.maxHeight = textBoxHeight + "px";

      const pinyinSize = Math.max(fontSize - 4, 12);
      const lineSpacing = pinyinSize + 2;
      const lineHeight = fontSize + lineSpacing;
      el.style.lineHeight = lineHeight / fontSize;
    });

    const container = document.querySelector(".page-container");
    if (container) {
      container.style.minHeight = pageHeight + "px";
    }

    const isLight = theme === "light";
    document.body.classList.toggle("light-theme", isLight);

    this._refreshCurrentPage();
  }

  _refreshCurrentPage() {
    const pageId = this.currentPageId;
    if (!pageId || pageId === "home") return;

    if (pageId === "practice-cn" || pageId === "practice-en") {
      const type = pageId === "practice-cn" ? "chinese" : "english";
      this.practiceEngine?.refresh(type);
    }
  }

  // ============================================
  // 渲染引擎
  // ============================================

  _renderPage(pageId) {
    const container = document.getElementById("pageContainer");
    if (!container) return;

    let html = "";

    switch (pageId) {
      case "home":
        html = this._getHomeHtml();
        break;
      case "practice-cn":
        html = this._getPracticeCnHtml();
        break;
      case "practice-en":
        html = this._getPracticeEnHtml();
        break;
      case "user":
      case "history":
      case "article-management":
      case "settings":
        html = "";
        break;
      default:
        html = '<p class="placeholder">页面不存在</p>';
    }

    container.innerHTML = html;

    this._applyUserSettings();
    this._bindPageEvents(pageId);
    this.currentPageId = pageId;
  }

  // ============================================
  // 页面 HTML 生成（保持不变）
  // ============================================

  _getHomeHtml() {
    const config = this._getMenuConfig();
    let html = "";

    config.sections.forEach((section) => {
      const sectionClass =
        section.id === "practice"
          ? "home-section-practice"
          : "home-section-management";
      html += `<div class="home-section ${sectionClass}">`;
      html += `<div class="home-section-title">${section.title}</div>`;
      html += `<div class="home-grid">`;

      section.items.forEach((item) => {
        const descHtml = item.desc
          ? `<span class="home-btn-desc">${item.desc}</span>`
          : "";
        html += `
                    <button class="home-btn" data-target="${item.id}">
                        <span class="home-btn-icon">${item.icon}</span>
                        <span class="home-btn-label">${item.label}</span>
                        ${descHtml}
                    </button>
                `;
      });

      html += `</div></div>`;
    });

    return html;
  }

  _getPracticeCnHtml() {
    return `
            <div class="mode-header">
                <button class="back-btn" data-target="home">← 返回</button>
                <h2>🀄 中文打字练习</h2>
                <select id="cnArticleSelect" class="article-select"></select>
                <button class="reset-btn" id="cnResetBtn">⟳ 重新开始</button>
            </div>

            <div class="stats-bar" id="cnStatsBar">
                <span>CPM⚡<b id="cnCpm">0</b></span>
                <span>KPM⌨️<b id="cnKpm">0</b></span>
                <span>KSPC📊<b id="cnKspc">0</b></span>
                <span>准确率🎯<b id="cnAccuracy">100</b>%</span>
                <span>字数📝<b id="cnProgressChars">0</b>/<b id="cnTotalChars">0</b></span>
                <span>用时⏱<b id="cnTimer">00:00</b></span>
                <span>峰值⚡<b id="cnPeakSpeed">0</b></span>
            </div>

            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="cnProgressFill" style="width:0%"></div>
                </div>
                <span class="progress-text" id="cnProgressText">0%</span>
            </div>

            <div class="text-box" id="cnTextBox">
                <span class="placeholder">选择一篇文章开始练习</span>
            </div>
        `;
  }

  _getPracticeEnHtml() {
    return `
            <div class="mode-header">
                <button class="back-btn" data-target="home">← 返回</button>
                <h2>🔤 英文打字练习</h2>
                <select id="enArticleSelect" class="article-select"></select>
                <button class="reset-btn" id="enResetBtn">⟳ 重新开始</button>
            </div>

            <div class="stats-bar" id="enStatsBar">
                <span>WPM⚡<b id="enWpm">0</b></span>
                <span>KPM⌨️<b id="enKpm">0</b></span>
                <span>KSPC📊<b id="enKspc">0</b></span>
                <span>准确率🎯<b id="enAccuracy">100</b>%</span>
                <span>字数📝<b id="enProgressChars">0</b>/<b id="enTotalChars">0</b></span>
                <span>用时⏱<b id="enTimer">00:00</b></span>
                <span>峰值⚡<b id="enPeakSpeed">0</b></span>
            </div>

            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="enProgressFill" style="width:0%"></div>
                </div>
                <span class="progress-text" id="enProgressText">0%</span>
            </div>

            <div class="text-box" id="enTextBox">
                <span class="placeholder">选择一篇文章开始练习</span>
            </div>
        `;
  }

  _getMenuConfig() {
    return {
      sections: [
        {
          id: "practice",
          title: "🎯 练习",
          items: [
            {
              id: "practice-cn",
              icon: "🀄",
              label: "中文练习",
              desc: "开始打字",
            },
            {
              id: "practice-en",
              icon: "🔤",
              label: "英文练习",
              desc: "Start Typing",
            },
          ],
        },
        {
          id: "management",
          title: "📂 管理",
          items: [
            { id: "article-management", icon: "📄", label: "文章管理" },
            { id: "user", icon: "👤", label: "用户管理" },
            { id: "history", icon: "📊", label: "历史记录" },
            { id: "settings", icon: "⚙️", label: "设置" },
          ],
        },
      ],
    };
  }

  // ============================================
  // 页面事件绑定
  // ============================================

  _bindPageEvents(pageId) {
    document.querySelectorAll(".back-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        if (target && this.navigator) {
          this.navigator.goTo(target);
        }
      });
    });

    if (pageId === "home") {
      document.querySelectorAll(".home-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = btn.dataset.target;
          if (target && this.navigator) {
            this.navigator.goTo(target);
          }
        });
      });
    }

    if (pageId === "practice-cn" || pageId === "practice-en") {
      const resetBtn = document.getElementById(
        pageId === "practice-cn" ? "cnResetBtn" : "enResetBtn",
      );
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          const type = pageId === "practice-cn" ? "chinese" : "english";
          this.practiceEngine?.reset(type);
        });
      }
    }
  }

  // ============================================
  // 全局事件
  // ============================================

  _bindEvents() {
    // 空方法，保留接口
  }

  // ============================================
  // 页面生命周期
  // ============================================

  _onPageChange(pageId) {
    const currentPage = this.currentPageId;
    this._leavePage(currentPage);
    this._renderPage(pageId);
    this._enterPage(pageId);
  }

  _leavePage(pageId) {
    if (pageId === "practice-cn" || pageId === "practice-en") {
      this.practiceEngine?.leave(pageId);
    }
    if (pageId === "article-management") {
      this._getArticlePresenter()?.destroy();
    }
    if (pageId === "history") {
      this._getHistoryPresenter()?.destroy();
    }
    if (pageId === "settings") {
      this._getSettingsPresenter()?.destroy();
    }
  }

  _enterPage(pageId) {
    const container = document.getElementById("pageContainer");
    if (!container) return;

    if (pageId === "practice-cn" || pageId === "practice-en") {
      this.practiceEngine?.enter(pageId);
    } else if (pageId === "user") {
      this._getUserPresenter()?.render(container);
    } else if (pageId === "settings") {
      this._getSettingsPresenter()?.render(container);
    } else if (pageId === "article-management") {
      this._getArticlePresenter()?.render(container);
    } else if (pageId === "history") {
      this._getHistoryPresenter()?.render(container);
    }
  }

  // ============================================
  // 练习完成
  // ============================================

  _onPracticeComplete(stats) {
    const currentPage = this.currentPageId || "practice-cn";
    const articleTitle = this.practiceEngine?.currentArticleTitle || "";

    // 先初始化 ResultManager（如果还没初始化）
    if (!this.resultManager) {
      this.resultManager = new ResultManager({
        historyService: this.historyService,
        userService: this.userService,
        onRestart: () => this._onResultRestart(),
      });
    }

    this.resultManager.show(stats, currentPage, articleTitle);
  }

  _onResultRestart() {
    const currentPage = this.currentPageId;
    if (currentPage === "practice-cn" || currentPage === "practice-en") {
      const type = currentPage === "practice-cn" ? "chinese" : "english";
      this.practiceEngine.loadFirstArticle(type);
    }
  }
}

// ============================================
// 启动
// ============================================

const app = new App();
app.init();

window.app = app;

console.log("🖊️ 砚迹（YanTrace）已加载");
