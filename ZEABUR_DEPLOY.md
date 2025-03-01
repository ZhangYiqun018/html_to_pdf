# Zeabur 部署指南

本指南将帮助您在 Zeabur 平台上部署 HTML/SVG 转 PDF/PNG API 服务，并确保中文字符正确渲染。

## 前提条件

1. 一个 Zeabur 账户
2. 本项目的代码库

## 部署步骤

### 1. 准备 Dockerfile

确保您的项目中包含了正确配置的 Dockerfile，特别是安装了必要的中文字体：

```dockerfile
FROM node:20

# 创建应用目录
WORKDIR /usr/src/app

# 安装html-pdf所需的依赖和中文字体支持
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libfontconfig1 \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fonts-wqy-zenhei \
    fonts-wqy-microhei \
    && rm -rf /var/lib/apt/lists/*

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p uploads output

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "index.js"]
```

### 2. 在 Zeabur 上创建项目

1. 登录到 [Zeabur 控制台](https://dash.zeabur.com)
2. 点击 "创建项目"
3. 为项目命名，例如 "html-to-pdf-api"

### 3. 部署服务

#### 方法 1: 使用 GitHub 仓库

1. 在项目中点击 "部署服务"
2. 选择 "从 GitHub 部署"
3. 选择包含此 API 服务的仓库
4. Zeabur 将自动检测 Dockerfile 并使用它来构建服务

#### 方法 2: 使用 Docker 镜像

1. 在本地构建 Docker 镜像并推送到 Docker Hub
   ```bash
   docker build -t yourusername/html-to-pdf-api:latest .
   docker push yourusername/html-to-pdf-api:latest
   ```
2. 在 Zeabur 项目中点击 "部署服务"
3. 选择 "从 Docker 镜像部署"
4. 输入您的 Docker 镜像地址 `yourusername/html-to-pdf-api:latest`

### 4. 配置环境变量

在 Zeabur 控制台中，为您的服务设置以下环境变量：

- `PORT`: 默认为 3000，但 Zeabur 可能会自动设置
- `NODE_ENV`: 设置为 `production`
- `API_KEY_REQUIRED`: 设置为 `true`
- `API_KEY`: 您的 API 密钥

### 5. 绑定域名（可选）

1. 在服务详情页面，点击 "域名" 选项卡
2. 点击 "添加域名"
3. 输入您想要使用的域名
4. 按照指示配置 DNS 记录

### 6. 测试部署

部署完成后，您可以使用以下命令测试 API：

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"content":"<h1>你好，世界！</h1><p>这是一个测试</p>","type":"html","format":"pdf"}' \
  https://your-domain.com/api/convert/url
```

## 故障排除

### 中文字符显示为方块或不显示

如果中文字符仍然无法正确显示，可能需要检查以下几点：

1. 确认 Dockerfile 中已安装所有必要的中文字体包
2. 检查 `index.js` 中的 `convertWithHtmlPdf` 函数是否正确配置了字体
3. 尝试在 HTML 内容中明确指定字体族：
   ```html
   <style>
     body {
       font-family: 'Noto Sans CJK SC', 'WQY Zen Hei', 'WQY Micro Hei', Arial, sans-serif;
     }
   </style>
   ```

### 布局问题

如果转换后的 PDF/PNG 布局与原始 HTML 不一致：

1. 确保 HTML 内容使用了响应式设计
2. 在 `convertWithHtmlPdf` 函数中调整 `renderDelay` 参数，给予更多时间加载样式和字体
3. 考虑在 HTML 中添加 `@page` CSS 规则来控制 PDF 页面布局：
   ```html
   <style>
     @page {
       size: A4;
       margin: 0;
     }
     body {
       margin: 0;
       padding: 20px;
     }
   </style>
   ```

## 结论

通过以上步骤，您应该能够在 Zeabur 上成功部署 HTML/SVG 转 PDF/PNG API 服务，并确保中文字符能够正确渲染。如果您仍然遇到问题，请检查服务日志以获取更多信息。 