/**
 * 砚迹（YanTrace）- 计时控制器
 * 职责：统一计时管理，支持重新初始化
 * 位置：modules/practice/controller/TimerController.js
 */

const TimerState = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
};

export default class TimerController {
  constructor(state, view) {
    this._state = state;
    this._view = view;
    this._timeLimit = 0;
    this._timerState = TimerState.IDLE;

    this._listeners = {
      tick: [],
      timeout: [],
    };
  }

  // ============================================
  // 事件注册
  // ============================================

  onTick(callback) {
    if (typeof callback === 'function') {
      this._listeners.tick.push(callback);
    }
  }

  onTimeout(callback) {
    if (typeof callback === 'function') {
      this._listeners.timeout.push(callback);
    }
  }

  // ============================================
  // 核心方法
  // ============================================

  /**
   * 重新初始化（加载/切换/重置时调用）
   * 重置所有数据，保留监听器
   */
  reinit() {
    if (this._state.statsTimer) {
      clearInterval(this._state.statsTimer);
      this._state.statsTimer = null;
    }

    this._state.startTime = null;
    this._state.timerStartTime = null;
    this._state.timerPaused = false;
    this._state.timerAccumulated = 0;
    this._state.effectiveElapsed = 0;
    this._timerState = TimerState.IDLE;

    this._view.updateTimer(0, this._timeLimit);
  }

  /**
   * 启动/恢复计时（打字时调用）
   */
  start() {
    if (this._state.statsTimer) return;

    // 从暂停恢复
    if (this._timerState === TimerState.PAUSED) {
      this._state.startTime = performance.now();
      this._state.timerPaused = false;
      this._timerState = TimerState.RUNNING;
      this._startStatsTimer();
      return;
    }

    // 首次启动
    this._state.startTime = performance.now();
    this._state.timerStartTime = performance.now();
    this._state.timerPaused = false;
    this._timerState = TimerState.RUNNING;
    this._startStatsTimer();
  }

  /**
   * 暂停计时（失焦时调用）
   */
  pause() {
    if (!this._state.statsTimer) return;

    if (this._state.startTime) {
      this._state.effectiveElapsed += (performance.now() - this._state.startTime) / 1000;
      this._state.timerAccumulated = this._state.effectiveElapsed;
    }

    clearInterval(this._state.statsTimer);
    this._state.statsTimer = null;
    this._state.timerPaused = true;
    this._timerState = TimerState.PAUSED;

    this._view.updateTimer(
      Math.floor(this._state.timerAccumulated),
      this._timeLimit
    );
  }

  /**
   * 设置限时模式
   */
  setTimeLimit(seconds) {
    this._timeLimit = seconds || 0;
    this._state.timeLimit = this._timeLimit;
    this._view.updateTimer(0, this._timeLimit);
  }

  /**
   * 获取有效时间（不含暂停）
   */
  getEffectiveElapsed() {
    let elapsed = this._state.effectiveElapsed;
    if (this._timerState === TimerState.RUNNING && this._state.startTime) {
      elapsed += (performance.now() - this._state.startTime) / 1000;
    }
    return elapsed;
  }

  /**
   * 获取当前状态
   */
  getState() {
    return this._timerState;
  }

  /**
   * 获取状态快照（用于恢复）
   */
  getSnapshot() {
    return {
      state: this._timerState,
      elapsed: this.getEffectiveElapsed(),
      timeLimit: this._timeLimit,
    };
  }

  /**
   * 销毁（页面卸载时调用）
   */
  destroy() {
    if (this._state.statsTimer) {
      clearInterval(this._state.statsTimer);
      this._state.statsTimer = null;
    }
    this._listeners.tick = [];
    this._listeners.timeout = [];
  }

  // ============================================
  // 私有方法
  // ============================================

  _emit(event, data) {
    const listeners = this._listeners[event] || [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (e) {
        console.warn(`[TimerController] ${event} 监听器执行失败:`, e);
      }
    }
  }

  _startStatsTimer() {
    if (this._state.statsTimer) {
      clearInterval(this._state.statsTimer);
      this._state.statsTimer = null;
    }

    let lastTick = performance.now();

    this._state.statsTimer = setInterval(() => {
      if (this._state.isFinished) {
        if (this._state.statsTimer) {
          clearInterval(this._state.statsTimer);
          this._state.statsTimer = null;
        }
        return;
      }

      // 时间补偿：检测事件循环延迟
      const now = performance.now();
      const delta = now - lastTick;
      if (delta > 1100) {
        this._state.effectiveElapsed += (delta - 1000) / 1000;
        this._state.timerAccumulated = this._state.effectiveElapsed;
      }
      lastTick = now;

      const elapsed = this.getEffectiveElapsed();
      this._view.updateTimer(elapsed, this._timeLimit);
      this._emit('tick', { elapsed });

      if (this._timeLimit > 0 && elapsed >= this._timeLimit) {
        this._emit('timeout');
        return;
      }
    }, 1000);
  }
}
