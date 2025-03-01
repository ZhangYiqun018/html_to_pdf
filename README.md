# HTML/SVG转PDF/PNG API服务

这是一个简单的API服务，用于将HTML或SVG内容转换为PDF或PNG格式。支持直接传入内容或上传文件进行转换。

## 主要功能

- 将HTML内容转换为PDF或PNG
- 将SVG内容转换为PDF或PNG
- 支持上传HTML或SVG文件进行转换
- 支持使用CSS选择器只转换特定内容
- 提供直接返回文件内容的API端点
- 提供返回文件URL的API端点（适用于AI助手集成）

## API端点

### 直接返回文件内容的端点

- `POST /api/convert` - 将HTML或SVG内容转换为PDF或PNG
- `POST /api/convert/file` - 上传HTML或SVG文件并转换为PDF或PNG

### 返回文件URL的端点（适用于AI助手集成）

- `POST /api/convert/url` - 将HTML或SVG内容转换为PDF或PNG并返回文件URL
- `POST /api/convert/file/url` - 上传HTML或SVG文件并转换为PDF或PNG并返回文件URL

## Dify集成

本项目支持作为自定义工具集成到Dify平台中。详细的集成指南请参考 [DIFY_INTEGRATION.md](DIFY_INTEGRATION.md)。

### 为什么需要返回URL的API端点？

Dify和其他AI助手平台通常无法直接处理二进制文件响应。为了解决这个问题，我们提供了专门的API端点，它们不直接返回文件内容，而是返回包含文件URL的JSON响应。这样，AI助手可以向用户提供下载链接，而不是尝试直接处理二进制文件。

## 技术栈

- Node.js
- Express.js
- html-pdf库（用于HTML/SVG转换）

## 安装和运行

1. 克隆仓库
2. 安装依赖：`npm install`
3. 运行服务：`node index.js`

默认情况下，服务将在 http://localhost:3000 上运行。

## 环境变量

- `PORT` - 服务器端口（默认：3000）
- `NODE_ENV` - 环境模式（development/production）
- `BASE_URL` - 基础URL，用于生成文件URL（默认：根据请求头自动检测）

## 测试

项目包含多种测试工具：

- `test-api.js` - Node.js测试脚本
- `test-api.sh` - Shell测试脚本
- `test-api.html` - 浏览器测试页面
- `public/test-url-api.html` - 测试返回URL的API端点的页面

## 许可证

MIT 