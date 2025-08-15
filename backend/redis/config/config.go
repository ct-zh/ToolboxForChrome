package config

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strconv"
)

// Config 应用配置结构
type Config struct {
	Name        string      `json:"name"`
	Version     string      `json:"version"`
	Description string      `json:"description"`
	Frontend    Frontend    `json:"frontend"`
	Backend     Backend     `json:"backend"`
	Environment Environment `json:"environment"`
}

// Frontend 前端配置
type Frontend struct {
	RedisManager RedisManagerFrontend `json:"redisManager"`
}

// RedisManagerFrontend Redis管理器前端配置
type RedisManagerFrontend struct {
	APIBaseURL     string `json:"apiBaseUrl"`
	Timeout        int    `json:"timeout"`
	RetryAttempts  int    `json:"retryAttempts"`
}

// Backend 后端配置
type Backend struct {
	Redis RedisBackend `json:"redis"`
}

// RedisBackend Redis后端配置
type RedisBackend struct {
	Port        int    `json:"port"`
	Host        string `json:"host"`
	LogLevel    string `json:"logLevel"`
	CORSEnabled bool   `json:"corsEnabled"`
	ConfigDir   string `json:"configDir"`
}

// Environment 环境配置
type Environment struct {
	Development EnvConfig `json:"development"`
	Production  EnvConfig `json:"production"`
}

// EnvConfig 环境特定配置
type EnvConfig struct {
	Frontend Frontend `json:"frontend"`
	Backend  Backend  `json:"backend"`
}

// 全局配置实例
var AppConfig *Config

// LoadConfig 加载配置文件
func LoadConfig(configPath string) (*Config, error) {
	// 如果没有指定配置文件路径，使用默认路径
	if configPath == "" {
		// 获取当前工作目录的上级目录（项目根目录）
		workDir, err := os.Getwd()
		if err != nil {
			return nil, fmt.Errorf("获取工作目录失败: %v", err)
		}
		// 向上两级目录找到项目根目录
		projectRoot := filepath.Dir(filepath.Dir(workDir))
		configPath = filepath.Join(projectRoot, "config.json")
	}

	log.Printf("正在加载配置文件: %s", configPath)

	// 检查配置文件是否存在
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		log.Printf("配置文件不存在，使用默认配置: %s", configPath)
		return getDefaultConfig(), nil
	}

	// 读取配置文件
	content, err := ioutil.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("读取配置文件失败: %v", err)
	}

	// 解析JSON配置
	var config Config
	if err := json.Unmarshal(content, &config); err != nil {
		return nil, fmt.Errorf("解析配置文件失败: %v", err)
	}

	// 应用环境变量覆盖
	applyEnvironmentOverrides(&config)

	// 验证配置
	if err := validateConfig(&config); err != nil {
		return nil, fmt.Errorf("配置验证失败: %v", err)
	}

	log.Printf("配置加载成功: %s", config.Name)
	return &config, nil
}

// getDefaultConfig 获取默认配置
func getDefaultConfig() *Config {
	return &Config{
		Name:        "DevToolBox Configuration",
		Version:     "1.0.0",
		Description: "开发者工具箱默认配置",
		Frontend: Frontend{
			RedisManager: RedisManagerFrontend{
				APIBaseURL:    "http://localhost:8080",
				Timeout:       5000,
				RetryAttempts: 3,
			},
		},
		Backend: Backend{
			Redis: RedisBackend{
				Port:        8080,
				Host:        "localhost",
				LogLevel:    "info",
				CORSEnabled: true,
				ConfigDir:   "data/redis",
			},
		},
	}
}

// applyEnvironmentOverrides 应用环境变量覆盖
func applyEnvironmentOverrides(config *Config) {
	// 后端Redis配置环境变量覆盖
	if port := os.Getenv("REDIS_API_PORT"); port != "" {
		if p, err := strconv.Atoi(port); err == nil {
			config.Backend.Redis.Port = p
			log.Printf("环境变量覆盖端口: %d", p)
		}
	}

	if host := os.Getenv("REDIS_API_HOST"); host != "" {
		config.Backend.Redis.Host = host
		log.Printf("环境变量覆盖主机: %s", host)
	}

	if logLevel := os.Getenv("REDIS_API_LOG_LEVEL"); logLevel != "" {
		config.Backend.Redis.LogLevel = logLevel
		log.Printf("环境变量覆盖日志级别: %s", logLevel)
	}

	if configDir := os.Getenv("REDIS_CONFIG_DIR"); configDir != "" {
		config.Backend.Redis.ConfigDir = configDir
		log.Printf("环境变量覆盖配置目录: %s", configDir)
	}

	// 前端配置环境变量覆盖
	if apiBaseURL := os.Getenv("REDIS_MANAGER_API_BASE_URL"); apiBaseURL != "" {
		config.Frontend.RedisManager.APIBaseURL = apiBaseURL
		log.Printf("环境变量覆盖API基础URL: %s", apiBaseURL)
	}
}

// validateConfig 验证配置
func validateConfig(config *Config) error {
	// 验证端口范围
	if config.Backend.Redis.Port < 1 || config.Backend.Redis.Port > 65535 {
		return fmt.Errorf("无效的端口号: %d，端口号必须在1-65535之间", config.Backend.Redis.Port)
	}

	// 验证主机地址
	if config.Backend.Redis.Host == "" {
		return fmt.Errorf("主机地址不能为空")
	}

	// 验证日志级别
	validLogLevels := []string{"debug", "info", "warn", "error"}
	validLevel := false
	for _, level := range validLogLevels {
		if config.Backend.Redis.LogLevel == level {
			validLevel = true
			break
		}
	}
	if !validLevel {
		return fmt.Errorf("无效的日志级别: %s，支持的级别: %v", config.Backend.Redis.LogLevel, validLogLevels)
	}

	// 验证API基础URL
	if config.Frontend.RedisManager.APIBaseURL == "" {
		return fmt.Errorf("API基础URL不能为空")
	}

	return nil
}

// InitConfig 初始化配置
func InitConfig(configPath string) error {
	config, err := LoadConfig(configPath)
	if err != nil {
		return err
	}
	AppConfig = config
	return nil
}

// GetConfig 获取全局配置
func GetConfig() *Config {
	if AppConfig == nil {
		log.Println("配置未初始化，使用默认配置")
		AppConfig = getDefaultConfig()
	}
	return AppConfig
}

// GetRedisBackendConfig 获取Redis后端配置
func GetRedisBackendConfig() RedisBackend {
	return GetConfig().Backend.Redis
}

// GetRedisManagerFrontendConfig 获取Redis管理器前端配置
func GetRedisManagerFrontendConfig() RedisManagerFrontend {
	return GetConfig().Frontend.RedisManager
}

// PrintConfig 打印当前配置（用于调试）
func PrintConfig() {
	config := GetConfig()
	configJSON, _ := json.MarshalIndent(config, "", "  ")
	log.Printf("当前配置:\n%s", string(configJSON))
}