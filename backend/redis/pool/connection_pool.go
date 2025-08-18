package pool

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/devtoolbox/redis/mock"
)
// RedisConnection Redis连接信息
type RedisConnection struct {
	ID       string       `json:"id"`
	Host     string       `json:"host"`
	Port     int          `json:"port"`
	DB       int          `json:"db"`
	Alias    string       `json:"alias"`
	Client   mock.RedisInterface `json:"-"`
	IsMock   bool         `json:"isMock"`
	CreatedAt time.Time   `json:"createdAt"`
	LastUsed time.Time    `json:"lastUsed"`
}

// ConnectionPool Redis连接池
type ConnectionPool struct {
	connections map[string]*RedisConnection
	mutex       sync.RWMutex
	maxConn     int
	mockMode    bool
}

// NewConnectionPool 创建新的连接池
func NewConnectionPool(maxConnections int) *ConnectionPool {
	return &ConnectionPool{
		connections: make(map[string]*RedisConnection),
		maxConn:     maxConnections,
		mockMode:    false,
	}
}

// SetMockMode 设置mock模式
func (cp *ConnectionPool) SetMockMode(enabled bool) {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()
	cp.mockMode = enabled
}

// IsMockMode 检查是否为mock模式
func (cp *ConnectionPool) IsMockMode() bool {
	cp.mutex.RLock()
	defer cp.mutex.RUnlock()
	return cp.mockMode
}

// CreateConnection 创建新的Redis连接
func (cp *ConnectionPool) CreateConnection(id, host string, port, db int, password, alias string) (*RedisConnection, error) {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()

	// 检查连接数限制
	if len(cp.connections) >= cp.maxConn {
		return nil, fmt.Errorf("maximum connections limit reached: %d", cp.maxConn)
	}

	// 检查连接是否已存在
	if _, exists := cp.connections[id]; exists {
		return nil, fmt.Errorf("connection with id %s already exists", id)
	}

	var client mock.RedisInterface
	isMock := cp.mockMode

	if cp.mockMode {
		// 创建Mock Redis客户端
		client = mock.NewRedisMock()
		// Mock模式下选择数据库
		if db > 0 {
			ctx := context.Background()
			if err := client.Select(ctx, db).Err(); err != nil {
				return nil, fmt.Errorf("failed to select database %d: %v", db, err)
			}
		}
	} else {
		// 创建真实Redis客户端
		realClient := redis.NewClient(&redis.Options{
			Addr:     fmt.Sprintf("%s:%d", host, port),
			Password: password,
			DB:       db,
		})
		
		// 测试连接
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		
		if err := realClient.Ping(ctx).Err(); err != nil {
			realClient.Close()
			return nil, fmt.Errorf("failed to connect to Redis: %v", err)
		}
		
		// 使用适配器包装真实客户端
		client = mock.NewRedisClientAdapter(realClient)
		isMock = false
	}

	// 创建连接对象
	conn := &RedisConnection{
		ID:        id,
		Host:      host,
		Port:      port,
		DB:        db,
		Alias:     alias,
		Client:    client,
		IsMock:    isMock,
		CreatedAt: time.Now(),
		LastUsed:  time.Now(),
	}

	// 添加到连接池
	cp.connections[id] = conn

	return conn, nil
}

// GetConnection 获取连接
func (cp *ConnectionPool) GetConnection(id string) (*RedisConnection, error) {
	cp.mutex.RLock()
	defer cp.mutex.RUnlock()

	conn, exists := cp.connections[id]
	if !exists {
		return nil, fmt.Errorf("connection with id %s not found", id)
	}

	// 更新最后使用时间
	conn.LastUsed = time.Now()

	return conn, nil
}

// RemoveConnection 移除连接
func (cp *ConnectionPool) RemoveConnection(id string) error {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()

	conn, exists := cp.connections[id]
	if !exists {
		return fmt.Errorf("connection with id %s not found", id)
	}

	// 关闭Redis客户端
	if conn.Client != nil {
		if closer, ok := conn.Client.(interface{ Close() error }); ok {
			closer.Close()
		}
	}

	// 从连接池中删除
	delete(cp.connections, id)

	return nil
}

// ListConnections 列出所有连接
func (cp *ConnectionPool) ListConnections() []*RedisConnection {
	cp.mutex.RLock()
	defer cp.mutex.RUnlock()

	connections := make([]*RedisConnection, 0, len(cp.connections))
	for _, conn := range cp.connections {
		connections = append(connections, conn)
	}

	return connections
}

// GetConnectionCount 获取连接数量
func (cp *ConnectionPool) GetConnectionCount() int {
	cp.mutex.RLock()
	defer cp.mutex.RUnlock()

	return len(cp.connections)
}

// CleanupIdleConnections 清理空闲连接
func (cp *ConnectionPool) CleanupIdleConnections(idleTimeout time.Duration) {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()

	now := time.Now()
	for id, conn := range cp.connections {
		if now.Sub(conn.LastUsed) > idleTimeout {
			if conn.Client != nil {
				conn.Client.Close()
			}
			delete(cp.connections, id)
		}
	}
}

// Close 关闭连接池
func (cp *ConnectionPool) Close() {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()

	for _, conn := range cp.connections {
		if conn.Client != nil {
			if closer, ok := conn.Client.(interface{ Close() error }); ok {
				closer.Close()
			}
		}
	}

	cp.connections = make(map[string]*RedisConnection)
}