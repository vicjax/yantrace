/**
 * SettingsPresenter - 设置展示器（弹窗版）
 * 职责：业务逻辑（加载设置、保存设置、恢复默认、音效试听）
 */
import BasePresenter from "../../core/BasePresenter.js";
import SettingsView from "./SettingsView.js";
import Modal from "../../modules/Modal.js";

const SIZE_PRESETS = {
    small:  { width: 640, height: 480 },
    medium: { width: 880, height: 620 },
    large:  { width: 1100, height: 760 },
};



export default class SettingsPresenter extends BasePresenter {
  constructor(options = {}) {
    super(options);
    this.settingsService = options.settingsService;
    this.userService = options.userService;
    this.modalEl = options.modalEl || document.getElementById("settingsModal");
    this.contentEl =
      options.contentEl ||
      this.modalEl?.querySelector(".settings-modal-content");
    this.isOpen = false;

    this.view = new SettingsView({
      onSave: () => this._handleSave(),
      onReset: () => this._handleReset(),
      onSoundTest: (sound) => this._handleSoundTest(sound),
      onClose: () => this.close(),
    });
  }

  /**
   * 打开设置弹窗
   */
  open() {
    if (!this.modalEl) return;
    console.log("🔧 打开设置弹窗");
    this.isOpen = true;
    this.modalEl.style.display = "flex";

    // ⭐ 渲染内容
    const contentEl = this.modalEl.querySelector(".settings-modal-content");
    if (contentEl) {
      this.view.render(contentEl);
    }

    this._loadSettings();
    // 焦点锁定在弹窗内
    setTimeout(() => {
      const firstInput = this.modalEl.querySelector("input, select, button");
      if (firstInput) firstInput.focus();
    }, 100);
  }

  /**
   * 关闭设置弹窗
   */
  close() {
    if (!this.modalEl) return;
    this.isOpen = false;
    this.modalEl.style.display = "none";
    // 清理视图事件
    this.view.cleanup();
  }

  /**
   * 刷新设置（外部调用）
   */
  refresh() {
    this._loadSettings();
  }

  destroy() {
    super.destroy();
    this.close();
    // 清理音频
    if (this._audio) {
      this._audio.pause();
      this._audio = null;
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  _loadSettings() {
    const user = this.userService.getCurrent();
    if (!user) {
      this.view.populate({});
      return;
    }
    const settings = this.settingsService.get(user.id);
    this.view.populate(settings);
  }

  async _handleSave() {
    const user = this.userService.getCurrent();
    if (!user) {
      await Modal.alert("请先登录");
      return;
    }

    const settings = this.view.getSettings();
    this.settingsService.update(user.id, settings);
    this.applySettings(settings);

    // 不关闭弹窗，让用户看到保存成功
    // 但可以给个短暂反馈
    const saveBtn = this.modalEl?.querySelector("#settingsSaveBtn");
    if (saveBtn) {
      const originalText = saveBtn.textContent;
      saveBtn.textContent = "✅ 已保存";
      setTimeout(() => {
        saveBtn.textContent = originalText;
      }, 1500);
    }
  }

  async _handleReset() {
    const user = this.userService.getCurrent();
    if (!user) {
      await Modal.alert("请先登录");
      return;
    }

    if (!(await Modal.confirm("确认恢复默认设置？所有当前设置将被重置。"))) {
      return;
    }

    const defaults = this.settingsService.getDefaults();
    this.settingsService.reset(user.id);
    this.view.populate(defaults);
    this.applySettings(defaults);
  }

  async _handleSoundTest(sound) {
    if (!sound || sound === "off") {
      await Modal.alert("请先选择一个音效");
      return;
    }

    const soundPath = `./assets/sounds/${sound}.mp3`;
    try {
      if (this._audio) {
        this._audio.pause();
        this._audio = null;
      }
      this._audio = new Audio(soundPath);
      this._audio.volume = 0.3;
      this._audio.play().catch(() => {});
    } catch (e) {
      console.warn("音效播放失败:", e);
    }
  }
  

  /**
   * 应用设置到页面
   */
  applySettings(settings) {
    const fontSize = settings.fontSize || 22;
    const theme = settings.theme || "dark";
    const pageSize = settings.pageSize || "medium";
    const size = SIZE_PRESETS[pageSize];

    // 1. 字体
    document.documentElement.style.setProperty("--font-size", fontSize + "px");

    // 2. 页面尺寸
    const app = document.getElementById("app");
    if (app) {
      app.style.maxWidth = size.width + "px";
      app.style.minHeight = size.height + "px";
    }

    // 3. 文章区高度
    const fixedHeight = 166;
    const textBoxHeight = Math.max(size.height - fixedHeight, 200);

    document.querySelectorAll(".text-box").forEach((el) => {
      el.style.fontSize = fontSize + "px";
      el.style.minHeight = textBoxHeight + "px";
      el.style.maxHeight = textBoxHeight + "px";

      const pinyinSize = Math.max(fontSize - 4, 12);
      const lineSpacing = pinyinSize + 2;
      const lineHeight = fontSize + lineSpacing;
      el.style.lineHeight = lineHeight / fontSize;
    });

    // 4. 主题
    document.body.classList.remove(
      "light-theme",
      "eye-care-theme",
      "warm-yellow-theme",
    );
    if (theme === "light") {
      document.body.classList.add("light-theme");
    } else if (theme === "eye-care") {
      document.body.classList.add("eye-care-theme");
    } else if (theme === "warm-yellow") {
      document.body.classList.add("warm-yellow-theme");
    }

    // 5. 音效
    window.__soundSetting = settings.sound || "off";

    // 6. 浮动输入框
    if (window.app?.practiceEngine?.strategy?.updatePosition) {
      setTimeout(() => {
        window.app.practiceEngine.strategy.updatePosition();
      }, 50);
    }
  }
}
