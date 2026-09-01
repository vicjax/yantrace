/**
 * 砚迹（YanTrace）- 练习展示器
 * 职责：业务逻辑协调，连接 View、State、Controllers
 * 位置：modules/practice/core/PracticePresenter.js
 */

import PracticeState from "./PracticeState.js";
import PracticeView from "./PracticeView.js";
import TimerController from "./TimerController.js";
import InputController from "./InputController.js";
import ContentFactory from "./ContentFactory.js";
import { calcStats } from "./StatsEngine.js";
import ChineseStrategy from "./ChineseStrategy.js";
import EnglishStrategy from "./EnglishStrategy.js";

import Modal from "../Modal.js";

const STATUS = {
  PENDING: "pending",
  CORRECT: "correct",
  ERROR: "error",
  FIXED: "fixed",
};

export default class PracticePresenter {
  constructor(options = {}) {
    this.articleService = options.articleService || null;
    this.phraseService = options.phraseService || null;
    this.onComplete = options.onComplete || null;

    // 核心组件
    this.state = new PracticeState();
    this.view = new PracticeView();

    // 内容策略
    this.contentFactory = new ContentFactory(
      this.articleService,
      this.phraseService,
    );
    this.contentStrategy = null; // 当前内容策略（文章/词组）
    this.currentContentType = "article"; // 当前内容类型

    // 输入策略（中文/英文输入处理）
    this.strategy = null;

    // 控制器
    this.timer = new TimerController(this.state, this.view);
    this.timer.onTick(() => this._refreshStatsDisplay()); // 监听 tick 刷新统计
    this.timer.onTimeout(() => this.stopPractice());

    this.input = new InputController(
      this.state,
      this.view,
      this.timer,
      (stats) => {
        stats.stopped = false;
        if (this.onComplete) this.onComplete(stats);
      },
    );

    // DOM 引用
    this.selector = null;
    this.resetBtn = null;
    this.stopBtn = null;
    this.categorySelect = null; // 新增：分类下拉
    this.timeLimit = 0;

    this._bindResizeEvent();
  }

  // ============================================
  // 策略访问接口（供 ChineseStrategy/EnglishStrategy 调用）
  // ============================================

  get textBox() {
    return this.view.textBox;
  }

  get isFinished() {
    return this.state.isFinished;
  }

  get currentCharIndex() {
    return this.state.currentCharIndex;
  }

  get _effectiveElapsed() {
    return this.timer.getEffectiveElapsed();
  }

  get _timerPaused() {
    return this.state.timerPaused;
  }

  // ============================================
  // 公共方法
  // ============================================

  async enter(pageId) {
    let type = "chinese";
    let contentType = "article";

    if (pageId === "practice-cn" || pageId === "practice-phrase-cn") {
      type = "chinese";
      contentType = pageId === "practice-phrase-cn" ? "phrase" : "article";
    } else if (pageId === "practice-en" || pageId === "practice-phrase-en") {
      type = "english";
      contentType = pageId === "practice-phrase-en" ? "phrase" : "article";
    }

    this.currentContentType = contentType;
    this._setPageDom(pageId);
    if (this.categorySelect && !this.categorySelect.value) {
      this.categorySelect.value = "prose";
    }

    await this.loadFirstContent(type, contentType);
  }
  leave() {
    this._clearStrategy();
  }

  async loadFirstContent(type, contentType) {
    await this.loadContentList(type, contentType);
  }

  /**
   * 加载内容列表（支持分类过滤）
   */

  async loadContentList(type, contentType, category) {
    // 如果 category 未传，从下拉框读取
    if (!category && this.categorySelect) {
      category = this.categorySelect.value;
    }

    // 默认值
    if (!category) {
      category = "prose";
    }

    this.contentStrategy = this.contentFactory.create(type, contentType);

    // 确保数据加载完成
    await this.contentStrategy.loadList();

    const list = this.contentStrategy.getList(category);
    const currentValue = this.selector?.value || "";

    this.selector.innerHTML = list
      .map((item) => `<option value="${item.id}">${item.title}</option>`)
      .join("");

    if (currentValue && list.some((item) => item.id === currentValue)) {
      this.selector.value = currentValue;
    } else if (list.length > 0) {
      this.selector.value = list[0].id;
    }

    if (list.length > 0) {
      await this.loadContent(type, contentType, this.selector.value);
    }
  }

