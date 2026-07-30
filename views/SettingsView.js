/**
 * SettingsView - 设置视图
 * 职责：纯 DOM 渲染，不包含业务逻辑
 */
export default class SettingsView {
    constructor(options = {}) {
        this.onSave = options.onSave || null;
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

    /**
     * 填充表单数据
     */
    populate(settings) {
        this.settings = settings;
        this._populateForm();
    }

    /**
     * 获取表单数据
     */
    getSettings() {
        return {
            defaultMode: this.defaultModeSelect?.value || 'practice-cn',
            fontSize: parseInt(this.fontSizeInput?.value) || 22,
            pageHeight: parseInt(this.pageHeightInput?.value) || 550,
            theme: this.themeSelect?.value || 'dark'
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
            <div class="mode-header">
                <button class="back-btn" data-target="home">← 返回</button>
                <h2>⚙️ 设置</h2>
            </div>
            <div class="settings-group">
                <label>默认模式</label>
                <select id="settingDefaultMode">
                    <option value="practice-cn">🀄 中文练习</option>
                    <option value="practice-en">🔤 英文练习</option>
                    <option value="article-management">📄 文章管理</option>
                </select>
            </div>
            <div class="settings-group">
                <label>字体大小</label>
                <input type="number" id="settingFontSize" min="14" max="36" />
                <span style="color:#666688;font-size:12px;">px（14-36）</span>
            </div>
            <div class="settings-group">
                <label>页面高度</label>
                <input type="number" id="settingPageHeight" min="400" max="800" step="10" />
                <span style="color:#666688;font-size:12px;">px（400-800）</span>
            </div>
            <div class="settings-group">
                <label>主题</label>
                <select id="settingTheme">
                    <option value="dark">🌙 暗色</option>
                    <option value="light">☀️ 亮色</option>
                </select>
            </div>
            <button class="save-btn" id="settingsSaveBtn">💾 保存设置</button>
        `;
    }

    _cacheElements() {
        this.defaultModeSelect = document.getElementById('settingDefaultMode');
        this.fontSizeInput = document.getElementById('settingFontSize');
        this.pageHeightInput = document.getElementById('settingPageHeight');
        this.themeSelect = document.getElementById('settingTheme');
        this.saveBtn = document.getElementById('settingsSaveBtn');
    }

    _bindEvents() {
        // 返回按钮
        this.container.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target && window.app?.navigator) {
                    window.app.navigator.goTo(target);
                }
            });
        });

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                if (this.onSave) this.onSave();
            });
        }
    }

    _populateForm() {
        if (this.defaultModeSelect) {
            this.defaultModeSelect.value = this.settings.defaultMode || 'practice-cn';
        }
        if (this.fontSizeInput) {
            this.fontSizeInput.value = this.settings.fontSize || 22;
        }
        if (this.pageHeightInput) {
            this.pageHeightInput.value = this.settings.pageHeight || 550;
        }
        if (this.themeSelect) {
            this.themeSelect.value = this.settings.theme || 'dark';
        }
    }
}