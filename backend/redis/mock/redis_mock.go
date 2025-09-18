package mock

import (
	"context"
	"fmt"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

// RedisValue Redis值结构
type RedisValue struct {
	Value     interface{}
	Type      string // string, hash, list, set, zset
	ExpireAt  *time.Time
	CreatedAt time.Time
}

// RedisMock Redis模拟实现
type RedisMock struct {
	data     map[string]*RedisValue
	mutex    sync.RWMutex
	db       int
	closed   bool
	cleanup  *time.Ticker
	stopChan chan struct{}
}

// NewRedisMock 创建新的Redis模拟实例
func NewRedisMock() *RedisMock {
	mock := &RedisMock{
		data:     make(map[string]*RedisValue),
		db:       0,
		closed:   false,
		stopChan: make(chan struct{}),
	}
	
	// 启动过期键清理协程
	mock.startCleanup()
	
	return mock
}

// startCleanup 启动过期键清理
func (r *RedisMock) startCleanup() {
	r.cleanup = time.NewTicker(1 * time.Second)
	go func() {
		for {
			select {
			case <-r.cleanup.C:
				r.cleanExpiredKeys()
			case <-r.stopChan:
				return
			}
		}
	}()
}

// cleanExpiredKeys 清理过期键
func (r *RedisMock) cleanExpiredKeys() {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	now := time.Now()
	for key, value := range r.data {
		if value.ExpireAt != nil && now.After(*value.ExpireAt) {
			delete(r.data, key)
		}
	}
}

// isExpired 检查键是否过期
func (r *RedisMock) isExpired(key string) bool {
	value, exists := r.data[key]
	if !exists {
		return true
	}
	if value.ExpireAt != nil && time.Now().After(*value.ExpireAt) {
		delete(r.data, key)
		return true
	}
	return false
}

// 基础操作
func (r *RedisMock) Ping(ctx context.Context) *StatusCmd {
	if r.closed {
		return &StatusCmd{err: fmt.Errorf("redis connection closed")}
	}
	return &StatusCmd{val: "PONG"}
}

func (r *RedisMock) Close() error {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return nil
	}
	
	r.closed = true
	if r.cleanup != nil {
		r.cleanup.Stop()
	}
	close(r.stopChan)
	return nil
}

// 字符串操作
func (r *RedisMock) Get(ctx context.Context, key string) *StringCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &StringCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "string" {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	return &StringCmd{val: fmt.Sprintf("%v", value.Value)}
}

func (r *RedisMock) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *StatusCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &StatusCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	redisValue := &RedisValue{
		Value:     value,
		Type:      "string",
		CreatedAt: time.Now(),
	}
	
	if expiration > 0 {
		expireAt := time.Now().Add(expiration)
		redisValue.ExpireAt = &expireAt
	}
	
	r.data[key] = redisValue
	return &StatusCmd{val: "OK"}
}

func (r *RedisMock) SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) *BoolCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &BoolCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if !r.isExpired(key) {
		if _, exists := r.data[key]; exists {
			return &BoolCmd{val: false}
		}
	}
	
	redisValue := &RedisValue{
		Value:     value,
		Type:      "string",
		CreatedAt: time.Now(),
	}
	
	if expiration > 0 {
		expireAt := time.Now().Add(expiration)
		redisValue.ExpireAt = &expireAt
	}
	
	r.data[key] = redisValue
	return &BoolCmd{val: true}
}

func (r *RedisMock) Del(ctx context.Context, keys ...string) *IntCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	count := int64(0)
	for _, key := range keys {
		if _, exists := r.data[key]; exists {
			delete(r.data, key)
			count++
		}
	}
	
	return &IntCmd{val: count}
}

func (r *RedisMock) Exists(ctx context.Context, keys ...string) *IntCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	count := int64(0)
	for _, key := range keys {
		if !r.isExpired(key) {
			if _, exists := r.data[key]; exists {
				count++
			}
		}
	}
	
	return &IntCmd{val: count}
}

func (r *RedisMock) Expire(ctx context.Context, key string, expiration time.Duration) *BoolCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &BoolCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &BoolCmd{val: false}
	}
	
	value, exists := r.data[key]
	if !exists {
		return &BoolCmd{val: false}
	}
	
	expireAt := time.Now().Add(expiration)
	value.ExpireAt = &expireAt
	return &BoolCmd{val: true}
}

