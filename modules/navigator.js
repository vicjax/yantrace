/**
 * 砚迹（YanTrace）- 导航模块
 * 职责：管理所有页面的切换（显示/隐藏）
 */

// ============================================
// 导航类
// ============================================

class Navigator {
    constructor(options = {}) {
        this.currentPage = 'home';
        this.onPageChange = options.onPageChange || null;

        // 所有页面的 DOM 引用
        this.pages = {
            home: document.getElementById('page-home'),
            'practice-cn': document.getElementById('page-practice-cn'),
            'practice-en': document.getElementById('page-practice-en'),
            'input-cn': document.getElementById('page-input-cn'),
            'input-en': document.getElementById('page-input-en'),
            user: document.getElementById('page-user'),
            history: document.getElementById('page-history'),
            settings: document.getElementById('page-settings')
        };

        // 初始化页面显示
        this._init();
    }

    /**
     * 初始化：隐藏所有页面，显示首页
     * @private
     */
    _init() {
        // 所有页面默认隐藏
        Object.values(this.pages).forEach(page => {
            if (page) page.classList.remove('active');
        });

        // 显示首页
        if (this.pages.home) {
            this.pages.home.classList.add('active');
        }
    }

    /**
     * 跳转到指定页面
     * @param {string} pageId - 页面 ID
     * @returns {boolean} 是否成功
     */
    goTo(pageId) {
        // 检查页面是否存在
        if (!this.pages[pageId]) {
            console.warn(`[Navigator] 页面不存在: ${pageId}`);
            return false;
        }

        // 隐藏所有页面
        Object.values(this.pages).forEach(page => {
            if (page) page.classList.remove('active');
        });

        // 显示目标页面
        this.pages[pageId].classList.add('active');
        this.currentPage = pageId;

        // 触发回调
        if (this.onPageChange) {
            this.onPageChange(pageId);
        }

        console.log(`[Navigator] 切换到: ${pageId}`);
        return true;
    }

    /**
     * 获取当前页面 ID
     * @returns {string}
     */
    getCurrentPage() {
        return this.currentPage;
    }

    /**
     * 判断是否在首页
     * @returns {boolean}
     */
    isHome() {
        return this.currentPage === 'home';
    }

    /**
     * 判断是否在练习页面
     * @returns {boolean}
     */
    isPractice() {
        return this.currentPage === 'practice-cn' || this.currentPage === 'practice-en';
    }

    /**
     * 判断是否在录入页面
     * @returns {boolean}
     */
    isInput() {
        return this.currentPage === 'input-cn' || this.currentPage === 'input-en';
    }

    /**
     * 返回首页
     */
    goHome() {
        this.goTo('home');
    }
}


// ============================================
// 导出
// ============================================

export default Navigator;