/**
 * ContentModel - 统一内容数据层
 */
import Storage from '../../utils/storage.js';
import { loadAllSystemData, getAllSystemData } from '../../data/index.js';

const ARTICLE_KEY = 'yantrace_articles';
const PHRASE_KEY = 'yantrace_phrases';

function saveData(key, data) {
  Storage.set(key, data);
}

class ContentModel {
  constructor() {
    this._articles = null;
    this._phrases = null;
    this._loaded = false;
    this._loadPromise = null;
  }

  /**
   * 公开方法：等待数据加载完成
   */
  async ready() {
    await this._ensureLoaded();
  }

  async _ensureLoaded() {
    if (this._loaded) return;
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = (async () => {
      await loadAllSystemData();

      const storedArticles = Storage.get(ARTICLE_KEY);
      const storedPhrases = Storage.get(PHRASE_KEY);

      if (storedArticles && Array.isArray(storedArticles) && storedArticles.length > 0) {
        this._articles = storedArticles;
      } else {
        this._articles = getAllSystemData('article', 'chinese')
          .concat(getAllSystemData('article', 'english'));
        saveData(ARTICLE_KEY, this._articles);
        console.log(`📚 首次加载系统文章: ${this._articles.length} 篇`);
      }

      if (storedPhrases && Array.isArray(storedPhrases) && storedPhrases.length > 0) {
        this._phrases = storedPhrases;
      } else {
        this._phrases = getAllSystemData('phrase', 'chinese')
          .concat(getAllSystemData('phrase', 'english'));
        saveData(PHRASE_KEY, this._phrases);
        console.log(`📚 首次加载系统词组: ${this._phrases.length} 组`);
      }

      this._loaded = true;
    })();

    return this._loadPromise;
  }

  // ---------- 获取 ----------

  async getItems(type, lang) {
    await this._ensureLoaded();
    const data = type === 'article' ? this._articles : this._phrases;
    return data.filter(item => item.type === lang);
  }

  async getItemsByCategory(type, lang, category) {
    await this._ensureLoaded();
    const data = type === 'article' ? this._articles : this._phrases;
    return data.filter(item => item.type === lang && item.category === category);
  }

  async getItem(type, id) {
    await this._ensureLoaded();
    const data = type === 'article' ? this._articles : this._phrases;
    return data.find(item => item.id === id) || null;
  }

  async getAll(type) {
    await this._ensureLoaded();
    return type === 'article' ? [...this._articles] : [...this._phrases];
  }

  // ---------- 创建 ----------

  async create(type, data) {
    await this._ensureLoaded();
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

  // ---------- 更新 ----------

  async update(type, id, updates) {
    await this._ensureLoaded();
    const items = type === 'article' ? this._articles : this._phrases;
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates };
    this._save(type);
    return items[index];
  }

  // ---------- 删除 ----------

  async delete(type, id) {
    await this._ensureLoaded();
    const items = type === 'article' ? this._articles : this._phrases;
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;
    items.splice(index, 1);
    this._save(type);
    return true;
  }

  // ---------- 保存 ----------

  _save(type) {
    if (type === 'article') {
      saveData(ARTICLE_KEY, this._articles);
    } else {
      saveData(PHRASE_KEY, this._phrases);
    }
  }

  // ---------- 重置 ----------

  async reset(type) {
    await this._ensureLoaded();
    if (type === 'article') {
      this._articles = getAllSystemData('article', 'chinese')
        .concat(getAllSystemData('article', 'english'));
      saveData(ARTICLE_KEY, this._articles);
      console.log(`📚 重置文章: ${this._articles.length} 篇`);
    } else {
      this._phrases = getAllSystemData('phrase', 'chinese')
        .concat(getAllSystemData('phrase', 'english'));
      saveData(PHRASE_KEY, this._phrases);
      console.log(`📚 重置词组: ${this._phrases.length} 组`);
    }
  }

  // ---------- 更新（补充新增的系统数据） ----------

  async updateSystemData(type) {
    await this._ensureLoaded();
    const systemData = type === 'article'
      ? getAllSystemData('article', 'chinese').concat(getAllSystemData('article', 'english'))
      : getAllSystemData('phrase', 'chinese').concat(getAllSystemData('phrase', 'english'));

    const currentData = type === 'article' ? this._articles : this._phrases;
    const currentIds = currentData.map(item => item.id);

    const newData = systemData.filter(item => !currentIds.includes(item.id));

    if (newData.length === 0) {
      console.log(`📚 没有新的系统${type === 'article' ? '文章' : '词组'}`);
      return 0;
    }

    currentData.push(...newData);
    this._save(type);
    console.log(`📚 新增 ${newData.length} 条系统${type === 'article' ? '文章' : '词组'}`);
    return newData.length;
  }
}

export default ContentModel;