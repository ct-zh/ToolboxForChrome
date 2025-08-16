package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

// TokenInfo Token信息
type TokenInfo struct {
	Token        string    `json:"token"`
	ConnectionID string    `json:"connectionId"`
	CreatedAt    time.Time `json:"createdAt"`
	ExpiresAt    time.Time `json:"expiresAt"`
	LastUsed     time.Time `json:"lastUsed"`
}

// TokenManager Token管理器
type TokenManager struct {
	tokens      map[string]*TokenInfo
	mutex       sync.RWMutex
	tokenExpiry time.Duration
}

// NewTokenManager 创建新的Token管理器
func NewTokenManager(tokenExpiry time.Duration) *TokenManager {
	return &TokenManager{
		tokens:      make(map[string]*TokenInfo),
		tokenExpiry: tokenExpiry,
	}
}

// GenerateToken 生成新的Token
func (tm *TokenManager) GenerateToken(connectionID string) (*TokenInfo, error) {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	// 生成随机Token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, fmt.Errorf("failed to generate token: %v", err)
	}

	token := hex.EncodeToString(tokenBytes)
	now := time.Now()

	// 创建Token信息
	tokenInfo := &TokenInfo{
		Token:        token,
		ConnectionID: connectionID,
		CreatedAt:    now,
		ExpiresAt:    now.Add(tm.tokenExpiry),
		LastUsed:     now,
	}

	// 存储Token
	tm.tokens[token] = tokenInfo

	return tokenInfo, nil
}

// ValidateToken 验证Token
func (tm *TokenManager) ValidateToken(token string) (*TokenInfo, error) {
	tm.mutex.RLock()
	defer tm.mutex.RUnlock()

	tokenInfo, exists := tm.tokens[token]
	if !exists {
		return nil, fmt.Errorf("invalid token")
	}

	// 检查Token是否过期
	if time.Now().After(tokenInfo.ExpiresAt) {
		return nil, fmt.Errorf("token expired")
	}

	// 更新最后使用时间
	tokenInfo.LastUsed = time.Now()

	return tokenInfo, nil
}

// RefreshToken 刷新Token
func (tm *TokenManager) RefreshToken(token string) (*TokenInfo, error) {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	tokenInfo, exists := tm.tokens[token]
	if !exists {
		return nil, fmt.Errorf("invalid token")
	}

	// 检查Token是否过期
	if time.Now().After(tokenInfo.ExpiresAt) {
		return nil, fmt.Errorf("token expired")
	}

	// 延长过期时间
	now := time.Now()
	tokenInfo.ExpiresAt = now.Add(tm.tokenExpiry)
	tokenInfo.LastUsed = now

	return tokenInfo, nil
}

// RevokeToken 撤销Token
func (tm *TokenManager) RevokeToken(token string) error {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	if _, exists := tm.tokens[token]; !exists {
		return fmt.Errorf("token not found")
	}

	delete(tm.tokens, token)
	return nil
}

// RevokeTokensByConnectionID 根据连接ID撤销所有Token
func (tm *TokenManager) RevokeTokensByConnectionID(connectionID string) {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	for token, tokenInfo := range tm.tokens {
		if tokenInfo.ConnectionID == connectionID {
			delete(tm.tokens, token)
		}
	}
}

// CleanupExpiredTokens 清理过期Token
func (tm *TokenManager) CleanupExpiredTokens() {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	now := time.Now()
	for token, tokenInfo := range tm.tokens {
		if now.After(tokenInfo.ExpiresAt) {
			delete(tm.tokens, token)
		}
	}
}

// GetTokenCount 获取Token数量
func (tm *TokenManager) GetTokenCount() int {
	tm.mutex.RLock()
	defer tm.mutex.RUnlock()

	return len(tm.tokens)
}

// ListTokens 列出所有Token（用于调试）
func (tm *TokenManager) ListTokens() []*TokenInfo {
	tm.mutex.RLock()
	defer tm.mutex.RUnlock()

	tokens := make([]*TokenInfo, 0, len(tm.tokens))
	for _, tokenInfo := range tm.tokens {
		tokens = append(tokens, tokenInfo)
	}

	return tokens
}