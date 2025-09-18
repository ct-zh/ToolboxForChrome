module github.com/devtoolbox/redis

go 1.21

// Redis API服务模块
// 提供Redis管理相关的HTTP接口
// 支持配置化管理

require github.com/go-redis/redis/v8 v8.11.5

require (
	github.com/cespare/xxhash/v2 v2.1.2 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
)
