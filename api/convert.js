import fs from 'fs';
import path from 'path';
import pkg from 'uuid';
const { v4: uuidv4 } = pkg;
import dotenv from 'dotenv';
import { createRequire } from 'module';

// 使用 createRequire 来导入 CommonJS 模块
const require = createRequire(import.meta.url);
const htmlPdf = require('html-pdf');

// 加载环境变量
dotenv.config();

// 获取输出目录配置
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'output';

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 使用html-pdf库转换HTML/SVG
 * @param {string} content - HTML或SVG内容
 * @param {string} type - 内容类型 (html 或 svg)
 * @param {string} format - 输出格式 (pdf 或 png)
 * @param {string} selector - CSS选择器
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<string>} 输出文件路径
 */
async function convertContent(content, type, format, selector, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`使用html-pdf转换${type}到${format}` + (selector ? ` 使用选择器: ${selector}` : ''));
    
    // 如果是SVG，将其嵌入到HTML中
    let htmlContent = content;
    if (type === 'svg') {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>SVG Preview</title>
          <style>
            body { margin: 0; padding: 0; }
            svg { display: block; width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `;
    }
    
    // 如果指定了选择器，我们需要修改HTML来只包含该选择器的内容
    if (type === 'html' && selector && selector !== 'body') {
      // 这是一个简单的方法，可能不适用于所有情况
      // 在实际应用中，您可能需要使用DOM解析器来提取选择器内容
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { margin: 0; padding: 0; }
            .selected-content { width: 100%; }
          </style>
        </head>
        <body>
          <div class="selected-content">${htmlContent}</div>
        </body>
        </html>
      `;
    }
    
    const options = {
      format: 'A4',
      border: '0',
      type: format === 'pdf' ? 'pdf' : 'png',
      renderDelay: 1000,
      quality: '100'
    };
    
    htmlPdf.create(htmlContent, options).toFile(outputPath, (err, res) => {
      if (err) {
        console.error('html-pdf转换错误:', err);
        reject(err);
      } else {
        console.log('html-pdf转换成功:', res);
        resolve(outputPath);
      }
    });
  });
}

/**
 * 处理HTML/SVG转换为PDF/PNG的API请求
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export async function handleConvertRequest(req, res) {
  let outputPath = null;
  
  try {
    const { content, type, format, selector } = req.body;
    
    // 验证必要参数
    if (!content) {
      return res.status(400).json({ error: '内容不能为空' });
    }
    
    if (!['html', 'svg'].includes(type)) {
      return res.status(400).json({ error: '类型必须是html或svg' });
    }
    
    if (!['pdf', 'png'].includes(format)) {
      return res.status(400).json({ error: '输出格式必须是pdf或png' });
    }
    
    // 生成唯一文件名
    const fileId = uuidv4();
    outputPath = path.join(OUTPUT_DIR, `${fileId}.${format}`);
    
    // 使用html-pdf库转换
    await convertContent(content, type, format, selector, outputPath);
    
    // 检查输出文件是否存在
    if (!fs.existsSync(outputPath)) {
      throw new Error('生成的文件不存在');
    }
    
    // 读取生成的文件
    const fileBuffer = fs.readFileSync(outputPath);
    
    // 设置响应头
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="output.${format}"`);
    
    // 发送文件
    res.send(fileBuffer);
    
    // 删除生成的文件（可选，取决于您是否想保留这些文件）
    fs.unlinkSync(outputPath);
    
  } catch (error) {
    console.error('转换错误:', error);
    res.status(500).json({ error: '处理转换请求时出错: ' + error.message });
  }
}

/**
 * 处理文件上传转换请求
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export async function handleFileConvertRequest(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }
    
    const { type, format, selector } = req.body;
    
    // 验证必要参数
    if (!['html', 'svg'].includes(type)) {
      return res.status(400).json({ error: '类型必须是html或svg' });
    }
    
    if (!['pdf', 'png'].includes(format)) {
      return res.status(400).json({ error: '输出格式必须是pdf或png' });
    }
    
    // 读取上传的文件内容
    const filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 创建一个新的请求对象，包含文件内容
    const newReq = {
      body: {
        content,
        type,
        format,
        selector
      }
    };
    
    // 调用处理函数
    await handleConvertRequest(newReq, res);
    
    // 删除上传的文件
    fs.unlinkSync(filePath);
    
  } catch (error) {
    console.error('文件转换错误:', error);
    res.status(500).json({ error: '处理文件转换请求时出错: ' + error.message });
  }
}

/**
 * 处理转换请求并返回文件URL而非文件内容
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export async function handleConvertRequestWithUrl(req, res) {
  try {
    // 验证请求参数
    const { content, type, format, selector } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, error: '内容不能为空' });
    }
    
    if (!type || !['html', 'svg'].includes(type)) {
      return res.status(400).json({ success: false, error: '类型必须是 html 或 svg' });
    }
    
    if (!format || !['pdf', 'png'].includes(format)) {
      return res.status(400).json({ success: false, error: '格式必须是 pdf 或 png' });
    }
    
    // 生成唯一的输出文件名
    const outputFileName = `${uuidv4()}.${format}`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    
    // 转换内容
    await convertContent(content, type, format, selector, outputPath);
    
    // 构建文件URL
    const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
    const fileUrl = `${baseUrl}/output/${outputFileName}`;
    
    // 返回成功响应和文件URL
    res.json({
      success: true,
      fileUrl: fileUrl,
      fileName: outputFileName,
      fileType: format === 'pdf' ? 'application/pdf' : 'image/png'
    });
  } catch (error) {
    console.error('转换错误:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * 处理文件转换请求并返回文件URL而非文件内容
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
export async function handleFileConvertRequestWithUrl(req, res) {
  try {
    // 验证请求参数
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未上传文件' });
    }
    
    const { type, format, selector } = req.body;
    
    if (!type || !['html', 'svg'].includes(type)) {
      return res.status(400).json({ success: false, error: '类型必须是 html 或 svg' });
    }
    
    if (!format || !['pdf', 'png'].includes(format)) {
      return res.status(400).json({ success: false, error: '格式必须是 pdf 或 png' });
    }
    
    // 读取上传的文件内容
    const content = await fs.promises.readFile(req.file.path, 'utf8');
    
    // 使用handleConvertRequestWithUrl处理转换
    req.body.content = content;
    return handleConvertRequestWithUrl(req, res);
  } catch (error) {
    console.error('文件转换错误:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 