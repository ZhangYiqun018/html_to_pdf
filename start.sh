#!/bin/bash

# HTML/SVG转PDF/PNG应用程序启动脚本
# 作者: AI助手
# 版本: 1.0

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 打印带颜色的消息
print_message() {
  echo -e "${2}${1}${NC}"
}

# 打印标题
print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# 检查命令是否存在
check_command() {
  if ! command -v $1 &> /dev/null; then
    print_message "❌ $1 未安装，请先安装它" "$RED"
    return 1
  else
    print_message "✅ $1 已安装" "$GREEN"
    return 0
  fi
}

# 检查文件是否存在
check_file() {
  if [ ! -f "$1" ]; then
    print_message "❌ $1 文件不存在" "$RED"
    return 1
  else
    print_message "✅ $1 文件存在" "$GREEN"
    return 0
  fi
}

# 检查目录是否存在，如果不存在则创建
check_directory() {
  if [ ! -d "$1" ]; then
    print_message "📁 创建目录: $1" "$YELLOW"
    mkdir -p "$1"
  else
    print_message "✅ 目录已存在: $1" "$GREEN"
  fi
}

# 显示欢迎信息
show_welcome() {
  clear
  echo -e "${BLUE}"
  echo "  _   _ _____ __  __ _     _____ ___    ____  ____  _____   "
  echo " | | | |_   _|  \/  | |   |_   _/ _ \  |  _ \|  _ \|  ___|  "
  echo " | |_| | | | | |\/| | |     | || | | | | |_) | | | | |_     "
  echo " |  _  | | | | |  | | |___  | || |_| | |  __/| |_| |  _|    "
  echo " |_| |_| |_| |_|  |_|_____| |_| \___/  |_|   |____/|_|      "
  echo -e "${NC}"
  echo -e "${GREEN}HTML/SVG 转 PDF/PNG 应用程序启动脚本${NC}"
  echo -e "${YELLOW}版本: 1.0${NC}"
  echo -e "${YELLOW}------------------------------------------------${NC}"
}

# 检查环境
check_environment() {
  print_header "检查环境"
  
  # 检查必要的命令
  check_command "node" || exit 1
  check_command "npm" || exit 1
  
  # 检查Node.js版本
  NODE_VERSION=$(node -v)
  print_message "Node.js 版本: $NODE_VERSION" "$BLUE"
  
  # 检查必要的文件
  check_file "package.json" || exit 1
  check_file "index.js" || exit 1
  
  # 检查.env文件
  if ! check_file ".env"; then
    print_message "⚠️ .env 文件不存在，将从.env.example创建" "$YELLOW"
    if check_file ".env.example"; then
      cp .env.example .env
      print_message "✅ 已从.env.example创建.env文件，请编辑它设置您的API密钥" "$GREEN"
    else
      print_message "❌ .env.example 文件也不存在，请手动创建.env文件" "$RED"
      touch .env
    fi
  fi
  
  # 检查必要的目录
  check_directory "uploads"
  check_directory "output"
  check_directory "api"
}

# 安装依赖
install_dependencies() {
  print_header "检查依赖"
  
  if [ ! -d "node_modules" ]; then
    print_message "📦 安装依赖..." "$YELLOW"
    npm install
    if [ $? -ne 0 ]; then
      print_message "❌ 依赖安装失败" "$RED"
      exit 1
    else
      print_message "✅ 依赖安装成功" "$GREEN"
    fi
  else
    print_message "✅ 依赖已安装" "$GREEN"
  fi
}

# 启动应用
start_application() {
  print_header "启动应用"
  
  # 检查端口是否被占用
  PORT=${PORT:-3000}
  if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    print_message "⚠️ 端口 $PORT 已被占用，请关闭占用该端口的程序或使用其他端口" "$YELLOW"
    read -p "是否尝试使用其他端口? (y/n): " change_port
    if [[ $change_port == "y" || $change_port == "Y" ]]; then
      read -p "请输入新端口号: " PORT
      export PORT=$PORT
    else
      print_message "❌ 无法启动应用，端口 $PORT 被占用" "$RED"
      exit 1
    fi
  fi
  
  print_message "🚀 正在启动应用，端口: $PORT" "$GREEN"
  print_message "📝 访问地址: http://localhost:$PORT" "$BLUE"
  print_message "🔍 按 Ctrl+C 停止应用" "$YELLOW"
  
  # 启动应用
  if [ -f "package.json" ] && grep -q "\"start\":" "package.json"; then
    npm start
  else
    node index.js
  fi
}

# 主函数
main() {
  show_welcome
  check_environment
  install_dependencies
  start_application
}

# 执行主函数
main 