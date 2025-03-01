# 故障排除指南

本文档提供了一些常见问题的解决方案。

## Puppeteer 相关问题

### 问题：无法启动浏览器进程

错误信息：
```
Failed to launch the browser process! /root/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome: error while loading shared libraries: libnss3.so: cannot open shared object file: No such file or directory
```

**解决方案**：

这个错误通常是因为缺少 Puppeteer 运行所需的系统依赖库。在不同的环境中，解决方案如下：

#### 在 Docker 中运行

使用项目中提供的 Dockerfile，它已经包含了所有必要的依赖：

```bash
docker build -t html-to-pdf .
docker run -p 3000:3000 html-to-pdf
```

#### 在 Ubuntu/Debian 系统中

安装必要的依赖：

```bash
apt-get update && apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
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
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget
```

#### 在 CentOS/RHEL 系统中

```bash
yum install -y \
    alsa-lib.x86_64 \
    atk.x86_64 \
    cups-libs.x86_64 \
    gtk3.x86_64 \
    ipa-gothic-fonts \
    libXcomposite.x86_64 \
    libXcursor.x86_64 \
    libXdamage.x86_64 \
    libXext.x86_64 \
    libXi.x86_64 \
    libXrandr.x86_64 \
    libXScrnSaver.x86_64 \
    libXtst.x86_64 \
    pango.x86_64 \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic \
    xorg-x11-fonts-misc \
    xorg-x11-fonts-Type1 \
    xorg-x11-utils \
    nss
```

#### 在 Zeabur 中部署

在 Zeabur 中部署时，使用项目中提供的 Dockerfile 和 zeabur.json 文件，它们已经配置好了所有必要的设置。

### 问题：中文字体显示为方块或乱码

**解决方案**：

确保安装了中文字体：

```bash
# Ubuntu/Debian
apt-get update && apt-get install -y fonts-wqy-zenhei fonts-wqy-microhei fonts-noto-cjk

# CentOS/RHEL
yum install -y wqy-zenhei-fonts wqy-microhei-fonts google-noto-cjk-fonts
```

## API 认证问题

### 问题：API 请求返回 401 未授权错误

**解决方案**：

1. 确保在请求中包含了有效的 API 密钥：
   - 在请求头中添加 `Authorization: Bearer YOUR_API_KEY`
   - 或者在请求头中添加 `X-API-Key: YOUR_API_KEY`
   - 或者在查询参数中添加 `?api_key=YOUR_API_KEY`

2. 确保环境变量中设置了正确的 API 密钥：
   - 在 `.env` 文件中设置 `API_KEYS=your_api_key_1,your_api_key_2`
   - 确保 `API_KEY_REQUIRED=true`

3. 如果在开发环境中测试，可以临时禁用 API 认证：
   - 在 `.env` 文件中设置 `API_KEY_REQUIRED=false`

## 文件生成问题

### 问题：生成的 PDF/PNG 文件尺寸不正确

**解决方案**：

1. 检查 HTML/SVG 内容是否包含了明确的宽度和高度设置
2. 尝试使用 CSS 选择器参数来只转换特定的内容区域
3. 确保 HTML 内容中没有使用百分比单位的宽度和高度

### 问题：生成的文件中文字体显示不正确

**解决方案**：

1. 确保 HTML 内容中使用了通用字体族名称：
   ```css
   body {
     font-family: 'Noto Sans CJK SC', 'WQY Zen Hei', 'WQY Micro Hei', Arial, sans-serif;
   }
   ```

2. 确保服务器上安装了相应的字体

## 其他问题

如果您遇到其他问题，请提交 GitHub Issue 或联系我们的支持团队。 