func (r *RedisMock) TTL(ctx context.Context, key string) *DurationCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &DurationCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &DurationCmd{val: -2 * time.Second} // key不存在
	}
	
	value, exists := r.data[key]
	if !exists {
		return &DurationCmd{val: -2 * time.Second}
	}
	
	if value.ExpireAt == nil {
		return &DurationCmd{val: -1 * time.Second} // 永不过期
	}
	
	ttl := time.Until(*value.ExpireAt)
	if ttl < 0 {
		return &DurationCmd{val: -2 * time.Second}
	}
	
	return &DurationCmd{val: ttl}
}

// 哈希操作
func (r *RedisMock) HGet(ctx context.Context, key, field string) *StringCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &StringCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "hash" {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	hash, ok := value.Value.(map[string]string)
	if !ok {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	fieldValue, exists := hash[field]
	if !exists {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	return &StringCmd{val: fieldValue}
}

func (r *RedisMock) HSet(ctx context.Context, key string, values ...interface{}) *IntCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if len(values)%2 != 0 {
		return &IntCmd{err: fmt.Errorf("wrong number of arguments")}
	}
	
	value, exists := r.data[key]
	var hash map[string]string
	
	if !exists || r.isExpired(key) {
		hash = make(map[string]string)
		r.data[key] = &RedisValue{
			Value:     hash,
			Type:      "hash",
			CreatedAt: time.Now(),
		}
	} else if value.Type != "hash" {
		return &IntCmd{err: fmt.Errorf("WRONGTYPE Operation against a key holding the wrong kind of value")}
	} else {
		hash = value.Value.(map[string]string)
	}
	
	count := int64(0)
	for i := 0; i < len(values); i += 2 {
		field := fmt.Sprintf("%v", values[i])
		fieldValue := fmt.Sprintf("%v", values[i+1])
		
		if _, exists := hash[field]; !exists {
			count++
		}
		hash[field] = fieldValue
	}
	
	return &IntCmd{val: count}
}

func (r *RedisMock) HDel(ctx context.Context, key string, fields ...string) *IntCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &IntCmd{val: 0}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "hash" {
		return &IntCmd{val: 0}
	}
	
	hash := value.Value.(map[string]string)
	count := int64(0)
	
	for _, field := range fields {
		if _, exists := hash[field]; exists {
			delete(hash, field)
			count++
		}
	}
	
	return &IntCmd{val: count}
}

func (r *RedisMock) HExists(ctx context.Context, key, field string) *BoolCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &BoolCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &BoolCmd{val: false}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "hash" {
		return &BoolCmd{val: false}
	}
	
	hash := value.Value.(map[string]string)
	_, exists = hash[field]
	
	return &BoolCmd{val: exists}
}

func (r *RedisMock) HGetAll(ctx context.Context, key string) *StringStringMapCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &StringStringMapCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &StringStringMapCmd{val: make(map[string]string)}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "hash" {
		return &StringStringMapCmd{val: make(map[string]string)}
	}
	
	hash := value.Value.(map[string]string)
	result := make(map[string]string)
	for k, v := range hash {
		result[k] = v
	}
	
	return &StringStringMapCmd{val: result}
}

func (r *RedisMock) HKeys(ctx context.Context, key string) *StringSliceCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &StringSliceCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &StringSliceCmd{val: []string{}}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "hash" {
		return &StringSliceCmd{val: []string{}}
	}
	
	hash := value.Value.(map[string]string)
	keys := make([]string, 0, len(hash))
	for k := range hash {
		keys = append(keys, k)
	}
	
	return &StringSliceCmd{val: keys}
}

func (r *RedisMock) HVals(ctx context.Context, key string) *StringSliceCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &StringSliceCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &StringSliceCmd{val: []string{}}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "hash" {
		return &StringSliceCmd{val: []string{}}
	}
	
	hash := value.Value.(map[string]string)
	values := make([]string, 0, len(hash))
	for _, v := range hash {
		values = append(values, v)
	}
	
	return &StringSliceCmd{val: values}
}

