/**
 * 砚迹（YanTrace）- 数据展示组件
 * 职责：统一展示打字数据（练习完成 / 历史记录点击）
 * 纯 UI 组件，不包含业务逻辑
 */

export default class DataDisplay {
  constructor() {
    this.overlay = null;
    this.title = null;
    this.mainNumber = null;
    this.mainLabel = null;
    this.grid = null;
    this.restartBtn = null;
    this.copyBtn = null;
    this.homeBtn = null;
    this._onRestart = null;

    this._cacheElements();
    this._bindEvents();
  }

  // ============================================
  // DOM 缓存
  // ============================================

  _cacheElements() {
    this.overlay = document.getElementById("resultOverlay");
    this.title = document.getElementById("resultTitle");
    this.mainNumber = document.getElementById("resultMainNumber");
    this.mainLabel = document.getElementById("resultMainLabel");
    this.grid = document.getElementById("resultGrid");

    this.restartBtn = document.getElementById("resultRestartBtn");
    this.copyBtn = document.getElementById("resultCopyBtn");
    this.homeBtn = document.getElementById("resultHomeBtn");
  }

  // ============================================
  // 事件绑定
  // ============================================

  _bindEvents() {
    if (this.copyBtn) {
      this.copyBtn.addEventListener("click", () => this._copyResult());
    }

    if (this.homeBtn) {
      this.homeBtn.addEventListener("click", () => {
        this.hide();
        if (window.app?.navigator) {
          window.app.navigator.goTo("home");
        }
      });
    }

    if (this.restartBtn) {
      this.restartBtn.addEventListener("click", () => {
        this.hide();
        if (this._onRestart) {
          this._onRestart();
        }
      });
    }
  }

  /**
   * 设置重新开始回调
   */
  onRestart(callback) {
    this._onRestart = callback;
  }

  // ============================================
  // 公共方法
  // ============================================

  /**
   * 显示数据展示弹窗
   */
  show(data) {
    const {
      stats,
      mode,
      articleTitle,
      createdAt,
      actionLabel,
      showRestart = true,
    } = data;

    if (!stats) return;

    const isChinese = mode === "practice-cn" || mode === "input-cn";
    const isPractice = mode.startsWith("practice");

    // 标题
    let titleText = "";
    if (actionLabel) {
      titleText = actionLabel;
    } else if (isPractice) {
      titleText = isChinese
        ? "🎉 中文练习完成！"
        : "🎉 English Practice Complete!";
    } else {
      titleText = isChinese ? "📝 中文录入完成" : "📝 English Input Complete";
    }
    this.title.textContent = titleText;

    // 主速度
    const speed = isChinese ? stats.cpm : stats.wpm;
    const netSpeed = isChinese ? stats.netCpm : stats.netWpm;
    this.mainNumber.textContent = `${speed || 0} / ${netSpeed || 0}`;
    this.mainLabel.textContent = isChinese ? "CPM / 净CPM" : "WPM / 净WPM";

    // 统计网格
    const items = this._buildGridItems(stats, isChinese);
    this.grid.innerHTML = items
      .map(
        (item) =>
          `<div class="item">
                <div class="num" style="color:${item.color}">${item.num}</div>
                <div class="lbl">${item.label}</div>
            </div>`,
      )
      .join("");

    // 重新开始按钮
    if (this.restartBtn) {
      this.restartBtn.style.display =
        isPractice && showRestart ? "inline-block" : "none";
    }

    this.overlay.classList.add("show");
    console.log(`📊 数据展示: ${titleText}`);
  }

  /**
   * 隐藏弹窗
   */
  hide() {
    this.overlay.classList.remove("show");
  }

  // ============================================
  // 私有方法
  // ============================================

  _buildGridItems(stats, isChinese) {
    const items = [];

    items.push({
      num: isChinese ? stats.cpm || 0 : stats.wpm || 0,
      label: isChinese ? "CPM" : "WPM",
      color: "#60a5fa",
    });
    items.push({
      num: isChinese ? stats.netCpm || 0 : stats.netWpm || 0,
      label: isChinese ? "净CPM" : "净WPM",
      color: "#34d399",
    });
    items.push({
      num: stats.kpm || 0,
      label: "KPM",
      color: "#f59e0b",
    });
    items.push({
      num: (stats.actualAccuracy || 0) + "%",
      label: "准确率",
      color: "#34d399",
    });
    items.push({
      num: (stats.backspaceRate || 0) + "%",
      label: "退格率",
      color: "#f59e0b",
    });
    items.push({
      num: (stats.elapsed || 0) + "s",
      label: "用时",
      color: "#f87171",
    });
    items.push({
      num: stats.kspc || 0,
      label: "KSPC",
      color: "#a78bfa",
    });
    items.push({
      num: stats.correct || 0,
      label: "✅ 正确",
      color: "#34d399",
    });
    items.push({
      num: stats.errors || 0,
      label: "❌ 错误",
      color: "#f87171",
    });

    if (stats.fixed > 0) {
      items.push({
        num: stats.fixed || 0,
        label: "🔄 改正",
        color: "#fbbf24",
      });
    }

    return items;
  }

  _getResultText() {
    const items = this.grid.querySelectorAll(".item");
    let text = "📊 打字统计结果\n";
    text += "─".repeat(35) + "\n";
    text += `${this.mainLabel.textContent}: ${this.mainNumber.textContent}\n`;
    text += "─".repeat(35) + "\n";

    items.forEach((item) => {
      const num = item.querySelector(".num")?.textContent || "";
      const label = item.querySelector(".lbl")?.textContent || "";
      text += `${label}: ${num}\n`;
    });

    text += "─".repeat(35) + "\n";
    text += `📅 ${new Date().toLocaleString()}`;
    return text;
  }

  _copyResult() {
    const text = this._getResultText();

    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      alert("📋 结果已复制到剪贴板！");
    } catch (e) {
      console.error("复制失败:", e);
      alert("复制失败，请手动复制");
    }
  }

}
