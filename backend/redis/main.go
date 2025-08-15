package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/devtoolbox/redis/config"
)

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

// originValidationMiddleware 来源验证中间件
func originValidationMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 获取配置
		redisConfig := config.GetRedisBackendConfig()
		
		// 获取请求来源
		origin := r.Header.Get("Origin")
		referer := r.Header.Get("Referer")
		
		// 验证来源
		if !isOriginAllowed(origin, referer, redisConfig.AllowedOrigins) {
			log.Printf("拒绝来源: Origin=%s, Referer=%s", origin, referer)
			http.Error(w, "Forbidden: 来源不被允许", http.StatusForbidden)
			return
		}
		
		// 设置CORS头
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		// 处理预检请求
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		// 调用下一个处理器
		next(w, r)
	}
}

// isOriginAllowed 检查来源是否被允许
func isOriginAllowed(origin, referer string, allowedOrigins []string) bool {
	// 如果没有配置允许的来源，则允许所有请求
	if len(allowedOrigins) == 0 {
		return true
	}
	
	// 检查Origin头
	if origin != "" {
		for _, allowed := range allowedOrigins {
			if strings.HasPrefix(origin, allowed) {
				return true
			}
		}
	}
	
	// 检查Referer头（用于Chrome插件等情况）
	if referer != "" {
		for _, allowed := range allowedOrigins {
			if strings.HasPrefix(referer, allowed) {
				return true
			}
		}
	}
	
	// 如果都不匹配，则拒绝
	return false
}

// pingHandler 处理ping请求
func pingHandler(w http.ResponseWriter, r *http.Request) {
	// 只允许GET请求
	if r.Method != "GET" {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}
	
	// 构造响应数据
	response := PingResponse{
		Status:    "success",
		Message:   "Redis服务连接正常",
		Timestamp: time.Now().Unix(),
	}
	
	// 设置响应头
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	// 返回JSON响应
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("编码响应失败: %v", err)
		http.Error(w, "内部服务器错误", http.StatusInternalServerError)
		return
	}
	
	log.Printf("Ping请求处理成功 - %s", time.Now().Format("2006-01-02 15:04:05"))
}

// healthHandler 健康检查接口
func healthHandler(w http.ResponseWriter, r *http.Request) {
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	response := map[string]interface{}{
		"status": "healthy",
		"time":   time.Now().Format("2006-01-02 15:04:05"),
	}
	
	json.NewEncoder(w).Encode(response)
}

// configsHandler 处理配置文件列表请求
func configsHandler(w http.ResponseWriter, r *http.Request) {
	// 只允许GET请求
	if r.Method != "GET" {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}
	
	// 读取配置文件
	configs, err := loadConfigFiles()
	if err != nil {
		log.Printf("加载配置文件失败: %v", err)
		response := ConfigResponse{
			Status:  "error",
			Message: fmt.Sprintf("加载配置文件失败: %v", err),
			Data:    []ConfigFile{},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(response)
		return
	}
	
	// 构造响应数据
	response := ConfigResponse{
		Status:  "success",
		Message: fmt.Sprintf("成功加载 %d 个配置文件", len(configs)),
		Data:    configs,
	}
	
	// 设置响应头
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	
	// 返回JSON响应
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("编码响应失败: %v", err)
		http.Error(w, "内部服务器错误", http.StatusInternalServerError)
		return
	}
	
	log.Printf("配置文件列表请求处理成功 - 返回 %d 个配置文件", len(configs))
}

