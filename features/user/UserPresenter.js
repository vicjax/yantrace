/**
 * UserPresenter - 用户管理展示器（下拉菜单版）
 */
import BasePresenter from "../../core/BasePresenter.js";
import UserView from "./UserView.js";

export default class UserPresenter extends BasePresenter {
  constructor(options = {}) {
    super(options);
    this.userService = options.userService;
    this.settingsService = options.settingsService;
    this.historyService = options.historyService;
    this.onUserChanged = options.onUserChanged || null;
    this.currentPage = "home";

    this.view = new UserView({
      onAddUser: (name) => this._handleAddUser(name),
      onSwitchUser: (userId) => this._handleSwitchUser(userId),
      onDeleteUser: (userId) => this._handleDeleteUser(userId),
      onRenameUser: (userId, newName) =>
        this._handleRenameUser(userId, newName),
    });

    this.view.render();
    this._refreshList();
    this._bindTopbarClick();
  }

  toggleMenu() {
    if (this.currentPage !== "home") return;
    this.view.toggle();
    if (this.view.isOpen) {
      this._refreshList();
    }
  }

  updateTopbar() {
    const current = this.userService.getCurrent();
    const userNameEl = document.getElementById("userName");
    if (userNameEl && current) {
      const textEl = document.getElementById("userNameText");
      if (textEl) {
        textEl.textContent = current.name;
      }
    }
  }

  destroy() {
    this.view.destroy();
    super.destroy();
  }

  setInteractive(interactive) {
    this.view.setInteractive(interactive);
  }

  setCurrentPage(pageId) {
    this.currentPage = pageId;
    const interactive = pageId === "home";
    this.setInteractive(interactive);
  }

  // ============================================
  // 私有方法
  // ============================================

  _bindTopbarClick() {
    const userNameEl = document.getElementById("userName");
    if (userNameEl) {
      userNameEl.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.currentPage !== "home") return;
        this.toggleMenu();
      });
    }
  }

  _refreshList() {
    const users = this.userService.getAll();
    const current = this.userService.getCurrent();
    this.view.updateUserList(users, current?.id);
    this.updateTopbar();
  }

  _handleAddUser(name) {
    try {
      const newUser = this.userService.create(name.trim());
      if (newUser) {
        this.userService.setCurrent(newUser.id);
      }
      this._refreshList();
      if (this.onUserChanged) this.onUserChanged();
      console.log(`👤 创建用户：${name.trim()}`);
      this.view.hideModal();
      this.view.resetError(); // ⭐ 新增
    } catch (err) {
      this.view.showInputError(err.message);
    }
  }

  _handleSwitchUser(userId) {
    const user = this.userService.getById(userId);
    if (!user) return;

    this.userService.setCurrent(userId);
    this._refreshList();
    if (this.onUserChanged) this.onUserChanged();
    console.log(`👤 切换到用户：${user.name}`);
  }

  _handleDeleteUser(userId) {
    const user = this.userService.getById(userId);
    if (!user) return;

    const historyRecords = this.historyService?.getByUser(userId) || [];
    const historyCount = historyRecords.length;

    if (historyCount > 0) {
      this.view.showModal({
        title: "无法删除",
        showInput: false,
        message: `用户「${user.name}」有 ${historyCount} 条历史记录，请先清空历史记录后再删除。`,
        confirmText: "知道了",
        onConfirm: () => {
          this.view.hideModal();
        },
      });
      return;
    }

    this.view.showModal({
      title: "确认删除",
      showInput: false,
      confirmText: "确认删除",
      onConfirm: () => {
        try {
          this.userService.delete(userId);
          this._refreshList();
          if (this.onUserChanged) this.onUserChanged();
          console.log(`🗑️ 已删除用户：${user.name}`);
          this.view.hideModal();
        } catch (err) {
          this.view.showInputError(err.message);
        }
      },
    });
  }

  _handleRenameUser(userId, newName) {
    try {
      this.userService.updateName(userId, newName.trim());
      this._refreshList();
      if (this.onUserChanged) this.onUserChanged();
      console.log(`✏️ 昵称已修改为：${newName.trim()}`);
      this.view.hideModal();
      this.view.resetError(); // ⭐ 新增
    } catch (err) {
      this.view.showInputError(err.message);
    }
  }
}
