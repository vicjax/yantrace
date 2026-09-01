/**
 * 砚迹（YanTrace）- 练习状态管理
 */

export default class PracticeState {
  constructor() {
    this.reset();
  }

  reset() {
    // 字符数据
    this.chars = [];
    this.totalChars = 0;
    this.currentCharIndex = 0;

    // 进度数据
    this.correct = 0;
    this.errors = 0;
    this.fixed = 0;
    this.backspaces = 0;
    this.keystrokes = 0;

    // 计时数据
    this.startTime = null;
    this.isFinished = false;
    this.currentMode = 'chinese';
    this.currentArticleId = null;
    this.currentArticleTitle = '';

    // 峰值速度
    this.peakCpm = 0;
    this.peakWpm = 0;

    // 限时模式
    this.timeLimit = 0;

    // 计时器控制
    this.timerPaused = false;
    this.timerAccumulated = 0;
    this.effectiveElapsed = 0;
    this.timerStartTime = null;
    this.timerSeconds = 0;
    this.statsTimer = null;
  }

  setChars(chars) {
    this.chars = chars;
    this.totalChars = chars.length;
  }

  getCurrentChar() {
    if (this.currentCharIndex >= this.totalChars) return null;
    return this.chars[this.currentCharIndex];
  }

  isComplete() {
    return this.currentCharIndex >= this.totalChars;
  }

  getProcessed() {
    return this.correct + this.errors + this.fixed;
  }

  getTotalCorrect() {
    return this.correct + this.fixed;
  }

  hasProgress() {
    return this.correct > 0 || this.errors > 0 || this.fixed > 0;
  }
}