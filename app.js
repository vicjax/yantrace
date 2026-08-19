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
import Modal from "./modules/Modal.js";

import {
  getHomeHtml,
  getPracticeCnHtml,
  getPracticeEnHtml,
} from "./modules/PageTemplates.js";

// Model 层
import { ArticleModel } from "./features/article/index.js";
import { UserModel } from "./features/user/index.js";
import { SettingsModel } from "./features/settings/index.js";
import { RecordsModel } from "./features/records/index.js";

// Presenter 层
import UserPresenter from "./features/user/index.js";
import ArticlePresenter from "./features/article/index.js";
import SettingsPresenter from "./features/settings/index.js";
import RecordsPresenter from "./features/records/index.js";

// ============================================
// 应用类
// ============================================

class App {
  constructor() {
    // 服务实例
    this.articleService = null;
    this.userService = null;
    this.historyService = null;
    this.settingsService = null;

    // 功能模块实例
    this.navigator = null;
    this.practiceEngine = null;

    // Presenter 实例
    this.userPresenter = null;
    this.articlePresenter = null;
    this.settingsPresenter = null;
    this.recordsPresenter = null;

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

    this._bindBackButtons();

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
      Modal.alert('localStorage 不可用，请检查浏览器设置', '⚠️ 存储错误');
      throw new Error("localStorage is not available");
    }
    console.log("📦 存储初始化完成");
  }

  _initServices() {
    this.articleService = new ArticleModel();
    this.userService = new UserModel();
    this.historyService = new RecordsModel();
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
    // 导航
    this.navigator = new Navigator({
      onPageChange: (pageId) => this._onPageChange(pageId),
    });

    // 打字引擎
    this.practiceEngine = new PracticeEngine({
      articleService: this.articleService,
      onComplete: (stats) => this._onPracticeComplete(stats),
      getSettings: () => this._getCurrentSettings(),
    });

    // 完成弹窗
    this.resultToast = new ResultToast();
    this.resultToast.setCallbacks(
      () => this._onResultRestart(),
      (data) => {
        this.navigator.goTo("history");
        setTimeout(() => {
          const user = this.userService?.getCurrent();
          if (user && this.recordsPresenter) {
            const records = this.historyService.getRecentByUser(user.id, 1);
            if (records && records.length > 0) {
              this.recordsPresenter.refresh(records[0].id);
            }
          }
        }, 100);
      },
    );

    // 设置 Presenter
    this.settingsPresenter = new SettingsPresenter({
      settingsService: this.settingsService,
      userService: this.userService,
    });

    // 用户管理 Presenter
    this.userPresenter = new UserPresenter({
      userService: this.userService,
      settingsService: this.settingsService,
      historyService: this.historyService,
      onUserChanged: () => {},
    });
    this.userPresenter.updateTopbar();
    this.userPresenter.setCurrentPage("home");

    // 记录 Presenter（历史记录 + 数据分析合并）
    this.recordsPresenter = new RecordsPresenter({
      historyService: this.historyService,
      userService: this.userService,
      onBack: () => {
        this.navigator.goTo("home");
      },
    });

    console.log("🧩 功能模块初始化完成");
  }

  // ============================================
  // Presenter 工厂方法
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

  _getSettingsPresenter() {
    if (!this.settingsPresenter) {
      this.settingsPresenter = new SettingsPresenter({
        settingsService: this.settingsService,
        userService: this.userService,
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
    // 首页按钮
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
      // 重置按钮
      const resetBtn = document.getElementById(
        pageId === "practice-cn" ? "cnResetBtn" : "enResetBtn",
      );
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          const type = pageId === "practice-cn" ? "chinese" : "english";
          this.practiceEngine?.reset(type);
        });
      }

      // 停止按钮
      const stopBtn = document.getElementById(
        pageId === "practice-cn" ? "cnStopBtn" : "enStopBtn",
      );
      if (stopBtn) {
        stopBtn.addEventListener("click", () => {
          if (this.practiceEngine?.isFinished) return;
          if (!this.practiceEngine?.startTime) return;
          this.practiceEngine?.stopPractice();
          stopBtn.blur();
        });
      }

      // 限时模式下拉选择
      const timeSelect = document.getElementById(
        pageId === "practice-cn" ? "cnTimeLimitSelect" : "enTimeLimitSelect",
      );
      if (timeSelect) {
        timeSelect.addEventListener("change", () => {
          const seconds = parseInt(timeSelect.value) || 0;
          const currentMode = this.practiceEngine?.currentMode || "chinese";
          this.practiceEngine?.setTimeLimit(seconds);
          this.practiceEngine?.reset(currentMode);
          const user = this.userService?.getCurrent();
          if (user) {
            this.settingsService?.setItem(user.id, "timeLimit", seconds);
          }
        });
      }
    }
  }

  // ============================================
  // 全局事件
  // ============================================

  _bindEvents() {
    // 设置齿轮点击
    const gearBtn = document.getElementById("settingsGearBtn");
    if (gearBtn) {
      gearBtn.addEventListener("click", () => {
        if (this.settingsPresenter) {
          this.settingsPresenter.open();
        }
      });
    }
  }

  // ============================================
  // 返回按钮统一绑定
  // ============================================

  _bindBackButtons() {
    // 使用事件委托，一次性绑定，永久生效
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".back-btn");
      if (btn) {
        const target = btn.dataset.target;
        if (target && this.navigator) {
          this.navigator.goTo(target);
        }
      }
    });
  }

  // ============================================
  // 页面生命周期
  // ============================================

  _onPageChange(pageId) {
    const currentPage = this.currentPageId;
    this._leavePage(currentPage);
    this._renderPage(pageId);
    this._enterPage(pageId);

    if (this.userPresenter) {
      this.userPresenter.setCurrentPage(pageId);
    }
  }

  _leavePage(pageId) {
    if (pageId === "practice-cn" || pageId === "practice-en") {
      this.practiceEngine?.leave(pageId);
    }
    if (pageId === "article-management") {
      this._getArticlePresenter()?.destroy();
    }
    if (pageId === "history") {
      this.recordsPresenter?.destroy();
    }
    if (pageId === "settings") {
      this._getSettingsPresenter()?.destroy();
    }
  }

  _enterPage(pageId) {
    const container = document.getElementById("pageContainer");
    if (!container) return;

    if (pageId === "practice-cn" || pageId === "practice-en") {
      // 加载限时模式设置
      const settings = this._getCurrentSettings();
      if (settings && settings.timeLimit !== undefined) {
        this.practiceEngine?.setTimeLimit(settings.timeLimit);
        // 同步下拉框
        const timeSelect = document.getElementById(
          pageId === "practice-cn" ? "cnTimeLimitSelect" : "enTimeLimitSelect",
        );
        if (timeSelect) {
          timeSelect.value = String(settings.timeLimit);
        }
      }
      this.practiceEngine?.enter(pageId);
    } else if (pageId === "settings") {
      this._getSettingsPresenter()?.render(container);
    } else if (pageId === "article-management") {
      this._getArticlePresenter()?.render(container);
    } else if (pageId === "history") {
      this.recordsPresenter?.render(container);
    }
  }

  // ============================================
  // 练习完成
  // ============================================

  // ============================================
  // 结果过滤
  // ============================================

  /**
   * 判断结果是否应该保存
   * @param {Object} stats - 统计数据
   * @returns {boolean}
   */
  _shouldSaveResult(stats) {
    // ⭐ 开发模式：控制台执行 localStorage.setItem('_devMode', 'true') 开启
    if (localStorage.getItem("_devMode") === "true") return true;

    const accuracy = stats.actualAccuracy || 0;
    const elapsed = stats.elapsed || 0;
    const processed = stats.processed || 0;

    // 准确率 ≥ 80%
    if (accuracy < 80) return false;
    // 时长 ≥ 15 秒
    if (elapsed < 15) return false;
    // 字符数 ≥ 10 个
    if (processed < 10) return false;

    return true;
  }

  // ============================================
  // 练习完成
  // ============================================

  _onPracticeComplete(stats) {
    const currentPage = this.currentPageId || "practice-cn";
    const articleTitle = this.practiceEngine?.currentArticleTitle || "";

    // 判断是否保存
    const shouldSave = this._shouldSaveResult(stats);

    if (shouldSave) {
      const user = this.userService?.getCurrent();
      if (user && this.historyService) {
        this.historyService.addWithDedup(
          user.id,
          currentPage,
          articleTitle,
          stats,
        );
      }
    }

    // 显示弹窗（传入 shouldSave 参数）
    if (this.resultToast) {
      this.resultToast.show(stats, currentPage, articleTitle, shouldSave);
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