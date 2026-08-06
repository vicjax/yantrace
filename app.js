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
import ResultToast from "./modules/ResultToast.js";
import { MENU_CONFIG } from "./config/menu.js";

import {
  getHomeHtml,
  getPracticeCnHtml,
  getPracticeEnHtml,
} from "./modules/PageTemplates.js";

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

    // ⭐ 结果模块
    // 替换 resultPresenter 为 resultToast
    this.resultToast = new ResultToast();
    this.resultToast.setCallbacks(
      () => this._onResultRestart(),
      (data) => {
        console.log("📊 查看详细数据:", data);
        // TODO: 调用数据分析模块
      },
    );

    // app.js _initModules()

    // 设置 Presenter
    this.settingsPresenter = new SettingsPresenter({
      settingsService: this.settingsService,
      userService: this.userService,
      // ⭐ 删除 onSettingsChanged 回调
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
      });
    }
    return this.historyPresenter;
  }

  _getSettingsPresenter() {
    if (!this.settingsPresenter) {
      this.settingsPresenter = new SettingsPresenter({
        settingsService: this.settingsService,
        userService: this.userService,
        // ⭐ 不再需要 onSettingsChanged
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

    // 直接调用 settingsPresenter 的 applySettings
    if (this.settingsPresenter) {
      this.settingsPresenter.applySettings(settings);
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
        html = getHomeHtml();
        break;
      case "practice-cn":
        html = getPracticeCnHtml();
        break;
      case "practice-en":
        html = getPracticeEnHtml();
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

    // 1. 保存历史（直接调用 historyService）
    const user = this.userService?.getCurrent();
    if (user) {
      this.historyService.addWithDedup(
        user.id,
        currentPage,
        articleTitle,
        stats,
      );
    }

    // 2. 显示弹窗
    if (this.resultToast) {
      this.resultToast.show(stats, currentPage, articleTitle);
    }
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
