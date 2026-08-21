/**
 * 砚迹（YanTrace）- 练习展示器
 * 职责：业务逻辑协调，连接 View、State、Controllers
 * 位置：modules/practice/core/PracticePresenter.js
 */

import PracticeState from "../model/PracticeState.js";
import PracticeView from "../view/PracticeView.js";
import ContentLoader from "../model/ContentLoader.js";
import TimerController from "../controller/TimerController.js";
import InputController from "../controller/InputController.js";
import ChineseStrategy from "../strategies/ChineseStrategy.js";
import EnglishStrategy from "../strategies/EnglishStrategy.js";
import Modal from "../../Modal.js";
import { calcStats } from "../model/StatsEngine.js";


const STATUS = {
  PENDING: "pending",
  CORRECT: "correct",
  ERROR: "error",
  FIXED: "fixed",
};

export default class PracticePresenter {
  constructor(options = {}) {
    this.articleService = options.articleService || null;
    this.onComplete = options.onComplete || null;

    // 核心组件
    this.state = new PracticeState();
    this.view = new PracticeView();
    this.loader = new ContentLoader(this.articleService);

    // 控制器
    this.timer = new TimerController(this.state, this.view);
    this.timer.onTimeout(() => this.stopPractice());

    this.input = new InputController(
      this.state,
      this.view,
      this.timer,
      (stats) => {
        stats.stopped = false;
        if (this.onComplete) this.onComplete(stats);
      }
    );

    // 策略
    this.strategy = null;

    // DOM 引用
    this.selector = null;
    this.resetBtn = null;
    this.stopBtn = null;
    this.timeLimit = 0;

    this._bindResizeEvent();
  }

  // ============================================
  // 策略访问接口
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

  enter(pageId) {
    const type = pageId === "practice-cn" ? "chinese" : "english";
    this._setPageDom(pageId);
    this.loadFirstArticle(type);
  }

  leave() {
    this._clearStrategy();
  }

  loadFirstArticle(type) {
    this.loadArticleList(type);
  }

  loadArticleList(type) {
    const list = this.loader.getList(type);
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
      this.loadArticle(type, this.selector.value);
    }
  }

  loadArticle(type, articleId) {
    const data = this.loader.load(type, articleId);
    if (!data) return;

    if (this.strategy) {
      this.strategy.destroy();
      this.strategy = null;
    }
    this.timer.destroy();

    this._switchStrategy(type);
    this.state.reset();
    this.input.resetPeak();

    this.state.currentMode = type;
    this.state.currentArticleId = articleId;
    this.state.currentArticleTitle = data.title;

    this.state.setChars(
      data.content.split("").map((char) => ({
        char: char,
        status: STATUS.PENDING,
        keepColor: null,
      }))
    );

    this.view.renderChars(this.state.chars, 0, false);
    this.view.updateProgress(0);
    this.view.updateTimer(0, this.timeLimit);

    if (this.strategy && this.state.currentMode === "chinese") {
      const textBox = this.view.textBox;
      textBox.offsetHeight;
      requestAnimationFrame(() => {
        if (this.strategy && typeof this.strategy.createInput === "function") {
          this.strategy.createInput();
          requestAnimationFrame(() => {
            if (this.strategy && typeof this.strategy.updatePosition === "function") {
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

  reset(type) {
    const articleId = this.selector?.value;
    if (articleId) {
      this.loadArticle(type, articleId);
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
    this.timer.destroy();

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

  _setPageDom(pageId) {
    const isChinese = pageId === "practice-cn";
    const prefix = isChinese ? "cn" : "en";

    const textBox = document.getElementById(`${prefix}TextBox`);
    this.selector = document.getElementById(`${prefix}ArticleSelect`);
    this.resetBtn = document.getElementById(`${prefix}ResetBtn`);
    this.stopBtn = document.getElementById(`${prefix}StopBtn`);

    const elements = {
      textBox: textBox,
      [`${prefix}Speed`]: document.getElementById(`${prefix}Cpm`) ||
        document.getElementById(`${prefix}Wpm`),
      [`${prefix}Cpm`]: document.getElementById(`${prefix}Cpm`),
      [`${prefix}Wpm`]: document.getElementById(`${prefix}Wpm`),
      [`${prefix}Kpm`]: document.getElementById(`${prefix}Kpm`),
      [`${prefix}Kspc`]: document.getElementById(`${prefix}Kspc`),
      [`${prefix}Accuracy`]: document.getElementById(`${prefix}Accuracy`),
      [`${prefix}ProgressChars`]: document.getElementById(`${prefix}ProgressChars`),
      [`${prefix}TotalChars`]: document.getElementById(`${prefix}TotalChars`),
      [`${prefix}PeakSpeed`]: document.getElementById(`${prefix}PeakSpeed`),
      [`${prefix}ProgressFill`]: document.getElementById(`${prefix}ProgressFill`),
      [`${prefix}ProgressText`]: document.getElementById(`${prefix}ProgressText`),
      [`${prefix}Timer`]: document.getElementById(`${prefix}Timer`),
    };

    this.view.bind(pageId, elements);
    this._bindUIEvents();
  }

  _bindUIEvents() {
    if (this.selector && this._selectorHandler) {
      this.selector.removeEventListener("change", this._selectorHandler);
    }
    if (this.resetBtn && this._resetHandler) {
      this.resetBtn.removeEventListener("click", this._resetHandler);
    }
    if (this.stopBtn && this._stopHandler) {
      this.stopBtn.removeEventListener("click", this._stopHandler);
    }

    if (!this._selectorHandler) {
      this._selectorHandler = () => {
        if (this.selector?.value) {
          this.loadArticle(this.state.currentMode, this.selector.value);
        }
      };
    }

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
            "取消"
          )
        ) {
          this.reset(type);
        }
      };
    }

    if (!this._stopHandler) {
      this._stopHandler = async () => {
        if (this.state.isFinished || !this.state.startTime) return;

        if (
          await Modal.confirm(
            "确定要停止当前练习吗？当前进度将保存为记录。",
            "⏹️ 停止练习",
            "确认停止",
            "继续练习"
          )
        ) {
          this.stopPractice();
        }
        this.stopBtn?.blur();
      };
    }

    if (this.selector) {
      this.selector.addEventListener("change", this._selectorHandler);
    }
    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", this._resetHandler);
    }
    if (this.stopBtn) {
      this.stopBtn.addEventListener("click", this._stopHandler);
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
}