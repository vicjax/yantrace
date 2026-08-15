/**
 * UserView - 用户管理视图（下拉菜单版）
 * 职责：渲染下拉菜单，不包含业务逻辑
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
    this.isOpen = false;
    this.menuEl = null;
    this._modalOnConfirm = null;
    this._interactive = false;
  }

  /**
   * 渲染下拉菜单（挂载到 body）
   */
  render() {
    const oldMenu = document.getElementById("userMenu");
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement("div");
    menu.id = "userMenu";
    menu.className = "user-dropdown";
    menu.style.display = "none";
    menu.innerHTML = this._getMenuHtml();
    document.body.appendChild(menu);

    this.menuEl = menu;
    this._cacheMenuElements();
    this._bindMenuEvents();

    this._outsideClickHandler = (e) => {
      const userNameEl = document.getElementById("userName");
      if (
        this.isOpen &&
        !menu.contains(e.target) &&
        !userNameEl?.contains(e.target)
      ) {
        this.close();
      }
    };
    document.addEventListener("click", this._outsideClickHandler);

    this._escHandler = (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener("keydown", this._escHandler);
  }

  updateUserList(users, currentUserId) {
    this.users = users;
    this.currentUserId = currentUserId;
    this._renderList();
  }

  open() {
    if (!this.menuEl || !this._interactive) return;
    this.isOpen = true;
    this.menuEl.style.display = "block";
    this._renderList();
    this._positionMenu();
  }

  close() {
    if (!this.menuEl) return;
    this.isOpen = false;
    this.menuEl.style.display = "none";
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  setInteractive(interactive) {
    this._interactive = interactive;
    const userNameEl = document.getElementById("userName");
    if (!userNameEl) return;

    const arrowEl = document.getElementById("userNameArrow");

    if (interactive) {
      userNameEl.classList.remove("readonly");
      userNameEl.classList.add("interactive");
      userNameEl.style.cursor = "pointer";
      if (arrowEl) arrowEl.style.display = "inline";
    } else {
      userNameEl.classList.remove("interactive");
      userNameEl.classList.add("readonly");
      userNameEl.style.cursor = "default";
      if (arrowEl) arrowEl.style.display = "none";
    }
  }

  /**
   * 显示通用弹窗
   */
  showModal(config) {
    const {
      title = "提示",
      message = "",
      showInput = false,
      inputValue = "",
      confirmText = "确认",
      onConfirm = null,
      defaultHint = "", // 默认提示文字
    } = config;

    this._modalOnConfirm = onConfirm;

    let modal = document.getElementById("userModal");
    if (!modal) {
      modal = this._createModal();
    }

    const titleEl = modal.querySelector("#userModalTitle");
    const inputEl = modal.querySelector("#userModalInput");
    const errorEl = modal.querySelector("#userModalError");
    const confirmBtn = modal.querySelector("#userModalConfirm");

    // 设置标题
    if (titleEl) titleEl.textContent = title;

    // 设置输入框
    if (inputEl) {
      if (showInput) {
        inputEl.style.display = "block";
        inputEl.value = inputValue;
        inputEl.placeholder = "";
        // 清空错误状态
        inputEl.classList.remove("error");
        if (errorEl) {
          errorEl.textContent = defaultHint || "请输入内容";
          errorEl.style.color = "#8888aa";
          errorEl.style.display = "block";
        }
        // 输入时只清除输入框的错误样式，保留提示文字
        inputEl.oninput = () => {
          inputEl.classList.remove("error");
          // 如果当前是错误状态（红色），恢复为默认提示
          if (errorEl && errorEl.style.color === "rgb(248, 113, 113)") {
            errorEl.textContent = defaultHint || "请输入内容";
            errorEl.style.color = "#8888aa";
          }
        };
        // 聚焦时选中所有文字
        inputEl.onfocus = () => {
          inputEl.select();
        };
      } else {
        inputEl.style.display = "none";
        if (errorEl) {
          if (message) {
            errorEl.textContent = message;
            errorEl.style.color = "#8888aa";
            errorEl.style.display = "block";
          } else {
            errorEl.textContent = "";
            errorEl.style.display = "none";
          }
        }
      }
    }

    // 设置确认按钮文字
    if (confirmBtn) confirmBtn.textContent = confirmText;

    // 显示弹窗
    modal.style.display = "flex";
    if (showInput) {
      setTimeout(() => inputEl?.focus(), 100);
    }

    // 存储当前弹窗配置
    this._currentModalConfig = config;
    this._defaultHint = defaultHint || "请输入内容";
  }

  /**
   * 隐藏弹窗
   */
  hideModal() {
    const modal = document.getElementById("userModal");
    if (modal) modal.style.display = "none";
    this._modalOnConfirm = null;
    this._currentModalConfig = null;
  }

  /**
   * 显示输入框错误
   */
  showInputError(message) {
    const modal = document.getElementById("userModal");
    if (!modal) return;

    const inputEl = modal.querySelector("#userModalInput");
    const errorEl = modal.querySelector("#userModalError");

    if (inputEl) {
      inputEl.classList.add("error");
      inputEl.focus();
    }
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.color = "#f87171";
      errorEl.style.display = "block";
    }
  }

  /**
   * 重置错误状态到默认提示
   */
  resetError() {
    const modal = document.getElementById("userModal");
    if (!modal) return;

    const inputEl = modal.querySelector("#userModalInput");
    const errorEl = modal.querySelector("#userModalError");

    if (inputEl) {
      inputEl.classList.remove("error");
    }
    if (errorEl) {
      errorEl.textContent = this._defaultHint || "请输入内容";
      errorEl.style.color = "#8888aa";
      errorEl.style.display = "block";
    }
  }

  destroy() {
    const menu = document.getElementById("userMenu");
    if (menu) menu.remove();
    const modal = document.getElementById("userModal");
    if (modal) modal.remove();
    if (this._outsideClickHandler) {
      document.removeEventListener("click", this._outsideClickHandler);
    }
    if (this._escHandler) {
      document.removeEventListener("keydown", this._escHandler);
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  _getMenuHtml() {
    return `
      <div class="user-dropdown-header">
        <span class="user-dropdown-title">👤 切换用户</span>
      </div>
      <div class="user-dropdown-list" id="userDropdownList">
        <div class="user-dropdown-empty">加载中...</div>
      </div>
      <div class="user-dropdown-footer">
        <button class="user-dropdown-add-btn" id="userDropdownAddBtn">➕ 添加用户</button>
      </div>
    `;
  }

  _cacheMenuElements() {
    this.listEl = document.getElementById("userDropdownList");
    this.addBtn = document.getElementById("userDropdownAddBtn");
  }

  _bindMenuEvents() {
    if (this.addBtn) {
      this.addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close();
        this.showModal({
          title: "添加用户",
          showInput: true,
          inputValue: "",
          confirmText: "确认添加",
          defaultHint: "请输入用户名",
          onConfirm: (name) => {
            if (name && name.trim()) {
              if (this.onAddUser) this.onAddUser(name.trim());
            }
          },
        });
      });
    }
  }

  _renderList() {
    if (!this.listEl) return;

    if (this.users.length === 0) {
      this.listEl.innerHTML = '<div class="user-dropdown-empty">暂无用户</div>';
      return;
    }

    this.listEl.innerHTML = this.users
      .map((user) => {
        const isCurrent = user.id === this.currentUserId;
        return `
          <div class="user-dropdown-item ${isCurrent ? "current" : ""}" data-user-id="${user.id}">
            <span class="user-dropdown-name">${this._escapeHtml(user.name)}</span>
            ${isCurrent ? '<span class="user-dropdown-badge">当前</span>' : ""}
            <div class="user-dropdown-actions">
              <button class="user-dropdown-rename" data-id="${user.id}" title="重命名">✏️</button>
              ${this.users.length > 1 ? `<button class="user-dropdown-delete" data-id="${user.id}" title="删除">🗑️</button>` : ""}
            </div>
          </div>
        `;
      })
      .join("");

    this.listEl.querySelectorAll(".user-dropdown-item").forEach((item) => {
      const userId = item.dataset.userId;
      item.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        if (userId !== this.currentUserId) {
          if (this.onSwitchUser) this.onSwitchUser(userId);
          this.close();
        }
      });
    });

    this.listEl.querySelectorAll(".user-dropdown-rename").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const userId = btn.dataset.id;
        const user = this.users.find((u) => u.id === userId);
        if (!user) return;
        this.close();
        this.showModal({
          title: "修改昵称",
          showInput: true,
          inputValue: user.name,
          confirmText: "确认修改",
          defaultHint: "请输入新昵称",
          onConfirm: (newName) => {
            if (newName && newName.trim() && newName.trim() !== user.name) {
              if (this.onRenameUser) this.onRenameUser(userId, newName.trim());
            }
          },
        });
      });
    });

    this.listEl.querySelectorAll(".user-dropdown-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const userId = btn.dataset.id;
        this.close();
        if (this.onDeleteUser) this.onDeleteUser(userId);
      });
    });
  }

  _positionMenu() {
    if (!this.menuEl) return;
    const userNameEl = document.getElementById("userName");
    if (!userNameEl) return;

    const rect = userNameEl.getBoundingClientRect();
    this.menuEl.style.top = rect.bottom + 6 + "px";
    this.menuEl.style.right = window.innerWidth - rect.right + "px";
    this.menuEl.style.minWidth = Math.max(rect.width, 200) + "px";
  }

  _createModal() {
    const modal = document.createElement("div");
    modal.id = "userModal";
    modal.className = "custom-modal";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="custom-modal-overlay"></div>
      <div class="custom-modal-content">
        <div class="custom-modal-header">
          <h3 id="userModalTitle">提示</h3>
          <button class="custom-modal-close" id="userModalClose">✕</button>
        </div>
        <div class="custom-modal-body">
          <input type="text" id="userModalInput" placeholder="" style="display:none;">
          <div id="userModalError" class="modal-error" style="display:none;"></div>
        </div>
        <div class="custom-modal-footer">
          <button class="btn-ghost" id="userModalCancel">取消</button>
          <button class="btn-primary" id="userModalConfirm">确认</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => {
      this.hideModal();
      this.resetError();
    };

    // 取消/关闭：重置错误状态
    const cancel = () => {
      this.hideModal();
      this.resetError();
    };

    modal.querySelector("#userModalClose").addEventListener("click", close);
    modal.querySelector("#userModalCancel").addEventListener("click", cancel);
    modal
      .querySelector(".custom-modal-overlay")
      .addEventListener("click", cancel);

    // 确认按钮：先校验，再执行回调，弹窗不自动关闭
    modal.querySelector("#userModalConfirm").addEventListener("click", () => {
      const input = modal.querySelector("#userModalInput");
      const value = input?.value || "";
      const config = this._currentModalConfig;

      // 如果需要输入框且值为空
      if (config?.showInput && (!value || !value.trim())) {
        this.showInputError(this._defaultHint || "请输入内容");
        return;
      }

      const onConfirm = this._modalOnConfirm;
      if (onConfirm) {
        onConfirm(value);
      }
    });

    modal.querySelector("#userModalInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        modal.querySelector("#userModalConfirm").click();
      }
    });

    return modal;
  }

  _escapeHtml(str) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(str).replace(/[&<>"']/g, (m) => map[m] || m);
  }
}