// 列表操作
func (r *RedisMock) LPush(ctx context.Context, key string, values ...interface{}) *IntCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	value, exists := r.data[key]
	var list []string
	
	if !exists || r.isExpired(key) {
		list = make([]string, 0)
		r.data[key] = &RedisValue{
			Value:     list,
			Type:      "list",
			CreatedAt: time.Now(),
		}
	} else if value.Type != "list" {
		return &IntCmd{err: fmt.Errorf("WRONGTYPE Operation against a key holding the wrong kind of value")}
	} else {
		list = value.Value.([]string)
	}
	
	// LPush adds elements to the head of the list (reverse order)
	for i := len(values) - 1; i >= 0; i-- {
		list = append([]string{fmt.Sprintf("%v", values[i])}, list...)
	}
	
	r.data[key].Value = list
	return &IntCmd{val: int64(len(list))}
}

func (r *RedisMock) RPush(ctx context.Context, key string, values ...interface{}) *IntCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	value, exists := r.data[key]
	var list []string
	
	if !exists || r.isExpired(key) {
		list = make([]string, 0)
		r.data[key] = &RedisValue{
			Value:     list,
			Type:      "list",
			CreatedAt: time.Now(),
		}
	} else if value.Type != "list" {
		return &IntCmd{err: fmt.Errorf("WRONGTYPE Operation against a key holding the wrong kind of value")}
	} else {
		list = value.Value.([]string)
	}
	
	// 从右侧插入（尾部插入）
	for _, v := range values {
		list = append(list, fmt.Sprintf("%v", v))
	}
	
	r.data[key].Value = list
	return &IntCmd{val: int64(len(list))}
}

func (r *RedisMock) LPop(ctx context.Context, key string) *StringCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &StringCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "list" {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	list := value.Value.([]string)
	if len(list) == 0 {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	result := list[0]
	list = list[1:]
	r.data[key].Value = list
	
	if len(list) == 0 {
		delete(r.data, key)
	}
	
	return &StringCmd{val: result}
}

func (r *RedisMock) RPop(ctx context.Context, key string) *StringCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &StringCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "list" {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	list := value.Value.([]string)
	if len(list) == 0 {
		return &StringCmd{err: fmt.Errorf("redis: nil")}
	}
	
	result := list[len(list)-1]
	list = list[:len(list)-1]
	r.data[key].Value = list
	
	if len(list) == 0 {
		delete(r.data, key)
	}
	
	return &StringCmd{val: result}
}

func (r *RedisMock) LLen(ctx context.Context, key string) *IntCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &IntCmd{val: 0}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "list" {
		return &IntCmd{val: 0}
	}
	
	list := value.Value.([]string)
	return &IntCmd{val: int64(len(list))}
}

func (r *RedisMock) LRange(ctx context.Context, key string, start, stop int64) *StringSliceCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &StringSliceCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &StringSliceCmd{val: []string{}}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "list" {
		return &StringSliceCmd{val: []string{}}
	}
	
	list := value.Value.([]string)
	length := int64(len(list))
	
	// 处理负数索引
	if start < 0 {
		start = length + start
	}
	if stop < 0 {
		stop = length + stop
	}
	
	// 边界检查
	if start < 0 {
		start = 0
	}
	if stop >= length {
		stop = length - 1
	}
	if start > stop {
		return &StringSliceCmd{val: []string{}}
	}
	
	result := make([]string, stop-start+1)
	copy(result, list[start:stop+1])
	
	return &StringSliceCmd{val: result}
}

// 集合操作
func (r *RedisMock) SAdd(ctx context.Context, key string, members ...interface{}) *IntCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	value, exists := r.data[key]
	var set map[string]bool
	
	if !exists || r.isExpired(key) {
		set = make(map[string]bool)
		r.data[key] = &RedisValue{
			Value:     set,
			Type:      "set",
			CreatedAt: time.Now(),
		}
	} else if value.Type != "set" {
		return &IntCmd{err: fmt.Errorf("WRONGTYPE Operation against a key holding the wrong kind of value")}
	} else {
		set = value.Value.(map[string]bool)
	}
	
	count := int64(0)
	for _, member := range members {
		memberStr := fmt.Sprintf("%v", member)
		if !set[memberStr] {
			set[memberStr] = true
			count++
		}
	}
	
	return &IntCmd{val: count}
}

