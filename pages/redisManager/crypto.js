/**
 * RSA加密工具类
 * 用于Redis连接密码的安全传输
 */
class CryptoUtils {
    constructor() {
        this.publicKey = null;
        this.encrypt = null;
    }

    /**
     * 初始化RSA加密器
     * @param {string} publicKey - RSA公钥
     */
    init(publicKey) {
        if (!publicKey) {
            throw new Error('公钥不能为空');
        }
        
        this.publicKey = publicKey;
        
        // 检查JSEncrypt是否可用
        if (typeof JSEncrypt === 'undefined') {
            throw new Error('JSEncrypt库未加载，请确保已引入JSEncrypt');
        }
        
        this.encrypt = new JSEncrypt();
        this.encrypt.setPublicKey(this.publicKey);
        
        console.log('RSA加密器初始化成功');
    }

    /**
     * 加密密码
     * @param {string} password - 明文密码
     * @returns {string} 加密后的密码
     */
    encryptPassword(password) {
        if (!this.encrypt) {
            throw new Error('RSA加密器未初始化，请先调用init方法');
        }
        
        if (!password) {
            return ''; // 空密码直接返回空字符串
        }
        
        const encrypted = this.encrypt.encrypt(password);
        if (!encrypted) {
            throw new Error('密码加密失败');
        }
        
        console.log('密码加密成功');
        return encrypted;
    }

    /**
     * 验证公钥格式
     * @param {string} publicKey - RSA公钥
     * @returns {boolean} 是否为有效的公钥格式
     */
    static validatePublicKey(publicKey) {
        if (!publicKey || typeof publicKey !== 'string') {
            return false;
        }
        
        // 检查公钥格式
        const publicKeyRegex = /^-----BEGIN PUBLIC KEY-----[\s\S]*-----END PUBLIC KEY-----$/;
        return publicKeyRegex.test(publicKey.trim());
    }

    /**
     * 从配置中获取公钥
     * @param {object} config - 配置对象
     * @returns {string|null} 公钥字符串
     */
    static getPublicKeyFromConfig(config) {
        try {
            const publicKey = config?.security?.encryption?.publicKey;
            if (CryptoUtils.validatePublicKey(publicKey)) {
                return publicKey;
            }
            console.warn('配置中的公钥格式无效');
            return null;
        } catch (error) {
            console.error('获取公钥失败:', error);
            return null;
        }
    }
}

// 导出到全局作用域
window.CryptoUtils = CryptoUtils;