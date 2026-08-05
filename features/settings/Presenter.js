/**
 * SettingsPresenter - 设置展示器
 * 职责：业务逻辑（加载设置、保存设置、应用设置）
 */
import BasePresenter from '../../core/BasePresenter.js';
import SettingsView from './View.js';

export default class SettingsPresenter extends BasePresenter {
    constructor(options = {}) {
        super(options);
        this.settingsService = options.settingsService;
        this.userService = options.userService;
        this.onSettingsChanged = options.onSettingsChanged || null;

        this.view = new SettingsView({
            onSave: () => this._handleSave()
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

    _handleSave() {
        const user = this.userService.getCurrent();
        if (!user) {
            alert('请先登录');
            return;
        }

        const settings = this.view.getSettings();
        this.settingsService.update(user.id, settings);

        if (this.onSettingsChanged) {
            this.onSettingsChanged(settings);
        }

        alert('✅ 设置已保存');
    }
}