/**
 * 砚迹（YanTrace）- 练习展示器
 * 职责：业务逻辑协调，连接 View、State、StatsEngine、Strategy
 * 位置：modules/practice/core/PracticePresenter.js
 */

import PracticeState from "../model/PracticeState.js";
import { calcStats } from "../model/StatsEngine.js";
import PracticeView from "../view/PracticeView.js";
import ChineseStrategy from "../ChineseStrategy.js";
import EnglishStrategy from "../EnglishStrategy.js";
import Modal from "../../Modal.js";

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

    this.state = new PracticeState();
    this.view = new PracticeView();

    this.contentStrategy = null;
    this.strategy = null;

    this.selector = null;
    this.resetBtn = null;
    this.stopBtn = null;

    this.timeLimit = 0;

    this._bindResizeEvent();
  }

  // ============================================
  // 策略访问接口（ChineseStrategy/EnglishStrategy 需要）
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
    return this.state.effectiveElapsed;
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
    if (!this.articleService) return;
    const articles = this.articleService.getByType(type);
    const currentValue = this.selector?.value || "";

    this.selector.innerHTML = articles
      .map((a) => `<option value="${a.id}">${a.title}</option>`)
      .join("");

    if (currentValue && articles.some((a) => a.id === currentValue)) {
      this.selector.value = currentValue;
    } else if (articles.length > 0) {
      this.selector.value = articles[0].id;
    }

    if (articles.length > 0) {
      this.loadArticle(type, this.selector.value);
    }
  }

  loadArticle(type, articleId) {
    if (!this.articleService) return;
    const article = this.articleService.getById(articleId);
    if (!article) return;

    if (this.strategy) {
      this.strategy.destroy();
      this.strategy = null;
    }
    if (this.state.statsTimer) {
      clearInterval(this.state.statsTimer);
      this.state.statsTimer = null;
    }

    this._switchStrategy(type);
    this.state.reset();

    this.state.currentMode = type;
    this.state.currentArticleId = articleId;
    this.state.currentArticleTitle = article.title;

    const content = article.content;
    this.state.setChars(
      content.split("").map((char) => ({
        char: char,
        status: STATUS.PENDING,
        keepColor: null,
      })),
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

  reset(type) {
    const articleId = this.selector?.value;
    if (articleId) {
      this.loadArticle(type, articleId);
    }
  }

  setTimeLimit(seconds) {
    this.timeLimit = seconds || 0;
    this.state.timeLimit = this.timeLimit;
    this.view.updateTimer(0, this.timeLimit);
    if (
      this.state.startTime &&
      !this.state.isFinished &&
      this.state.statsTimer
    ) {
      clearInterval(this.state.statsTimer);
      this.state.statsTimer = null;
      this._startStatsTimer();
    }
  }

  stopPractice() {
    if (this.state.isFinished) return;
    if (this.state.totalChars === 0) return;

    if (this.strategy && typeof this.strategy._destroyInput === "function") {
      this.strategy._destroyInput();
    }

    this.state.isFinished = true;

    if (this.state.statsTimer) {
      clearInterval(this.state.statsTimer);
      this.state.statsTimer = null;
    }

    this._refreshStatsDisplay();

    if (this.onComplete) {
      const stats = this.getStats();
      stats.stopped = true;
      this.onComplete(stats);
    }
  }

  getStats() {
    return this._calcStats();
  }

  focus() {
    if (this.strategy && typeof this.strategy.focus === "function") {
      this.strategy.focus();
    }
  }

  destroy() {
    if (this.state.statsTimer) {
      clearInterval(this.state.statsTimer);
      this.state.statsTimer = null;
    }
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
    this.state.keystrokes++;
    this._startTimer();
    this._updateProgressOnly();
    this._playSound();
  }

  recordBackspace() {
    this.state.backspaces++;
    this.state.keystrokes++;
    this._updateProgressOnly();
    this._playSound();
  }

  _handleCharInput(char) {
    if (this.state.isFinished) return;
    if (this.state.totalChars === 0) return;
    if (this.state.currentCharIndex >= this.state.totalChars) return;

    const idx = this.state.currentCharIndex;
    const item = this.state.chars[idx];
    const isMatch = char === item.char;

    const currentStatus = item.status;
    const wasError = item.keepColor === STATUS.ERROR;
    const wasFixed = item.keepColor === STATUS.FIXED;

    let newStatus;
    let correctChange = 0,
      errorsChange = 0,
      fixedChange = 0;

    if (isMatch) {
      if (currentStatus === STATUS.PENDING && (wasError || wasFixed)) {
        newStatus = STATUS.FIXED;
        fixedChange = 1;
      } else if (currentStatus === STATUS.PENDING) {
        newStatus = STATUS.CORRECT;
        correctChange = 1;
      } else if (currentStatus === STATUS.ERROR) {
        newStatus = STATUS.FIXED;
        errorsChange = -1;
        fixedChange = 1;
      } else {
        newStatus = currentStatus;
      }
    } else {
      if (currentStatus === STATUS.PENDING) {
        newStatus = STATUS.ERROR;
        errorsChange = 1;
      } else if (currentStatus === STATUS.CORRECT) {
        newStatus = STATUS.ERROR;
        correctChange = -1;
        errorsChange = 1;
      } else if (currentStatus === STATUS.FIXED) {
        newStatus = STATUS.ERROR;
        fixedChange = -1;
        errorsChange = 1;
      } else {
        newStatus = currentStatus;
      }
    }

    this.state.correct += correctChange;
    this.state.errors += errorsChange;
    this.state.fixed += fixedChange;

    item.keepColor = null;
    item.status = newStatus;

    this.state.currentCharIndex++;
    this.view.renderChars(
      this.state.chars,
      this.state.currentCharIndex,
      this.state.isFinished,
    );
    this.view.updateCurrentChar(this.state.currentCharIndex);

    this._updateProgressOnly();
    this._samplePeakSpeed();
    this._updateFloatingInputPosition();
    this.view.scrollToChar(this.state.currentCharIndex);

    if (this.state.currentCharIndex >= this.state.totalChars) {
      this.state.isFinished = true;
      if (this.state.statsTimer) {
        clearInterval(this.state.statsTimer);
        this.state.statsTimer = null;
      }
      this._refreshStatsDisplay();
      if (this.onComplete) {
        this.onComplete(this.getStats());
      }
    }
  }

  _handleBackspace() {
    if (this.state.isFinished) return;
    if (this.state.currentCharIndex === 0) return;

    this.state.currentCharIndex--;
    this.view.updateCurrentChar(this.state.currentCharIndex);

    const item = this.state.chars[this.state.currentCharIndex];
    const currentStatus = item.status;

    if (currentStatus === STATUS.PENDING) return;

    if (currentStatus === STATUS.CORRECT) {
      this.state.correct--;
    } else if (currentStatus === STATUS.ERROR) {
      this.state.errors--;
    } else if (currentStatus === STATUS.FIXED) {
      this.state.fixed--;
    }

    item.keepColor = currentStatus;
    item.status = STATUS.PENDING;

    this.view.renderChars(
      this.state.chars,
      this.state.currentCharIndex,
      this.state.isFinished,
    );
    this._updateProgressOnly();
    this._updateFloatingInputPosition();
    this.view.scrollToChar(this.state.currentCharIndex);
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
      [`${prefix}Speed`]:
        document.getElementById(`${prefix}Cpm`) ||
        document.getElementById(`${prefix}Wpm`),
      [`${prefix}Cpm`]: document.getElementById(`${prefix}Cpm`),
      [`${prefix}Wpm`]: document.getElementById(`${prefix}Wpm`),
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

  _startTimer() {
    if (this.state.statsTimer) return;

    this.state.startTime = Date.now();
    this.state.timerStartTime = Date.now();

    this.state.timerPaused = false;
    this._startStatsTimer();
  }

  _stopTimer() {
    if (!this.state.statsTimer) return;

    if (this.state.startTime) {
      this.state.effectiveElapsed += (Date.now() - this.state.startTime) / 1000;
      this.state.timerAccumulated = this.state.effectiveElapsed;
    }

    clearInterval(this.state.statsTimer);
    this.state.statsTimer = null;
    this.state.timerPaused = true;

    this.view.updateTimer(
      Math.floor(this.state.timerAccumulated),
      this.timeLimit,
    );
  }

  _startStatsTimer() {
    if (this.state.statsTimer) {
      clearInterval(this.state.statsTimer);
      this.state.statsTimer = null;
    }

    this.state.statsTimer = setInterval(() => {
      if (this.state.isFinished) {
        if (this.state.statsTimer) {
          clearInterval(this.state.statsTimer);
          this.state.statsTimer = null;
        }
        return;
      }

      let elapsed = this.state.effectiveElapsed;
      if (!this.state.timerPaused && this.state.startTime) {
        elapsed += (Date.now() - this.state.startTime) / 1000;
      }

      this.view.updateTimer(elapsed, this.timeLimit);

      if (this.timeLimit > 0 && elapsed >= this.timeLimit) {
        this.stopPractice();
        return;
      }

      this._refreshStatsDisplay();
    }, 1000);
  }

  _refreshStatsDisplay() {
    const stats = this._calcStats();
    const isChinese = this.state.currentMode === "chinese";
    this.view.updateStats(stats, isChinese);
  }

  _updateProgressOnly() {
    const stats = this._calcStats();
    this.view.updateProgress(stats.progress);
  }

  _calcStats() {
    let elapsed = this.state.effectiveElapsed;
    if (!this.state.timerPaused && this.state.startTime) {
      elapsed += (Date.now() - this.state.startTime) / 1000;
    }

    return calcStats(
      this.state,
      elapsed,
      this.state.peakCpm,
      this.state.peakWpm,
    );
  }

  _samplePeakSpeed() {
    if (!this.state.startTime) return;

    let elapsed = this.state.effectiveElapsed;
    if (!this.state.timerPaused && this.state.startTime) {
      elapsed += (Date.now() - this.state.startTime) / 1000;
    }

    if (elapsed < 10) return;

    const effectiveChars = this.state.correct + this.state.fixed;
    if (effectiveChars < 5) return;

    const minutes = elapsed / 60;
    const netCpm = Math.round(effectiveChars / minutes);

    if (this.state.currentMode === "chinese") {
      if (netCpm > this.state.peakCpm) {
        this.state.peakCpm = netCpm;
      }
    } else {
      const netWpm = Math.round(netCpm / 5);
      if (netWpm > this.state.peakWpm) {
        this.state.peakWpm = netWpm;
      }
    }
  }

  _updateFloatingInputPosition() {
    if (this.strategy && typeof this.strategy.updatePosition === "function") {
      this.strategy.updatePosition();
    }
  }

  _bindUIEvents() {
    // 移除旧监听
    if (this.selector && this._selectorHandler) {
      this.selector.removeEventListener("change", this._selectorHandler);
    }
    if (this.resetBtn && this._resetHandler) {
      this.resetBtn.removeEventListener("click", this._resetHandler);
    }
    if (this.stopBtn && this._stopHandler) {
      this.stopBtn.removeEventListener("click", this._stopHandler);
    }

    // 定义处理器
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
            "取消",
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
            "继续练习",
          )
        ) {
          this.stopPractice();
        }
        this.stopBtn?.blur();
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
