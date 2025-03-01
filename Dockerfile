FROM node:18-slim

# 安装Puppeteer和PhantomJS所需的依赖
RUN apt-get update \
    && apt-get install -y wget gnupg bzip2 libfontconfig1 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制所有文件
COPY . .

# 创建必要的目录
RUN mkdir -p output uploads .well-known

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV API_KEY_REQUIRED=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "index.js"] 