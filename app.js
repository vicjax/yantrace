/**
 * 砚迹（YanTrace）- 主应用入口
 * 职责：初始化所有模块，启动应用
 */

// ============================================
// 模块导入
// ============================================

import Storage from './utils/storage.js';
import * as Helpers from './utils/helpers.js';

import ArticleService from './services/article.js';
import UserService from './services/user.js';
import HistoryService from './services/history.js';
import SettingsService from './services/settings.js';

import Navigator from './modules/navigator.js';
import PracticeEngine from './modules/practice/index.js';
import ResultManager from './modules/result.js';


// ============================================
// 应用类
// ============================================

class App {
    constructor() {
        // 服务实例
        this.articleService = null;
        this.userService = null;
        this.historyService = null;
        this.settingsService = null;

        // 功能模块实例
        this.navigator = null;
        this.practiceEngine = null;
        this.resultManager = null;

        // 状态
        this.currentUser = null;
        this.isInitialized = false;
        this.currentPageId = 'home';
    }

    // ============================================
    // 初始化
    // ============================================

    async init() {
        if (this.isInitialized) return;

        console.log('🖊️ 砚迹（YanTrace）启动中...');

        this._initStorage();
        this._initServices();
        this._initModules();
        this._initDefaultData();
        this._bindEvents();

        // 应用用户设置
        this._applyUserSettings();

        this._renderPage('home');
        this.navigator.currentPage = 'home';

        this.isInitialized = true;
        console.log('✅ 砚迹（YanTrace）启动完成');
    }

    _initStorage() {
        if (!Storage.isAvailable()) {
            alert('⚠️ localStorage 不可用，请检查浏览器设置');
            throw new Error('localStorage is not available');
        }
        console.log('📦 存储初始化完成');
    }

    _initServices() {
        this.articleService = new ArticleService();
        this.userService = new UserService();
        this.historyService = new HistoryService();
        this.settingsService = new SettingsService();
        console.log('📚 服务层初始化完成');
    }

    _initModules() {
        this.navigator = new Navigator({
            onPageChange: (pageId) => this._onPageChange(pageId)
        });

        this.practiceEngine = new PracticeEngine({
            articleService: this.articleService,
            onComplete: (stats) => this._onPracticeComplete(stats),
            getSettings: () => this._getCurrentSettings()
        });

        this.resultManager = new ResultManager({
            historyService: this.historyService,
            userService: this.userService,
            onRestart: () => this._onResultRestart()
        });

        console.log('🧩 功能模块初始化完成');
    }

    _initDefaultData() {
        const users = this.userService.getAll();
        if (users.length === 0) {
            this.userService.create('砚客');
            console.log('👤 创建默认用户：砚客');
        }

        const articles = this.articleService.getAll();
        if (articles.length === 0) {
            this.articleService.loadAll();
            console.log('📄 加载内置文章');
        }

        this.currentUser = this.userService.getCurrent();
        if (!this.currentUser) {
            this.currentUser = this.userService.getFirst();
        }

        this._updateUserDisplay();
        console.log('📦 默认数据初始化完成');
    }

    // ============================================
    // 设置管理
    // ============================================

    _getCurrentSettings() {
        if (!this.currentUser) return null;
        return this.settingsService.get(this.currentUser.id);
    }

    _applyUserSettings() {
        const settings = this._getCurrentSettings();
        if (!settings) return;
        this._applySettings(settings);
    }

    _applySettings(settings) {
        const fontSize = settings.fontSize || 22;
        const pageHeight = settings.pageHeight || 550;
        const theme = settings.theme || 'dark';

        // 1. 更新 CSS 变量（文字大小）
        document.documentElement.style.setProperty('--font-size', fontSize + 'px');

        // 2. 计算文章区高度
        const fixedHeight = 166;
        const textBoxHeight = Math.max(pageHeight - fixedHeight, 200);

        // 3. 更新所有 .text-box（只更新文字大小和高度，响应式只改布局）
        document.querySelectorAll('.text-box').forEach(el => {
            // 文字大小（用户设置，响应式不变）
            el.style.fontSize = fontSize + 'px';
            // 文章区高度（用户设置，响应式不变）
            el.style.minHeight = textBoxHeight + 'px';
            el.style.maxHeight = textBoxHeight + 'px';
            // 重新计算 line-height
            const pinyinSize = Math.max(fontSize - 4, 12);
            const lineSpacing = pinyinSize + 2;
            const lineHeight = fontSize + lineSpacing;
            el.style.lineHeight = (lineHeight / fontSize);
        });

        // 4. 更新页面容器
        const container = document.querySelector('.page-container');
        if (container) {
            container.style.minHeight = pageHeight + 'px';
        }

        // 5. 主题
        const isLight = theme === 'light';
        document.body.classList.toggle('light-theme', isLight);

        // 6. 通知当前页面刷新
        this._refreshCurrentPage();
    }

