# HTML/SVG转PDF/PNG API部署指南

本指南将帮助您将HTML/SVG转PDF/PNG API部署到服务器上。

## 目录

1. [系统要求](#系统要求)
2. [部署选项](#部署选项)
3. [基本部署步骤](#基本部署步骤)
4. [使用PM2进行进程管理](#使用pm2进行进程管理)
5. [使用Docker部署](#使用docker部署)
6. [配置Nginx反向代理](#配置nginx反向代理)
7. [设置HTTPS](#设置https)
8. [监控和日志](#监控和日志)
9. [性能优化](#性能优化)
10. [常见问题](#常见问题)

## 系统要求

- Node.js 14.0.0或更高版本
- npm或yarn包管理器
- 足够的磁盘空间用于临时文件存储
- 至少1GB RAM（推荐2GB或更多）
- Linux、macOS或Windows服务器

## 部署选项

您可以选择以下几种方式部署API：

1. **直接部署**：在服务器上直接运行Node.js应用
2. **Docker容器**：使用Docker容器化应用
3. **云服务**：部署到AWS、Google Cloud、Azure等云服务

## 基本部署步骤

### 1. 准备服务器

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装Node.js和npm（如果尚未安装）
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# 安装构建工具（用于某些npm包）
sudo apt install -y build-essential

# 安装Puppeteer依赖
sudo apt install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

### 2. 克隆代码并安装依赖

```bash
# 克隆代码库（如果使用Git）
git clone https://your-repository-url.git html-to-pdf-api
cd html-to-pdf-api

# 或者上传您的代码到服务器

# 安装依赖
npm install

# 创建必要的目录
mkdir -p uploads output
```

### 3. 配置环境变量

```bash
# 复制示例环境文件
cp .env.example .env

# 编辑环境文件
nano .env
```

在`.env`文件中设置以下变量：

```
PORT=3000
OUTPUT_DIR=output
UPLOAD_DIR=uploads
NODE_ENV=production
```

### 4. 测试应用

```bash
# 启动应用
node index.js

# 或使用提供的启动脚本
./start.sh
```

确保应用正常运行，然后按Ctrl+C停止它。

## 使用PM2进行进程管理

PM2是一个Node.js应用的进程管理器，可以帮助您保持应用持续运行。

### 1. 安装PM2

```bash
sudo npm install -g pm2
```

### 2. 创建PM2配置文件

创建一个名为`ecosystem.config.js`的文件：

```javascript
module.exports = {
  apps: [{
    name: "html-to-pdf-api",
    script: "index.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    max_memory_restart: "1G"
  }]
};
```

### 3. 启动应用

```bash
pm2 start ecosystem.config.js
```

### 4. 设置开机自启

```bash
pm2 startup
pm2 save
```

### 5. 管理应用

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart html-to-pdf-api

# 停止应用
pm2 stop html-to-pdf-api
```

## 使用Docker部署

### 1. 创建Dockerfile

在项目根目录创建一个名为`Dockerfile`的文件：

```dockerfile
FROM node:16

# 创建应用目录
WORKDIR /usr/src/app

# 安装Puppeteer依赖
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
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

### 2. 创建.dockerignore文件

```
node_modules
npm-debug.log
output
uploads
.env
.git
.gitignore
```

### 3. 构建Docker镜像

```bash
docker build -t html-to-pdf-api .
```

### 4. 运行Docker容器

```bash
docker run -p 3000:3000 -d --name html-to-pdf-api html-to-pdf-api
```

### 5. 使用Docker Compose（可选）

创建`docker-compose.yml`文件：

```yaml
version: '3'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./output:/usr/src/app/output
      - ./uploads:/usr/src/app/uploads
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: always
```

启动服务：

```bash
docker-compose up -d
```

## 配置Nginx反向代理

Nginx可以作为反向代理，处理客户端请求并将它们转发到Node.js应用。

### 1. 安装Nginx

```bash
sudo apt install -y nginx
```

### 2. 创建Nginx配置文件

```bash
sudo nano /etc/nginx/sites-available/html-to-pdf-api
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 增加超时时间，适用于大文件处理
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        
        # 增加上传文件大小限制
        client_max_body_size 10M;
    }
}
```

### 3. 启用站点配置

```bash
sudo ln -s /etc/nginx/sites-available/html-to-pdf-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 设置HTTPS

使用Let's Encrypt免费获取SSL证书。

### 1. 安装Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. 获取SSL证书

```bash
sudo certbot --nginx -d your-domain.com
```

按照提示完成配置。

## 监控和日志

### 1. 设置日志目录

```bash
mkdir -p logs
```

### 2. 配置日志轮转

创建`logrotate.conf`文件：

```
/path/to/your/app/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 node node
}
```

添加到系统logrotate：

```bash
sudo cp logrotate.conf /etc/logrotate.d/html-to-pdf-api
```

### 3. 使用监控工具

- **PM2监控**：`pm2 monit`
- **Prometheus + Grafana**：设置监控和警报系统

## 性能优化

### 1. 调整Node.js内存限制

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 2. 使用CDN缓存静态资源

配置Nginx缓存或使用CloudFlare等CDN服务。

### 3. 实现请求限流

使用`express-rate-limit`包限制API请求频率。

### 4. 优化Puppeteer性能

- 使用共享浏览器实例
- 实现浏览器实例池
- 调整Puppeteer启动参数

## 常见问题

### 1. Puppeteer无法启动

确保安装了所有必要的依赖：

```bash
sudo apt install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

### 2. 内存使用过高

调整Puppeteer启动参数：

```javascript
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ]
});
```

### 3. 请求超时

增加Nginx和Node.js的超时设置。

### 4. 文件大小限制

调整Nginx和Express的文件大小限制：

```javascript
// Express
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

```nginx
# Nginx
client_max_body_size 10M;
```

## 安全建议

1. 实现API密钥认证
2. 设置请求限流
3. 定期更新依赖
4. 使用HTTPS
5. 实现输入验证
6. 限制上传文件类型和大小
7. 定期备份数据 