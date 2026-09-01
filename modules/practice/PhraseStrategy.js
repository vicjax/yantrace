/**
 * 砚迹（YanTrace）- 词组内容策略
 * 位置：modules/practice/strategies/PhraseStrategy.js
 */

import ContentStrategy from "./ContentStrategy.js";

export default class PhraseStrategy extends ContentStrategy {
  constructor(phraseService, language) {
    super();
    this._phraseService = phraseService;
    this._language = language;
    this._currentPhraseSet = null;
    this._phraseSets = [];
    this._loaded = false;
    this._cachedChars = [];
    this._loadPromise = null; // ✅ 添加
  }

  loadList() {
    if (this._loaded) return Promise.resolve(this._phraseSets);
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = (async () => {
      const result = await this._phraseService.getByType(this._language);
      this._phraseSets = result || [];
      this._loaded = true;
      return this._phraseSets;
    })();

    return this._loadPromise;
  }

  async load(id) {
    await this.loadList();
    const phraseSet = await this._phraseService.getById(id);
    if (!phraseSet) {
      console.warn(`[PhraseStrategy] 词组集 ${id} 不存在`);
      return;
    }
    this._currentPhraseSet = phraseSet;

    const chars = [];
    const words = phraseSet.words || [];
    words.forEach((word) => {
      word.split("").forEach((char) => {
        chars.push(char);
      });
    });

    this._cachedChars = chars;
    this._setCurrentId(id);
  }

  getChars() {
    return this._cachedChars;
  }

  getTitle() {
    return this._currentPhraseSet?.name || "未选择词组";
  }

  getType() {
    return "phrase";
  }

  getLanguage() {
    return this._language;
  }

  getList(category) {
    if (!this._loaded) {
      console.warn("[PhraseStrategy] getList called before loadList");
      return [];
    }

    let phraseSets = this._phraseSets;
    if (category) {
      phraseSets = phraseSets.filter((item) => item.category === category);
    }

    return phraseSets.map((item) => ({
      id: item.id,
      title: item.name,
      type: "phrase",
      difficulty: item.difficulty || 1,
      wordCount: item.words?.length || 0,
    }));
  }

  getMetadata() {
    if (!this._currentPhraseSet) return {};
    const words = this._currentPhraseSet.words || [];
    const totalChars = words.reduce((sum, w) => sum + w.length, 0);
    return {
      wordCount: words.length,
      difficulty: this._currentPhraseSet.difficulty || 1,
      totalChars: totalChars,
      tags: ["词组", this._language === "chinese" ? "中文" : "英文"],
    };
  }

  getRawData() {
    return this._currentPhraseSet;
  }
}
