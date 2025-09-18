package mock

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestRedisMock_BasicOperations(t *testing.T) {
	mock := NewRedisMock()
	defer mock.Close()
	ctx := context.Background()

	// Test Ping
	result := mock.Ping(ctx)
	if result.Err() != nil {
		t.Errorf("Ping failed: %v", result.Err())
	}
	if result.Val() != "PONG" {
		t.Errorf("Expected PONG, got %s", result.Val())
	}
}

func TestRedisMock_StringOperations(t *testing.T) {
	mock := NewRedisMock()
	defer mock.Close()
	ctx := context.Background()

	// Test Set and Get
	setResult := mock.Set(ctx, "test_key", "test_value", 0)
	if setResult.Err() != nil {
		t.Errorf("Set failed: %v", setResult.Err())
	}

	getResult := mock.Get(ctx, "test_key")
	if getResult.Err() != nil {
		t.Errorf("Get failed: %v", getResult.Err())
	}
	if getResult.Val() != "test_value" {
		t.Errorf("Expected test_value, got %s", getResult.Val())
	}

	// Test SetNX
	setNXResult := mock.SetNX(ctx, "test_key", "new_value", 0)
	if setNXResult.Err() != nil {
		t.Errorf("SetNX failed: %v", setNXResult.Err())
	}
	if setNXResult.Val() != false {
		t.Errorf("Expected false for existing key, got %v", setNXResult.Val())
	}

	setNXResult2 := mock.SetNX(ctx, "new_key", "new_value", 0)
	if setNXResult2.Err() != nil {
		t.Errorf("SetNX failed: %v", setNXResult2.Err())
	}
	if setNXResult2.Val() != true {
		t.Errorf("Expected true for new key, got %v", setNXResult2.Val())
	}

	// Test Exists
	existsResult := mock.Exists(ctx, "test_key")
	if existsResult.Err() != nil {
		t.Errorf("Exists failed: %v", existsResult.Err())
	}
	if existsResult.Val() != 1 {
		t.Errorf("Expected 1 for existing key, got %d", existsResult.Val())
	}

	// Test Del
	delResult := mock.Del(ctx, "test_key")
	if delResult.Err() != nil {
		t.Errorf("Del failed: %v", delResult.Err())
	}
	if delResult.Val() != 1 {
		t.Errorf("Expected 1 deleted key, got %d", delResult.Val())
	}

	// Verify key is deleted
	getResult2 := mock.Get(ctx, "test_key")
	if getResult2.Err() == nil {
		t.Error("Expected error for deleted key")
	}
}

func TestRedisMock_ExpireOperations(t *testing.T) {
	mock := NewRedisMock()
	defer mock.Close()
	ctx := context.Background()

	// Set a key with expiration
	mock.Set(ctx, "expire_key", "expire_value", 0)

	// Set expiration
	expireResult := mock.Expire(ctx, "expire_key", 1*time.Second)
	if expireResult.Err() != nil {
		t.Errorf("Expire failed: %v", expireResult.Err())
	}
	if expireResult.Val() != true {
		t.Errorf("Expected true for expire, got %v", expireResult.Val())
	}

	// Check TTL
	ttlResult := mock.TTL(ctx, "expire_key")
	if ttlResult.Err() != nil {
		t.Errorf("TTL failed: %v", ttlResult.Err())
	}
	if ttlResult.Val() <= 0 || ttlResult.Val() > time.Second {
		t.Errorf("Expected TTL between 0 and 1 second, got %v", ttlResult.Val())
	}

	// Wait for expiration
	time.Sleep(1100 * time.Millisecond)

	// Key should be expired
	getResult := mock.Get(ctx, "expire_key")
	if getResult.Err() == nil {
		t.Error("Expected error for expired key")
	}
}

func TestRedisMock_HashOperations(t *testing.T) {
	mock := NewRedisMock()
	defer mock.Close()
	ctx := context.Background()

	// Test HSet and HGet
	hsetResult := mock.HSet(ctx, "hash_key", "field1", "value1")
	if hsetResult.Err() != nil {
		t.Errorf("HSet failed: %v", hsetResult.Err())
	}

	hgetResult := mock.HGet(ctx, "hash_key", "field1")
	if hgetResult.Err() != nil {
		t.Errorf("HGet failed: %v", hgetResult.Err())
	}
	if hgetResult.Val() != "value1" {
		t.Errorf("Expected value1, got %s", hgetResult.Val())
	}

	// Test HExists
	hexistsResult := mock.HExists(ctx, "hash_key", "field1")
	if hexistsResult.Err() != nil {
		t.Errorf("HExists failed: %v", hexistsResult.Err())
	}
	if hexistsResult.Val() != true {
		t.Errorf("Expected true for existing field, got %v", hexistsResult.Val())
	}

	// Test HDel
	hdelResult := mock.HDel(ctx, "hash_key", "field1")
	if hdelResult.Err() != nil {
		t.Errorf("HDel failed: %v", hdelResult.Err())
	}
	if hdelResult.Val() != 1 {
		t.Errorf("Expected 1 deleted field, got %d", hdelResult.Val())
	}
}