  async loadContent(type, contentType, contentId) {
    // ============================================
    // 1. 加载内容数据
    // ============================================
    if (!this.contentStrategy || this.contentStrategy.getLanguage() !== type) {
      this.contentStrategy = this.contentFactory.create(type, contentType);
    }
    await this.contentStrategy.load(contentId);

    // ============================================
    // 2. 清理旧策略
    // ============================================
    if (this.strategy) {
      this.strategy.destroy();
      this.strategy = null;
    }

    // ============================================
    // 3. 重置所有数据（先不刷新视图）
    // ============================================
    // 切换输入策略
    this._switchStrategy(type);

    // 重置状态
    this.state.reset();
    this.input.resetPeak();

    // 设置新状态
    this.state.currentMode = type;
    this.state.currentArticleId = contentId;
    this.state.currentArticleTitle = this.contentStrategy.getTitle();

    const chars = this.contentStrategy.getChars();
    this.state.setChars(
      chars.map((char) => ({
        char: char,
        status: STATUS.PENDING,
        keepColor: null,
      })),
    );

    // 重置计时器（归零，保留监听器）
    this.timer.reinit();

    // ============================================
    // 4. 统一刷新视图
    // ============================================
    // 渲染字符
    this.view.renderChars(this.state.chars, 0, false);

    // 更新进度（归零）
    this.view.updateProgress(0);

    // 更新计时器（归零）
    this.view.updateTimer(0, this.timeLimit);

    // ⭐ 最后统一刷新统计（归零状态）
    this._refreshStatsDisplay();

    // ============================================
    // 5. 创建输入框
    // ============================================
    if (this.strategy && this.state.currentMode === "chinese") {
      const textBox = this.view.textBox;
      textBox.offsetHeight;
      requestAnimationFrame(() => {
        if (this.strategy && typeof this.strategy.createInput === "function") {
          this.strategy.createInput();
          requestAnimationFrame(() => {
            if (
              this.strategy &&
              typeof this.strategy.updatePosition === "function"
            ) {
              this.strategy.updatePosition();
            }
            if (this.strategy && typeof this.strategy.focus === "function") {
              this.strategy.focus();
            }
          });
        }
      });
    } else {
      setTimeout(() => this.focus(), 100);
    }
  }

  // ============================================
  // 兼容旧方法（app.js 调用）
  // ============================================

  loadFirstArticle(type) {
    this.loadFirstContent(type, "article");
  }

  loadArticleList(type) {
    this.loadContentList(type, "article");
  }

  loadArticle(type, articleId) {
    this.loadContent(type, "article", articleId);
  }

  reset(type) {
    const contentId = this.selector?.value;
    if (contentId) {
      this.loadContent(type, this.currentContentType || "article", contentId);
    }
  }

  setTimeLimit(seconds) {
    this.timeLimit = seconds || 0;
    this.timer.setTimeLimit(seconds);
  }
  stopPractice() {
    if (this.state.isFinished) return;
    if (this.state.totalChars === 0) return;

    if (this.strategy && typeof this.strategy._destroyInput === "function") {
      this.strategy._destroyInput();
    }

    this.state.isFinished = true;

    // ⭐ 暂停计时（保留监听器）
    this.timer.pause();

    if (this.onComplete) {
      const stats = this.getStats();
      stats.stopped = true;
      this.onComplete(stats);
    }
  }
  getStats() {
    const elapsed = this.timer.getEffectiveElapsed();
    const peakSpeed = this.input.getPeakSpeed();
    return calcStats(this.state, elapsed, peakSpeed, peakSpeed);
  }