    _refreshCurrentPage() {
        const pageId = this.currentPageId;
        if (!pageId || pageId === 'home') return;

        // 练习页刷新
        if (pageId === 'practice-cn' || pageId === 'practice-en') {
            const type = pageId === 'practice-cn' ? 'chinese' : 'english';
            this.practiceEngine?.refresh(type);
        }
    }

    // ============================================
    // 渲染引擎
    // ============================================

    _renderPage(pageId) {
        const container = document.getElementById('pageContainer');
        if (!container) return;

        let html = '';

        switch (pageId) {
            case 'home':
                html = this._getHomeHtml();
                break;
            case 'practice-cn':
                html = this._getPracticeCnHtml();
                break;
            case 'practice-en':
                html = this._getPracticeEnHtml();
                break;
            case 'user':
                html = this._getUserHtml();
                break;
            case 'history':
                html = this._getHistoryHtml();
                break;
            case 'settings':
                html = this._getSettingsHtml();
                break;
            case 'article-management':
                html = this._getArticleManagementHtml();
                break;
            default:
                html = '<p class="placeholder">页面不存在</p>';
        }

        container.innerHTML = html;

        // 应用设置
        this._applyUserSettings();

        // 绑定页面事件
        this._bindPageEvents(pageId);

        // 记录当前页面
        this.currentPageId = pageId;
    }

    // ============================================
    // 页面 HTML 生成
    // ============================================

    _getHomeHtml() {
        const config = this._getMenuConfig();
        let html = '';

        config.sections.forEach(section => {
            const sectionClass = section.id === 'practice' ? 'home-section-practice' : 'home-section-management';
            html += `<div class="home-section ${sectionClass}">`;
            html += `<div class="home-section-title">${section.title}</div>`;
            html += `<div class="home-grid">`;

            section.items.forEach(item => {
                const descHtml = item.desc ? `<span class="home-btn-desc">${item.desc}</span>` : '';
                html += `
                    <button class="home-btn" data-target="${item.id}">
                        <span class="home-btn-icon">${item.icon}</span>
                        <span class="home-btn-label">${item.label}</span>
                        ${descHtml}
                    </button>
                `;
            });

            html += `</div></div>`;
        });

        return html;
    }

    _getPracticeCnHtml() {
        return `
            <div class="mode-header">
                <button class="back-btn" data-target="home">← 返回</button>
                <h2>🀄 中文打字练习</h2>
                <select id="cnArticleSelect" class="article-select"></select>
                <button class="reset-btn" id="cnResetBtn">⟳ 重新开始</button>
            </div>

            <div class="stats-bar" id="cnStatsBar">
                <span>CPM⚡<b id="cnCpm">0</b></span>
                <span>KPM⌨️<b id="cnKpm">0</b></span>
                <span>KSPC📊<b id="cnKspc">0</b></span>
                <span>准确率🎯<b id="cnAccuracy">100</b>%</span>
                <span>字数📝<b id="cnProgressChars">0</b>/<b id="cnTotalChars">0</b></span>
                <span>用时⏱<b id="cnTimer">00:00</b></span>
                <span>峰值⚡<b id="cnPeakSpeed">0</b></span>
            </div>

            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="cnProgressFill" style="width:0%"></div>
                </div>
                <span class="progress-text" id="cnProgressText">0%</span>
            </div>

            <div class="text-box" id="cnTextBox">
                <span class="placeholder">选择一篇文章开始练习</span>
            </div>
        `;
    }

