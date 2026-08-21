/**
 * 砚迹（YanTrace）- 计时控制器
 * 职责：管理计时器（开始、暂停、恢复、超时检查）
 * 位置：modules/practice/controller/TimerController.js
 */

export default class TimerController {
  constructor(state, view) {
    this._state = state;
    this._view = view;
    this._timeLimit = 0;
    this._onTimeout = null;
  }

  /**
   * 设置限时模式
   * @param {number} seconds - 0 = 无限时
   */
  setTimeLimit(seconds) {
    this._timeLimit = seconds || 0;
    this._state.timeLimit = this._timeLimit;
    this._view.updateTimer(0, this._timeLimit);
  }

  /**
   * 设置超时回调
   * @param {Function} callback
   */
  onTimeout(callback) {
    this._onTimeout = callback;
  }

  /**
   * 开始计时
   */
  start() {
    if (this._state.statsTimer) return;

    this._state.startTime = Date.now();
    this._state.timerStartTime = Date.now();
    this._state.timerPaused = false;
    this._startStatsTimer();
  }

  /**
   * 暂停计时
   */
  pause() {
    if (!this._state.statsTimer) return;

    if (this._state.startTime) {
      this._state.effectiveElapsed +=
        (Date.now() - this._state.startTime) / 1000;
      this._state.timerAccumulated = this._state.effectiveElapsed;
    }

    clearInterval(this._state.statsTimer);
    this._state.statsTimer = null;
    this._state.timerPaused = true;

    this._view.updateTimer(
      Math.floor(this._state.timerAccumulated),
      this._timeLimit
    );
  }

  /**
   * 检查是否超时
   * @returns {boolean}
   */
  checkTimeout() {
    const elapsed = this._getElapsed();
    if (this._timeLimit > 0 && elapsed >= this._timeLimit) {
      if (this._onTimeout) this._onTimeout();
      return true;
    }
    return false;
  }

  /**
   * 获取当前有效时间（不含暂停）
   * @returns {number}
   */
  getElapsed() {
    return this._getElapsed();
  }

  /**
   * 刷新显示
   */
  refreshDisplay() {
    const elapsed = this._getElapsed();
    this._view.updateTimer(elapsed, this._timeLimit);
  }

  /**
   * 获取统计用的时间（用于计算速度）
   */
  getEffectiveElapsed() {
    let elapsed = this._state.effectiveElapsed;
    if (!this._state.timerPaused && this._state.startTime) {
      elapsed += (Date.now() - this._state.startTime) / 1000;
    }
    return elapsed;
  }

  /**
   * 销毁
   */
  destroy() {
    if (this._state.statsTimer) {
      clearInterval(this._state.statsTimer);
      this._state.statsTimer = null;
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  _getElapsed() {
    let elapsed = this._state.effectiveElapsed;
    if (!this._state.timerPaused && this._state.startTime) {
      elapsed += (Date.now() - this._state.startTime) / 1000;
    }
    return elapsed;
  }

  _startStatsTimer() {
    if (this._state.statsTimer) {
      clearInterval(this._state.statsTimer);
      this._state.statsTimer = null;
    }

    this._state.statsTimer = setInterval(() => {
      if (this._state.isFinished) {
        if (this._state.statsTimer) {
          clearInterval(this._state.statsTimer);
          this._state.statsTimer = null;
        }
        return;
      }

      const elapsed = this._getElapsed();
      this._view.updateTimer(elapsed, this._timeLimit);

      if (this._timeLimit > 0 && elapsed >= this._timeLimit) {
        if (this._onTimeout) this._onTimeout();
        return;
      }
    }, 1000);
  }
}