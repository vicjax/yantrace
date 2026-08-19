/**
 * SettingsView - 设置视图（弹窗紧凑版）
 * 职责：渲染设置弹窗 UI，不包含业务逻辑
 */
export default class SettingsView {
  constructor(options = {}) {
    this.onSave = options.onSave || null;
    this.onReset = options.onReset || null;
    this.onSoundTest = options.onSoundTest || null;
    this.onClose = options.onClose || null;
    this.container = null;
    this.settings = {};
  }

  render(container) {
    this.container = container;
    container.innerHTML = this._getHtml();
    this._cacheElements();
    this._bindEvents();
    this._populateForm();
  }

  populate(settings) {
    this.settings = settings;
    this._populateForm();
  }

  getSettings() {
    return {
      fontSize: parseInt(this.fontSizeSlider?.value) || 22,
      pageHeight: parseInt(this.pageHeightSlider?.value) || 550,
      theme: this.themeSelect?.value || "dark", // ← 直接读取下拉框值
      sound: this.soundSelect?.value || "off",
    };
  }

  destroy() {
    this.container = null;
  }

  // ============================================
  // 私有方法
  // ============================================

  _getHtml() {
    return `
            <div class="settings-modal-header">
                <h2>⚙️ 设置</h2>
                <button class="settings-modal-close" id="settingsCloseBtn">✕</button>
            </div>

            <div class="settings-panel">

                <!-- 外观 -->
                <div class="settings-section">
                    <div class="section-label">🎨 外观</div>

                <div class="settings-row">
                    <span class="settings-label">主题</span>
                    <div class="settings-control">
                        <select id="themeSelect">
                            <option value="dark">🌙 深空灰（暗色）</option>
                            <option value="light">☀️ 暖阳白（亮色）</option>
                            <option value="eye-care">🌿 豆沙绿（护眼）</option>
                            <option value="warm-yellow">📜 暖黄（护眼）</option>
                        </select>
                    </div>
                </div>

                <div class="settings-row">
                    <span class="settings-label">字体大小</span>
                    <div class="settings-control">
                        <input type="range" id="fontSizeSlider" min="14" max="36" step="1" />
                        <span class="settings-value" id="fontSizeValue">22px</span>
                    </div>
                </div>
                </div>

                <!-- 布局 -->
                <div class="settings-section">
                    <div class="section-label">📐 布局</div>

                    <div class="settings-row">
                        <span class="settings-label">页面高度</span>
                        <div class="settings-control">
                            <input type="range" id="pageHeightSlider" min="400" max="800" step="10" />
                            <span class="settings-value" id="pageHeightValue">550px</span>
                        </div>
                    </div>
                </div>

                <!-- 声音 -->
                <div class="settings-section">
                    <div class="section-label">🔊 声音</div>

                    <div class="settings-row">
                        <span class="settings-label">按键音效</span>
                        <div class="settings-control">
                            <select id="soundSelect">
                                <option value="off">🔇 关闭</option>
                                <option value="clicky">🟦 青轴</option>
                                <option value="tactile">🟧 茶轴</option>
                                <option value="speed">⚪ 银轴</option>
                                <option value="silent">🟫 静音红轴</option>
                                <option value="membrane">🟩 薄膜</option>
                            </select>
                            <button class="sound-test-btn" id="soundTestBtn">🔊 试听</button>
                        </div>
                    </div>
                </div>

                <!-- 操作 -->
                <div class="settings-section" style="border-bottom: none; margin-bottom: 0; padding-bottom: 0;">
                    <div class="section-label">⚡ 操作</div>
                    <div class="settings-row settings-actions">
                        <button class="btn btn-save" id="settingsSaveBtn">💾 保存设置</button>
                        <button class="btn btn-reset" id="settingsResetBtn">🔄 恢复默认</button>
                    </div>
                </div>

            </div>
        `;
  }

  _cacheElements() {
    this.themeSelect = document.getElementById("themeSelect");
    this.fontSizeSlider = document.getElementById("fontSizeSlider");
    this.fontSizeValue = document.getElementById("fontSizeValue");
    this.pageHeightSlider = document.getElementById("pageHeightSlider");
    this.pageHeightValue = document.getElementById("pageHeightValue");
    this.soundSelect = document.getElementById("soundSelect");
    this.soundTestBtn = document.getElementById("soundTestBtn");
    this.saveBtn = document.getElementById("settingsSaveBtn");
    this.resetBtn = document.getElementById("settingsResetBtn");
    this.closeBtn = document.getElementById("settingsCloseBtn");
  }

  _bindEvents() {
    // 替换主题切换事件
    if (this.themeSelect) {
      this.themeSelect.addEventListener("change", () => {
        this._setTheme(this.themeSelect.value);
      });
    }

    // 其余保持不变
    // 字体大小滑块
    if (this.fontSizeSlider) {
      this.fontSizeSlider.addEventListener("input", () => {
        const val = this.fontSizeSlider.value;
        this.fontSizeValue.textContent = val + "px";
      });
    }

    // 页面高度滑块
    if (this.pageHeightSlider) {
      this.pageHeightSlider.addEventListener("input", () => {
        const val = this.pageHeightSlider.value;
        this.pageHeightValue.textContent = val + "px";
      });
    }

    // 保存
    if (this.saveBtn) {
      this.saveBtn.addEventListener("click", () => {
        if (this.onSave) this.onSave();
      });
    }

    // 恢复默认
    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => {
        if (this.onReset) this.onReset();
      });
    }

    // 试听
    if (this.soundTestBtn) {
      this.soundTestBtn.addEventListener("click", () => {
        const sound = this.soundSelect?.value || "off";
        if (this.onSoundTest) this.onSoundTest(sound);
      });
    }

    // 关闭
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => {
        if (this.onClose) this.onClose();
      });
    }

    // 点击遮罩关闭
    const overlay = this.container
      ?.closest(".settings-modal")
      ?.querySelector(".settings-modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", () => {
        if (this.onClose) this.onClose();
      });
    }

    // ESC 键关闭
    this._escHandler = (e) => {
      if (e.key === "Escape" && this.onClose) {
        this.onClose();
      }
    };
    document.addEventListener("keydown", this._escHandler);
  }

  _populateForm() {
    const s = this.settings;

    // 主题 - 改为下拉选择
    if (this.themeSelect) {
      this.themeSelect.value = s.theme || "dark";
    }

    // 字体
    const fontSize = s.fontSize || 22;
    if (this.fontSizeSlider) {
      this.fontSizeSlider.value = fontSize;
      this.fontSizeValue.textContent = fontSize + "px";
    }

    // 页面高度
    const pageHeight = s.pageHeight || 550;
    if (this.pageHeightSlider) {
      this.pageHeightSlider.value = pageHeight;
      this.pageHeightValue.textContent = pageHeight + "px";
    }

    // 音效
    if (this.soundSelect) {
      this.soundSelect.value = s.sound || "off";
    }
  }

  _setTheme(theme) {
    // 更新下拉框选中值
    if (this.themeSelect) {
      this.themeSelect.value = theme;
    }
    // 保存当前选中
    this._selectedTheme = theme;
  }

  /**
   * 清理事件监听（弹窗关闭时调用）
   */
  cleanup() {
    if (this._escHandler) {
      document.removeEventListener("keydown", this._escHandler);
      this._escHandler = null;
    }
  }
}
