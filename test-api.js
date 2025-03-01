import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// 获取 __dirname 等价物
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const API_URL = process.env.API_URL || 'https://htmlpdf.zeabur.app';
const OUTPUT_DIR = path.join(__dirname, 'test-output');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 测试用例
const tests = [
  {
    name: 'HTML转PDF',
    endpoint: '/api/convert',
    method: 'post',
    data: {
      content: '<html><body><h1 style="color:blue">测试HTML转PDF</h1><p>这是一个测试段落</p></body></html>',
      type: 'html',
      format: 'pdf'
    },
    outputFile: path.join(OUTPUT_DIR, 'test-html.pdf'),
    contentType: 'application/json'
  },
  {
    name: 'HTML转PNG',
    endpoint: '/api/convert',
    method: 'post',
    data: {
      content: '<html><body><h1 style="color:green">测试HTML转PNG</h1><p>这是一个测试段落</p></body></html>',
      type: 'html',
      format: 'png'
    },
    outputFile: path.join(OUTPUT_DIR, 'test-html.png'),
    contentType: 'application/json'
  },
  {
    name: 'SVG转PDF',
    endpoint: '/api/convert',
    method: 'post',
    data: {
      content: '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="80" fill="blue"/></svg>',
      type: 'svg',
      format: 'pdf'
    },
    outputFile: path.join(OUTPUT_DIR, 'test-svg.pdf'),
    contentType: 'application/json'
  },
  {
    name: 'SVG转PNG',
    endpoint: '/api/convert',
    method: 'post',
    data: {
      content: '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="80" fill="red"/></svg>',
      type: 'svg',
      format: 'png'
    },
    outputFile: path.join(OUTPUT_DIR, 'test-svg.png'),
    contentType: 'application/json'
  },
  {
    name: 'HTML带选择器转PDF',
    endpoint: '/api/convert',
    method: 'post',
    data: {
      content: `
        <html>
          <head>
            <style>
              .container { padding: 20px; }
              .header { color: purple; }
              .content { color: green; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="header">测试选择器</h1>
              <div class="content">这是要被选择的内容</div>
              <div class="footer">这是页脚</div>
            </div>
          </body>
        </html>
      `,
      type: 'html',
      format: 'pdf',
      selector: '.content'
    },
    outputFile: path.join(OUTPUT_DIR, 'test-selector.pdf'),
    contentType: 'application/json'
  }
];

// 测试文件上传
async function testFileUpload() {
  console.log(chalk.blue('\n测试文件上传...'));
  
  // 创建测试HTML文件
  const testFilePath = path.join(OUTPUT_DIR, 'upload-test.html');
  fs.writeFileSync(testFilePath, '<html><body><h1>测试文件上传</h1></body></html>');
  
  // 创建FormData
  const form = new FormData();
  form.append('file', fs.createReadStream(testFilePath));
  form.append('type', 'html');
  form.append('format', 'pdf');
  
  try {
    console.log(chalk.yellow('发送请求...'));
    const response = await axios.post(`${API_URL}/api/convert/file`, form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    const outputFile = path.join(OUTPUT_DIR, 'test-upload.pdf');
    fs.writeFileSync(outputFile, response.data);
    
    console.log(chalk.green(`✅ 文件上传测试成功，输出文件: ${outputFile}`));
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ 文件上传测试失败: ${error.message}`));
    if (error.response) {
      console.log(chalk.red(`状态码: ${error.response.status}`));
      console.log(chalk.red(`响应: ${error.response.data.toString()}`));
    }
    return false;
  }
}

// 运行测试
async function runTest(test) {
  console.log(chalk.blue(`\n测试 ${test.name}...`));
  
  try {
    console.log(chalk.yellow('发送请求...'));
    
    const config = {
      responseType: 'arraybuffer'
    };
    
    if (test.contentType) {
      config.headers = {
        'Content-Type': test.contentType
      };
    }
    
    const response = await axios({
      method: test.method,
      url: `${API_URL}${test.endpoint}`,
      data: test.data,
      ...config
    });
    
    fs.writeFileSync(test.outputFile, response.data);
    
    console.log(chalk.green(`✅ ${test.name}测试成功，输出文件: ${test.outputFile}`));
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ ${test.name}测试失败: ${error.message}`));
    if (error.response) {
      console.log(chalk.red(`状态码: ${error.response.status}`));
      console.log(chalk.red(`响应: ${error.response.data.toString()}`));
    }
    return false;
  }
}

// 测试服务器是否运行
async function testServer() {
  console.log(chalk.blue('测试API服务器是否运行...'));
  
  try {
    await axios.head(API_URL);
    console.log(chalk.green(`✅ API服务器运行正常: ${API_URL}`));
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ 无法连接到API服务器: ${API_URL}`));
    console.log(chalk.red(`错误: ${error.message}`));
    return false;
  }
}

// 主函数
async function main() {
  console.log(chalk.blue('HTML/SVG转PDF/PNG API测试脚本'));
  console.log(chalk.blue('================================'));
  
  // 测试服务器
  if (!await testServer()) {
    console.log(chalk.red('请确保API服务器正在运行，然后重试'));
    return;
  }
  
  // 运行所有测试
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const success = await runTest(test);
    if (success) passed++; else failed++;
  }
  
  // 测试文件上传
  const uploadSuccess = await testFileUpload();
  if (uploadSuccess) passed++; else failed++;
  
  // 打印结果
  console.log(chalk.blue('\n测试结果摘要'));
  console.log(chalk.blue('----------------'));
  console.log(chalk.green(`通过: ${passed}`));
  console.log(chalk.red(`失败: ${failed}`));
  console.log(chalk.blue(`总计: ${passed + failed}`));
  
  if (failed === 0) {
    console.log(chalk.green('\n✅ 所有测试通过！'));
  } else {
    console.log(chalk.red('\n❌ 部分测试失败，请检查日志'));
  }
  
  console.log(chalk.blue('\n测试输出文件保存在: ' + OUTPUT_DIR));
}

// 执行主函数
main().catch(error => {
  console.error(chalk.red('测试过程中发生错误:'), error);
}); 