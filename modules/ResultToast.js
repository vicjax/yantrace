/**
 * 砚迹（YanTrace）- 完成提示弹窗
 * 职责：练习完成后显示简略数据，提供入口
 * 位置：modules/ResultToast.js（全局 UI 组件）
 */

export default class ResultToast {
  constructor() {
    this.overlay = null;
    this.title = null;
    this.speedEl = null;
    this.speedLabelEl = null;
    this.accuracyEl = null;
    this.timeEl = null;
    this.charsEl = null;
    this.restartBtn = null;
    this.detailBtn = null;

    this._onRestart = null;
    this._onDetail = null;
    this._isShowing = false;
    this._pendingData = null;
    this._saved = true; // ⭐ 新增

    this._cacheElements();
    this._bindEvents();
    this._bindShortcuts();
  }

  // ============================================
  // DOM 缓存
  // ============================================

  _cacheElements() {
    this.overlay = document.getElementById("resultOverlay");
    this.title = document.getElementById("resultTitle");
    this.speedEl = document.getElementById("resultMainNumber");
    this.speedLabelEl = document.getElementById("resultMainLabel");
    this.accuracyEl = document.getElementById("resultAccuracy");
    this.timeEl = document.getElementById("resultTime");
    this.charsEl = document.getElementById("resultChars");

    this.restartBtn = document.getElementById("resultRestartBtn");
    this.detailBtn = document.getElementById("resultDetailBtn");
    this.homeBtn = document.getElementById("resultHomeBtn");

    const grid = document.getElementById("resultGrid");
    if (grid) grid.style.display = "none";
  }

  // ============================================
  // 事件绑定
  // ============================================

  _bindEvents() {
    if (this.restartBtn) {
      this.restartBtn.addEventListener("click", () => {
        this.hide();
        if (this._onRestart) this._onRestart();
      });
    }

    if (this.detailBtn) {
      this.detailBtn.addEventListener("click", () => {
        // ⭐ 未保存时不执行任何操作
        if (!this._saved) return;
        this.hide();
        if (this._onDetail && this._pendingData) {
          this._onDetail(this._pendingData);
        }
      });
    }

    if (this.homeBtn) {
      this.homeBtn.addEventListener("click", () => {
        this.hide();
        if (window.app?.navigator) {
          window.app.navigator.goTo("home");
        }
      });
    }

    if (this.overlay) {
      this.overlay.addEventListener("click", (e) => {
        if (e.target === this.overlay) {
          this.hide();
        }
      });
    }
  }

  // ============================================
  // 快捷键
  // ============================================

  _bindShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (!this._isShowing) return;

      if (e.key === "Escape") {
        e.preventDefault();
        this.hide();
      }

      if (e.key === "Enter") {
        e.preventDefault();
        this.hide();
        if (this._onRestart) this._onRestart();
      }
    });
  }

  // ============================================
  // 公共方法
  // ============================================

  setCallbacks(onRestart, onDetail) {
    this._onRestart = onRestart;
    this._onDetail = onDetail;
  }

  /**
   * 显示弹窗
   */
  show(stats, mode, articleTitle, saved = true) {
    if (!stats) return;

    this._pendingData = { stats, mode, articleTitle, createdAt: Date.now() };

    // ⭐ 保存状态供点击事件使用
    this._saved = saved;

    const isChinese = mode === "practice-cn" || mode === "input-cn";
    const rawSpeed = isChinese ? stats.cpm : stats.wpm;
    const speedLabel = isChinese ? "CPM" : "WPM";
    const accuracy = stats.actualAccuracy || 0;
    const netSpeed = Math.round(rawSpeed * (accuracy / 100));

    // 标题
    if (this.title) {
      if (stats.stopped) {
        this.title.textContent = saved
          ? "⏹️ 练习已停止"
          : "⏹️ 练习未达标（已停止）";
        this.title.style.color = "#f59e0b";
      } else {
        this.title.textContent = saved ? "🎉 练习完成！" : "📉 练习未达标";
        this.title.style.color = saved ? "" : "#f59e0b";
      }
    }

    // 速度
    if (this.speedEl) this.speedEl.textContent = netSpeed || 0;
    if (this.speedLabelEl) this.speedLabelEl.textContent = speedLabel;

    // 准确率
    if (this.accuracyEl) {
      this.accuracyEl.textContent = (stats.actualAccuracy || 0) + "%";
    }

    // 用时
    if (this.timeEl) {
      this.timeEl.textContent = (stats.elapsed || 0) + "s";
    }

    // 字数
    if (this.charsEl) {
      const processed = stats.processed || 0;
      const total = stats.totalChars || 0;
      this.charsEl.textContent = `${processed}/${total}`;
    }

    // ⭐ 按钮文字和样式
    if (this.detailBtn) {
      if (saved) {
        this.detailBtn.textContent = "📊 查看详细数据";
        this.detailBtn.style.opacity = "1";
        this.detailBtn.style.cursor = "pointer";
      } else {
        this.detailBtn.textContent = "❌ 未保存记录";
        this.detailBtn.style.opacity = "0.5";
        this.detailBtn.style.cursor = "default";
      }
    }

    // 显示弹窗
    if (this.overlay) {
      this.overlay.classList.add("show");
      this.overlay.classList.add("toast-mode");
    }

    this._isShowing = true;
  }

  /**
   * 隐藏弹窗
   */
  hide() {
    if (this.overlay) {
      this.overlay.classList.remove("show");
      this.overlay.classList.remove("toast-mode");
    }
    this._isShowing = false;
  }
}
