/**
 * ContentModel - 统一内容数据层
 * 职责：管理文章和词组数据，统一接口
 * 
 * 存储：保持两个 Key 不变，避免数据迁移
 *   - yantrace_articles: 文章数据
 *   - yantrace_phrases: 词组数据
 */

import Storage from '../../utils/storage.js';

const ARTICLE_KEY = 'yantrace_articles';
const PHRASE_KEY = 'yantrace_phrases';

// ============================================
// 数据加载/保存
// ============================================

function loadData(key, defaultData) {
  const data = Storage.get(key);
  if (data && Array.isArray(data) && data.length > 0) {
    return data;
  }
  Storage.set(key, defaultData);
  return defaultData;
}

function saveData(key, data) {
  Storage.set(key, data);
}

// ============================================
// ContentModel 类
// ============================================

class ContentModel {
  constructor() {
    this._articles = null;
    this._phrases = null;
    this._loaded = false;
  }

  _load() {
    if (this._loaded) return;
    this._articles = loadData(ARTICLE_KEY, []);
    this._phrases = loadData(PHRASE_KEY, []);
    this._loaded = true;
  }

  getItems(type, lang) {
    this._load();
    const data = type === 'article' ? this._articles : this._phrases;
    return data.filter(item => item.type === lang);
  }

  getItem(type, id) {
    this._load();
    const data = type === 'article' ? this._articles : this._phrases;
    return data.find(item => item.id === id) || null;
  }

  getAll(type) {
    this._load();
    return type === 'article' ? [...this._articles] : [...this._phrases];
  }

  create(type, data) {
    this._load();
    const items = type === 'article' ? this._articles : this._phrases;
    const newItem = {
      ...data,
      id: `${type}-${Date.now().toString(36)}`,
      createdAt: Date.now(),
    };
    items.push(newItem);
    this._save(type);
    return newItem;
  }

  update(type, id, updates) {
    this._load();
    const items = type === 'article' ? this._articles : this._phrases;
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates };
    this._save(type);
    return items[index];
  }

  delete(type, id) {
    this._load();
    const items = type === 'article' ? this._articles : this._phrases;
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;
    items.splice(index, 1);
    this._save(type);
    return true;
  }

  _save(type) {
    if (type === 'article') {
      saveData(ARTICLE_KEY, this._articles);
    } else {
      saveData(PHRASE_KEY, this._phrases);
    }
  }

  reset(type) {
    console.warn('重置功能暂时不可用，等待数据文件');
    // TODO: 数据文件准备后实现
  }
}

export default ContentModel;