func (r *RedisMock) SRem(ctx context.Context, key string, members ...interface{}) *IntCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &IntCmd{val: 0}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "set" {
		return &IntCmd{val: 0}
	}
	
	set := value.Value.(map[string]bool)
	count := int64(0)
	
	for _, member := range members {
		memberStr := fmt.Sprintf("%v", member)
		if set[memberStr] {
			delete(set, memberStr)
			count++
		}
	}
	
	return &IntCmd{val: count}
}

func (r *RedisMock) SMembers(ctx context.Context, key string) *StringSliceCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &StringSliceCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &StringSliceCmd{val: []string{}}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "set" {
		return &StringSliceCmd{val: []string{}}
	}
	
	set := value.Value.(map[string]bool)
	members := make([]string, 0, len(set))
	for member := range set {
		members = append(members, member)
	}
	
	return &StringSliceCmd{val: members}
}

func (r *RedisMock) SIsMember(ctx context.Context, key string, member interface{}) *BoolCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &BoolCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &BoolCmd{val: false}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "set" {
		return &BoolCmd{val: false}
	}
	
	set := value.Value.(map[string]bool)
	memberStr := fmt.Sprintf("%v", member)
	
	return &BoolCmd{val: set[memberStr]}
}

func (r *RedisMock) SCard(ctx context.Context, key string) *IntCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &IntCmd{val: 0}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "set" {
		return &IntCmd{val: 0}
	}
	
	set := value.Value.(map[string]bool)
	return &IntCmd{val: int64(len(set))}
}

// 有序集合操作
func (r *RedisMock) ZAdd(ctx context.Context, key string, members ...*Z) *IntCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	value, exists := r.data[key]
	var zset map[string]float64
	
	if !exists || r.isExpired(key) {
		zset = make(map[string]float64)
		r.data[key] = &RedisValue{
			Value:     zset,
			Type:      "zset",
			CreatedAt: time.Now(),
		}
	} else if value.Type != "zset" {
		return &IntCmd{err: fmt.Errorf("WRONGTYPE Operation against a key holding the wrong kind of value")}
	} else {
		zset = value.Value.(map[string]float64)
	}
	
	count := int64(0)
	for _, member := range members {
		memberStr := fmt.Sprintf("%v", member.Member)
		if _, exists := zset[memberStr]; !exists {
			count++
		}
		zset[memberStr] = member.Score
	}
	
	return &IntCmd{val: count}
}

func (r *RedisMock) ZRem(ctx context.Context, key string, members ...interface{}) *IntCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &IntCmd{val: 0}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "zset" {
		return &IntCmd{val: 0}
	}
	
	zset := value.Value.(map[string]float64)
	count := int64(0)
	
	for _, member := range members {
		memberStr := fmt.Sprintf("%v", member)
		if _, exists := zset[memberStr]; exists {
			delete(zset, memberStr)
			count++
		}
	}
	
	return &IntCmd{val: count}
}

func (r *RedisMock) ZRange(ctx context.Context, key string, start, stop int64) *StringSliceCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &StringSliceCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &StringSliceCmd{val: []string{}}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "zset" {
		return &StringSliceCmd{val: []string{}}
	}
	
	zset := value.Value.(map[string]float64)
	
	// 按分数排序
	type memberScore struct {
		member string
		score  float64
	}
	
	members := make([]memberScore, 0, len(zset))
	for member, score := range zset {
		members = append(members, memberScore{member, score})
	}
	
	sort.Slice(members, func(i, j int) bool {
		return members[i].score < members[j].score
	})
	
	length := int64(len(members))
	
	// 处理负数索引
	if start < 0 {
		start = length + start
	}
	if stop < 0 {
		stop = length + stop
	}
	
	// 边界检查
	if start < 0 {
		start = 0
	}
	if stop >= length {
		stop = length - 1
	}
	if start > stop {
		return &StringSliceCmd{val: []string{}}
	}
	
	result := make([]string, 0, stop-start+1)
	for i := start; i <= stop; i++ {
		result = append(result, members[i].member)
	}
	
	return &StringSliceCmd{val: result}
}

