import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { createRequire } from 'module';
import dotenv from 'dotenv';

// 导入API处理函数
import { handleConvertRequest, handleFileConvertRequest, handleConvertRequestWithUrl, handleFileConvertRequestWithUrl } from './api/convert.js';

// 导入鉴权中间件
import { globalRateLimit, protectApi, ipWhitelist } from './middleware/auth.js';

// 加载环境变量
dotenv.config();

// 使用 createRequire 来导入 CommonJS 模块
const require = createRequire(import.meta.url);
const htmlPdf = require('html-pdf');

// 设置__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 设置环境变量
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();
const port = process.env.PORT || 3000;

// 设置视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 设置静态文件夹
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/output', express.static(path.join(__dirname, 'output')));

// 创建必要的文件夹
const createFolders = async () => {
  try {
    await fs.mkdir(path.join(__dirname, 'uploads'), { recursive: true });
    await fs.mkdir(path.join(__dirname, 'output'), { recursive: true });
    await fs.mkdir(path.join(__dirname, '.well-known'), { recursive: true });
  } catch (err) {
    console.error('Error creating folders:', err);
  }
};
createFolders();

// 设置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// 使用 html-pdf 库转换 HTML 到 PDF/PNG
function convertWithHtmlPdf(htmlContent, format, selector, outputPath) {
  return new Promise((resolve, reject) => {
    const options = {
      format: 'A4',
      border: '0',
      type: format === 'pdf' ? 'pdf' : 'png',
      renderDelay: 1000,
      quality: '100'
    };
    
    // 如果指定了选择器，我们需要修改 HTML 来只包含该选择器的内容
    if (selector && selector !== 'body') {
      // 这是一个简单的方法，可能不适用于所有情况
      const tempHtml = `
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
      htmlContent = tempHtml;
    }
    
    htmlPdf.create(htmlContent, options).toFile(outputPath, (err, res) => {
      if (err) {
        console.error('html-pdf error:', err);
        reject(err);
      } else {
        resolve(outputPath);
      }
    });
  });
}

// HTML转换函数
async function convertHtml(htmlContent, format, selector) {
  try {
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, 'output');
    const outputPath = path.join(outputDir, `output-${timestamp}.${format === 'pdf' ? 'pdf' : 'png'}`);
    
    await convertWithHtmlPdf(htmlContent, format, selector, outputPath);
    return outputPath.replace(__dirname, '').replace(/^\//, '');
  } catch (error) {
    console.error('HTML conversion error:', error);
    throw error;
  }
}

// 路由
app.get('/', (req, res) => {
  res.render('index');
});

// SVG转换页面路由
app.get('/svg', (req, res) => {
  res.render('svg');
});

// 添加测试路由
app.get('/test', async (req, res) => {
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
    
    const outputPath = await convertHtml(simpleHtml, 'png', 'body');
    res.json({ success: true, message: 'Test successful', filePath: outputPath });
  } catch (error) {
    console.error('Test conversion failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 处理HTML文本输入
app.post('/convert-html', express.text({ limit: '10mb' }), async (req, res) => {
  try {
    const htmlContent = req.body;
    const format = req.query.format || 'pdf';
    const selector = req.query.selector || 'body';
    
    if (!htmlContent || htmlContent.trim() === '') {
      return res.status(400).json({ success: false, error: 'HTML content is required' });
    }
    
    console.log(`Converting HTML to ${format} with selector: ${selector}`);
    const outputPath = await convertHtml(htmlContent, format, selector);
    res.json({ success: true, filePath: outputPath });
  } catch (error) {
    console.error('Error converting HTML:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 处理HTML文件上传
app.post('/convert-file', upload.single('htmlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const format = req.body.format || 'pdf';
    const selector = req.body.selector || 'body';
    
    const htmlContent = await fs.readFile(req.file.path, 'utf8');
    const outputPath = await convertHtml(htmlContent, format, selector);
    
    res.json({ success: true, filePath: outputPath });
  } catch (error) {
    console.error('Error converting file:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 处理SVG文本输入
app.post('/convert-svg', express.text({ limit: '10mb' }), async (req, res) => {
  try {
    const svgContent = req.body;
    const format = req.query.format || 'png';
    
    if (!svgContent || svgContent.trim() === '') {
      return res.status(400).json({ success: false, error: 'SVG content is required' });
    }
    
    console.log(`Converting SVG to ${format}`);
    const outputPath = await convertSvg(svgContent, format);
    res.json({ success: true, filePath: outputPath });
  } catch (error) {
    console.error('Error converting SVG:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 处理SVG文件上传
app.post('/convert-svg-file', upload.single('svgFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const format = req.body.format || 'png';
    
    const svgContent = await fs.readFile(req.file.path, 'utf8');
    const outputPath = await convertSvg(svgContent, format);
    
    res.json({ success: true, filePath: outputPath });
  } catch (error) {
    console.error('Error converting SVG file:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// SVG转换函数
async function convertSvg(svgContent, format) {
  try {
    // 确保SVG内容有正确的XML声明和SVG命名空间
    if (!svgContent.includes('<svg')) {
      throw new Error('Invalid SVG content');
    }
    
    // 如果SVG没有宽度和高度，添加默认值
    if (!svgContent.includes('width=') && !svgContent.includes('height=')) {
      svgContent = svgContent.replace('<svg', '<svg width="800" height="600"');
    }
    
    // 将SVG嵌入到HTML中
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background: transparent;
          }
          svg {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
      </html>
    `;
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, 'output');
    const outputPath = path.join(outputDir, `svg-${timestamp}.${format === 'pdf' ? 'pdf' : 'png'}`);
    
    await convertWithHtmlPdf(htmlContent, format, 'body', outputPath);
    
    // 返回相对路径
    return outputPath.replace(__dirname, '').replace(/^\//, '');
  } catch (error) {
    console.error('SVG conversion error details:', error);
    throw error;
  }
}

// 添加API路由 - 内容转换（添加保护）
app.post('/api/convert', express.json({ limit: '10mb' }), protectApi, handleConvertRequest);

// 添加API路由 - 文件上传转换（添加保护）
app.post('/api/convert/file', protectApi, upload.single('file'), handleFileConvertRequest);

// 添加API路由 - 内容转换（返回URL）（添加保护）
app.post('/api/convert/url', express.json({ limit: '10mb' }), protectApi, handleConvertRequestWithUrl);

// 添加API路由 - 文件上传转换（返回URL）（添加保护）
app.post('/api/convert/file/url', protectApi, upload.single('file'), handleFileConvertRequestWithUrl);

// 添加OpenAPI规范文件路由
app.get('/openapi.yaml', async (req, res) => {
  try {
    const openapiContent = await fs.readFile(path.join(__dirname, 'openapi.yaml'), 'utf8');
    res.setHeader('Content-Type', 'text/yaml');
    res.send(openapiContent);
  } catch (error) {
    console.error('Error serving OpenAPI spec:', error);
    res.status(500).send('Error serving OpenAPI specification');
  }
});

// 添加ChatGPT Plugin Manifest路由
app.get('/.well-known/ai-plugin.json', async (req, res) => {
  try {
    const pluginContent = await fs.readFile(path.join(__dirname, 'ai-plugin.json'), 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(pluginContent);
  } catch (error) {
    console.error('Error serving Plugin Manifest:', error);
    res.status(500).send('Error serving Plugin Manifest');
  }
});

// 添加CORS支持
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 添加全局速率限制
app.use(globalRateLimit);

// 可选：添加IP白名单保护（默认不启用）
if (process.env.IP_WHITELIST_REQUIRED === 'true') {
  app.use(ipWhitelist);
}

// 启动服务器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 