# DevToolkit - Chrome开发者工具集插件

![Chrome Web Store](https://img.shields.io/chrome-web-store/v/your-extension-id-here) 
![GitHub](https://img.shields.io/github/license/ct-zh/ToolboxForChrome)

一个为开发者设计的Chrome插件，提供日常开发工具集合：
- JSON解析与格式化
- 时间戳转换工具
- 其他实用开发辅助功能

## 功能特性
- ✅ 时间戳与日期互转
- todo URL编码/解码
- todo JSON美化与压缩  
- ✅ 二维码生成
- todo 内网接口扫描添加 + 自动造参数

## 安装
1. 克隆本仓库
```bash
git clone https://github.com/ct-zh/ToolboxForChrome.git
```
2. 在Chrome中加载扩展程序：
   - 打开 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择本项目目录

## 开发
```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

## 许可证
MIT © 2023 ct-zh