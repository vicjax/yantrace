/**
 * BasePresenter - Presenter 基类
 * 职责：定义 Presenter 的统一接口
 */
export default class BasePresenter {
    constructor(options = {}) {
        this.view = null;
        this.container = null;
    }

    /**
     * 渲染页面（由子类实现）
     * @param {HTMLElement} container - 页面容器
     */
    render(container) {
        this.container = container;
        if (this.view && typeof this.view.render === 'function') {
            this.view.render(container);
            this._bindEvents();
        }
    }

    /**
     * 绑定视图事件（由子类重写）
     */
    _bindEvents() {}

    /**
     * 销毁资源（由子类重写）
     */
    destroy() {
        if (this.view && typeof this.view.destroy === 'function') {
            this.view.destroy();
        }
        this.container = null;
    }
}