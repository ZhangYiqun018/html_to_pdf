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