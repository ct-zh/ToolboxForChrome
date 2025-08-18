package mock

import (
	"context"
	"time"

	"github.com/go-redis/redis/v8"
)

// RedisClientAdapter 真实Redis客户端适配器，实现RedisInterface接口
type RedisClientAdapter struct {
	client *redis.Client
}

// NewRedisClientAdapter 创建新的Redis客户端适配器
func NewRedisClientAdapter(client *redis.Client) *RedisClientAdapter {
	return &RedisClientAdapter{
		client: client,
	}
}

// 基础操作
func (r *RedisClientAdapter) Ping(ctx context.Context) *StatusCmd {
	cmd := r.client.Ping(ctx)
	return &StatusCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) Close() error {
	return r.client.Close()
}

// 字符串操作
func (r *RedisClientAdapter) Get(ctx context.Context, key string) *StringCmd {
	cmd := r.client.Get(ctx, key)
	return &StringCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *StatusCmd {
	cmd := r.client.Set(ctx, key, value, expiration)
	return &StatusCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) *BoolCmd {
	cmd := r.client.SetNX(ctx, key, value, expiration)
	return &BoolCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) Del(ctx context.Context, keys ...string) *IntCmd {
	cmd := r.client.Del(ctx, keys...)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) Exists(ctx context.Context, keys ...string) *IntCmd {
	cmd := r.client.Exists(ctx, keys...)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) Expire(ctx context.Context, key string, expiration time.Duration) *BoolCmd {
	cmd := r.client.Expire(ctx, key, expiration)
	return &BoolCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) TTL(ctx context.Context, key string) *DurationCmd {
	cmd := r.client.TTL(ctx, key)
	return &DurationCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

// 哈希操作
func (r *RedisClientAdapter) HGet(ctx context.Context, key, field string) *StringCmd {
	cmd := r.client.HGet(ctx, key, field)
	return &StringCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) HSet(ctx context.Context, key string, values ...interface{}) *IntCmd {
	cmd := r.client.HSet(ctx, key, values...)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) HDel(ctx context.Context, key string, fields ...string) *IntCmd {
	cmd := r.client.HDel(ctx, key, fields...)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) HExists(ctx context.Context, key, field string) *BoolCmd {
	cmd := r.client.HExists(ctx, key, field)
	return &BoolCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) HGetAll(ctx context.Context, key string) *StringStringMapCmd {
	cmd := r.client.HGetAll(ctx, key)
	return &StringStringMapCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

// 列表操作
func (r *RedisClientAdapter) LPush(ctx context.Context, key string, values ...interface{}) *IntCmd {
	cmd := r.client.LPush(ctx, key, values...)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) RPush(ctx context.Context, key string, values ...interface{}) *IntCmd {
	cmd := r.client.RPush(ctx, key, values...)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) LPop(ctx context.Context, key string) *StringCmd {
	cmd := r.client.LPop(ctx, key)
	return &StringCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) RPop(ctx context.Context, key string) *StringCmd {
	cmd := r.client.RPop(ctx, key)
	return &StringCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) LLen(ctx context.Context, key string) *IntCmd {
	cmd := r.client.LLen(ctx, key)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) LRange(ctx context.Context, key string, start, stop int64) *StringSliceCmd {
	cmd := r.client.LRange(ctx, key, start, stop)
	return &StringSliceCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

// 集合操作
func (r *RedisClientAdapter) SAdd(ctx context.Context, key string, members ...interface{}) *IntCmd {
	cmd := r.client.SAdd(ctx, key, members...)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) SRem(ctx context.Context, key string, members ...interface{}) *IntCmd {
	cmd := r.client.SRem(ctx, key, members...)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) SMembers(ctx context.Context, key string) *StringSliceCmd {
	cmd := r.client.SMembers(ctx, key)
	return &StringSliceCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) SIsMember(ctx context.Context, key string, member interface{}) *BoolCmd {
	cmd := r.client.SIsMember(ctx, key, member)
	return &BoolCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) SCard(ctx context.Context, key string) *IntCmd {
	cmd := r.client.SCard(ctx, key)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

// 有序集合操作
func (r *RedisClientAdapter) ZAdd(ctx context.Context, key string, members ...*Z) *IntCmd {
	// 转换Z结构到redis.Z
	redisMembers := make([]*redis.Z, len(members))
	for i, member := range members {
		redisMembers[i] = &redis.Z{
			Score:  member.Score,
			Member: member.Member,
		}
	}
	cmd := r.client.ZAdd(ctx, key, redisMembers...)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) ZRem(ctx context.Context, key string, members ...interface{}) *IntCmd {
	cmd := r.client.ZRem(ctx, key, members...)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) ZRange(ctx context.Context, key string, start, stop int64) *StringSliceCmd {
	cmd := r.client.ZRange(ctx, key, start, stop)
	return &StringSliceCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) ZRangeWithScores(ctx context.Context, key string, start, stop int64) *ZSliceCmd {
	cmd := r.client.ZRangeWithScores(ctx, key, start, stop)
	// 转换redis.Z到我们的Z结构
	redisZs := cmd.Val()
	zs := make([]Z, len(redisZs))
	for i, redisZ := range redisZs {
		zs[i] = Z{
			Score:  redisZ.Score,
			Member: redisZ.Member,
		}
	}
	return &ZSliceCmd{
		val: zs,
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) ZCard(ctx context.Context, key string) *IntCmd {
	cmd := r.client.ZCard(ctx, key)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) ZScore(ctx context.Context, key, member string) *FloatCmd {
	cmd := r.client.ZScore(ctx, key, member)
	return &FloatCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

// 数据库操作
func (r *RedisClientAdapter) DBSize(ctx context.Context) *IntCmd {
	cmd := r.client.DBSize(ctx)
	return &IntCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) Keys(ctx context.Context, pattern string) *StringSliceCmd {
	cmd := r.client.Keys(ctx, pattern)
	return &StringSliceCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) FlushDB(ctx context.Context) *StatusCmd {
	cmd := r.client.FlushDB(ctx)
	return &StatusCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) FlushAll(ctx context.Context) *StatusCmd {
	cmd := r.client.FlushAll(ctx)
	return &StatusCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

// 键操作
func (r *RedisClientAdapter) Type(ctx context.Context, key string) *StatusCmd {
	cmd := r.client.Type(ctx, key)
	return &StatusCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

// 数据库操作
func (r *RedisClientAdapter) Select(ctx context.Context, index int) *StatusCmd {
	cmd := r.client.Do(ctx, "SELECT", index)
	return &StatusCmd{
		val: cmd.Val().(string),
		err: cmd.Err(),
	}
}

// 哈希操作补充
func (r *RedisClientAdapter) HKeys(ctx context.Context, key string) *StringSliceCmd {
	cmd := r.client.HKeys(ctx, key)
	return &StringSliceCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}

func (r *RedisClientAdapter) HVals(ctx context.Context, key string) *StringSliceCmd {
	cmd := r.client.HVals(ctx, key)
	return &StringSliceCmd{
		val: cmd.Val(),
		err: cmd.Err(),
	}
}