func TestRedisMock_ListOperations(t *testing.T) {
	mock := NewRedisMock()
	defer mock.Close()
	ctx := context.Background()

	// Test LPush and LLen
	lpushResult := mock.LPush(ctx, "list_key", "value1", "value2")
	if lpushResult.Err() != nil {
		t.Errorf("LPush failed: %v", lpushResult.Err())
	}
	if lpushResult.Val() != 2 {
		t.Errorf("Expected list length 2, got %d", lpushResult.Val())
	}

	llenResult := mock.LLen(ctx, "list_key")
	if llenResult.Err() != nil {
		t.Errorf("LLen failed: %v", llenResult.Err())
	}
	if llenResult.Val() != 2 {
		t.Errorf("Expected list length 2, got %d", llenResult.Val())
	}

	// Test LPop (should return the first element, which is value2 due to LPush order)
	lpopResult := mock.LPop(ctx, "list_key")
	if lpopResult.Err() != nil {
		t.Errorf("LPop failed: %v", lpopResult.Err())
	}
	if lpopResult.Val() != "value1" {
		t.Errorf("Expected value1, got %s", lpopResult.Val())
	}

	// Test LRange (should return remaining elements)
	lrangeResult := mock.LRange(ctx, "list_key", 0, -1)
	if lrangeResult.Err() != nil {
		t.Errorf("LRange failed: %v", lrangeResult.Err())
	}
	if len(lrangeResult.Val()) != 1 || lrangeResult.Val()[0] != "value2" {
		t.Errorf("Expected [value2], got %v", lrangeResult.Val())
	}
}

func TestRedisMock_SetOperations(t *testing.T) {
	mock := NewRedisMock()
	defer mock.Close()
	ctx := context.Background()

	// Test SAdd and SCard
	saddResult := mock.SAdd(ctx, "set_key", "member1", "member2")
	if saddResult.Err() != nil {
		t.Errorf("SAdd failed: %v", saddResult.Err())
	}
	if saddResult.Val() != 2 {
		t.Errorf("Expected 2 added members, got %d", saddResult.Val())
	}

	scardResult := mock.SCard(ctx, "set_key")
	if scardResult.Err() != nil {
		t.Errorf("SCard failed: %v", scardResult.Err())
	}
	if scardResult.Val() != 2 {
		t.Errorf("Expected set size 2, got %d", scardResult.Val())
	}

	// Test SIsMember
	sismemberResult := mock.SIsMember(ctx, "set_key", "member1")
	if sismemberResult.Err() != nil {
		t.Errorf("SIsMember failed: %v", sismemberResult.Err())
	}
	if sismemberResult.Val() != true {
		t.Errorf("Expected true for existing member, got %v", sismemberResult.Val())
	}

	// Test SRem
	sremResult := mock.SRem(ctx, "set_key", "member1")
	if sremResult.Err() != nil {
		t.Errorf("SRem failed: %v", sremResult.Err())
	}
	if sremResult.Val() != 1 {
		t.Errorf("Expected 1 removed member, got %d", sremResult.Val())
	}
}

func TestRedisMock_DatabaseOperations(t *testing.T) {
	mock := NewRedisMock()
	defer mock.Close()
	ctx := context.Background()

	// Add some data
	mock.Set(ctx, "key1", "value1", 0)
	mock.Set(ctx, "key2", "value2", 0)

	// Test DBSize
	dbsizeResult := mock.DBSize(ctx)
	if dbsizeResult.Err() != nil {
		t.Errorf("DBSize failed: %v", dbsizeResult.Err())
	}
	if dbsizeResult.Val() != 2 {
		t.Errorf("Expected DB size 2, got %d", dbsizeResult.Val())
	}

	// Test Keys
	keysResult := mock.Keys(ctx, "*")
	if keysResult.Err() != nil {
		t.Errorf("Keys failed: %v", keysResult.Err())
	}
	if len(keysResult.Val()) != 2 {
		t.Errorf("Expected 2 keys, got %d", len(keysResult.Val()))
	}

	// Test FlushDB
	flushResult := mock.FlushDB(ctx)
	if flushResult.Err() != nil {
		t.Errorf("FlushDB failed: %v", flushResult.Err())
	}

	// Verify DB is empty
	dbsizeResult2 := mock.DBSize(ctx)
	if dbsizeResult2.Err() != nil {
		t.Errorf("DBSize failed: %v", dbsizeResult2.Err())
	}
	if dbsizeResult2.Val() != 0 {
		t.Errorf("Expected DB size 0 after flush, got %d", dbsizeResult2.Val())
	}
}

func TestRedisMock_ConcurrentAccess(t *testing.T) {
	mock := NewRedisMock()
	defer mock.Close()
	ctx := context.Background()

	// Test concurrent operations
	done := make(chan bool, 10)

	for i := 0; i < 10; i++ {
		go func(id int) {
			key := fmt.Sprintf("concurrent_key_%d", id)
			value := fmt.Sprintf("concurrent_value_%d", id)

			// Set value
			mock.Set(ctx, key, value, 0)

			// Get value
			result := mock.Get(ctx, key)
			if result.Err() != nil {
				t.Errorf("Concurrent Get failed for %s: %v", key, result.Err())
			}
			if result.Val() != value {
				t.Errorf("Expected %s, got %s", value, result.Val())
			}

			done <- true
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}
}