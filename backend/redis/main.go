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
)

// PingResponse ping接口响应结构
type PingResponse struct {
	Status    string `json:"status"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
}

// ConfigFile 配置文件结构
type ConfigFile struct {
	FileName    string     `json:"file_name"`
	ServiceName string     `json:"service_name"`
	RedisKeys   []RedisKey `json:"redis_key"`
}

// RedisKey Redis键结构
type RedisKey struct {
	Key string `json:"key"`
}

// ConfigResponse 配置文件响应结构
type ConfigResponse struct {
	Status  string       `json:"status"`
	Message string       `json:"message"`
	Data    []ConfigFile `json:"data"`
}

// enableCORS 启用跨域请求
func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

// pingHandler 处理ping请求
func pingHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)
	
	// 处理预检请求
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
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
	enableCORS(w)
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
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
	enableCORS(w)
	
	// 处理预检请求
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
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
	// 获取项目根目录
	workDir, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("获取工作目录失败: %v", err)
	}
	
	// 构造data/redis目录路径
	configDir := filepath.Join(filepath.Dir(filepath.Dir(workDir)), "data", "redis")
	log.Printf("配置文件目录: %s", configDir)
	
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
		serviceName, hasServiceName := rawConfig["service_name"].(string)
		redisKeyInterface, hasRedisKey := rawConfig["redis_key"]
		
		if !hasServiceName || !hasRedisKey {
			log.Printf("配置文件格式不正确 %s: 缺少service_name或redis_key字段", file.Name())
			continue
		}
		
		// 验证redis_key是否为数组
		redisKeyArray, ok := redisKeyInterface.([]interface{})
		if !ok {
			log.Printf("配置文件格式不正确 %s: redis_key字段不是数组", file.Name())
			continue
		}
		
		// 解析redis_key数组
		var redisKeys []RedisKey
		for _, keyInterface := range redisKeyArray {
			keyMap, ok := keyInterface.(map[string]interface{})
			if !ok {
				continue
			}
			
			if keyValue, exists := keyMap["key"].(string); exists {
				redisKeys = append(redisKeys, RedisKey{Key: keyValue})
			}
		}
		
		// 创建配置文件对象
		config := ConfigFile{
			FileName:    file.Name(),
			ServiceName: serviceName,
			RedisKeys:   redisKeys,
		}
		
		configs = append(configs, config)
		log.Printf("成功加载配置文件: %s (服务名: %s, 键数量: %d)", file.Name(), serviceName, len(redisKeys))
	}
	
	return configs, nil
}

func main() {
	// 注册路由
	http.HandleFunc("/ping", pingHandler)
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/configs", configsHandler)
	
	// 启动服务器
	port := ":8080"
	fmt.Printf("Redis API服务启动中...\n")
	fmt.Printf("服务地址: http://localhost%s\n", port)
	fmt.Printf("Ping接口: http://localhost%s/ping\n", port)
	fmt.Printf("健康检查: http://localhost%s/health\n", port)
	fmt.Printf("配置文件接口: http://localhost%s/api/configs\n", port)
	fmt.Println("按 Ctrl+C 停止服务")
	
	// 启动HTTP服务器
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}