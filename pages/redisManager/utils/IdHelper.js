/**
 * ID助手工具类
 * 用于处理带cardId后缀的元素ID
 */
class IdHelper {
    /**
     * 获取带cardId后缀的元素ID
     * @param {string} baseId - 基础ID
     * @param {string} cardId - 卡片ID
     * @returns {string} 完整的元素ID
     */
    static getElementId(baseId, cardId) {
        return cardId ? `${baseId}-${cardId}` : baseId;
    }

    /**
     * 获取带cardId后缀的元素选择器
     * @param {string} baseId - 基础ID
     * @param {string} cardId - 卡片ID
     * @returns {string} 完整的元素选择器
     */
    static getElementSelector(baseId, cardId) {
        return `#${this.getElementId(baseId, cardId)}`;
    }

    /**
     * 在指定容器中查找带cardId后缀的元素
     * @param {Element} container - 容器元素
     * @param {string} baseId - 基础ID
     * @param {string} cardId - 卡片ID
     * @returns {Element|null} 找到的元素或null
     */
    static querySelector(container, baseId, cardId) {
        const selector = this.getElementSelector(baseId, cardId);
        return container.querySelector(selector);
    }

    /**
     * 在指定容器中查找所有带cardId后缀的元素
     * @param {Element} container - 容器元素
     * @param {string} baseId - 基础ID
     * @param {string} cardId - 卡片ID
     * @returns {NodeList} 找到的元素列表
     */
    static querySelectorAll(container, baseId, cardId) {
        const selector = this.getElementSelector(baseId, cardId);
        return container.querySelectorAll(selector);
    }
}

// 导出IdHelper类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IdHelper;
} else if (typeof window !== 'undefined') {
    window.IdHelper = IdHelper;
}