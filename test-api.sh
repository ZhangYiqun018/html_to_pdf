#!/bin/bash

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

# 测试API服务器是否运行
test_server() {
  print_message "测试API服务器是否运行..." "$BLUE"
  
  # 默认API地址
  API_URL=${1:-"http://localhost:3000"}
  
  # 测试服务器连接
  if curl -s --head "$API_URL" > /dev/null; then
    print_message "✅ API服务器运行正常: $API_URL" "$GREEN"
    return 0
  else
    print_message "❌ 无法连接到API服务器: $API_URL" "$RED"
    return 1
  fi
}

# 测试HTML转PDF
test_html_to_pdf() {
  print_message "\n测试HTML转PDF..." "$BLUE"
  
  # 创建测试HTML内容
  HTML_CONTENT="<html><body><h1 style='color:blue'>测试HTML转PDF</h1><p>这是一个测试段落</p></body></html>"
  
  # 发送请求
  print_message "发送请求..." "$YELLOW"
  curl -X POST \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"$HTML_CONTENT\", \"type\": \"html\", \"format\": \"pdf\"}" \
    --output test-html.pdf \
    http://localhost:3000/api/convert
  
  # 检查结果
  if [ -f "test-html.pdf" ] && [ -s "test-html.pdf" ]; then
    print_message "✅ HTML转PDF测试成功，输出文件: test-html.pdf" "$GREEN"
  else
    print_message "❌ HTML转PDF测试失败" "$RED"
  fi
}

# 测试SVG转PNG
test_svg_to_png() {
  print_message "\n测试SVG转PNG..." "$BLUE"
  
  # 创建测试SVG内容
  SVG_CONTENT="<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'><circle cx='100' cy='100' r='80' fill='red'/></svg>"
  
  # 发送请求
  print_message "发送请求..." "$YELLOW"
  curl -X POST \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"$SVG_CONTENT\", \"type\": \"svg\", \"format\": \"png\"}" \
    --output test-svg.png \
    http://localhost:3000/api/convert
  
  # 检查结果
  if [ -f "test-svg.png" ] && [ -s "test-svg.png" ]; then
    print_message "✅ SVG转PNG测试成功，输出文件: test-svg.png" "$GREEN"
  else
    print_message "❌ SVG转PNG测试失败" "$RED"
  fi
}

# 测试文件上传
test_file_upload() {
  print_message "\n测试文件上传..." "$BLUE"
  
  # 创建测试HTML文件
  echo "<html><body><h1>测试文件上传</h1></body></html>" > test-upload.html
  
  # 发送请求
  print_message "发送请求..." "$YELLOW"
  curl -X POST \
    -F "file=@test-upload.html" \
    -F "type=html" \
    -F "format=pdf" \
    --output test-upload.pdf \
    http://localhost:3000/api/convert/file
  
  # 检查结果
  if [ -f "test-upload.pdf" ] && [ -s "test-upload.pdf" ]; then
    print_message "✅ 文件上传测试成功，输出文件: test-upload.pdf" "$GREEN"
  else
    print_message "❌ 文件上传测试失败" "$RED"
  fi
  
  # 清理测试文件
  rm -f test-upload.html
}

# 主函数
main() {
  print_message "HTML/SVG转PDF/PNG API测试脚本" "$BLUE"
  print_message "================================" "$BLUE"
  
  # 测试服务器
  if ! test_server "$1"; then
    print_message "请确保API服务器正在运行，然后重试" "$RED"
    exit 1
  fi
  
  # 运行测试
  test_html_to_pdf
  test_svg_to_png
  test_file_upload
  
  print_message "\n测试完成！" "$BLUE"
}

# 执行主函数，传入可选的API URL
main "$1" 