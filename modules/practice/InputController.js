/**
 * 砚迹（YanTrace）- 输入控制器
 */

import { calcStats } from "./StatsEngine.js";

const STATUS = {
  PENDING: "pending",
  CORRECT: "correct",
  ERROR: "error",
  FIXED: "fixed",
};

export default class InputController {
  constructor(state, view, timer, onComplete) {
    this._state = state;
    this._view = view;
    this._timer = timer;
    this._onComplete = onComplete;

    this._peakCpm = 0;
    this._peakWpm = 0;
  }

  handleCharInput(char) {
    if (this._state.isFinished) return;
    if (this._state.totalChars === 0) return;
    if (this._state.currentCharIndex >= this._state.totalChars) return;

    const idx = this._state.currentCharIndex;
    const item = this._state.chars[idx];
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

    this._state.correct += correctChange;
    this._state.errors += errorsChange;
    this._state.fixed += fixedChange;

    item.keepColor = null;
    item.status = newStatus;

    this._state.currentCharIndex++;
    
    // ⭐ 打字后只更新单个字符状态，不重新渲染全部
    this._view.updateCharStatus(idx, newStatus);
    this._view.updateCurrentChar(this._state.currentCharIndex);

    this._updateProgress();
    this._samplePeakSpeed();
    this._view.scrollToChar(this._state.currentCharIndex);

    if (this._state.currentCharIndex >= this._state.totalChars) {
      this._state.isFinished = true;
      if (this._state.statsTimer) {
        clearInterval(this._state.statsTimer);
        this._state.statsTimer = null;
      }
      if (this._onComplete) {
        this._onComplete(this._getStats());
      }
    }
  }

  handleBackspace() {
    if (this._state.isFinished) return;
    if (this._state.currentCharIndex === 0) return;

    this._state.currentCharIndex--;
    
    const item = this._state.chars[this._state.currentCharIndex];
    const currentStatus = item.status;

    if (currentStatus === STATUS.PENDING) {
      this._view.updateCurrentChar(this._state.currentCharIndex);
      return;
    }

    if (currentStatus === STATUS.CORRECT) {
      this._state.correct--;
    } else if (currentStatus === STATUS.ERROR) {
      this._state.errors--;
    } else if (currentStatus === STATUS.FIXED) {
      this._state.fixed--;
    }

    item.keepColor = currentStatus;
    item.status = STATUS.PENDING;

    // ⭐ 退格后只更新单个字符状态，不重新渲染全部
    this._view.updateCharStatus(this._state.currentCharIndex, STATUS.PENDING);
    this._view.updateCurrentChar(this._state.currentCharIndex);

    this._updateProgress();
    this._view.scrollToChar(this._state.currentCharIndex);
  }

  recordKeypress() {
    this._state.keystrokes++;
    this._timer.start();
    this._updateProgress();
    this._playSound();
  }

  recordBackspace() {
    this._state.backspaces++;
    this._state.keystrokes++;
    this._updateProgress();
    this._playSound();
  }

  getPeakSpeed() {
    return this._state.currentMode === "chinese"
      ? this._peakCpm
      : this._peakWpm;
  }

  resetPeak() {
    this._peakCpm = 0;
    this._peakWpm = 0;
  }

  _updateProgress() {
    const stats = this._getStats();
    this._view.updateProgress(stats.progress);
  }

  _samplePeakSpeed() {
    if (!this._state.startTime) return;

    const elapsed = this._timer.getEffectiveElapsed();
    if (elapsed < 10) return;

    const effectiveChars = this._state.correct + this._state.fixed;
    if (effectiveChars < 5) return;

    const minutes = elapsed / 60;
    const netCpm = Math.round(effectiveChars / minutes);

    if (this._state.currentMode === "chinese") {
      if (netCpm > this._peakCpm) {
        this._peakCpm = netCpm;
      }
    } else {
      const netWpm = Math.round(netCpm / 5);
      if (netWpm > this._peakWpm) {
        this._peakWpm = netWpm;
      }
    }
  }

  _getStats() {
    const elapsed = this._timer.getEffectiveElapsed();
    return calcStats(this._state, elapsed, this._peakCpm, this._peakWpm);
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