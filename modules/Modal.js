/**
 * 砚迹（YanTrace）- 统一弹窗工具
 * 职责：提供 alert / confirm 的自定义弹窗，替代系统弹窗
 */

class ModalManager {
  constructor() {
    this._overlay = null;
    this._content = null;
    this._resolve = null;
    this._closed = true;
  }

  /**
   * 初始化 DOM 结构（懒加载）
   */
  _init() {
    if (this._overlay) return;

    this._overlay = document.createElement('div');
    this._overlay.className = 'modal-overlay';
    this._overlay.style.display = 'none';

    this._content = document.createElement('div');
    this._content.className = 'modal-content modal-content--sm';

    this._overlay.appendChild(this._content);
    document.body.appendChild(this._overlay);

    // 点击遮罩关闭（仅 alert 模式）
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay && this._overlay.dataset.type === 'alert') {
        this._close(true);
      }
    });

    // ESC 键关闭（全局）
    this._escHandler = (e) => {
      if (e.key === 'Escape' && this._overlay.style.display === 'flex') {
        const isAlert = this._overlay.dataset.type === 'alert';
        this._close(isAlert ? true : false);
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  /**
   * 显示 Alert
   */
  alert(message, title = '提示', buttonText = '确定') {
    return new Promise((resolve) => {
      this._init();
      this._closed = false;
      this._resolve = resolve;
      this._overlay.dataset.type = 'alert';

      this._content.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" data-action="close">✕</button>
        </div>
        <div class="modal-body">
          <p style="margin: 0; color: var(--text-secondary); font-size: 15px; line-height: 1.6;">${message}</p>
        </div>
        <div class="modal-footer" style="justify-content: center;">
          <button class="btn btn-primary" data-action="confirm" style="min-width: 80px;">${buttonText}</button>
        </div>
      `;

      this._show();
      this._bindEvents();
    });
  }

  /**
   * 显示 Confirm
   */
  confirm(message, title = '确认', confirmText = '确认', cancelText = '取消') {
    return new Promise((resolve) => {
      this._init();
      this._closed = false;
      this._resolve = resolve;
      this._overlay.dataset.type = 'confirm';

      this._content.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
        </div>
        <div class="modal-body">
          <p style="margin: 0; color: var(--text-secondary); font-size: 15px; line-height: 1.6;">${message}</p>
        </div>
        <div class="modal-footer" style="justify-content: center; gap: var(--spacing-md);">
          <button class="btn btn-ghost" data-action="cancel" style="min-width: 80px;">${cancelText}</button>
          <button class="btn btn-primary" data-action="confirm" style="min-width: 80px;">${confirmText}</button>
        </div>
      `;

      this._show();
      this._bindEvents();
    });
  }

  /**
   * 显示弹窗（内部）
   */
  _show() {
    this._overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      this._overlay.classList.add('active');
    });
    // 聚焦到确认按钮
    setTimeout(() => {
      const btn = this._content.querySelector('[data-action="confirm"]');
      if (btn) btn.focus();
    }, 100);
  }

  /**
   * 绑定事件（内部）- 使用事件委托，更简洁
   */
  _bindEvents() {
    // 移除旧的委托监听器
    if (this._delegateHandler) {
      this._content.removeEventListener('click', this._delegateHandler);
    }

    this._delegateHandler = (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      if (action === 'confirm') {
        this._close(true);
      } else if (action === 'cancel' || action === 'close') {
        const isAlert = this._overlay.dataset.type === 'alert';
        this._close(isAlert ? true : false);
      }
    };

    this._content.addEventListener('click', this._delegateHandler);
  }

  /**
   * 关闭弹窗（内部）
   */
  _close(result) {
    if (this._closed) return;
    this._closed = true;

    this._overlay.classList.remove('active');
    setTimeout(() => {
      this._overlay.style.display = 'none';
    }, 200);

    if (this._resolve) {
      this._resolve(result);
      this._resolve = null;
    }
  }

  /**
   * 销毁实例
   */
  destroy() {
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
    }
    this._overlay = null;
    this._content = null;
    this._resolve = null;
  }
}

export default new ModalManager();