  focus() {
    if (this.strategy && typeof this.strategy.focus === "function") {
      this.strategy.focus();
    }
  }

  destroy() {
    this.timer.destroy();
    this._clearStrategy();
    if (this._resizeHandler) {
      window.removeEventListener("resize", this._resizeHandler);
      this._resizeHandler = null;
    }
    if (this.selector && this._selectorHandler) {
      this.selector.removeEventListener("change", this._selectorHandler);
    }
    if (this.resetBtn && this._resetHandler) {
      this.resetBtn.removeEventListener("click", this._resetHandler);
    }
    if (this.stopBtn && this._stopHandler) {
      this.stopBtn.removeEventListener("click", this._stopHandler);
    }
  }

  // ============================================
  // 输入处理（由策略调用）
  // ============================================

  recordKeypress() {
    this.input.recordKeypress();
  }

  recordBackspace() {
    this.input.recordBackspace();
  }

  _handleCharInput(char) {
    this.input.handleCharInput(char);
  }

  _handleBackspace() {
    this.input.handleBackspace();
  }

  _startTimer() {
    this.timer.start();
  }

  _stopTimer() {
    this.timer.pause();
  }

  // ============================================
  // DOM 相关
  // ============================================

  getContainerRect() {
    return this.view.getContainerRect();
  }

  getCharPosition() {
    return this.view.getCharPosition(this.state.currentCharIndex);
  }

  // ============================================
  // 统计显示
  // ============================================

  _refreshStatsDisplay() {
    const stats = this.getStats();
    const isChinese = this.state.currentMode === "chinese";
    this.view.updateStats(stats, isChinese);
  }

  _updateProgressOnly() {
    const stats = this.getStats();
    this.view.updateProgress(stats.progress);
  }

  _updateTimerDisplay(seconds) {
    this.view.updateTimer(seconds, this.timeLimit);
  }

  _samplePeakSpeed() {
    // 已由 InputController 处理
  }

  // ============================================
  // 策略管理
  // ============================================

  _switchStrategy(type) {
    if (this.strategy) {
      this.strategy.destroy();
      this.strategy = null;
    }
    if (type === "chinese") {
      this.strategy = new ChineseStrategy(this);
    } else {
      this.strategy = new EnglishStrategy(this);
    }
    this.strategy.init();
  }

