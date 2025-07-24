package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// PingResponse ping接口响应结构
type PingResponse struct {
	Status    string `json:"status"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
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

func main() {
	// 注册路由
	http.HandleFunc("/ping", pingHandler)
	http.HandleFunc("/health", healthHandler)
	
	// 启动服务器
	port := ":8080"
	fmt.Printf("Redis API服务启动中...\n")
	fmt.Printf("服务地址: http://localhost%s\n", port)
	fmt.Printf("Ping接口: http://localhost%s/ping\n", port)
	fmt.Printf("健康检查: http://localhost%s/health\n", port)
	fmt.Println("按 Ctrl+C 停止服务")
	
	// 启动HTTP服务器
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("服务器启动失败: %v", err)
	}
}