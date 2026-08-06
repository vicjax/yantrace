/**
 * SettingsPresenter - 设置展示器
 * 职责：业务逻辑（加载设置、保存设置、应用设置）
 */
import BasePresenter from "../../core/BasePresenter.js";
import SettingsView from "./View.js";

export default class SettingsPresenter extends BasePresenter {
  constructor(options = {}) {
    super(options);
    this.settingsService = options.settingsService;
    this.userService = options.userService;
    this.onSettingsChanged = options.onSettingsChanged || null;

    this.view = new SettingsView({
      onSave: () => this._handleSave(),
    });
  }

  render(container) {
    super.render(container);
    this._loadSettings();
  }

  /**
   * 刷新设置（外部调用，如用户切换后）
   */
  refresh() {
    this._loadSettings();
  }

  destroy() {
    super.destroy();
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

  // features/settings/Presenter.js

  _handleSave() {
    const user = this.userService.getCurrent();
    if (!user) {
      alert("请先登录");
      return;
    }

    const settings = this.view.getSettings();
    this.settingsService.update(user.id, settings);

    // ⭐ 自己调用自己，不需要外部回调
    this.applySettings(settings);

    alert("✅ 设置已保存");
  }

  // features/settings/Presenter.js

  /**
   * 应用设置到页面
   * @param {Object} settings - 设置对象
   */
  applySettings(settings) {
    const fontSize = settings.fontSize || 22;
    const pageHeight = settings.pageHeight || 550;
    const theme = settings.theme || "dark";

    // 1. 更新 CSS 变量
    document.documentElement.style.setProperty("--font-size", fontSize + "px");

    // 2. 计算文章区高度
    const fixedHeight = 166;
    const textBoxHeight = Math.max(pageHeight - fixedHeight, 200);

    // 3. 更新所有 .text-box
    document.querySelectorAll(".text-box").forEach((el) => {
      el.style.fontSize = fontSize + "px";
      el.style.minHeight = textBoxHeight + "px";
      el.style.maxHeight = textBoxHeight + "px";

      const pinyinSize = Math.max(fontSize - 4, 12);
      const lineSpacing = pinyinSize + 2;
      const lineHeight = fontSize + lineSpacing;
      el.style.lineHeight = lineHeight / fontSize;
    });

    // 4. 更新页面容器
    const container = document.querySelector(".page-container");
    if (container) {
      container.style.minHeight = pageHeight + "px";
    }

    // 5. 主题
    const isLight = theme === "light";
    document.body.classList.toggle("light-theme", isLight);
  }
}
