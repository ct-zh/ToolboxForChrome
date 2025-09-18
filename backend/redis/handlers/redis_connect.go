package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/devtoolbox/redis/auth"
	"github.com/devtoolbox/redis/config"
	"github.com/devtoolbox/redis/crypto"
	"github.com/devtoolbox/redis/pool"
)

// ConnectRequest 连接请求结构
type ConnectRequest struct {
	Host             string `json:"host"`
	Port             int    `json:"port"`
	EncryptedPassword string `json:"encryptedPassword"`
	Database         int    `json:"database"`
	Alias            string `json:"alias"`
}

// ConnectResponse 连接响应结构
type ConnectResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	ConnectionID string `json:"connectionId,omitempty"`
	Token        string `json:"token,omitempty"`
	ExpiresAt    int64  `json:"expiresAt,omitempty"`
}

// ErrorResponse 错误响应结构
type ErrorResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// RedisConnectHandler Redis连接处理器
type RedisConnectHandler struct {
	connectionPool *pool.ConnectionPool
	tokenManager   *auth.TokenManager
	rsaDecryptor   *crypto.RSADecryptor
}

// NewRedisConnectHandler 创建新的Redis连接处理器
func NewRedisConnectHandler() (*RedisConnectHandler, error) {
	// 获取安全配置
	securityConfig := config.GetSecurityConfig()
	if securityConfig == nil {
		return nil, fmt.Errorf("security configuration not found")
	}

	// 创建RSA解密器
	rsaDecryptor, err := crypto.NewRSADecryptor(securityConfig.Encryption.PrivateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create RSA decryptor: %v", err)
	}

	// 创建连接池
	connectionPool := pool.NewConnectionPool(securityConfig.MaxConnections)

	// 创建Token管理器
	tokenManager := auth.NewTokenManager(time.Duration(securityConfig.TokenExpiry) * time.Second)

	return &RedisConnectHandler{
		connectionPool: connectionPool,
		tokenManager:   tokenManager,
		rsaDecryptor:   rsaDecryptor,
	}, nil
}

// HandleConnect 处理Redis连接请求
func (h *RedisConnectHandler) HandleConnect(w http.ResponseWriter, r *http.Request) {
	// 设置响应头
	w.Header().Set("Content-Type", "application/json")

	// 检查请求方法
	if r.Method != http.MethodPost {
		h.sendErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed", "")
		return
	}

	// 解析请求体
	var req ConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	// 验证请求参数
	if err := h.validateConnectRequest(&req); err != nil {
		h.sendErrorResponse(w, http.StatusBadRequest, "Invalid request parameters", err.Error())
		return
	}

	// 解密密码
	password, err := h.rsaDecryptor.DecryptPassword(req.EncryptedPassword)
	if err != nil {
		log.Printf("Failed to decrypt password: %v", err)
		h.sendErrorResponse(w, http.StatusBadRequest, "Failed to decrypt password", "")
		return
	}

	// 生成连接ID
	connectionID := h.generateConnectionID(req.Host, req.Port, req.Database)

	// 创建Redis连接
	_, err = h.connectionPool.CreateConnection(
		connectionID,
		req.Host,
		req.Port,
		req.Database,
		password,
		req.Alias,
	)
	if err != nil {
		log.Printf("Failed to create Redis connection: %v", err)
		h.sendErrorResponse(w, http.StatusInternalServerError, "Failed to connect to Redis", err.Error())
		return
	}

	// 生成Token
	tokenInfo, err := h.tokenManager.GenerateToken(connectionID)
	if err != nil {
		log.Printf("Failed to generate token: %v", err)
		// 清理已创建的连接
		h.connectionPool.RemoveConnection(connectionID)
		h.sendErrorResponse(w, http.StatusInternalServerError, "Failed to generate token", err.Error())
		return
	}

	// 发送成功响应
	response := ConnectResponse{
		Success:      true,
		Message:      "Connected to Redis successfully",
		ConnectionID: connectionID,
		Token:        tokenInfo.Token,
		ExpiresAt:    tokenInfo.ExpiresAt.Unix(),
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)

	log.Printf("Redis connection created successfully: %s (%s:%d/%d)", connectionID, req.Host, req.Port, req.Database)
}

// validateConnectRequest 验证连接请求参数
func (h *RedisConnectHandler) validateConnectRequest(req *ConnectRequest) error {
	if req.Host == "" {
		return fmt.Errorf("host is required")
	}

	if req.Port <= 0 || req.Port > 65535 {
		return fmt.Errorf("invalid port number: %d", req.Port)
	}

	if req.EncryptedPassword == "" {
		return fmt.Errorf("encrypted password is required")
	}

	if req.Database < 0 {
		return fmt.Errorf("invalid database number: %d", req.Database)
	}

	return nil
}

// generateConnectionID 生成连接ID
func (h *RedisConnectHandler) generateConnectionID(host string, port, database int) string {
	timestamp := time.Now().Unix()
	return fmt.Sprintf("%s_%d_%d_%d", host, port, database, timestamp)
}

// sendErrorResponse 发送错误响应
func (h *RedisConnectHandler) sendErrorResponse(w http.ResponseWriter, statusCode int, message, errorDetail string) {
	response := ErrorResponse{
		Success: false,
		Message: message,
		Error:   errorDetail,
	}

	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

// GetConnectionPool 获取连接池（用于其他处理器）
func (h *RedisConnectHandler) GetConnectionPool() *pool.ConnectionPool {
	return h.connectionPool
}

// GetTokenManager 获取Token管理器（用于其他处理器）
func (h *RedisConnectHandler) GetTokenManager() *auth.TokenManager {
	return h.tokenManager
}