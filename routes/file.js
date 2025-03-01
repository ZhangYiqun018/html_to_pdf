import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import multer from 'multer';
import { convertHtml, convertSvg } from '../utils/converter.js';

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
 * 处理HTML文件上传
 */
router.post('/convert-file', upload.single('htmlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const format = req.body.format || 'pdf';
    const selector = req.body.selector || 'body';
    
    // 读取上传的文件内容
    const filePath = req.file.path;
    const htmlContent = await fs.readFile(filePath, 'utf8');
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, '..', 'output');
    const outputPath = path.join(outputDir, `output-${timestamp}.${format === 'pdf' ? 'pdf' : 'png'}`);
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });
    
    // 转换HTML
    await convertHtml(htmlContent, format, selector, outputPath);
    
    // 删除上传的文件
    await fs.unlink(filePath);
    
    // 返回相对路径
    const relativePath = outputPath.replace(path.join(__dirname, '..'), '').replace(/^\//, '');
    res.json({ success: true, filePath: relativePath });
  } catch (error) {
    console.error('Error converting file:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 处理SVG文件上传
 */
router.post('/convert-svg-file', upload.single('svgFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const format = req.body.format || 'png';
    
    // 读取上传的文件内容
    const filePath = req.file.path;
    const svgContent = await fs.readFile(filePath, 'utf8');
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, '..', 'output');
    const outputPath = path.join(outputDir, `svg-${timestamp}.${format === 'pdf' ? 'pdf' : 'png'}`);
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });
    
    // 转换SVG
    await convertSvg(svgContent, format, outputPath);
    
    // 删除上传的文件
    await fs.unlink(filePath);
    
    // 返回相对路径
    const relativePath = outputPath.replace(path.join(__dirname, '..'), '').replace(/^\//, '');
    res.json({ success: true, filePath: relativePath });
  } catch (error) {
    console.error('Error converting SVG file:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router; 