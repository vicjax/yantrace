/**
 * UserPresenter - 用户管理展示器
 * 职责：业务逻辑（增删改查、切换用户）
 */
import BasePresenter from '../core/BasePresenter.js';
import UserView from '../views/UserView.js';

export default class UserPresenter extends BasePresenter {
    constructor(options = {}) {
        super(options);
        this.userService = options.userService;
        this.settingsService = options.settingsService;
        this.onUserChanged = options.onUserChanged || null;

        // 创建 View
        this.view = new UserView({
            onAddUser: () => this._handleAddUser(),
            onSwitchUser: (userId) => this._handleSwitchUser(userId),
            onDeleteUser: (userId) => this._handleDeleteUser(userId),
            onRenameUser: (userId, currentName) => this._handleRenameUser(userId, currentName)
        });
    }

    /**
     * 渲染页面
     */
    render(container) {
        super.render(container);
        this._refreshList();
    }

    /**
     * 刷新用户列表
     */
    _refreshList() {
        const users = this.userService.getAll();
        const current = this.userService.getCurrent();
        this.view.updateUserList(users, current?.id);
        this._updateTopbar();
    }

    /**
     * 更新顶部栏显示
     */
    _updateTopbar() {
    const current = this.userService.getCurrent();
    const userNameEl = document.getElementById('userName');
    if (userNameEl && current) {
        userNameEl.textContent = `👤 ${current.name}`;
    }
}

    /**
     * 处理添加用户
     */
    _handleAddUser() {
        const name = prompt('请输入新用户名称：');
        if (!name || !name.trim()) return;

        try {
            this.userService.create(name.trim());
            this._refreshList();
            // 通知 app 更新顶部栏
            if (this.onUserChanged) this.onUserChanged();
            console.log(`👤 创建用户：${name.trim()}`);
        } catch (err) {
            alert(err.message);
        }
    }

    /**
     * 处理切换用户
     */
    _handleSwitchUser(userId) {
        const user = this.userService.getById(userId);
        if (!user) return;

        this.userService.setCurrent(userId);
        this._refreshList();
        if (this.onUserChanged) this.onUserChanged();
        console.log(`👤 切换到用户：${user.name}`);
    }

    /**
     * 处理删除用户
     */
    _handleDeleteUser(userId) {
        const user = this.userService.getById(userId);
        if (!user) return;

        if (!confirm(`确定要删除用户「${user.name}」吗？`)) return;

        try {
            this.userService.delete(userId);
            this._refreshList();
            if (this.onUserChanged) this.onUserChanged();
            console.log(`🗑️ 已删除用户：${user.name}`);
        } catch (err) {
            alert(err.message);
        }
    }

    /**
     * 处理重命名用户
     */
    _handleRenameUser(userId, currentName) {
        const newName = prompt(`修改昵称（当前：${currentName}）：`, currentName);
        if (!newName || !newName.trim() || newName.trim() === currentName) return;

        try {
            this.userService.updateName(userId, newName.trim());
            this._refreshList();
            if (this.onUserChanged) this.onUserChanged();
            console.log(`✏️ 昵称已修改为：${newName.trim()}`);
        } catch (err) {
            alert(err.message);
        }
    }

    /**
     * 销毁
     */
    destroy() {
        super.destroy();
    }
}