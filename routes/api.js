import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import multer from 'multer';
import { convertHtml, convertSvg, preprocessContent } from '../utils/converter.js';
import { protectApi } from '../middleware/auth.js';

// 设置__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 设置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

/**
 * 处理HTML/SVG转换为PDF/PNG的API请求
 */
router.post('/convert', express.json({ limit: '10mb' }), protectApi, async (req, res) => {
  let outputPath = null;
  
  try {
    const { content, type, format, selector } = req.body;
    
    // 预处理内容
    const processedContent = preprocessContent(content, type);
    
    // 验证必要参数
    if (!processedContent) {
      return res.status(400).json({ error: '内容不能为空' });
    }
    
    if (!['html', 'svg'].includes(type)) {
      return res.status(400).json({ error: '类型必须是html或svg' });
    }
    
    if (!['pdf', 'png'].includes(format)) {
      return res.status(400).json({ error: '输出格式必须是pdf或png' });
    }
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, '..', 'output');
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });
    
    // 根据类型选择转换方法
    if (type === 'html') {
      outputPath = path.join(outputDir, `output-${timestamp}.${format}`);
      await convertHtml(processedContent, format, selector, outputPath);
    } else {
      outputPath = path.join(outputDir, `svg-${timestamp}.${format}`);
      await convertSvg(processedContent, format, outputPath);
    }
    
    // 检查输出文件是否存在
    if (!await fileExists(outputPath)) {
      throw new Error('生成的文件不存在');
    }
    
    // 读取生成的文件
    const fileBuffer = await fs.readFile(outputPath);
    
    // 设置响应头
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="output.${format}"`);
    
    // 发送文件
    res.send(fileBuffer);
    
    // 删除生成的文件（可选，取决于您是否想保留这些文件）
    await fs.unlink(outputPath);
    
  } catch (error) {
    console.error('转换错误:', error);
    res.status(500).json({ error: '处理转换请求时出错: ' + error.message });
  }
});

/**
 * 处理文件上传转换请求
 */
router.post('/convert/file', protectApi, upload.single('file'), async (req, res) => {
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
    const content = await fs.readFile(filePath, 'utf8');
    
    // 预处理内容
    const processedContent = preprocessContent(content, type);
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, '..', 'output');
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });
    
    let outputPath;
    
    // 根据类型选择转换方法
    if (type === 'html') {
      outputPath = path.join(outputDir, `output-${timestamp}.${format}`);
      await convertHtml(processedContent, format, selector, outputPath);
    } else {
      outputPath = path.join(outputDir, `svg-${timestamp}.${format}`);
      await convertSvg(processedContent, format, outputPath);
    }
    
    // 检查输出文件是否存在
    if (!await fileExists(outputPath)) {
      throw new Error('生成的文件不存在');
    }
    
    // 读取生成的文件
    const fileBuffer = await fs.readFile(outputPath);
    
    // 设置响应头
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="output.${format}"`);
    
    // 发送文件
    res.send(fileBuffer);
    
    // 删除上传的文件和生成的文件
    await fs.unlink(filePath);
    await fs.unlink(outputPath);
    
  } catch (error) {
    console.error('文件转换错误:', error);
    res.status(500).json({ error: '处理文件转换请求时出错: ' + error.message });
  }
});

/**
 * 处理转换请求并返回文件URL而非文件内容
 */
router.post('/convert/url', express.json({ limit: '10mb' }), protectApi, async (req, res) => {
  try {
    // 验证请求参数
    const { content, type, format, selector } = req.body;
    
    // 预处理内容
    const processedContent = preprocessContent(content, type);
    
    if (!processedContent) {
      return res.status(400).json({ success: false, error: '内容不能为空' });
    }
    
    if (!type || !['html', 'svg'].includes(type)) {
      return res.status(400).json({ success: false, error: '类型必须是 html 或 svg' });
    }
    
    if (!format || !['pdf', 'png'].includes(format)) {
      return res.status(400).json({ success: false, error: '格式必须是 pdf 或 png' });
    }
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, '..', 'output');
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });
    
    let outputPath, outputFileName;
    
    // 根据类型选择转换方法
    if (type === 'html') {
      outputFileName = `output-${timestamp}.${format}`;
      outputPath = path.join(outputDir, outputFileName);
      await convertHtml(processedContent, format, selector, outputPath);
    } else {
      outputFileName = `svg-${timestamp}.${format}`;
      outputPath = path.join(outputDir, outputFileName);
      await convertSvg(processedContent, format, outputPath);
    }
    
    // 构建文件URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
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
});

/**
 * 处理文件上传转换请求并返回URL
 */
router.post('/convert/file/url', protectApi, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未上传文件' });
    }
    
    const { type, format, selector } = req.body;
    
    // 验证必要参数
    if (!['html', 'svg'].includes(type)) {
      return res.status(400).json({ success: false, error: '类型必须是html或svg' });
    }
    
    if (!['pdf', 'png'].includes(format)) {
      return res.status(400).json({ success: false, error: '格式必须是pdf或png' });
    }
    
    // 读取上传的文件内容
    const filePath = req.file.path;
    const content = await fs.readFile(filePath, 'utf8');
    
    // 预处理内容
    const processedContent = preprocessContent(content, type);
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, '..', 'output');
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });
    
    let outputPath, outputFileName;
    
    // 根据类型选择转换方法
    if (type === 'html') {
      outputFileName = `output-${timestamp}.${format}`;
      outputPath = path.join(outputDir, outputFileName);
      await convertHtml(processedContent, format, selector, outputPath);
    } else {
      outputFileName = `svg-${timestamp}.${format}`;
      outputPath = path.join(outputDir, outputFileName);
      await convertSvg(processedContent, format, outputPath);
    }
    
    // 构建文件URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/output/${outputFileName}`;
    
    // 删除上传的文件
    await fs.unlink(filePath);
    
    // 返回成功响应和文件URL
    res.json({
      success: true,
      fileUrl: fileUrl,
      fileName: outputFileName,
      fileType: format === 'pdf' ? 'application/pdf' : 'image/png'
    });
  } catch (error) {
    console.error('文件转换错误:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 检查文件是否存在
 * @param {string} filePath - 文件路径
 * @returns {Promise<boolean>} 文件是否存在
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

export default router; 