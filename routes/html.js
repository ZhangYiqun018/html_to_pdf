import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { convertHtml } from '../utils/converter.js';

// 设置__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * 处理HTML文本输入
 */
router.post('/convert-html', express.text({ limit: '10mb' }), async (req, res) => {
  try {
    const htmlContent = req.body;
    const format = req.query.format || 'pdf';
    const selector = req.query.selector || 'body';
    
    if (!htmlContent || htmlContent.trim() === '') {
      return res.status(400).json({ success: false, error: 'HTML content is required' });
    }
    
    console.log(`Converting HTML to ${format} with selector: ${selector}`);
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, '..', 'output');
    const outputPath = path.join(outputDir, `output-${timestamp}.${format === 'pdf' ? 'pdf' : 'png'}`);
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });
    
    // 转换HTML
    await convertHtml(htmlContent, format, selector, outputPath);
    
    // 返回相对路径
    const relativePath = outputPath.replace(path.join(__dirname, '..'), '').replace(/^\//, '');
    res.json({ success: true, filePath: relativePath });
  } catch (error) {
    console.error('Error converting HTML:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 测试路由
 */
router.get('/test', async (req, res) => {
  try {
    const simpleHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Page</title>
      </head>
      <body>
        <div id="test">This is a test</div>
      </body>
      </html>
    `;
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, '..', 'output');
    const outputPath = path.join(outputDir, `test-${timestamp}.png`);
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });
    
    // 转换HTML
    await convertHtml(simpleHtml, 'png', 'body', outputPath);
    
    // 返回相对路径
    const relativePath = outputPath.replace(path.join(__dirname, '..'), '').replace(/^\//, '');
    res.json({ success: true, message: 'Test successful', filePath: relativePath });
  } catch (error) {
    console.error('Test conversion failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 中文渲染测试路由
 */
router.get('/test-chinese', async (req, res) => {
  try {
    const format = req.query.format || 'pdf';
    
    // 读取测试文件
    const htmlContent = await fs.readFile(path.join(__dirname, '..', 'public', 'chinese-test.html'), 'utf8');
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, '..', 'output');
    const outputPath = path.join(outputDir, `chinese-test-${timestamp}.${format}`);
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });
    
    // 转换HTML
    await convertHtml(htmlContent, format, null, outputPath);
    
    // 返回文件URL
    const fileUrl = `${req.protocol}://${req.get('host')}/output/chinese-test-${timestamp}.${format}`;
    
    res.json({
      success: true,
      message: '中文渲染测试文件已生成',
      fileUrl: fileUrl,
      fileName: `chinese-test-${timestamp}.${format}`,
      fileType: format === 'pdf' ? 'application/pdf' : 'image/png'
    });
  } catch (error) {
    console.error('中文渲染测试错误:', error);
    res.status(500).json({
      success: false,
      error: '生成测试文件时出错',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

export default router; 