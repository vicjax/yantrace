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
import UserPresenter from './presenters/UserPresenter.js';
import ArticlePresenter from './presenters/ArticlePresenter.js';
import HistoryPresenter from './presenters/HistoryPresenter.js';
import SettingsPresenter from './presenters/SettingsPresenter.js';


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


    // 在 _initModules() 中
    _initModules() {
        this.navigator = new Navigator({
            onPageChange: (pageId) => this._onPageChange(pageId)
        });

        this.practiceEngine = new PracticeEngine({
            articleService: this.articleService,
            onComplete: (stats) => this._onPracticeComplete(stats),
            getSettings: () => this._getCurrentSettings()
        });

        // ⭐ 新增：用户管理 Presenter
        this.userPresenter = new UserPresenter({
            userService: this.userService,
            settingsService: this.settingsService,
            onUserChanged: () => {
                this.currentUser = this.userService.getCurrent();
                this.userPresenter?.updateTopbar();
            }
        });

        // 文章管理 Presenter
        this.articlePresenter = new ArticlePresenter({
            articleService: this.articleService,
            historyService: this.historyService,
            userService: this.userService
        });

        this.resultManager = new ResultManager({
            historyService: this.historyService,
            userService: this.userService,
            onRestart: () => this._onResultRestart()
        });

        // 历史记录 Presenter
        this.historyPresenter = new HistoryPresenter({
            historyService: this.historyService,
            userService: this.userService
        });

        // 设置 Presenter
        this.settingsPresenter = new SettingsPresenter({
            settingsService: this.settingsService,
            userService: this.userService,
            onSettingsChanged: (settings) => {
                this._applySettings(settings);
            }
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
            case 'history':
            case 'article-management':
            case 'settings':
                html = '';
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

    }

    // ============================================
    // 全局事件
    // ============================================

    _bindEvents() {
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
        };
        if (pageId === 'article-management') {
            this.articlePresenter?.destroy();
        };
        if (pageId === 'history') {
            this.historyPresenter?.destroy();
        };
        if (pageId === 'settings') {
            this.settingsPresenter?.destroy();
        }
    }

    _enterPage(pageId) {
        const container = document.getElementById('pageContainer');
        if (!container) return;

        if (pageId === 'practice-cn' || pageId === 'practice-en') {
            this.practiceEngine?.enter(pageId);
        } else if (pageId === 'user') {
            // ⭐ 使用 UserPresenter 渲染
            this.userPresenter?.render(container);
        } else if (pageId === 'settings') {
            this.settingsPresenter?.render(container);
        } else if (pageId === 'article-management') {
            this.articlePresenter?.render(container);
        } else if (pageId === 'history') {
            this.historyPresenter?.render(container);
        }
    }

    // ============================================
    // 设置保存
    // ============================================


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


    // ============================================
    // 历史记录
    // ============================================


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