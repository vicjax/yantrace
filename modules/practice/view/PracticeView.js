/**
 * 砚迹（YanTrace）- 练习视图
 * 职责：所有 DOM 渲染操作，不包含业务逻辑
 * 位置：modules/practice/view/PracticeView.js
 */

import { formatTime } from "../../../utils/stats.js";

export default class PracticeView {
  constructor() {
    this.textBox = null;
    this.statsEl = { cn: null, en: null };
    this.timerEl = { cn: null, en: null };
    this.progressEl = { cn: null, en: null };
  }

  /**
   * 绑定 DOM 元素
   */

  bind(pageId, elements) {
    const isChinese =
      pageId === "practice-cn" ||
      pageId === "practice-phrase-cn" ||
      pageId === "practice-phrase-cn";
    const prefix = isChinese ? "cn" : "en";

    this.textBox = elements.textBox;

    this.statsEl = {
      speed:
        elements[`${prefix}Speed`] ||
        elements[`${prefix}Cpm`] ||
        elements[`${prefix}Wpm`],
      kpm: elements[`${prefix}Kpm`],
      kspc: elements[`${prefix}Kspc`],
      accuracy: elements[`${prefix}Accuracy`],
      progressChars: elements[`${prefix}ProgressChars`],
      totalChars: elements[`${prefix}TotalChars`],
      peakSpeed: elements[`${prefix}PeakSpeed`],
      progressFill: elements[`${prefix}ProgressFill`],
      progressText: elements[`${prefix}ProgressText`],
    };

    this.timerEl = {
      timer: elements[`${prefix}Timer`],
    };

    this.progressEl = {
      fill: elements[`${prefix}ProgressFill`],
      text: elements[`${prefix}ProgressText`],
    };
  }

  /**
   * 渲染字符
   */
  renderChars(chars, currentIndex, isFinished) {
    if (!this.textBox) return;

    const html = chars
      .map((item, index) => {
        const char = item.char;
        const display = char === " " ? "&nbsp;" : this._escapeHtml(char);

        let displayStatus = item.status;
        if (item.status === "pending" && item.keepColor) {
          displayStatus = item.keepColor;
        }
        const statusClass = displayStatus !== "pending" ? displayStatus : "";
        const currentClass =
          index === currentIndex && !isFinished ? "current" : "";
        return `<span class="char ${statusClass} ${currentClass}" data-index="${index}">${display}</span>`;
      })
      .join("");

    this.textBox.innerHTML = html;
  }

  /**
   * 更新当前字符高亮
   */
  updateCurrentChar(index) {
    this.textBox?.querySelectorAll(".char.current").forEach((el) => {
      el.classList.remove("current");
    });

    const charEl = this.textBox?.querySelector(`.char[data-index="${index}"]`);
    if (charEl) {
      charEl.classList.add("current");
    }
  }

  /**
   * 更新统计显示
   */
  updateStats(stats, isChinese) {
    const el = this.statsEl;

    if (isChinese && el.speed) {
      el.speed.textContent = stats.netCpm;
    } else if (!isChinese && el.speed) {
      el.speed.textContent = stats.netWpm;
    }

    if (el.kpm) el.kpm.textContent = stats.kpm;
    if (el.kspc) el.kspc.textContent = stats.kspc;
    if (el.accuracy) el.accuracy.textContent = stats.actualAccuracy;
    if (el.progressChars) el.progressChars.textContent = stats.processed;
    if (el.totalChars) el.totalChars.textContent = stats.totalChars;
    if (el.peakSpeed) el.peakSpeed.textContent = stats.peakSpeed;
  }

  /**
   * 更新计时器显示
   */
  updateTimer(seconds, timeLimit) {
    let displaySeconds = seconds;
    let isCountdown = false;

    if (timeLimit > 0) {
      displaySeconds = Math.max(0, timeLimit - seconds);
      isCountdown = true;
    }

    const timerText = formatTime(Math.floor(displaySeconds));
    const isWarning = isCountdown && displaySeconds < 10;

    const timerEl = this.timerEl.timer;
    if (timerEl) {
      timerEl.textContent = timerText;
      timerEl.style.color = isWarning ? "var(--color-danger)" : "";
    }
  }

  /**
   * 更新进度显示
   */
  updateProgress(progress) {
    if (this.progressEl.fill) {
      this.progressEl.fill.style.width = progress + "%";
    }
    if (this.progressEl.text) {
      this.progressEl.text.textContent = progress + "%";
    }
  }

  /**
   * 重置所有统计显示
   */
  resetStats() {
    const el = this.statsEl;
    if (el.speed) el.speed.textContent = "0";
    if (el.kpm) el.kpm.textContent = "0";
    if (el.kspc) el.kspc.textContent = "0";
    if (el.accuracy) el.accuracy.textContent = "100";
    if (el.progressChars) el.progressChars.textContent = "0";
    if (el.totalChars) el.totalChars.textContent = "0";
    if (el.peakSpeed) el.peakSpeed.textContent = "0";
    if (el.progressFill) el.progressFill.style.width = "0%";
    if (el.progressText) el.progressText.textContent = "0%";
  }

  /**
   * 重置计时器
   */
  resetTimer() {
    if (this.timerEl.timer) {
      this.timerEl.timer.textContent = "00:00";
      this.timerEl.timer.style.color = "";
    }
  }

  /**
   * 清除高亮
   */
  clearHighlights() {
    this.textBox?.querySelectorAll(".char.current").forEach((el) => {
      el.classList.remove("current");
    });
  }

  /**
   * 获取字符位置
   */
  getCharPosition(index) {
    if (!this.textBox) return null;
    const charEl = this.textBox.querySelector(`.char[data-index="${index}"]`);
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

  /**
   * 获取容器位置
   */
  getContainerRect() {
    return this.textBox?.getBoundingClientRect() || null;
  }

  /**
   * 滚动到当前字符
   */
  scrollToChar(index) {
    if (!this.textBox) return;
    const charEl = this.textBox.querySelector(`.char[data-index="${index}"]`);
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
}
