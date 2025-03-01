# HTML/SVG 转 PDF/PNG 服务

<div align="center">

![版本](https://img.shields.io/badge/版本-1.0.0-blue.svg)
![许可证](https://img.shields.io/badge/许可证-MIT-green.svg)
![Node.js](https://img.shields.io/badge/Node.js-v14+-yellow.svg)

</div>

这是一个高效的API服务，用于将HTML或SVG内容转换为PDF或PNG格式。支持直接传入内容或上传文件进行转换，适用于各种文档生成和图像处理场景。

## ✨ 主要功能

- 🔄 将HTML内容转换为PDF或PNG格式
- 🔄 将SVG内容转换为PDF或PNG格式
- 📤 支持上传HTML或SVG文件进行转换
- 🎯 支持使用CSS选择器只转换特定内容
- 📄 提供直接返回文件内容的API端点
- 🔗 提供返回文件URL的API端点（适用于AI助手集成）
- 🌐 支持中文和其他Unicode字符的正确渲染
- 🔒 内置API密钥认证和速率限制保护

## 🚀 快速开始

### 安装和运行

```bash
# 克隆仓库
git clone https://github.com/yourusername/html-to-pdf.git
cd html-to-pdf

# 安装依赖
npm install

# 运行服务
node index.js
```

默认情况下，服务将在 http://localhost:3000 上运行。

### 使用Docker运行

```bash
# 构建Docker镜像
docker build -t html-to-pdf .

# 运行Docker容器
docker run -p 3000:3000 -e API_KEY_REQUIRED=false html-to-pdf
```

### 部署到Zeabur

本项目可以轻松部署到[Zeabur](https://zeabur.com)云平台：

1. 在Zeabur上创建一个新项目
2. 连接您的GitHub仓库
3. 选择本仓库并部署
4. Zeabur将自动检测Dockerfile并构建应用

部署完成后，您可以在Zeabur控制台中设置以下环境变量：

- `API_KEY_REQUIRED`: 设置为`true`以启用API密钥认证
- `API_KEYS`: 设置有效的API密钥列表（逗号分隔）
- `BASE_URL`: 设置基础URL，用于生成文件URL

> **注意**: 在生产环境中，强烈建议启用API密钥认证。

## 📚 API文档

### 内容转换API

#### 将HTML/SVG内容转换为PDF/PNG

```
POST /api/convert
```

**请求体**:
```json
{
  "content": "<div>您的HTML内容</div>",
  "type": "html",  // "html" 或 "svg"
  "format": "pdf", // "pdf" 或 "png"
  "selector": "body" // 可选，CSS选择器
}
```

**响应**: 直接返回生成的PDF或PNG文件

#### 上传文件并转换为PDF/PNG

```
POST /api/convert/file
```

**请求**: 使用`multipart/form-data`格式上传文件
- `file`: HTML或SVG文件
- `type`: "html" 或 "svg"
- `format`: "pdf" 或 "png"
- `selector`: 可选，CSS选择器

**响应**: 直接返回生成的PDF或PNG文件

### URL返回API（适用于AI助手集成）

#### 将HTML/SVG内容转换为PDF/PNG并返回URL

```
POST /api/convert/url
```

**请求体**:
```json
{
  "content": "<div>您的HTML内容</div>",
  "type": "html",  // "html" 或 "svg"
  "format": "pdf", // "pdf" 或 "png"
  "selector": "body" // 可选，CSS选择器
}
```

**响应**:
```json
{
  "success": true,
  "fileUrl": "http://example.com/output/output-1234567890.pdf",
  "fileName": "output-1234567890.pdf",
  "fileType": "application/pdf"
}
```

#### 上传文件并转换为PDF/PNG并返回URL

```
POST /api/convert/file/url
```

**请求**: 使用`multipart/form-data`格式上传文件
- `file`: HTML或SVG文件
- `type`: "html" 或 "svg"
- `format`: "pdf" 或 "png"
- `selector`: 可选，CSS选择器

**响应**:
```json
{
  "success": true,
  "fileUrl": "http://example.com/output/output-1234567890.pdf",
  "fileName": "output-1234567890.pdf",
  "fileType": "application/pdf"
}
```

## 🔧 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `PORT` | 服务器端口 | 3000 |
| `NODE_ENV` | 环境模式 | development |
| `BASE_URL` | 基础URL，用于生成文件URL | 自动检测 |
| `API_KEY_REQUIRED` | 是否启用API密钥验证 | false（开发环境） |
| `API_KEYS` | 有效的API密钥列表（逗号分隔） | - |
| `MONTHLY_QUOTA` | 每月API调用配额 | 1000 |

## 🔒 安全性

本服务提供多层安全保护：

1. **API密钥认证**: 保护API端点免受未授权访问
2. **速率限制**: 防止API滥用
3. **IP白名单**: 可选的IP地址限制

> **⚠️ 重要提示**: 在生产环境中，强烈建议启用API密钥认证。默认情况下，开发环境中API认证是禁用的，但在部署到公共服务器时必须启用，以防止未授权访问和滥用。请参考`.env.production.example`文件进行配置。

### 如何使用API密钥

在请求API端点时，您需要在请求头中包含API密钥：

```
Authorization: Bearer YOUR_API_KEY
```

或者：

```
X-API-Key: YOUR_API_KEY
```

您也可以在查询参数中包含API密钥：

```
?api_key=YOUR_API_KEY
```

## 🧪 测试

项目包含多种测试工具：

- `test-api.js` - Node.js测试脚本
- `test-api.sh` - Shell测试脚本
- `test-api.html` - 浏览器测试页面
- `public/test-url-api.html` - 测试返回URL的API端点的页面

## 🔌 AI平台集成

### Dify集成

本项目支持作为自定义工具集成到Dify平台中。详细的集成指南请参考 [DIFY_INTEGRATION.md](DIFY_INTEGRATION.md)。

### 为什么需要返回URL的API端点？

Dify和其他AI助手平台通常无法直接处理二进制文件响应。为了解决这个问题，我们提供了专门的API端点，它们不直接返回文件内容，而是返回包含文件URL的JSON响应。这样，AI助手可以向用户提供下载链接，而不是尝试直接处理二进制文件。

## 📁 项目结构

```
.
├── index.js              # 主入口文件
├── utils/                # 工具函数
│   └── converter.js      # 转换功能实现
├── routes/               # 路由处理
│   ├── html.js           # HTML转换路由
│   ├── svg.js            # SVG转换路由
│   ├── file.js           # 文件上传路由
│   ├── api.js            # API路由
│   └── index.js          # 路由导出
├── middleware/           # 中间件
│   └── auth.js           # 认证和安全中间件
├── public/               # 静态文件
├── views/                # 视图模板
├── output/               # 输出文件目录
└── uploads/              # 上传文件临时目录
```

## 📄 许可证

MIT 