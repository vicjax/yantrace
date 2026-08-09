/**
 * UserView - 用户管理视图
 * 职责：纯 DOM 渲染，不包含业务逻辑
 */
export default class UserView {
    constructor(options = {}) {
        this.onAddUser = options.onAddUser || null;
        this.onSwitchUser = options.onSwitchUser || null;
        this.onDeleteUser = options.onDeleteUser || null;
        this.onRenameUser = options.onRenameUser || null;
        this.container = null;
        this.users = [];
        this.currentUserId = null;
    }

    /**
     * 渲染用户管理界面
     * @param {HTMLElement} container - 页面容器
     */
    render(container) {
        this.container = container;
        container.innerHTML = this._getHtml();
        this._cacheElements();
        this._bindEvents();
    }

    /**
     * 更新用户列表
     * @param {Array} users - 用户列表
     * @param {string} currentUserId - 当前用户 ID
     */
    updateUserList(users, currentUserId) {
        this.users = users;
        this.currentUserId = currentUserId;
        this._renderList();
    }

    /**
     * 获取页面 HTML
     */
    _getHtml() {
        return `
            <div class="mode-header">
                <button class="back-btn" data-target="home">← 返回</button>
                <h2>👤 用户管理</h2>
                <button class="new-btn" id="addUserBtn">➕ 添加用户</button>
            </div>
            <div class="user-list" id="userList">
                <div class="history-empty">加载中...</div>
            </div>
        `;
    }

    /**
     * 缓存 DOM 元素
     */
    _cacheElements() {
        this.userListEl = document.getElementById('userList');
        this.addBtn = document.getElementById('addUserBtn');
    }

    /**
     * 渲染用户列表
     */
    _renderList() {
        if (!this.userListEl) return;

        if (this.users.length === 0) {
            this.userListEl.innerHTML = '<div class="history-empty">暂无用户</div>';
            return;
        }

        this.userListEl.innerHTML = this.users.map(user => {
            const isCurrent = user.id === this.currentUserId;
            return `
                <div class="user-item" data-user-id="${user.id}">
                    <span class="name">${user.name}</span>
                    ${isCurrent ? '<span class="badge">当前</span>' : ''}
                    <div class="actions">
                        ${!isCurrent ? `<button class="switch-btn" data-id="${user.id}">切换</button>` : ''}
                        ${this.users.length > 1 ? `<button class="danger delete-btn" data-id="${user.id}">删除</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // 重新绑定列表内的事件
        this._bindListEvents();
    }

    /**
     * 绑定列表内按钮事件
     */
    _bindListEvents() {
        // 切换按钮
        this.userListEl.querySelectorAll('.switch-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.dataset.id;
                if (this.onSwitchUser) this.onSwitchUser(userId);
            });
        });

        // 删除按钮
        this.userListEl.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.dataset.id;
                if (this.onDeleteUser) this.onDeleteUser(userId);
            });
        });

        // 双击用户名 → 重命名
        this.userListEl.querySelectorAll('.user-item .name').forEach(el => {
            el.addEventListener('dblclick', () => {
                const item = el.closest('.user-item');
                const userId = item.dataset.userId;
                const currentName = el.textContent;
                if (this.onRenameUser) this.onRenameUser(userId, currentName);
            });
        });
    }

    /**
     * 绑定全局事件
     */
    _bindEvents() {
        // 添加用户按钮
        if (this.addBtn) {
            this.addBtn.addEventListener('click', () => {
                if (this.onAddUser) this.onAddUser();
            });
        }

        // 返回按钮
        this.container.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                if (target && window.app?.navigator) {
                    window.app.navigator.goTo(target);
                }
            });
        });
    }

    /**
     * 销毁
     */
    destroy() {
        this.container = null;
        this.userListEl = null;
        this.addBtn = null;
    }
}