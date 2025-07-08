# DevToolkit - Chrome开发者工具集插件

![Chrome Web Store](https://img.shields.io/chrome-web-store/v/your-extension-id-here) 
![GitHub](https://img.shields.io/github/license/ct-zh/ToolboxForChrome)

一个为开发者设计的Chrome插件，提供日常开发工具集合。

## todolist
- 完成功能特性
- 样式美化
- 代码优化、整理

## 功能特性
- ✅ 时间戳与日期互转
- ✅ 二维码生成
- ✅ URL编码/解码
- todo 模拟请求
- todo JSON美化与压缩
  - 快速格式化凌乱的JSON字符串，使其易于阅读；或压缩JSON以减少传输大小。
- todo 图片 Base64 转换
- todo SQL 格式化
  - 美化SQL查询语句，使其结构清晰，易于阅读和调试。
- todo IP 地址查询/归属地查询
  - 快速查询IP地址的地理位置信息，辅助网络排查。
- todo User-Agent 解析器
  - 解析浏览器User-Agent字符串，显示操作系统、浏览器版本等详细信息。
- todo Cookie/LocalStorage 管理器
  - 方便查看、编辑和删除当前网站的Cookie和LocalStorage数据。
- todo 正则表达式测试工具
  - 输入正则表达式和测试文本，实时显示匹配结果，辅助正则编写和调试。
- todo UUID/GUID 生成器
  - 快速生成通用唯一标识符（UUID/GUID），常用于唯一ID的生成。
- todo MD5/SHA 加密工具
  - 对输入的字符串进行MD5、SHA1、SHA256等常见哈希加密。
- todo 代码片段管理
  - 存储和管理常用的代码片段，方便快速插入到开发中。
- todo 内网接口扫描添加 + 自动造参数
  - 探索内网接口并尝试自动生成请求参数，提高接口调试效率。
- todo Mermaid 实时预览
- todo 常用ai工具网站跳转

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