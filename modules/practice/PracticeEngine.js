/**
 * 砚迹（YanTrace）- 打字引擎门面
 * 职责：对外提供统一接口，内部委托给 PracticePresenter
 * 位置：modules/practice/PracticeEngine.js
 */

import PracticePresenter from "./PracticePresenter.js";
import { formatTime } from "../../utils/stats.js";

export default class PracticeEngine {
  constructor(options = {}) {
    // 创建 Presenter（持有所有业务逻辑）
    this._presenter = new PracticePresenter(options);

    // 暴露给外部使用的属性（兼容旧代码）
    this.textBox = null;
    this.selector = null;
    this.resetBtn = null;
    this.stopBtn = null;
    this.stats = { cn: null, en: null };

    // 代理方法到 Presenter
    this.enter = this._presenter.enter.bind(this._presenter);
    this.leave = this._presenter.leave.bind(this._presenter);
    this.loadFirstArticle = this._presenter.loadFirstArticle.bind(this._presenter);
    this.loadArticleList = this._presenter.loadArticleList.bind(this._presenter);
    this.loadArticle = this._presenter.loadArticle.bind(this._presenter);
    this.reset = this._presenter.reset.bind(this._presenter);
    this.setTimeLimit = this._presenter.setTimeLimit.bind(this._presenter);
    this.stopPractice = this._presenter.stopPractice.bind(this._presenter);
    this.getStats = this._presenter.getStats.bind(this._presenter);
    this.focus = this._presenter.focus.bind(this._presenter);
    this.destroy = this._presenter.destroy.bind(this._presenter);
    this.getCharPosition = this._presenter.getCharPosition.bind(this._presenter);
    this.getContainerRect = this._presenter.getContainerRect.bind(this._presenter);
    this.refresh = this._presenter.reset.bind(this._presenter);

    // 策略相关
    this.strategy = null;
  }

  // ============================================
  // 兼容属性（代理到 Presenter）
  // ============================================

  get currentMode() {
    return this._presenter.state.currentMode;
  }

  get currentArticleId() {
    return this._presenter.state.currentArticleId;
  }

  get currentArticleTitle() {
    return this._presenter.state.currentArticleTitle;
  }

  get chars() {
    return this._presenter.state.chars;
  }

  get totalChars() {
    return this._presenter.state.totalChars;
  }

  get correct() {
    return this._presenter.state.correct;
  }

  get errors() {
    return this._presenter.state.errors;
  }

  get fixed() {
    return this._presenter.state.fixed;
  }

  get backspaces() {
    return this._presenter.state.backspaces;
  }

  get keystrokes() {
    return this._presenter.state.keystrokes;
  }

  get startTime() {
    return this._presenter.state.startTime;
  }

  get isFinished() {
    return this._presenter.isFinished;
  }

  get currentCharIndex() {
    return this._presenter.currentCharIndex;
  }

  get _effectiveElapsed() {
    return this._presenter._effectiveElapsed;
  }

  get _timerPaused() {
    return this._presenter._timerPaused;
  }

  // ============================================
  // 内部方法（供策略调用）- 代理到 Presenter
  // ============================================

  recordKeypress() {
    this._presenter.recordKeypress();
  }

  recordBackspace() {
    this._presenter.recordBackspace();
  }

  _handleCharInput(char) {
    this._presenter._handleCharInput(char);
  }

  _handleBackspace() {
    this._presenter._handleBackspace();
  }

  _stopTimer() {
    this._presenter._stopTimer();
  }

  _startTimer() {
    this._presenter._startTimer();
  }

  // ============================================
  // 统计显示相关（兼容外部调用）
  // ============================================

  _refreshStatsDisplay() {
    this._presenter._refreshStatsDisplay();
  }

  _updateProgressOnly() {
    this._presenter._updateProgressOnly();
  }

  _updateTimerDisplay(seconds) {
    this._presenter._updateTimerDisplay(seconds);
  }

  _calcStats() {
    return this._presenter.getStats();
  }

  _samplePeakSpeed() {
    // 已由 InputController 处理
  }

  // ============================================
  // 渲染方法（兼容外部调用）
  // ============================================

  _renderArticle() {
    this._presenter.view.renderChars(
      this._presenter.state.chars,
      this._presenter.state.currentCharIndex,
      this._presenter.state.isFinished
    );
  }

  _updateCurrentChar(index) {
    this._presenter.view.updateCurrentChar(index);
  }

  _scrollToCurrentChar() {
    this._presenter.view.scrollToChar(this._presenter.state.currentCharIndex);
  }

  _updateFloatingInputPosition() {
    this._presenter._updateFloatingInputPosition();
  }

  // ============================================
  // 策略管理（兼容外部调用）
  // ============================================

  clearStrategy() {
    this._presenter._clearStrategy();
  }

  // ============================================
  // 工具方法（兼容外部调用）
  // ============================================

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
    this._presenter._playSound();
  }
}
