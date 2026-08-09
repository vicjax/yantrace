/**
 * 砚迹（YanTrace）- 用户管理服务
 * 职责：管理用户的增删改查，持久化到 localStorage
 */

import Storage from '../../utils/storage.js';
import Helpers from '../../utils/helpers.js';

// ============================================
// 常量
// ============================================

const STORAGE_KEY = 'yantrace_users';
const CURRENT_USER_KEY = 'yantrace_current_user';


// ============================================
// 用户服务类
// ============================================

class UserService {
    constructor() {
        this.users = [];
        this.currentUserId = null;
        this._loaded = false;
    }

    /**
     * 加载所有用户
     * @returns {Array} 用户列表
     */
    loadAll() {
        if (this._loaded) return this.users;

        const data = Storage.get(STORAGE_KEY);
        if (data && data.length > 0) {
            this.users = data;
        } else {
            this.users = [];
        }

        // 加载当前用户 ID
        this.currentUserId = Storage.get(CURRENT_USER_KEY, null);

        // 验证当前用户是否还存在
        if (this.currentUserId) {
            const exists = this.users.some(u => u.id === this.currentUserId);
            if (!exists) {
                this.currentUserId = null;
                Storage.remove(CURRENT_USER_KEY);
            }
        }

        this._loaded = true;
        return this.users;
    }

    /**
     * 获取所有用户
     * @returns {Array}
     */
    getAll() {
        if (!this._loaded) this.loadAll();
        return this.users;
    }

    /**
     * 获取当前用户
     * @returns {Object|null}
     */
    getCurrent() {
        if (!this._loaded) this.loadAll();
        if (!this.currentUserId) return null;
        return this.users.find(u => u.id === this.currentUserId) || null;
    }

    /**
     * 根据 ID 获取用户
     * @param {string} id
     * @returns {Object|null}
     */
    getById(id) {
        return this.getAll().find(u => u.id === id) || null;
    }

    /**
     * 获取第一个用户（当没有当前用户时使用）
     * @returns {Object|null}
     */
    getFirst() {
        const users = this.getAll();
        return users.length > 0 ? users[0] : null;
    }

    /**
     * 创建用户
     * @param {string} name - 用户名
     * @returns {Object} 创建的用户对象
     */
    create(name) {
        const trimmed = name.trim();
        if (!trimmed) {
            throw new Error('用户名不能为空');
        }

        // 检查是否已存在同名用户
        const exists = this.users.some(u => u.name === trimmed);
        if (exists) {
            throw new Error(`用户 "${trimmed}" 已存在`);
        }

        const user = {
            id: Helpers.generateId('usr'),
            name: trimmed,
            createdAt: new Date().toISOString()
        };

        this.users.push(user);
        this._save();

        // 如果这是第一个用户，自动设为当前用户
        if (this.users.length === 1) {
            this.setCurrent(user.id);
        }

        return user;
    }

    /**
     * 设置当前用户
     * @param {string} id - 用户 ID
     * @returns {boolean}
     */
    setCurrent(id) {
        const user = this.getById(id);
        if (!user) return false;

        this.currentUserId = id;
        Storage.set(CURRENT_USER_KEY, id);
        return true;
    }

    /**
     * 更新用户名
     * @param {string} id - 用户 ID
     * @param {string} newName - 新用户名
     * @returns {Object|null}
     */
    updateName(id, newName) {
        const trimmed = newName.trim();
        if (!trimmed) {
            throw new Error('用户名不能为空');
        }

        const user = this.getById(id);
        if (!user) return null;

        // 检查新名称是否已被其他用户使用
        const exists = this.users.some(u => u.id !== id && u.name === trimmed);
        if (exists) {
            throw new Error(`用户 "${trimmed}" 已存在`);
        }

        user.name = trimmed;
        this._save();
        return user;
    }

    /**
     * 删除用户
     * @param {string} id - 用户 ID
     * @returns {boolean}
     */
    delete(id) {
        const users = this.getAll();
        if (users.length <= 1) {
            throw new Error('至少保留一个用户');
        }

        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) return false;

        this.users.splice(index, 1);
        this._save();

        // 如果删除的是当前用户，切换到第一个
        if (this.currentUserId === id) {
            const first = this.getFirst();
            if (first) {
                this.setCurrent(first.id);
            } else {
                this.currentUserId = null;
                Storage.remove(CURRENT_USER_KEY);
            }
        }

        return true;
    }

    /**
     * 获取用户总数
     * @returns {number}
     */
    count() {
        return this.getAll().length;
    }

    /**
     * 保存到 localStorage
     * @private
     */
    _save() {
        Storage.set(STORAGE_KEY, this.users);
        if (this.currentUserId) {
            Storage.set(CURRENT_USER_KEY, this.currentUserId);
        }
    }
}


// ============================================
// 导出
// ============================================

export default UserService;