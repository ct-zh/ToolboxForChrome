package main

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// MockRedisManager Mock Redis管理器实现
type MockRedisManager struct {
	data *MockRedisData
	mutex sync.RWMutex
}

// NewMockRedisManager 创建Mock Redis管理器
func NewMockRedisManager() *MockRedisManager {
	return &MockRedisManager{
		data: &MockRedisData{
			Keys: make(map[string]MockKeyData),
		},
	}
}

// initMockData 初始化Mock数据
func (m *MockRedisManager) initMockData() {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	
	now := time.Now()
	
	// 添加一些测试数据
	m.data.Keys["user:session:12345"] = MockKeyData{
		Type:      "string",
		Value:     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
		TTL:       3600, // 1小时
		CreatedAt: now.Add(-time.Hour),
		UpdatedAt: now,
	}
	
	m.data.Keys["user:profile:john"] = MockKeyData{
		Type: "hash",
		Value: map[string]interface{}{
			"name":  "John Doe",
			"email": "john@example.com",
			"age":   "30",
		},
		TTL:       -1, // 永不过期
		CreatedAt: now.Add(-2 * time.Hour),
		UpdatedAt: now.Add(-time.Minute * 30),
	}
	
	m.data.Keys["cache:temp:data"] = MockKeyData{
		Type:      "string",
		Value:     "temporary cached data",
		TTL:       300, // 5分钟
		CreatedAt: now.Add(-time.Minute * 2),
		UpdatedAt: now.Add(-time.Minute * 2),
	}
	
	m.data.Keys["queue:tasks"] = MockKeyData{
		Type: "list",
		Value: []interface{}{
			"task1",
			"task2",
			"task3",
		},
		TTL:       7200, // 2小时
		CreatedAt: now.Add(-time.Minute * 10),
		UpdatedAt: now.Add(-time.Minute * 5),
	}
	
	m.data.Keys["set:tags"] = MockKeyData{
		Type: "set",
		Value: []interface{}{
			"redis",
			"cache",
			"database",
		},
		TTL:       -1, // 永不过期
		CreatedAt: now.Add(-time.Hour * 3),
		UpdatedAt: now.Add(-time.Hour),
	}
	
	m.data.Keys["zset:scores"] = MockKeyData{
		Type: "zset",
		Value: map[string]interface{}{
			"player1": 100,
			"player2": 85,
			"player3": 92,
		},
		TTL:       1800, // 30分钟
		CreatedAt: now.Add(-time.Minute * 15),
		UpdatedAt: now.Add(-time.Minute * 5),
	}
}

// GetKeyInfo 获取键信息
func (m *MockRedisManager) GetKeyInfo(keyName string) (*KeyInfo, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	keyData, exists := m.data.Keys[keyName]
	if !exists {
		return nil, fmt.Errorf("键 '%s' 不存在", keyName)
	}
	
	// 检查TTL是否过期
	var ttl int64 = keyData.TTL
	if keyData.TTL > 0 {
		// 计算剩余时间
		elapsed := time.Since(keyData.UpdatedAt).Seconds()
		remaining := keyData.TTL - int64(elapsed)
		if remaining <= 0 {
			// 键已过期，从数据中删除
			m.mutex.RUnlock()
			m.mutex.Lock()
			delete(m.data.Keys, keyName)
			m.mutex.Unlock()
			m.mutex.RLock()
			return nil, fmt.Errorf("键 '%s' 已过期", keyName)
		}
		ttl = remaining
	}
	
	// 计算键大小
	var size int64
	if valueBytes, err := json.Marshal(keyData.Value); err == nil {
		size = int64(len(valueBytes))
	}
	
	return &KeyInfo{
		Name:      keyName,
		Type:      keyData.Type,
		TTL:       ttl,
		Size:      size,
		Value:     keyData.Value,
		CreatedAt: keyData.CreatedAt,
		UpdatedAt: keyData.UpdatedAt,
	}, nil
}

// DeleteKey 删除键
func (m *MockRedisManager) DeleteKey(keyName string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	
	if _, exists := m.data.Keys[keyName]; !exists {
		return fmt.Errorf("键 '%s' 不存在", keyName)
	}
	
	delete(m.data.Keys, keyName)
	return nil
}

// KeyExists 检查键是否存在
func (m *MockRedisManager) KeyExists(keyName string) bool {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	keyData, exists := m.data.Keys[keyName]
	if !exists {
		return false
	}
	
	// 检查TTL是否过期
	if keyData.TTL > 0 {
		elapsed := time.Since(keyData.UpdatedAt).Seconds()
		remaining := keyData.TTL - int64(elapsed)
		if remaining <= 0 {
			// 键已过期
			m.mutex.RUnlock()
			m.mutex.Lock()
			delete(m.data.Keys, keyName)
			m.mutex.Unlock()
			m.mutex.RLock()
			return false
		}
	}
	
	return true
}

// Close 关闭连接（Mock模式下无需实际操作）
func (m *MockRedisManager) Close() error {
	return nil
}

// GetAllKeys 获取所有键名（用于调试）
func (m *MockRedisManager) GetAllKeys() []string {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	
	keys := make([]string, 0, len(m.data.Keys))
	for keyName := range m.data.Keys {
		keys = append(keys, keyName)
	}
	return keys
}