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
import InputEngine from './modules/input.js';
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
        this.inputEngine = null;
        this.resultManager = null;

        // 状态
        this.currentUser = null;
        this.isInitialized = false;
    }

    /**
     * 初始化应用
     */
    async init() {
        if (this.isInitialized) return;

        console.log('🖊️ 砚迹（YanTrace）启动中...');

        this._initStorage();
        this._initServices();
        this._initModules();
        this._initDefaultData();
        this._bindEvents();

        this.navigator.goTo('home');

        this.isInitialized = true;
        console.log('✅ 砚迹（YanTrace）启动完成');
    }

    /**
     * 初始化存储
     */
    _initStorage() {
        if (!Storage.isAvailable()) {
            alert('⚠️ localStorage 不可用，请检查浏览器设置');
            throw new Error('localStorage is not available');
        }
        console.log('📦 存储初始化完成');
    }

    /**
     * 初始化服务层
     */
    _initServices() {
        this.articleService = new ArticleService();
        this.userService = new UserService();
        this.historyService = new HistoryService();
        this.settingsService = new SettingsService();
        console.log('📚 服务层初始化完成');
    }

    /**
     * 初始化功能模块
     */
    _initModules() {
        this.navigator = new Navigator({
            onPageChange: (pageId) => this._onPageChange(pageId)
        });

        this.practiceEngine = new PracticeEngine({
            articleService: this.articleService,
            onComplete: (stats) => this._onPracticeComplete(stats)
        });

        this.inputEngine = new InputEngine({
            articleService: this.articleService,
            userService: this.userService,
            historyService: this.historyService
        });

        this.resultManager = new ResultManager({
            historyService: this.historyService,
            userService: this.userService,
            onRestart: () => this._onResultRestart()
        });

        console.log('🧩 功能模块初始化完成');
    }

    /**
     * 初始化默认数据
     */
    _initDefaultData() {
        // 默认用户
        const users = this.userService.getAll();
        if (users.length === 0) {
            this.userService.create('砚客');
            console.log('👤 创建默认用户：砚客');
        }

        // 默认文章
        const articles = this.articleService.getAll();
        if (articles.length === 0) {
            this.articleService.loadAll();
            console.log('📄 加载内置文章');
        }

        // 当前用户
        this.currentUser = this.userService.getCurrent();
        if (!this.currentUser) {
            this.currentUser = this.userService.getFirst();
        }

        this._updateUserDisplay();
        console.log('📦 默认数据初始化完成');
    }

    /**
     * 绑定全局事件
     */
    _bindEvents() {
        // 首页四大模块
        document.querySelectorAll('.home-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target && this.navigator) {
                    this.navigator.goTo(target);
                }
            });
        });

        // 首页底部三个功能
        document.querySelectorAll('.footer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target && this.navigator) {
                    this.navigator.goTo(target);
                }
            });
        });

        // 所有返回按钮
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target && this.navigator) {
                    this.navigator.goTo(target);
                }
            });
        });

        // 修改昵称
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.addEventListener('click', () => {
                this._handleUserNameClick();
            });
        }

        // 保存设置
        document.getElementById('settingsSaveBtn').addEventListener('click', () => {
            this._saveSettings();
        });
    }

    // ============================================
    // 页面生命周期
    // ============================================

    _onPageChange(pageId) {
        const currentPage = this.navigator?.currentPage || '';
        this._leavePage(currentPage);
        this._enterPage(pageId);
    }

    _leavePage(pageId) {
        if (pageId === 'practice-cn' || pageId === 'practice-en') {
            this.practiceEngine?.leave(pageId);
        }
        if (pageId === 'input-cn' || pageId === 'input-en') {
            this.inputEngine?.leave(pageId);
        }
    }

    _enterPage(pageId) {
        if (pageId === 'practice-cn' || pageId === 'practice-en') {
            this.practiceEngine?.enter(pageId);
        }
        if (pageId === 'input-cn' || pageId === 'input-en') {
            this.inputEngine?.enter(pageId);
        }
        if (pageId === 'history') {
            this.resultManager?.renderHistory();
        }
        if (pageId === 'user') {
            this._renderUserList();
        }
        if (pageId === 'settings') {
            this._loadSettings();
        }
    }

    _onPracticeComplete(stats) {
        const currentPage = this.navigator?.getCurrentPage?.() || 'practice-cn';
        const articleTitle = this.practiceEngine?.currentArticleTitle || '';
        this.resultManager.show(stats, currentPage, articleTitle);
    }

    _onResultRestart() {
        const currentPage = this.navigator.getCurrentPage();
        if (currentPage === 'practice-cn' || currentPage === 'practice-en') {
            const type = currentPage === 'practice-cn' ? 'chinese' : 'english';
            this.practiceEngine.loadFirstArticle(type);
        }
    }

    // ============================================
    // 设置
    // ============================================

    _loadSettings() {
        if (!this.currentUser) return;
        const settings = this.settingsService.get(this.currentUser.id);
        document.getElementById('settingDefaultMode').value = settings.defaultMode || 'practice-cn';
        document.getElementById('settingFontSize').value = settings.fontSize || 22;
        document.getElementById('settingTheme').value = settings.theme || 'dark';
        this._applySettings(settings);
    }

    _applySettings(settings) {
        const fontSize = settings.fontSize || 22;
        document.querySelectorAll('.text-box, .input-display, .floating-input')
            .forEach(el => el.style.fontSize = fontSize + 'px');

        const isLight = settings.theme === 'light';
        document.body.classList.toggle('light-theme', isLight);
    }

    _saveSettings() {
        if (!this.currentUser) return;
        const settings = {
            defaultMode: document.getElementById('settingDefaultMode').value,
            fontSize: parseInt(document.getElementById('settingFontSize').value) || 22,
            theme: document.getElementById('settingTheme').value
        };
        this.settingsService.update(this.currentUser.id, settings);
        this._applySettings(settings);
        alert('✅ 设置已保存');
    }

    // ============================================
    // 用户
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
}


// ============================================
// 启动
// ============================================

const app = new App();
app.init();

window.app = app;

console.log('🖊️ 砚迹（YanTrace）已加载');