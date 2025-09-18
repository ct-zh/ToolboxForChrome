package main

import "time"

// PingResponse ping接口响应结构
type PingResponse struct {
	Status    string `json:"status"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
}

// ConfigFile 配置文件结构
type ConfigFile struct {
	FileName  string     `json:"file_name"`
	Service   string     `json:"service"`
	Package   string     `json:"package,omitempty"`
	FilePath  string     `json:"file_path,omitempty"`
	RedisKeys []RedisKey `json:"redis_keys"`
}

// Parameter Redis键参数结构
type Parameter struct {
	Index       int    `json:"index"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Placeholder string `json:"placeholder"`
}

// RedisKey Redis键结构
type RedisKey struct {
	Name       string      `json:"name"`
	Template   string      `json:"template"`
	Comment    string      `json:"comment"`
	Parameters []Parameter `json:"parameters"`
}

// ConfigResponse 配置文件响应结构
type ConfigResponse struct {
	Status  string       `json:"status"`
	Message string       `json:"message"`
	Data    []ConfigFile `json:"data"`
}

// KeyInfoResponse Redis键信息响应结构
type KeyInfoResponse struct {
	Status  string  `json:"status"`
	Message string  `json:"message"`
	Data    KeyInfo `json:"data"`
}

// KeyInfo Redis键详细信息
type KeyInfo struct {
	Name      string      `json:"name"`
	Type      string      `json:"type"`
	TTL       int64       `json:"ttl"`
	Size      int64       `json:"size,omitempty"`
	Value     interface{} `json:"value,omitempty"`
	CreatedAt time.Time   `json:"created_at,omitempty"`
	UpdatedAt time.Time   `json:"updated_at,omitempty"`
}

// DeleteKeyResponse Redis键删除响应结构
type DeleteKeyResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Success bool   `json:"success"`
}

// MockRedisData Mock Redis数据结构
type MockRedisData struct {
	Keys map[string]MockKeyData `json:"keys"`
}

// MockKeyData Mock键数据
type MockKeyData struct {
	Type      string      `json:"type"`
	Value     interface{} `json:"value"`
	TTL       int64       `json:"ttl"`        // -1表示永不过期，0表示已过期，>0表示剩余秒数
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}

// RedisMode Redis运行模式
type RedisMode string

const (
	// MockMode Mock模式
	MockMode RedisMode = "mock"
	// RealMode 真实Redis连接模式
	RealMode RedisMode = "real"
)

// RedisManager Redis管理器接口
type RedisManager interface {
	// GetKeyInfo 获取键信息
	GetKeyInfo(keyName string) (*KeyInfo, error)
	// DeleteKey 删除键
	DeleteKey(keyName string) error
	// KeyExists 检查键是否存在
	KeyExists(keyName string) bool
	// Close 关闭连接
	Close() error
}