    _getPracticeEnHtml() {
        return `
            <div class="mode-header">
                <button class="back-btn" data-target="home">← 返回</button>
                <h2>🔤 英文打字练习</h2>
                <select id="enArticleSelect" class="article-select"></select>
                <button class="reset-btn" id="enResetBtn">⟳ 重新开始</button>
            </div>

            <div class="stats-bar" id="enStatsBar">
                <span>WPM⚡<b id="enWpm">0</b></span>
                <span>KPM⌨️<b id="enKpm">0</b></span>
                <span>KSPC📊<b id="enKspc">0</b></span>
                <span>准确率🎯<b id="enAccuracy">100</b>%</span>
                <span>字数📝<b id="enProgressChars">0</b>/<b id="enTotalChars">0</b></span>
                <span>用时⏱<b id="enTimer">00:00</b></span>
                <span>峰值⚡<b id="enPeakSpeed">0</b></span>
            </div>

            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="enProgressFill" style="width:0%"></div>
                </div>
                <span class="progress-text" id="enProgressText">0%</span>
            </div>

            <div class="text-box" id="enTextBox">
                <span class="placeholder">选择一篇文章开始练习</span>
            </div>
        `;
    }

    _getUserHtml() {
        return `
            <div class="mode-header">
                <button class="back-btn" data-target="home">← 返回</button>
                <h2>👤 用户管理</h2>
                <button class="new-btn" id="addUserBtn">➕ 添加用户</button>
            </div>
            <div class="user-list" id="userList"></div>
        `;
    }

    _getHistoryHtml() {
        return `
            <div class="mode-header">
                <button class="back-btn" data-target="home">← 返回</button>
                <h2>📊 历史记录</h2>
                <div class="history-actions">
                    <button class="action-btn" id="exportHistoryBtn">📥 导出CSV</button>
                    <button class="action-btn danger" id="clearHistoryBtn">🗑️ 清空</button>
                </div>
            </div>
            <div class="history-list" id="historyList"></div>
        `;
    }

    _getSettingsHtml() {
        const settings = this._getCurrentSettings() || {};
        return `
            <div class="mode-header">
                <button class="back-btn" data-target="home">← 返回</button>
                <h2>⚙️ 设置</h2>
            </div>
            <div class="settings-group">
                <label>默认模式</label>
                <select id="settingDefaultMode">
                    <option value="practice-cn" ${settings.defaultMode === 'practice-cn' ? 'selected' : ''}>🀄 中文练习</option>
                    <option value="practice-en" ${settings.defaultMode === 'practice-en' ? 'selected' : ''}>🔤 英文练习</option>
                    <option value="article-management" ${settings.defaultMode === 'article-management' ? 'selected' : ''}>📄 文章管理</option>
                </select>
            </div>
            <div class="settings-group">
                <label>字体大小</label>
                <input type="number" id="settingFontSize" value="${settings.fontSize || 22}" min="14" max="36" />
                <span style="color:#666688;font-size:12px;">px（14-36）</span>
            </div>
            <div class="settings-group">
                <label>页面高度</label>
                <input type="number" id="settingPageHeight" value="${settings.pageHeight || 550}" min="400" max="800" step="10" />
                <span style="color:#666688;font-size:12px;">px（400-800）</span>
            </div>
            <div class="settings-group">
                <label>主题</label>
                <select id="settingTheme">
                    <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>🌙 暗色</option>
                    <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>☀️ 亮色</option>
                </select>
            </div>
            <button class="save-btn" id="settingsSaveBtn">💾 保存设置</button>
        `;
    }

    _getArticleManagementHtml() {
        return `
            <div class="mode-header">
                <button class="back-btn" data-target="home">← 返回</button>
                <h2>📄 文章管理</h2>
                <div class="article-management-tools">
                    <select id="amLangSelect" class="article-select">
                        <option value="chinese">中文</option>
                        <option value="english">English</option>
                    </select>
                    <button class="new-btn" id="amNewBtn">➕ 新建文章</button>
                </div>
            </div>
            <div class="article-management-body">
                <div class="am-left">
                    <div class="am-list" id="amList">
                        <span class="placeholder">加载中...</span>
                    </div>
                </div>
                <div class="am-right">
                    <div class="am-content" id="amContent">
                        <span class="placeholder">请从左侧选择一篇文章</span>
                    </div>
                </div>
            </div>
            <div class="am-actions">
                <button class="action-btn" id="amViewBtn">📖 查看</button>
                <button class="action-btn" id="amEditBtn">✏️ 编辑</button>
                <button class="action-btn" id="amAppendBtn">📋 追加</button>
                <button class="action-btn danger" id="amDeleteBtn">🗑️ 删除</button>
                <button class="save-btn" id="amSaveBtn" style="display:none;">💾 保存</button>
                <button class="reset-btn" id="amCancelBtn" style="display:none;">↻ 取消</button>
            </div>
        `;
    }

