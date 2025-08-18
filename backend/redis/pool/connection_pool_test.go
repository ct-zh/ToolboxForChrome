package pool

import (
	"context"
	"fmt"
	"sync"
	"testing"
)

func TestConnectionPool_CreateMockConnection(t *testing.T) {
	pool := NewConnectionPool(10)
	defer pool.Close()
	pool.SetMockMode(true)

	// 创建mock连接
	conn, err := pool.CreateConnection("test1", "localhost", 6379, 0, "password", "test")
	if err != nil {
		t.Fatalf("Failed to create mock connection: %v", err)
	}

	if !conn.IsMock {
		t.Error("Expected connection to be marked as mock")
	}

	// 测试基本操作
	ctx := context.Background()
	err = conn.Client.Ping(ctx).Err()
	if err != nil {
		t.Errorf("Mock ping failed: %v", err)
	}

	// 测试Set和Get操作
	err = conn.Client.Set(ctx, "test_key", "test_value", 0).Err()
	if err != nil {
		t.Errorf("Mock set failed: %v", err)
	}

	val, err := conn.Client.Get(ctx, "test_key").Result()
	if err != nil {
		t.Errorf("Mock get failed: %v", err)
	}
	if val != "test_value" {
		t.Errorf("Expected 'test_value', got '%s'", val)
	}
}

func TestConnectionPool_RealMode(t *testing.T) {
	pool := NewConnectionPool(10)
	defer pool.Close()

	// 默认应该是真实模式
	if pool.IsMockMode() {
		t.Error("Expected real mode by default")
	}

	// 尝试创建真实连接（这会失败，因为没有真实的Redis服务器）
	_, err := pool.CreateConnection("real1", "localhost", 6379, 0, "password", "test")
	if err == nil {
		t.Error("Expected error when creating real connection without Redis server")
	}
}

func TestConnectionPool_ModeSwitch(t *testing.T) {
	pool := NewConnectionPool(10)
	defer pool.Close()

	// Test switching between modes
	pool.SetMockMode(true)
	if !pool.IsMockMode() {
		t.Error("Expected mock mode to be enabled")
	}

	pool.SetMockMode(false)
	if pool.IsMockMode() {
		t.Error("Expected mock mode to be disabled")
	}
}

func TestConnectionPool_MockConnectionLifecycle(t *testing.T) {
	pool := NewConnectionPool(10)
	defer pool.Close()
	pool.SetMockMode(true)

	// 创建连接
	conn, err := pool.CreateConnection("lifecycle1", "localhost", 6379, 0, "password", "test")
	if err != nil {
		t.Fatalf("Failed to create connection: %v", err)
	}

	// 验证连接存在
	if pool.GetConnectionCount() != 1 {
		t.Errorf("Expected 1 connection, got %d", pool.GetConnectionCount())
	}

	// 获取连接
	retrievedConn, err := pool.GetConnection("lifecycle1")
	if err != nil {
		t.Errorf("Failed to retrieve connection: %v", err)
	}
	if retrievedConn == nil {
		t.Error("Failed to retrieve connection")
	}
	if retrievedConn.ID != conn.ID {
		t.Error("Retrieved connection ID mismatch")
	}

	// 移除连接
	err = pool.RemoveConnection("lifecycle1")
	if err != nil {
		t.Errorf("Failed to remove connection: %v", err)
	}

	// 验证连接已移除
	if pool.GetConnectionCount() != 0 {
		t.Errorf("Expected 0 connections after removal, got %d", pool.GetConnectionCount())
	}

	// 尝试获取已移除的连接
	retrievedConn, err = pool.GetConnection("lifecycle1")
	if err == nil {
		t.Error("Expected error when getting removed connection")
	}
	if retrievedConn != nil {
		t.Error("Expected nil when getting removed connection")
	}
}

func TestConnectionPool_MockConnectionConcurrency(t *testing.T) {
	pool := NewConnectionPool(10)
	defer pool.Close()
	pool.SetMockMode(true)

	// 并发创建和操作连接
	var wg sync.WaitGroup
	numGoroutines := 10

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			id := fmt.Sprintf("concurrent%d", index)
			alias := fmt.Sprintf("alias%d", index)
			conn, err := pool.CreateConnection(id, "localhost", 6379, index, "password", alias)
			if err != nil {
				t.Errorf("Failed to create connection %s: %v", id, err)
				return
			}

			// 执行一些操作
			ctx := context.Background()
			key := fmt.Sprintf("key%d", index)
			value := fmt.Sprintf("value%d", index)

			err = conn.Client.Set(ctx, key, value, 0).Err()
			if err != nil {
				t.Errorf("Failed to set %s: %v", key, err)
			}

			result, err := conn.Client.Get(ctx, key).Result()
			if err != nil {
				t.Errorf("Failed to get %s: %v", key, err)
			}
			if result != value {
				t.Errorf("Expected %s, got %s", value, result)
			}
		}(i)
	}

	wg.Wait()

	// 验证所有连接都创建成功
	if pool.GetConnectionCount() != numGoroutines {
		t.Errorf("Expected %d connections, got %d", numGoroutines, pool.GetConnectionCount())
	}
}