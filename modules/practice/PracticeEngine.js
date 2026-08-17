/**
 * 砚迹（YanTrace）- 打字引擎核心
 * 职责：状态管理、统计计算、流程控制
 * 不直接处理输入，委托给策略（ChineseStrategy / EnglishStrategy）
 *
 * 统计刷新机制：
 *   - 按键时只更新数据，不刷新 DOM
 *   - 定时器每秒刷新一次统计显示
 *   - 计时器从首次按键开始计时
 *
 * 字符状态规则：
 *   - 第一次输对 → 绿色 (CORRECT)
 *   - 错误后改正 → 黄色 (FIXED)
 *   - 任何情况输错 → 红色 (ERROR)
 *   - 退格时颜色保留，计数减一
 *   - 正确总数 = 绿色 + 黄色
 */

import ChineseStrategy from "./ChineseStrategy.js";
import EnglishStrategy from "./EnglishStrategy.js";
import { calcPracticeStats, formatTime } from "../../utils/stats.js";

const STATUS = {
  PENDING: "pending",
  CORRECT: "correct",
  ERROR: "error",
  FIXED: "fixed",
};

export default class PracticeEngine {
  constructor(options = {}) {
    this.articleService = options.articleService || null;
    this.onComplete = options.onComplete || null;

    // DOM 引用
    this.textBox = null;
    this.selector = null;
    this.resetBtn = null;

    // 统计元素（双页面）
    this.stats = { cn: null, en: null };

    // 核心状态
    this.chars = [];
    this.totalChars = 0;
    this.correct = 0;
    this.errors = 0;
    this.fixed = 0;
    this.backspaces = 0;
    this.keystrokes = 0;
    this.startTime = null;
    this.isFinished = false;
    this.currentMode = "chinese";
    this.currentArticleId = null;
    this.currentArticleTitle = "";
    this.currentCharIndex = 0;

    // 峰值速度
    this._peakCpm = 0;
    this._peakWpm = 0;
    this._lastSampleTime = 0;

    // 策略
    this.strategy = null;

    // 窗口 resize 防抖
    this._resizeHandler = null;

    // 统计定时器
    this._statsTimer = null;
    this._timerStartTime = null;
    this._timerSeconds = 0;
    this._instantCorrect = 0;
    this._instantStartTime = null;

    // 计时器控制（失焦暂停/聚焦继续）
    this._timerPaused = false;
    this._timerAccumulated = 0;

    // 限时模式
    this.timeLimit = 0; // 0 = 无限时

    this._bindResizeEvent();
  }

  // ============================================
  // 生命周期方法
  // ============================================

  enter(pageId) {
    const type = pageId === "practice-cn" ? "chinese" : "english";
    this._setPageDom(pageId);
    this.loadFirstArticle(type);
  }

  leave(pageId) {
    this.clearStrategy();
  }

  _setPageDom(pageId) {
    if (pageId === "practice-cn") {
      this.textBox = document.getElementById("cnTextBox");
      this.selector = document.getElementById("cnArticleSelect");
      this.resetBtn = document.getElementById("cnResetBtn");

      this.stats.cn = {
        cpm: document.getElementById("cnCpm"),
        kpm: document.getElementById("cnKpm"),
        kspc: document.getElementById("cnKspc"),
        accuracy: document.getElementById("cnAccuracy"),
        progressChars: document.getElementById("cnProgressChars"),
        totalChars: document.getElementById("cnTotalChars"),
        timer: document.getElementById("cnTimer"),
        peakSpeed: document.getElementById("cnPeakSpeed"),
        progressFill: document.getElementById("cnProgressFill"),
        progressText: document.getElementById("cnProgressText"),
      };
    } else if (pageId === "practice-en") {
      this.textBox = document.getElementById("enTextBox");
      this.selector = document.getElementById("enArticleSelect");
      this.resetBtn = document.getElementById("enResetBtn");

      this.stats.en = {
        wpm: document.getElementById("enWpm"),
        kpm: document.getElementById("enKpm"),
        kspc: document.getElementById("enKspc"),
        accuracy: document.getElementById("enAccuracy"),
        progressChars: document.getElementById("enProgressChars"),
        totalChars: document.getElementById("enTotalChars"),
        timer: document.getElementById("enTimer"),
        peakSpeed: document.getElementById("enPeakSpeed"),
        progressFill: document.getElementById("enProgressFill"),
        progressText: document.getElementById("enProgressText"),
      };
    }
    this._bindUIEvents();
  }

