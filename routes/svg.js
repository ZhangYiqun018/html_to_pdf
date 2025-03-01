import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { convertSvg } from '../utils/converter.js';

// 设置__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * 处理SVG文本输入
 */
router.post('/convert-svg', express.text({ limit: '10mb' }), async (req, res) => {
  try {
    const svgContent = req.body;
    const format = req.query.format || 'png';
    
    if (!svgContent || svgContent.trim() === '') {
      return res.status(400).json({ success: false, error: 'SVG content is required' });
    }
    
    console.log(`Converting SVG to ${format}`);
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, '..', 'output');
    const outputPath = path.join(outputDir, `svg-${timestamp}.${format === 'pdf' ? 'pdf' : 'png'}`);
    
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });
    
    // 转换SVG
    await convertSvg(svgContent, format, outputPath);
    
    // 返回相对路径
    const relativePath = outputPath.replace(path.join(__dirname, '..'), '').replace(/^\//, '');
    res.json({ success: true, filePath: relativePath });
  } catch (error) {
    console.error('Error converting SVG:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router; 