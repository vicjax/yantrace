/**
 * 砚迹（YanTrace）- 统一弹窗工具（优化版）
 * 职责：提供 alert / confirm 的自定义弹窗，替代系统弹窗
 */

class ModalManager {
  constructor() {
    this._overlay = null;
    this._content = null;
    this._resolve = null;
    this._closed = true;
  }

  _init() {
    if (this._overlay) return;

    this._overlay = document.createElement('div');
    this._overlay.className = 'modal-overlay';
    this._overlay.style.display = 'none';

    this._content = document.createElement('div');
    this._content.className = 'modal-content modal-content--sm';

    this._overlay.appendChild(this._content);
    document.body.appendChild(this._overlay);

    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay && this._overlay.dataset.type === 'alert') {
        this._close(true);
      }
    });

    this._escHandler = (e) => {
      if (e.key === 'Escape' && this._overlay.style.display === 'flex') {
        const isAlert = this._overlay.dataset.type === 'alert';
        this._close(isAlert ? true : false);
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  alert(message, title = '提示', buttonText = '确定') {
    return new Promise((resolve) => {
      this._init();
      this._closed = false;
      this._resolve = resolve;
      this._overlay.dataset.type = 'alert';

      // ⭐ 优化 HTML 结构
      this._content.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">${this._escapeHtml(title)}</h3>
        </div>
        <div class="modal-body">
          <p class="modal-message">${this._escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary modal-btn" data-action="confirm">${this._escapeHtml(buttonText)}</button>
        </div>
      `;

      this._show();
      this._bindEvents();
    });
  }

  confirm(message, title = '确认', confirmText = '确认', cancelText = '取消') {
    return new Promise((resolve) => {
      this._init();
      this._closed = false;
      this._resolve = resolve;
      this._overlay.dataset.type = 'confirm';

      // ⭐ 优化 HTML 结构
      this._content.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">${this._escapeHtml(title)}</h3>
        </div>
        <div class="modal-body">
          <p class="modal-message">${this._escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost modal-btn" data-action="cancel">${this._escapeHtml(cancelText)}</button>
          <button class="btn btn-primary modal-btn" data-action="confirm">${this._escapeHtml(confirmText)}</button>
        </div>
      `;

      this._show();
      this._bindEvents();
    });
  }

  _show() {
    this._overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      this._overlay.classList.add('active');
    });
    setTimeout(() => {
      const btn = this._content.querySelector('[data-action="confirm"]');
      if (btn) btn.focus();
    }, 100);
  }

  _bindEvents() {
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

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

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