// loadConfigFiles 加载配置文件
func loadConfigFiles() ([]ConfigFile, error) {
	// 从配置中获取配置目录
	redisConfig := config.GetRedisBackendConfig()
	configDirFromConfig := redisConfig.ConfigDir
	
	// 获取项目根目录
	workDir, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("获取工作目录失败: %v", err)
	}
	
	// 构造配置目录路径
	var configDir string
	if filepath.IsAbs(configDirFromConfig) {
		// 如果是绝对路径，直接使用
		configDir = configDirFromConfig
	} else {
		// 如果是相对路径，相对于项目根目录
		projectRoot := filepath.Dir(filepath.Dir(workDir))
		configDir = filepath.Join(projectRoot, configDirFromConfig)
	}
	
	log.Printf("配置文件目录: %s (来源: %s)", configDir, configDirFromConfig)
	
	// 检查目录是否存在
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		return nil, fmt.Errorf("配置文件目录不存在: %s", configDir)
	}
	
	// 读取目录下的所有文件
	files, err := ioutil.ReadDir(configDir)
	if err != nil {
		return nil, fmt.Errorf("读取配置目录失败: %v", err)
	}
	
	var configs []ConfigFile
	
	// 遍历所有JSON文件
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(strings.ToLower(file.Name()), ".json") {
			continue
		}
		
		filePath := filepath.Join(configDir, file.Name())
		log.Printf("处理配置文件: %s", filePath)
		
		// 读取文件内容
		content, err := ioutil.ReadFile(filePath)
		if err != nil {
			log.Printf("读取文件失败 %s: %v", file.Name(), err)
			continue
		}
		
		// 解析JSON
		var rawConfig map[string]interface{}
		if err := json.Unmarshal(content, &rawConfig); err != nil {
			log.Printf("解析JSON失败 %s: %v", file.Name(), err)
			continue
		}
		
		// 验证必需字段
		service, hasService := rawConfig["service"].(string)
		redisKeysInterface, hasRedisKeys := rawConfig["redis_keys"]
		
		if !hasService || !hasRedisKeys {
			log.Printf("配置文件格式不正确 %s: 缺少service或redis_keys字段", file.Name())
			continue
		}
		
		// 验证redis_keys是否为数组
		redisKeysArray, ok := redisKeysInterface.([]interface{})
		if !ok {
			log.Printf("配置文件格式不正确 %s: redis_keys字段不是数组", file.Name())
			continue
		}
		
		// 创建配置文件对象
		config := ConfigFile{
			FileName: file.Name(),
			Service:  service,
		}
		
		// 可选字段
		if pkg, ok := rawConfig["package"].(string); ok {
			config.Package = pkg
		}
		if filePath, ok := rawConfig["file_path"].(string); ok {
			config.FilePath = filePath
		}
		
		// 解析redis_keys数组
		for _, keyInterface := range redisKeysArray {
			if keyMap, ok := keyInterface.(map[string]interface{}); ok {
				redisKey := RedisKey{}
				
				if name, exists := keyMap["name"].(string); exists {
					redisKey.Name = name
				}
				if template, exists := keyMap["template"].(string); exists {
					redisKey.Template = template
				}
				if comment, exists := keyMap["comment"].(string); exists {
					redisKey.Comment = comment
				}
				
				// 解析parameters数组
				if paramsInterface, exists := keyMap["parameters"]; exists {
					if paramsArray, ok := paramsInterface.([]interface{}); ok {
						for _, paramInterface := range paramsArray {
							if paramMap, ok := paramInterface.(map[string]interface{}); ok {
								param := Parameter{}
								if index, exists := paramMap["index"].(float64); exists {
									param.Index = int(index)
								}
								if paramType, exists := paramMap["type"].(string); exists {
									param.Type = paramType
								}
								if desc, exists := paramMap["description"].(string); exists {
									param.Description = desc
								}
								if placeholder, exists := paramMap["placeholder"].(string); exists {
									param.Placeholder = placeholder
								}
								redisKey.Parameters = append(redisKey.Parameters, param)
							}
						}
					}
				}
				
				config.RedisKeys = append(config.RedisKeys, redisKey)
			}
		}
		
		configs = append(configs, config)
		log.Printf("成功加载配置文件: %s (服务名: %s, 键数量: %d)", file.Name(), config.Service, len(config.RedisKeys))
	}
	
	return configs, nil
}

func main() {
	// 初始化配置
	if err := config.InitConfig(""); err != nil {
		log.Printf("配置初始化失败，使用默认配置: %v", err)
	}

	// 获取配置
	appConfig := config.GetConfig()
	redisConfig := config.GetRedisBackendConfig()

	// 打印配置信息（调试用）
	if redisConfig.LogLevel == "debug" {
		config.PrintConfig()
	}

	// 注册路由（使用来源验证中间件）
	http.HandleFunc("/ping", originValidationMiddleware(pingHandler))
	http.HandleFunc("/health", originValidationMiddleware(healthHandler))
	http.HandleFunc("/api/configs", originValidationMiddleware(configsHandler))
	
	// 启动服务器
	port := fmt.Sprintf(":%d", redisConfig.Port)
	host := redisConfig.Host
	
	fmt.Printf("Redis API服务启动中...\n")
	fmt.Printf("配置名称: %s v%s\n", appConfig.Name, appConfig.Version)
	fmt.Printf("服务地址: http://%s%s\n", host, port)
	fmt.Printf("日志级别: %s\n", redisConfig.LogLevel)
	fmt.Printf("配置目录: %s\n", redisConfig.ConfigDir)
	fmt.Printf("CORS启用: %t\n", redisConfig.CORSEnabled)
	fmt.Printf("Ping接口: http://%s%s/ping\n", host, port)
	fmt.Printf("健康检查: http://%s%s/health\n", host, port)
	fmt.Printf("配置文件接口: http://%s%s/api/configs\n", host, port)
	fmt.Println("按 Ctrl+C 停止服务")
	fmt.Println("")
	fmt.Println("环境变量支持:")
	fmt.Println("  REDIS_API_PORT - 覆盖服务端口")
	fmt.Println("  REDIS_API_HOST - 覆盖服务主机")
	fmt.Println("  REDIS_API_LOG_LEVEL - 覆盖日志级别")
	fmt.Println("  REDIS_CONFIG_DIR - 覆盖配置目录")
	fmt.Println("")
	
	// 启动HTTP服务器
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}