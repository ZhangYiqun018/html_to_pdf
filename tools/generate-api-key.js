import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 设置__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 生成随机API密钥
function generateApiKey() {
  return crypto.randomBytes(24).toString('hex');
}

// 主函数
async function main() {
  try {
    // 生成API密钥
    const apiKey = generateApiKey();
    console.log('生成的API密钥:', apiKey);
    
    // 检查.env文件是否存在
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch (error) {
      // 如果文件不存在，创建一个空的.env文件
      envContent = '';
    }
    
    // 检查是否已经有API_KEYS配置
    if (envContent.includes('API_KEYS=')) {
      // 更新现有的API_KEYS配置
      const regex = /API_KEYS=(.*)/;
      const match = envContent.match(regex);
      
      if (match && match[1]) {
        const existingKeys = match[1].split(',').map(key => key.trim());
        
        // 添加新的API密钥
        existingKeys.push(apiKey);
        
        // 更新.env文件
        envContent = envContent.replace(regex, `API_KEYS=${existingKeys.join(',')}`);
      } else {
        // 如果格式不正确，直接替换
        envContent = envContent.replace(regex, `API_KEYS=${apiKey}`);
      }
    } else {
      // 添加API_KEYS配置
      envContent += `\n# API密钥配置\nAPI_KEYS=${apiKey}\n`;
      
      // 如果没有API_KEY_REQUIRED配置，添加它
      if (!envContent.includes('API_KEY_REQUIRED=')) {
        envContent += `API_KEY_REQUIRED=true\n`;
      }
    }
    
    // 写入.env文件
    await fs.writeFile(envPath, envContent);
    
    console.log('API密钥已添加到.env文件');
    console.log('请确保在生产环境中启用API_KEY_REQUIRED=true');
    
  } catch (error) {
    console.error('生成API密钥时出错:', error);
    process.exit(1);
  }
}

// 执行主函数
main(); 