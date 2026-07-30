/**
 * 砚迹（YanTrace）- 导航模块
 * 职责：管理页面切换，通知 app 渲染
 */

class Navigator {
    constructor(options = {}) {
        this.currentPage = '';
        this.onPageChange = options.onPageChange || null;
    }

    /**
     * 跳转到指定页面
     * @param {string} pageId - 页面标识
     */
    goTo(pageId) {
        // 页面由 app._renderPage 负责渲染
        this.currentPage = pageId;
        if (this.onPageChange) {
            this.onPageChange(pageId);
        }
    }

    /**
     * 获取当前页面
     * @returns {string}
     */
    getCurrentPage() {
        return this.currentPage;
    }
}

export default Navigator;