/**
 * 砚迹（YanTrace）- 练习视图
 */

import { formatTime } from "../../utils/stats.js";

export default class PracticeView {
  constructor() {
    this.textBox = null;
    this.statsEl = { cn: null, en: null };
    this.timerEl = { cn: null, en: null };
    this.progressEl = { cn: null, en: null };
  }

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
   * 渲染原始内容（首次加载/切换/重置时使用）
   * @param {string} rawContent - 原始内容
   * @param {Array} chars - 字符数组
   * @param {number} currentIndex - 当前索引
   * @param {boolean} isFinished - 是否完成
   * @param {string} contentType - 'article' | 'phrase'
   */
  renderRawContent(
    rawContent,
    chars,
    currentIndex,
    isFinished,
    contentType = "article",
  ) {
    if (!this.textBox) return;

    if (!rawContent || !rawContent.trim()) {
      this.textBox.innerHTML = "";
      return;
    }

    // 词组：词列表渲染
    if (contentType === "phrase") {
      this._renderPhrase(rawContent, chars, currentIndex, isFinished);
      return;
    }

    // 文章/诗词：段落/行渲染
    this._renderArticleOrPoem(rawContent, chars, currentIndex, isFinished);
  }

  /**
   * 文章/诗词渲染
   */
  _renderArticleOrPoem(rawContent, chars, currentIndex, isFinished) {
    const blocks = rawContent.split(/\n\n/);
    let charOffset = 0;

    const html = blocks
      .map((block) => {
        if (!block.trim()) return "";

        if (block.includes("\n")) {
          const lines = block.split("\n").filter((l) => l.trim());
          return lines
            .map((line) => {
              const start = charOffset;
              const end = start + line.length;
              charOffset = end;
              const lineChars = chars.slice(start, end);
              const hasCurrent = start <= currentIndex && currentIndex < end;
              return `<div class="line poem-line">${this._renderCharSpan(
                lineChars,
                start,
                hasCurrent ? currentIndex : -1,
                isFinished,
              )}</div>`;
            })
            .join("");
        } else {
          const start = charOffset;
          const end = start + block.length;
          charOffset = end;
          const blockChars = chars.slice(start, end);
          return `<p class="practice-para">${this._renderCharSpan(
            blockChars,
            start,
            currentIndex,
            isFinished,
          )}</p>`;
        }
      })
      .join("");

    this.textBox.innerHTML = html;
    this.textBox.style.textIndent = "0";
  }

  /**
   * 词组渲染：词列表，词间距
   */
  /**
   * 词组渲染：flex 换行，词间距
   */
  _renderPhrase(rawContent, chars, currentIndex, isFinished) {
    const words = rawContent.split(" ");
    let charOffset = 0;

    const html = words
      .map((word) => {
        const start = charOffset;
        const end = start + word.length;
        charOffset = end;
        const wordChars = chars.slice(start, end);
        const hasCurrent = start <= currentIndex && currentIndex < end;
        return `<span class="phrase-word">${this._renderCharSpan(
          wordChars,
          start,
          hasCurrent ? currentIndex : -1,
          isFinished,
        )}</span>`;
      })
      .join("");

    this.textBox.innerHTML = `<div class="phrase-container">${html}</div>`;
    this.textBox.style.textIndent = "0";
  }

  /**
   * 渲染字符区间（辅助方法）
   */
  _renderCharSpan(chars, offset, currentIndex, isFinished) {
    return chars
      .map((item, idx) => {
        const globalIndex = offset + idx;
        const char = item.char;
        const display = char === " " ? "&nbsp;" : this._escapeHtml(char);
        let displayStatus = item.status;
        if (item.status === "pending" && item.keepColor) {
          displayStatus = item.keepColor;
        }
        const statusClass = displayStatus !== "pending" ? displayStatus : "";
        const currentClass =
          globalIndex === currentIndex && !isFinished ? "current" : "";
        return `<span class="char ${statusClass} ${currentClass}" data-index="${globalIndex}">${display}</span>`;
      })
      .join("");
  }

  /**
   * 更新单个字符状态（打字时使用）
   */
  updateCharStatus(index, status) {
    const charEl = this.textBox?.querySelector(`.char[data-index="${index}"]`);
    if (!charEl) return;

    charEl.classList.remove("correct", "error", "fixed");
    if (status && status !== "pending") {
      charEl.classList.add(status);
    }
  }

  /**
   * 更新当前字符高亮（打字时使用）
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
   * 连续渲染（降级方案）
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

  // ============================================
  // 以下方法保持不变
  // ============================================

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

  updateProgress(progress) {
    if (this.progressEl.fill) {
      this.progressEl.fill.style.width = progress + "%";
    }
    if (this.progressEl.text) {
      this.progressEl.text.textContent = progress + "%";
    }
  }

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

  resetTimer() {
    if (this.timerEl.timer) {
      this.timerEl.timer.textContent = "00:00";
      this.timerEl.timer.style.color = "";
    }
  }

  clearHighlights() {
    this.textBox?.querySelectorAll(".char.current").forEach((el) => {
      el.classList.remove("current");
    });
  }

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

  getContainerRect() {
    return this.textBox?.getBoundingClientRect() || null;
  }

  scrollToChar(index) {
    if (!this.textBox) return;

    // 如果索引无效，滚动到顶部
    if (index < 0) {
      this.textBox.scrollTop = 0;
      return;
    }

    const charEl = this.textBox.querySelector(`.char[data-index="${index}"]`);
    if (!charEl) return;

    const containerRect = this.textBox.getBoundingClientRect();
    const charRect = charEl.getBoundingClientRect();

    // 计算行高
    const computedStyle = getComputedStyle(this.textBox);
    const fontSize = parseFloat(computedStyle.fontSize) || 22;
    const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 2;

    // 字符距离容器底部的距离（像素）
    const distanceToBottom = containerRect.bottom - charRect.bottom;

    // 触发滚动的阈值：3 行高度
    const threshold = lineHeight * 3;

    if (distanceToBottom < threshold) {
      // 计算字符在容器中的位置（行数）
      const charOffset = charRect.top - containerRect.top;
      const lineNumber = Math.round(charOffset / lineHeight);

      // 目标：让字符出现在第 2 行（从 0 开始）
      const targetLine = 2;
      const targetOffset = targetLine * lineHeight;

      // 计算滚动量
      const scrollDelta = charOffset - targetOffset;
      this.textBox.scrollTop += scrollDelta;
    }

    // 如果字符在容器上方（退格或跳转），滚动到顶部附近
    if (charRect.top < containerRect.top) {
      const charOffset = charRect.top - containerRect.top;
      const targetOffset = lineHeight; // 保留 1 行空间
      const scrollDelta = charOffset - targetOffset;
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