func (r *RedisMock) ZRangeWithScores(ctx context.Context, key string, start, stop int64) *ZSliceCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &ZSliceCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &ZSliceCmd{val: []Z{}}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "zset" {
		return &ZSliceCmd{val: []Z{}}
	}
	
	zset := value.Value.(map[string]float64)
	
	// 按分数排序
	type memberScore struct {
		member string
		score  float64
	}
	
	members := make([]memberScore, 0, len(zset))
	for member, score := range zset {
		members = append(members, memberScore{member, score})
	}
	
	sort.Slice(members, func(i, j int) bool {
		return members[i].score < members[j].score
	})
	
	length := int64(len(members))
	
	// 处理负数索引
	if start < 0 {
		start = length + start
	}
	if stop < 0 {
		stop = length + stop
	}
	
	// 边界检查
	if start < 0 {
		start = 0
	}
	if stop >= length {
		stop = length - 1
	}
	if start > stop {
		return &ZSliceCmd{val: []Z{}}
	}
	
	result := make([]Z, 0, stop-start+1)
	for i := start; i <= stop; i++ {
		result = append(result, Z{
			Score:  members[i].score,
			Member: members[i].member,
		})
	}
	
	return &ZSliceCmd{val: result}
}

func (r *RedisMock) ZCard(ctx context.Context, key string) *IntCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &IntCmd{val: 0}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "zset" {
		return &IntCmd{val: 0}
	}
	
	zset := value.Value.(map[string]float64)
	return &IntCmd{val: int64(len(zset))}
}

func (r *RedisMock) ZScore(ctx context.Context, key, member string) *FloatCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &FloatCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &FloatCmd{err: fmt.Errorf("redis: nil")}
	}
	
	value, exists := r.data[key]
	if !exists || value.Type != "zset" {
		return &FloatCmd{err: fmt.Errorf("redis: nil")}
	}
	
	zset := value.Value.(map[string]float64)
	score, exists := zset[member]
	if !exists {
		return &FloatCmd{err: fmt.Errorf("redis: nil")}
	}
	
	return &FloatCmd{val: score}
}

// 键操作
func (r *RedisMock) Keys(ctx context.Context, pattern string) *StringSliceCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &StringSliceCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	keys := make([]string, 0)
	for key := range r.data {
		if !r.isExpired(key) {
			matched, _ := filepath.Match(pattern, key)
			if matched {
				keys = append(keys, key)
			}
		}
	}
	
	return &StringSliceCmd{val: keys}
}

func (r *RedisMock) Type(ctx context.Context, key string) *StatusCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &StatusCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if r.isExpired(key) {
		return &StatusCmd{val: "none"}
	}
	
	value, exists := r.data[key]
	if !exists {
		return &StatusCmd{val: "none"}
	}
	
	return &StatusCmd{val: value.Type}
}

func (r *RedisMock) FlushDB(ctx context.Context) *StatusCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &StatusCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	r.data = make(map[string]*RedisValue)
	return &StatusCmd{val: "OK"}
}

func (r *RedisMock) FlushAll(ctx context.Context) *StatusCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &StatusCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	r.data = make(map[string]*RedisValue)
	return &StatusCmd{val: "OK"}
}

// 数据库操作
func (r *RedisMock) Select(ctx context.Context, index int) *StatusCmd {
	r.mutex.Lock()
	defer r.mutex.Unlock()
	
	if r.closed {
		return &StatusCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	if index < 0 || index > 15 {
		return &StatusCmd{err: fmt.Errorf("invalid DB index")}
	}
	
	r.db = index
	return &StatusCmd{val: "OK"}
}

func (r *RedisMock) DBSize(ctx context.Context) *IntCmd {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	
	if r.closed {
		return &IntCmd{err: fmt.Errorf("redis connection closed")}
	}
	
	count := int64(0)
	for key := range r.data {
		if !r.isExpired(key) {
			count++
		}
	}
	
	return &IntCmd{val: count}
}

// GetDB 获取当前数据库索引
func (r *RedisMock) GetDB() int {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	return r.db
}

// IsClosed 检查连接是否已关闭
func (r *RedisMock) IsClosed() bool {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	return r.closed
}

// GetDataSize 获取数据大小（用于测试）
func (r *RedisMock) GetDataSize() int {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	return len(r.data)
}

// ClearExpiredKeys 手动清理过期键（用于测试）
func (r *RedisMock) ClearExpiredKeys() {
	r.cleanExpiredKeys()
}