  _clearStrategy() {
    if (this.strategy) {
      this.strategy.destroy();
      this.strategy = null;
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 设置 DOM 引用（新增 categorySelect）
   */
  _setPageDom(pageId) {
    // 判断语言
    // 第 399 行
    const prefix =
      pageId === "practice-en" || pageId === "practice-phrase-en" ? "en" : "cn";

    const textBox = document.getElementById(`${prefix}TextBox`);
    this.selector =
      document.getElementById(`${prefix}ArticleSelect`) ||
      document.getElementById(`${prefix}Select`);
    this.resetBtn = document.getElementById(`${prefix}ResetBtn`);
    this.stopBtn = document.getElementById(`${prefix}StopBtn`);
    this.categorySelect = document.getElementById(`${prefix}CategorySelect`); // 新增

    // 设置分类下拉默认值
    if (this.categorySelect && !this.categorySelect.value) {
      const isPhrase = this.currentContentType === "phrase";
      const isChinese = this.state.currentMode === "chinese";
      if (isPhrase) {
        this.categorySelect.value = isChinese ? "two-char" : "words";
      } else {
        this.categorySelect.value = "prose";
      }
    }

    const elements = {
      textBox: textBox,
      [`${prefix}Speed`]:
        document.getElementById(`${prefix}Speed`) ||
        document.getElementById(`${prefix}Cpm`) ||
        document.getElementById(`${prefix}Wpm`),
      [`${prefix}Kpm`]: document.getElementById(`${prefix}Kpm`),
      [`${prefix}Kspc`]: document.getElementById(`${prefix}Kspc`),
      [`${prefix}Accuracy`]: document.getElementById(`${prefix}Accuracy`),
      [`${prefix}ProgressChars`]: document.getElementById(
        `${prefix}ProgressChars`,
      ),
      [`${prefix}TotalChars`]: document.getElementById(`${prefix}TotalChars`),
      [`${prefix}PeakSpeed`]: document.getElementById(`${prefix}PeakSpeed`),
      [`${prefix}ProgressFill`]: document.getElementById(
        `${prefix}ProgressFill`,
      ),
      [`${prefix}ProgressText`]: document.getElementById(
        `${prefix}ProgressText`,
      ),
      [`${prefix}Timer`]: document.getElementById(`${prefix}Timer`),
    };

    this.view.bind(pageId, elements);
    this._bindUIEvents();
  }

  /**
   * 绑定 UI 事件（新增分类切换）
   */
  _bindUIEvents() {
    // 移除旧监听器
    if (this.selector && this._selectorHandler) {
      this.selector.removeEventListener("change", this._selectorHandler);
    }
    if (this.resetBtn && this._resetHandler) {
      this.resetBtn.removeEventListener("click", this._resetHandler);
    }
    if (this.stopBtn && this._stopHandler) {
      this.stopBtn.removeEventListener("click", this._stopHandler);
    }
    if (this.categorySelect && this._categoryHandler) {
      this.categorySelect.removeEventListener("change", this._categoryHandler);
    }

    // 文章选择
    if (!this._selectorHandler) {
      this._selectorHandler = async () => {
        if (this.selector?.value) {
          const type = this.state.currentMode;
          const contentType = this.currentContentType || "article";
          const category = this.categorySelect?.value || "prose";
          await this.loadContent(type, contentType, this.selector.value);
        }
      };
    }

    // 重置按钮
    if (!this._resetHandler) {
      this._resetHandler = async () => {
        const type = this.state.currentMode;
        if (this.state.isFinished || !this.state.startTime) {
          this.reset(type);
          return;
        }
        if (
          await Modal.confirm(
            "确定要重新开始吗？当前进度将丢失。",
            "🔄 重新开始",
            "重新开始",
            "取消",
          )
        ) {
          this.reset(type);
        }
      };
    }

    // 停止按钮
    if (!this._stopHandler) {
      this._stopHandler = async () => {
        if (this.state.isFinished || !this.state.startTime) return;
        if (
          await Modal.confirm(
            "确定要停止当前练习吗？当前进度将保存为记录。",
            "⏹️ 停止练习",
            "确认停止",
            "继续练习",
          )
        ) {
          this.stopPractice();
        }
        this.stopBtn?.blur();
      };
    }

    // 分类切换（新增）
    if (!this._categoryHandler) {
      this._categoryHandler = async () => {
        const category = this.categorySelect?.value || "prose";
        const type = this.state.currentMode;
        const contentType = this.currentContentType || "article";
        await this.loadContentList(type, contentType, category);
      };
    }
    // 绑定事件
    if (this.selector) {
      this.selector.addEventListener("change", this._selectorHandler);
    }
    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", this._resetHandler);
    }
    if (this.stopBtn) {
      this.stopBtn.addEventListener("click", this._stopHandler);
    }
    if (this.categorySelect) {
      this.categorySelect.addEventListener("change", this._categoryHandler);
    }
  }

  _bindResizeEvent() {
    this._resizeHandler = this._debounce(() => {
      if (
        this.state.currentArticleId &&
        this.strategy &&
        typeof this.strategy.updatePosition === "function"
      ) {
        this.strategy.updatePosition();
      }
    }, 300);
    window.addEventListener("resize", this._resizeHandler);
  }

  _debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  _playSound() {
    const sound = window.__soundSetting || "off";
    if (sound === "off") return;

    const soundPath = `./assets/sounds/${sound}.mp3`;
    try {
      const audio = new Audio(soundPath);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }
}
