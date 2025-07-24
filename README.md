# DevToolkit - Chrome开发者工具集插件

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
  - [x] **动态键值对编辑**: 将 "Params" 和 "Headers" 从文本域升级为可动态添加/删除的键值对输入框。
  - [x] **URL与Params双向同步**: 实现 URL 输入框与 "Params" 区域的数据双向绑定。
  - [x] **发送请求逻辑更新**: 更新发送请求的逻辑，以适配新的键值对输入方式。
- ✅ JSON美化与压缩
  - 快速格式化凌乱的JSON字符串，使其易于阅读；或压缩JSON以减少传输大小。
- ✅ 图片 Base64 转换
- todo SQL 格式化
  - 美化SQL查询语句，使其结构清晰，易于阅读和调试。
- todo 正则表达式测试工具
  - 输入正则表达式和测试文本，实时显示匹配结果，辅助正则编写和调试。
- todo 内网接口扫描添加 + 自动造参数
  - 探索内网接口并尝试自动生成请求参数，提高接口调试效率。


## 项目结构
```
/
├───assets/
│   ├───icons/          # 存放扩展图标
│   ├───libs/           # 存放第三方库，如 qrcode.min.js
│   └───css/            # 存放全局CSS文件 (如果需要)
├───components/         # 存放可复用的UI组件，如导航栏
│   └───navbar/
│       ├───navbar.html
│       └───navbar.js
├───pages/              # 存放各个独立功能的页面及其逻辑
│   ├───apiTester/
│   │   ├───index.html
│   │   └───index.js
│   ├───qrcode/
│   │   ├───index.html
│   │   └───index.js
│   ├───timestamp/
│   │   ├───index.html
│   │   └───index.js
│   └───urlEncoderDecoder/
│       ├───index.html
│       └───index.js
├───popup/              # 扩展的弹出页面及其逻辑
│   ├───popup.html
│   └───popup.js
├───manifest.json       # 扩展的配置文件
├───README.md           # 项目说明文件
└───.gitignore          # Git忽略文件
```

## 许可证
MIT © 2023 ct-zh