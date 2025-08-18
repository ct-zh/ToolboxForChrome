package mock

import (
	"context"
	"fmt"
	"time"
)

// RedisInterface Redis操作接口，兼容go-redis客户端
type RedisInterface interface {
	// 基础操作
	Ping(ctx context.Context) *StatusCmd
	Close() error
	
	// 字符串操作
	Get(ctx context.Context, key string) *StringCmd
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *StatusCmd
	SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) *BoolCmd
	Del(ctx context.Context, keys ...string) *IntCmd
	Exists(ctx context.Context, keys ...string) *IntCmd
	Expire(ctx context.Context, key string, expiration time.Duration) *BoolCmd
	TTL(ctx context.Context, key string) *DurationCmd
	
	// 哈希操作
	HGet(ctx context.Context, key, field string) *StringCmd
	HSet(ctx context.Context, key string, values ...interface{}) *IntCmd
	HDel(ctx context.Context, key string, fields ...string) *IntCmd
	HExists(ctx context.Context, key, field string) *BoolCmd
	HGetAll(ctx context.Context, key string) *StringStringMapCmd
	HKeys(ctx context.Context, key string) *StringSliceCmd
	HVals(ctx context.Context, key string) *StringSliceCmd
	
	// 列表操作
	LPush(ctx context.Context, key string, values ...interface{}) *IntCmd
	RPush(ctx context.Context, key string, values ...interface{}) *IntCmd
	LPop(ctx context.Context, key string) *StringCmd
	RPop(ctx context.Context, key string) *StringCmd
	LLen(ctx context.Context, key string) *IntCmd
	LRange(ctx context.Context, key string, start, stop int64) *StringSliceCmd
	
	// 集合操作
	SAdd(ctx context.Context, key string, members ...interface{}) *IntCmd
	SRem(ctx context.Context, key string, members ...interface{}) *IntCmd
	SMembers(ctx context.Context, key string) *StringSliceCmd
	SIsMember(ctx context.Context, key string, member interface{}) *BoolCmd
	SCard(ctx context.Context, key string) *IntCmd
	
	// 有序集合操作
	ZAdd(ctx context.Context, key string, members ...*Z) *IntCmd
	ZRem(ctx context.Context, key string, members ...interface{}) *IntCmd
	ZRange(ctx context.Context, key string, start, stop int64) *StringSliceCmd
	ZRangeWithScores(ctx context.Context, key string, start, stop int64) *ZSliceCmd
	ZCard(ctx context.Context, key string) *IntCmd
	ZScore(ctx context.Context, key, member string) *FloatCmd
	
	// 键操作
	Keys(ctx context.Context, pattern string) *StringSliceCmd
	Type(ctx context.Context, key string) *StatusCmd
	FlushDB(ctx context.Context) *StatusCmd
	FlushAll(ctx context.Context) *StatusCmd
	
	// 数据库操作
	Select(ctx context.Context, index int) *StatusCmd
	DBSize(ctx context.Context) *IntCmd
}

// Z 有序集合成员结构
type Z struct {
	Score  float64
	Member interface{}
}

// 命令结果接口
type Cmder interface {
	Err() error
	String() string
}

// StatusCmd 状态命令结果
type StatusCmd struct {
	val string
	err error
}

func (cmd *StatusCmd) Result() (string, error) {
	return cmd.val, cmd.err
}

func (cmd *StatusCmd) Val() string {
	return cmd.val
}

func (cmd *StatusCmd) Err() error {
	return cmd.err
}

func (cmd *StatusCmd) String() string {
	return cmd.val
}

// StringCmd 字符串命令结果
type StringCmd struct {
	val string
	err error
}

func (cmd *StringCmd) Result() (string, error) {
	return cmd.val, cmd.err
}

func (cmd *StringCmd) Val() string {
	return cmd.val
}

func (cmd *StringCmd) Err() error {
	return cmd.err
}

func (cmd *StringCmd) String() string {
	return cmd.val
}

// IntCmd 整数命令结果
type IntCmd struct {
	val int64
	err error
}

func (cmd *IntCmd) Result() (int64, error) {
	return cmd.val, cmd.err
}

func (cmd *IntCmd) Val() int64 {
	return cmd.val
}

func (cmd *IntCmd) Err() error {
	return cmd.err
}

func (cmd *IntCmd) String() string {
	return string(rune(cmd.val))
}

// BoolCmd 布尔命令结果
type BoolCmd struct {
	val bool
	err error
}

func (cmd *BoolCmd) Result() (bool, error) {
	return cmd.val, cmd.err
}

func (cmd *BoolCmd) Val() bool {
	return cmd.val
}

func (cmd *BoolCmd) Err() error {
	return cmd.err
}

func (cmd *BoolCmd) String() string {
	if cmd.val {
		return "true"
	}
	return "false"
}

// FloatCmd 浮点数命令结果
type FloatCmd struct {
	val float64
	err error
}

func (cmd *FloatCmd) Result() (float64, error) {
	return cmd.val, cmd.err
}

func (cmd *FloatCmd) Val() float64 {
	return cmd.val
}

func (cmd *FloatCmd) Err() error {
	return cmd.err
}

func (cmd *FloatCmd) String() string {
	return string(rune(cmd.val))
}

// DurationCmd 时间间隔命令结果
type DurationCmd struct {
	val time.Duration
	err error
}

func (cmd *DurationCmd) Result() (time.Duration, error) {
	return cmd.val, cmd.err
}

func (cmd *DurationCmd) Val() time.Duration {
	return cmd.val
}

func (cmd *DurationCmd) Err() error {
	return cmd.err
}

func (cmd *DurationCmd) String() string {
	return cmd.val.String()
}

// StringSliceCmd 字符串切片命令结果
type StringSliceCmd struct {
	val []string
	err error
}

func (cmd *StringSliceCmd) Result() ([]string, error) {
	return cmd.val, cmd.err
}

func (cmd *StringSliceCmd) Val() []string {
	return cmd.val
}

func (cmd *StringSliceCmd) Err() error {
	return cmd.err
}

func (cmd *StringSliceCmd) String() string {
	return fmt.Sprintf("%v", cmd.val)
}

// StringStringMapCmd 字符串映射命令结果
type StringStringMapCmd struct {
	val map[string]string
	err error
}

func (cmd *StringStringMapCmd) Result() (map[string]string, error) {
	return cmd.val, cmd.err
}

func (cmd *StringStringMapCmd) Val() map[string]string {
	return cmd.val
}

func (cmd *StringStringMapCmd) Err() error {
	return cmd.err
}

func (cmd *StringStringMapCmd) String() string {
	return fmt.Sprintf("%v", cmd.val)
}

// ZSliceCmd 有序集合切片命令结果
type ZSliceCmd struct {
	val []Z
	err error
}

func (cmd *ZSliceCmd) Result() ([]Z, error) {
	return cmd.val, cmd.err
}

func (cmd *ZSliceCmd) Val() []Z {
	return cmd.val
}

func (cmd *ZSliceCmd) Err() error {
	return cmd.err
}

func (cmd *ZSliceCmd) String() string {
	return fmt.Sprintf("%v", cmd.val)
}