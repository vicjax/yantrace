/**
 * 砚迹（YanTrace）- 内容策略基类
 * 位置：modules/practice/strategies/ContentStrategy.js
 */

export default class ContentStrategy {
  async load(id) {
    throw new Error('子类必须实现 load 方法');
  }

  getChars() {
    throw new Error('子类必须实现 getChars 方法');
  }

  getTitle() {
    throw new Error('子类必须实现 getTitle 方法');
  }

  getType() {
    throw new Error('子类必须实现 getType 方法');
  }

  getLanguage() {
    throw new Error('子类必须实现 getLanguage 方法');
  }

  getList() {
    throw new Error('子类必须实现 getList 方法');
  }

  getMetadata() {
    return {};
  }

  getCurrentId() {
    return this._currentId || null;
  }

  _setCurrentId(id) {
    this._currentId = id;
  }
}