    _getMenuConfig() {
        return {
            sections: [
                {
                    id: 'practice',
                    title: '🎯 练习',
                    items: [
                        { id: 'practice-cn', icon: '🀄', label: '中文练习', desc: '开始打字' },
                        { id: 'practice-en', icon: '🔤', label: '英文练习', desc: 'Start Typing' }
                    ]
                },
                {
                    id: 'management',
                    title: '📂 管理',
                    items: [
                        { id: 'article-management', icon: '📄', label: '文章管理' },
                        { id: 'user', icon: '👤', label: '用户管理' },
                        { id: 'history', icon: '📊', label: '历史记录' },
                        { id: 'settings', icon: '⚙️', label: '设置' }
                    ]
                }
            ]
        };
    }

    // ============================================
    // 页面事件绑定
    // ============================================

    _bindPageEvents(pageId) {
        // 返回按钮
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target && this.navigator) {
                    this.navigator.goTo(target);
                }
            });
        });

        if (pageId === 'home') {
            document.querySelectorAll('.home-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = btn.dataset.target;
                    if (target && this.navigator) {
                        this.navigator.goTo(target);
                    }
                });
            });
        }

        if (pageId === 'practice-cn' || pageId === 'practice-en') {
            const resetBtn = document.getElementById(pageId === 'practice-cn' ? 'cnResetBtn' : 'enResetBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    const type = pageId === 'practice-cn' ? 'chinese' : 'english';
                    this.practiceEngine?.reset(type);
                });
            }
        }

        if (pageId === 'user') {
            const addBtn = document.getElementById('addUserBtn');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    const name = prompt('请输入新用户名称：');
                    if (name && name.trim()) {
                        this.userService.create(name.trim());
                        this._renderUserList();
                        this._updateUserDisplay();
                    }
                });
            }
            this._renderUserList();
        }

        if (pageId === 'history') {
            this.resultManager?.renderHistory();
            const exportBtn = document.getElementById('exportHistoryBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this._exportHistory());
            }
            const clearBtn = document.getElementById('clearHistoryBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this._clearHistory());
            }
        }

        if (pageId === 'settings') {
            const saveBtn = document.getElementById('settingsSaveBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this._saveSettings());
            }
        }
    }

    // ============================================
    // 全局事件
    // ============================================

    _bindEvents() {
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.addEventListener('click', () => this._handleUserNameClick());
        }

        const resultHomeBtn = document.getElementById('resultHomeBtn');
        if (resultHomeBtn) {
            resultHomeBtn.addEventListener('click', () => {
                document.getElementById('resultOverlay').classList.remove('show');
                this.navigator.goTo('home');
            });
        }

        const resultRestartBtn = document.getElementById('resultRestartBtn');
        if (resultRestartBtn) {
            resultRestartBtn.addEventListener('click', () => {
                document.getElementById('resultOverlay').classList.remove('show');
                this._onResultRestart();
            });
        }

        const resultCopyBtn = document.getElementById('resultCopyBtn');
        if (resultCopyBtn) {
            resultCopyBtn.addEventListener('click', () => this._copyResult());
        }
    }

    // ============================================
    // 页面生命周期
    // ============================================

    _onPageChange(pageId) {
        const currentPage = this.currentPageId;
        this._leavePage(currentPage);
        this._renderPage(pageId);
        this._enterPage(pageId);
    }

    _leavePage(pageId) {
        if (pageId === 'practice-cn' || pageId === 'practice-en') {
            this.practiceEngine?.leave(pageId);
        }
    }

    _enterPage(pageId) {
        if (pageId === 'practice-cn' || pageId === 'practice-en') {
            this.practiceEngine?.enter(pageId);
        }
    }

    // ============================================
    // 设置保存
    // ============================================

    _saveSettings() {
        if (!this.currentUser) return;

        const settings = {
            defaultMode: document.getElementById('settingDefaultMode').value,
            fontSize: parseInt(document.getElementById('settingFontSize').value) || 22,
            pageHeight: parseInt(document.getElementById('settingPageHeight').value) || 550,
            theme: document.getElementById('settingTheme').value
        };

        this.settingsService.update(this.currentUser.id, settings);
        this._applySettings(settings);
        alert('✅ 设置已保存');
    }

    // ============================================
    // 练习完成
    // ============================================

    _onPracticeComplete(stats) {
        const currentPage = this.currentPageId || 'practice-cn';
        const articleTitle = this.practiceEngine?.currentArticleTitle || '';
        this.resultManager.show(stats, currentPage, articleTitle);
    }

    _onResultRestart() {
        const currentPage = this.currentPageId;
        if (currentPage === 'practice-cn' || currentPage === 'practice-en') {
            const type = currentPage === 'practice-cn' ? 'chinese' : 'english';
            this.practiceEngine.loadFirstArticle(type);
        }
    }

    // ============================================
    // 用户管理
    // ============================================

    _updateUserDisplay() {
        const userNameEl = document.getElementById('userName');
        if (userNameEl && this.currentUser) {
            userNameEl.textContent = `👤 ${this.currentUser.name}`;
        }
    }

    _renderUserList() {
        const container = document.getElementById('userList');
        if (!container) return;

        const users = this.userService.getAll();
        const current = this.userService.getCurrent();

        if (users.length === 0) {
            container.innerHTML = '<div class="history-empty">暂无用户</div>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="user-item" data-user-id="${user.id}">
                <span class="name">${user.name}</span>
                ${user.id === current?.id ? '<span class="badge">当前</span>' : ''}
                <div class="actions">
                    ${user.id !== current?.id ? `<button class="switch-btn">切换</button>` : ''}
                    ${users.length > 1 ? `<button class="danger delete-btn">删除</button>` : ''}
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.switch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.user-item');
                const userId = item.dataset.userId;
                this._switchUser(userId);
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.user-item');
                const userId = item.dataset.userId;
                this._deleteUser(userId);
            });
        });
    }

    _switchUser(userId) {
        const user = this.userService.getById(userId);
        if (user) {
            this.userService.setCurrent(userId);
            this.currentUser = user;
            this._updateUserDisplay();
            this._renderUserList();
            // 重新应用设置
            this._applyUserSettings();
            console.log(`👤 切换到用户：${user.name}`);
        }
    }

    _deleteUser(userId) {
        const user = this.userService.getById(userId);
        if (!user) return;

        if (!confirm(`确定要删除用户「${user.name}」吗？`)) return;

        const success = this.userService.delete(userId);
        if (success) {
            this.currentUser = this.userService.getCurrent();
            this._updateUserDisplay();
            this._renderUserList();
            this._applyUserSettings();
            console.log(`🗑️ 已删除用户：${user.name}`);
        }
    }

    _handleUserNameClick() {
        const user = this.userService.getCurrent();
        if (!user) return;

        const newName = prompt(`修改昵称（当前：${user.name}）：`, user.name);
        if (newName && newName.trim() && newName.trim() !== user.name) {
            try {
                this.userService.updateName(user.id, newName.trim());
                this.currentUser = this.userService.getCurrent();
                this._updateUserDisplay();
                this._renderUserList();
                console.log(`✏️ 昵称已修改为：${newName.trim()}`);
            } catch (err) {
                alert(err.message);
            }
        }
    }

    // ============================================
    // 历史记录
    // ============================================

    _exportHistory() {
        if (!this.currentUser) return;
        const csv = this.historyService.exportCSV(this.currentUser.id);
        if (!csv) {
            alert('暂无历史记录可导出');
            return;
        }
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `砚迹_历史记录_${this.currentUser.name}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    _clearHistory() {
        if (!this.currentUser) return;
        if (!confirm('确定要清空所有历史记录吗？此操作不可恢复！')) return;
        const records = this.historyService.getByUser(this.currentUser.id);
        records.forEach(record => {
            this.historyService.delete(record.id);
        });
        this.resultManager?.renderHistory();
        alert('✅ 历史记录已清空');
    }

    _copyResult() {
        const overlay = document.getElementById('resultOverlay');
        const text = overlay.textContent.trim();
        navigator.clipboard?.writeText(text).then(() => {
            alert('✅ 结果已复制到剪贴板');
        }).catch(() => {
            const range = document.createRange();
            range.selectNode(overlay);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            alert('✅ 结果已复制到剪贴板');
        });
    }
}


// ============================================
// 启动
// ============================================

const app = new App();
app.init();

window.app = app;

console.log('🖊️ 砚迹（YanTrace）已加载');