  // ============================================
  // 公共方法
  // ============================================

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
    if (this._statsTimer) {
      clearInterval(this._statsTimer);
      this._statsTimer = null;
    }

    this._switchStrategy(type);
    this._resetState();

    this.currentMode = type;
    this.currentArticleId = articleId;
    this.currentArticleTitle = article.title;

    const content = article.content;
    this.chars = content.split("").map((char) => ({
      char: char,
      status: STATUS.PENDING,
      keepColor: null,
    }));
    this.totalChars = this.chars.length;

    this._renderArticle();
    this._updateProgressOnly();
    this._updateTimerDisplay(0);

    if (this.strategy && this.currentMode === "chinese") {
      this.textBox.offsetHeight;
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

  loadFirstArticle(type) {
    this.loadArticleList(type);
  }

  reset(type) {
    const articleId = this.selector?.value;
    if (articleId) {
      this.loadArticle(type, articleId);
    }
  }

  /**
   * 设置限时模式
   * @param {number} seconds - 0 = 无限时, 30/60/120 = 限时秒数
   */
  setTimeLimit(seconds) {
    this.timeLimit = seconds || 0;
    // 重置计时器显示
    this._updateTimerDisplay(0);
    // 如果正在练习，重新启动定时器
    if (this.startTime && !this.isFinished && this._statsTimer) {
      clearInterval(this._statsTimer);
      this._statsTimer = null;
      this._startStatsTimer();
    }
  }

  /**
   * 手动停止练习
   */
  stopPractice() {
    if (this.isFinished) return;
    if (this.totalChars === 0) return;

    // 销毁输入框，关闭输入法
    if (this.strategy && typeof this.strategy._destroyInput === "function") {
      this.strategy._destroyInput();
    }

    this.isFinished = true;

    if (this._statsTimer) {
      clearInterval(this._statsTimer);
      this._statsTimer = null;
    }

    this._refreshStatsDisplay();

    if (this.onComplete) {
      this.onComplete(this.getStats());
    }
  }

  focus() {
    if (this.strategy && typeof this.strategy.focus === "function") {
      this.strategy.focus();
    }
  }

  clearStrategy() {
    if (this.strategy) {
      this.strategy.destroy();
      this.strategy = null;
    }
  }

  destroy() {
    if (this._statsTimer) {
      clearInterval(this._statsTimer);
      this._statsTimer = null;
    }
    this.clearStrategy();
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
  }

  // ============================================
  // 渲染方法
  // ============================================

  _renderArticle() {
    if (!this.textBox) return;

    const html = this.chars
      .map((item, index) => {
        const char = item.char;
        const display = char === " " ? "&nbsp;" : this._escapeHtml(char);

        let displayStatus = item.status;
        if (item.status === STATUS.PENDING && item.keepColor) {
          displayStatus = item.keepColor;
        }
        const statusClass =
          displayStatus !== STATUS.PENDING ? displayStatus : "";
        const currentClass =
          index === this.currentCharIndex && !this.isFinished ? "current" : "";
        return `<span class="char ${statusClass} ${currentClass}" data-index="${index}">${display}</span>`;
      })
      .join("");

    this.textBox.innerHTML = html;
  }

  _updateCurrentChar(index) {
    this.textBox?.querySelectorAll(".char.current").forEach((el) => {
      el.classList.remove("current");
    });

    const charEl = this.textBox?.querySelector(`.char[data-index="${index}"]`);
    if (charEl) {
      charEl.classList.add("current");
    }
    this.currentCharIndex = index;
  }

  getCharPosition() {
    if (!this.textBox) return null;
    const charEl = this.textBox.querySelector(
      `.char[data-index="${this.currentCharIndex}"]`,
    );
    if (!charEl) return null;

    const rect = charEl.getBoundingClientRect();
    const containerRect = this.textBox.getBoundingClientRect();

    return {
      x: rect.left - containerRect.left,
      y: rect.bottom - containerRect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  getContainerRect() {
    return this.textBox?.getBoundingClientRect() || null;
  }

  // ============================================
  // 核心输入处理
  // ============================================

  _startTimer() {
    if (this._statsTimer) return;

    if (this._timerAccumulated === 0) {
      this.startTime = Date.now();
      this._timerStartTime = Date.now();
    } else {
      this.startTime = Date.now() - this._timerAccumulated * 1000;
      this._timerStartTime = Date.now() - this._timerAccumulated * 1000;
    }

    this._timerPaused = false;
    this._startStatsTimer();
  }

  _stopTimer() {
    if (!this._statsTimer) return;

    if (this.startTime) {
      this._timerAccumulated = (Date.now() - this.startTime) / 1000;
    }

    clearInterval(this._statsTimer);
    this._statsTimer = null;
    this._timerPaused = true;

    this._updateTimerDisplay(Math.floor(this._timerAccumulated));
  }

  recordKeypress() {
    this.keystrokes++;
    this._startTimer();
    this._updateProgressOnly();
    this._playSound();
  }

  recordBackspace() {
    this.backspaces++;
    this.keystrokes++;
    this._updateProgressOnly();
    this._playSound();
  }

  _handleCharInput(char) {
    if (this.isFinished) return;
    if (this.totalChars === 0) return;
    if (this.currentCharIndex >= this.totalChars) return;

    const idx = this.currentCharIndex;
    const item = this.chars[idx];
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

    this.correct += correctChange;
    this.errors += errorsChange;
    this.fixed += fixedChange;

    item.keepColor = null;
    item.status = newStatus;

    this.currentCharIndex++;
    this._renderArticle();
    this._updateCurrentChar(this.currentCharIndex);

    this._updateProgressOnly();
    this._samplePeakSpeed();
    this._updateFloatingInputPosition();
    this._scrollToCurrentChar();

    if (this.currentCharIndex >= this.totalChars) {
      this.isFinished = true;
      if (this._statsTimer) {
        clearInterval(this._statsTimer);
        this._statsTimer = null;
      }
      this._refreshStatsDisplay();
      if (this.onComplete) {
        this.onComplete(this.getStats());
      }
    }
  }

  _handleBackspace() {
    if (this.isFinished) return;
    if (this.currentCharIndex === 0) return;

    this.currentCharIndex--;
    this._updateCurrentChar(this.currentCharIndex);

    const item = this.chars[this.currentCharIndex];
    const currentStatus = item.status;

    if (currentStatus === STATUS.PENDING) return;

    if (currentStatus === STATUS.CORRECT) {
      this.correct--;
    } else if (currentStatus === STATUS.ERROR) {
      this.errors--;
    } else if (currentStatus === STATUS.FIXED) {
      this.fixed--;
    }

    item.keepColor = currentStatus;
    item.status = STATUS.PENDING;

    this._renderArticle();
    this._updateProgressOnly();
    this._updateFloatingInputPosition();
    this._scrollToCurrentChar();
  }

  _scrollToCurrentChar() {
    if (!this.textBox || this.isFinished) return;

    const charEl = this.textBox.querySelector(
      `.char[data-index="${this.currentCharIndex}"]`,
    );
    if (!charEl) return;

    const containerRect = this.textBox.getBoundingClientRect();
    const charRect = charEl.getBoundingClientRect();

    const distanceToBottom = containerRect.bottom - charRect.bottom;

    if (distanceToBottom < 100) {
      const targetOffset = containerRect.height * 0.2;
      const currentOffset = charRect.top - containerRect.top;
      const scrollDelta = currentOffset - targetOffset;
      this.textBox.scrollTop += scrollDelta;
    }
  }

  _updateFloatingInputPosition() {
    if (this.strategy && typeof this.strategy.updatePosition === "function") {
      this.strategy.updatePosition();
    }
  }

  // ============================================
  // 统计方法
  // ============================================

  _startStatsTimer() {
    if (this._statsTimer) {
      clearInterval(this._statsTimer);
      this._statsTimer = null;
    }

    this._statsTimer = setInterval(() => {
      if (this.isFinished) {
        if (this._statsTimer) {
          clearInterval(this._statsTimer);
          this._statsTimer = null;
        }
        return;
      }

      if (this._timerStartTime) {
        this._timerSeconds = Math.floor(
          (Date.now() - this._timerStartTime) / 1000
        );
        this._updateTimerDisplay(this._timerSeconds);

        // 限时模式：检查是否超时
        if (this.timeLimit > 0 && this._timerSeconds >= this.timeLimit) {
          this.stopPractice();
          return;
        }
      }

      this._refreshStatsDisplay();
    }, 1000);
  }

  _refreshStatsDisplay() {
    const stats = this._calcStats();
    const isChinese = this.currentMode === "chinese";
    const processed = stats.correct + stats.errors + stats.fixed;
    const fixRate =
      processed === 0 ? 0 : Math.round((stats.fixed / processed) * 100);

    const el = isChinese ? this.stats.cn : this.stats.en;

    if (isChinese && el.cpm) {
      el.cpm.textContent = stats.cpm;
    } else if (!isChinese && el.wpm) {
      el.wpm.textContent = stats.wpm;
    }

    if (el.kpm) el.kpm.textContent = stats.kpm;
    if (el.kspc) el.kspc.textContent = stats.kspc;
    if (el.accuracy) el.accuracy.textContent = stats.actualAccuracy;
    if (el.progressChars) el.progressChars.textContent = stats.processed;
    if (el.totalChars) el.totalChars.textContent = stats.totalChars;
    if (el.peakSpeed) el.peakSpeed.textContent = stats.peakSpeed;
  }

  _updateTimerDisplay(seconds) {
    // seconds 是累计秒数
    let displaySeconds = seconds;
    let isCountdown = false;

    if (this.timeLimit > 0) {
      displaySeconds = Math.max(0, this.timeLimit - seconds);
      isCountdown = true;
    }

    const timerText = formatTime(displaySeconds);
    const isWarning = isCountdown && displaySeconds < 10;

    const cnTimer = document.getElementById("cnTimer");
    if (cnTimer) {
      cnTimer.textContent = timerText;
      cnTimer.style.color = isWarning ? "var(--color-danger)" : "";
    }

    const enTimer = document.getElementById("enTimer");
    if (enTimer) {
      enTimer.textContent = timerText;
      enTimer.style.color = isWarning ? "var(--color-danger)" : "";
    }
  }

  _updateProgressOnly() {
    const stats = this._calcStats();
    const isChinese = this.currentMode === "chinese";
    const el = isChinese ? this.stats.cn : this.stats.en;

    if (el.progressFill) {
      el.progressFill.style.width = stats.progress + "%";
    }
    if (el.progressText) {
      el.progressText.textContent = stats.progress + "%";
    }
  }

  _calcStats() {
    let elapsed = 0;
    if (this._timerPaused) {
      elapsed = this._timerAccumulated;
    } else if (this.startTime) {
      elapsed = (Date.now() - this.startTime) / 1000;
      if (this._timerAccumulated > 0) {
        elapsed += this._timerAccumulated;
      }
    }
    const minutes = elapsed / 60;
    const processed = this.correct + this.errors + this.fixed;

    const totalCorrect = this.correct + this.fixed;
    const actualAccuracy =
      processed === 0 ? 100 : Math.round((totalCorrect / processed) * 100);

    const cpm = minutes > 0 ? Math.round(totalCorrect / minutes) : 0;
    const wpm = minutes > 0 ? Math.round(totalCorrect / 5 / minutes) : 0;
    const kpm = minutes > 0 ? Math.round(this.keystrokes / minutes) : 0;
    const netCpm = Math.round(cpm * (actualAccuracy / 100));
    const netWpm = Math.round(wpm * (actualAccuracy / 100));

    const backspaceRate =
      this.keystrokes > 0
        ? Math.round((this.backspaces / this.keystrokes) * 100)
        : 0;
    const kspc =
      totalCorrect > 0
        ? parseFloat((this.keystrokes / totalCorrect).toFixed(2))
        : 0;
    const progress =
      this.totalChars === 0
        ? 0
        : Math.round((processed / this.totalChars) * 100);

    const peakSpeed =
      this.currentMode === "chinese" ? this._peakCpm : this._peakWpm;

    return {
      correct: this.correct,
      errors: this.errors,
      fixed: this.fixed,
      totalCorrect: totalCorrect,
      backspaces: this.backspaces,
      keystrokes: this.keystrokes,
      elapsed: Math.round(elapsed),
      totalChars: this.totalChars,
      processed: processed,
      isFinished: this.isFinished,
      actualAccuracy: actualAccuracy,
      cpm: cpm,
      wpm: wpm,
      kpm: kpm,
      netCpm: netCpm,
      netWpm: netWpm,
      peakSpeed: peakSpeed,
      backspaceRate: backspaceRate,
      kspc: kspc,
      progress: progress,
    };
  }

  getStats() {
    return this._calcStats();
  }

  _samplePeakSpeed() {
    if (!this.startTime) return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    if (elapsed < 15) return;

    const now = Date.now();
    if (now - this._lastSampleTime < 10000) return;

    const stats = this._calcStats();

    if (this.currentMode === "chinese") {
      const speed = stats.netCpm;
      if (speed > this._peakCpm) {
        this._peakCpm = speed;
      }
    } else {
      const speed = stats.netWpm;
      if (speed > this._peakWpm) {
        this._peakWpm = speed;
      }
    }
    this._lastSampleTime = now;
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

  _resetState() {
    this.correct = 0;
    this.errors = 0;
    this.fixed = 0;
    this.backspaces = 0;
    this.keystrokes = 0;
    this.startTime = null;
    this.isFinished = false;
    this.currentCharIndex = 0;
    this._peakCpm = 0;
    this._peakWpm = 0;
    this._lastSampleTime = 0;
    this.chars = [];
    this.totalChars = 0;

    this._timerSeconds = 0;
    this._timerStartTime = null;
    this._instantCorrect = 0;
    this._instantStartTime = null;
    this._timerPaused = false;
    this._timerAccumulated = 0;

    // 重置限时模式显示
    this._updateTimerDisplay(0);

    if (this._statsTimer) {
      clearInterval(this._statsTimer);
      this._statsTimer = null;
    }
    this._resetStatsDisplay();
  }

  _resetStatsDisplay() {
    const cn = this.stats.cn;
    const en = this.stats.en;

    if (cn) {
      if (cn.cpm) cn.cpm.textContent = "0";
      if (cn.kpm) cn.kpm.textContent = "0";
      if (cn.kspc) cn.kspc.textContent = "0";
      if (cn.accuracy) cn.accuracy.textContent = "100";
      if (cn.progressChars) cn.progressChars.textContent = "0";
      if (cn.totalChars) cn.totalChars.textContent = "0";
      if (cn.peakSpeed) cn.peakSpeed.textContent = "0";
      if (cn.progressFill) cn.progressFill.style.width = "0%";
      if (cn.progressText) cn.progressText.textContent = "0%";
    }

    if (en) {
      if (en.wpm) en.wpm.textContent = "0";
      if (en.kpm) en.kpm.textContent = "0";
      if (en.kspc) en.kspc.textContent = "0";
      if (en.accuracy) en.accuracy.textContent = "100";
      if (en.progressChars) en.progressChars.textContent = "0";
      if (en.totalChars) en.totalChars.textContent = "0";
      if (en.peakSpeed) en.peakSpeed.textContent = "0";
      if (en.progressFill) en.progressFill.style.width = "0%";
      if (en.progressText) en.progressText.textContent = "0%";
    }
  }

  // ============================================
  // UI 事件绑定
  // ============================================

  _bindUIEvents() {
    if (this.selector && this._selectorHandler) {
      this.selector.removeEventListener("change", this._selectorHandler);
    }
    if (this.resetBtn && this._resetHandler) {
      this.resetBtn.removeEventListener("click", this._resetHandler);
    }

    this._selectorHandler = () => {
      if (this.selector?.value) {
        this.loadArticle(this.currentMode, this.selector.value);
      }
    };
    this._resetHandler = () => {
      this.reset(this.currentMode);
    };

    if (this.selector) {
      this.selector.addEventListener("change", this._selectorHandler);
    }
    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", this._resetHandler);
    }
  }

  _bindResizeEvent() {
    this._resizeHandler = this._debounce(() => {
      if (
        this.currentArticleId &&
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

  _escapeHtml(str) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(str).replace(/[&<>"']/g, (m) => map[m] || m);
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

  refresh(type) {
    if (this.currentArticleId) {
      this.loadArticle(type, this.currentArticleId);
    } else {
      this.loadFirstArticle(type);
    }
  }
}