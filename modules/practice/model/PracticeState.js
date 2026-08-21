/**
 * 砚迹（YanTrace）- 练习状态管理
 * 职责：统一管理打字引擎的所有运行时状态
 * 位置：modules/practice/model/PracticeState.js
 */

export default class PracticeState {
  constructor() {
    this.reset();
  }

  /**
   * 重置所有状态
   */
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
    this.currentMode = "chinese";
    this.currentArticleId = null;
    this.currentArticleTitle = "";

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

  /**
   * 设置字符数组
   */
  setChars(chars) {
    this.chars = chars;
    this.totalChars = chars.length;
  }

  /**
   * 获取当前字符
   */
  getCurrentChar() {
    if (this.currentCharIndex >= this.totalChars) return null;
    return this.chars[this.currentCharIndex];
  }

  /**
   * 是否已完成
   */
  isComplete() {
    return this.currentCharIndex >= this.totalChars;
  }

  /**
   * 获取处理字符数（正确+错误+改正）
   */
  getProcessed() {
    return this.correct + this.errors + this.fixed;
  }

  /**
   * 获取正确字符数
   */
  getTotalCorrect() {
    return this.correct + this.fixed;
  }

  /**
   * 是否有输入进度
   */
  hasProgress() {
    return this.correct > 0 || this.errors > 0 || this.fixed > 0;
  }
}
