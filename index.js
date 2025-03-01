import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import { createRequire } from 'module';
import dotenv from 'dotenv';

// 导入API处理函数
import { handleConvertRequest, handleFileConvertRequest } from './api/convert.js';

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

// 全局 Puppeteer 浏览器实例
let browserInstance = null;

// 初始化浏览器实例
async function initBrowser() {
  try {
    if (browserInstance) {
      await browserInstance.close();
    }
    
    console.log('Launching new browser instance...');
    
    // 尝试使用不同的浏览器启动方式
    const options = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      timeout: 60000,
      ignoreHTTPSErrors: true,
      dumpio: true // 输出浏览器进程的 stdout 和 stderr
    };
    
    // 尝试查找系统 Chrome 路径
    try {
      const { execSync } = await import('child_process');
      
      // 在 macOS 上查找 Chrome
      if (process.platform === 'darwin') {
        try {
          const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
          await fs.access(chromePath);
          console.log('Using system Chrome at:', chromePath);
          options.executablePath = chromePath;
        } catch (e) {
          console.log('System Chrome not found, using bundled browser');
        }
      }
    } catch (e) {
      console.log('Error finding Chrome path:', e.message);
    }
    
    browserInstance = await puppeteer.launch(options);
    
    // 设置浏览器关闭事件处理
    browserInstance.on('disconnected', () => {
      console.log('Browser disconnected, will create new instance on next request');
      browserInstance = null;
    });
    
    return browserInstance;
  } catch (error) {
    console.error('Failed to launch browser:', error);
    browserInstance = null;
    throw error;
  }
}

// 获取浏览器实例
async function getBrowser() {
  if (!browserInstance) {
    return initBrowser();
  }
  return browserInstance;
}

// 使用 html-pdf 库转换 HTML 到 PDF
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
  let browser = null;
  let page = null;
  
  try {
    // 尝试获取浏览器实例，如果失败则使用备用方法
    try {
      browser = await getBrowser();
    } catch (browserError) {
      console.log('Failed to get shared browser instance, trying one-time browser');
      
      // 备用方法：为此请求创建一次性浏览器实例
      const options = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      };
      
      // 尝试使用系统 Chrome
      if (process.platform === 'darwin') {
        try {
          const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
          await fs.access(chromePath);
          options.executablePath = chromePath;
        } catch (e) {
          // 忽略错误
        }
      }
      
      browser = await puppeteer.launch(options);
    }
    
    page = await browser.newPage();
    
    // 设置页面视口
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 1,
    });
    
    // 设置页面内容
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // 等待一下确保页面完全渲染
    await page.waitForTimeout(1000);
    
    // 获取选择器元素
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element with selector "${selector}" not found`);
    }
    
    // 获取元素的边界框
    const boundingBox = await element.boundingBox();
    if (!boundingBox) {
      throw new Error(`Could not get bounding box for element with selector "${selector}"`);
    }
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, 'output');
    let outputPath;
    
    if (format === 'pdf') {
      outputPath = path.join(outputDir, `output-${timestamp}.pdf`);
      await page.pdf({
        path: outputPath,
        clip: boundingBox,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });
    } else {
      outputPath = path.join(outputDir, `output-${timestamp}.png`);
      await element.screenshot({
        path: outputPath,
        omitBackground: false
      });
    }
    
    // 返回相对路径
    return outputPath.replace(__dirname, '').replace(/^\//, '');
  } catch (error) {
    console.error('Puppeteer error details:', error);
    
    // 如果 Puppeteer 失败，尝试使用 html-pdf 作为备用方案
    console.log('Trying fallback conversion with html-pdf...');
    try {
      const timestamp = Date.now();
      const outputDir = path.join(__dirname, 'output');
      const outputPath = path.join(outputDir, `output-${timestamp}.${format === 'pdf' ? 'pdf' : 'png'}`);
      
      await convertWithHtmlPdf(htmlContent, format, selector, outputPath);
      return outputPath.replace(__dirname, '').replace(/^\//, '');
    } catch (fallbackError) {
      console.error('Fallback conversion failed:', fallbackError);
      throw error; // 仍然抛出原始错误
    }
  } finally {
    if (page) {
      await page.close().catch(e => console.error('Error closing page:', e));
    }
    
    // 如果使用的是一次性浏览器实例，则关闭它
    if (browser && browser !== browserInstance) {
      await browser.close().catch(e => console.error('Error closing one-time browser:', e));
    }
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
  let browser = null;
  let page = null;
  
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
    
    // 尝试获取浏览器实例
    try {
      browser = await getBrowser();
    } catch (browserError) {
      console.log('Failed to get shared browser instance, trying one-time browser');
      
      // 备用方法：为此请求创建一次性浏览器实例
      const options = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      };
      
      // 尝试使用系统 Chrome
      if (process.platform === 'darwin') {
        try {
          const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
          await fs.access(chromePath);
          options.executablePath = chromePath;
        } catch (e) {
          // 忽略错误
        }
      }
      
      browser = await puppeteer.launch(options);
    }
    
    page = await browser.newPage();
    
    // 设置页面视口
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2, // 使用更高的缩放比例以获得更清晰的图像
    });
    
    // 设置页面内容
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // 等待一下确保页面完全渲染
    await page.waitForTimeout(1000);
    
    // 获取SVG元素
    const svgElement = await page.$('svg');
    if (!svgElement) {
      throw new Error('SVG element not found in the rendered page');
    }
    
    // 获取SVG的边界框
    const boundingBox = await svgElement.boundingBox();
    if (!boundingBox) {
      throw new Error('Could not get bounding box for SVG element');
    }
    
    // 生成输出文件名
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, 'output');
    let outputPath;
    
    if (format === 'pdf') {
      outputPath = path.join(outputDir, `svg-${timestamp}.pdf`);
      await page.pdf({
        path: outputPath,
        clip: boundingBox,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });
    } else {
      outputPath = path.join(outputDir, `svg-${timestamp}.png`);
      await svgElement.screenshot({
        path: outputPath,
        omitBackground: true // 使背景透明
      });
    }
    
    // 返回相对路径
    return outputPath.replace(__dirname, '').replace(/^\//, '');
  } catch (error) {
    console.error('SVG conversion error details:', error);
    throw error;
  } finally {
    if (page) {
      await page.close().catch(e => console.error('Error closing page:', e));
    }
    
    // 如果使用的是一次性浏览器实例，则关闭它
    if (browser && browser !== browserInstance) {
      await browser.close().catch(e => console.error('Error closing one-time browser:', e));
    }
  }
}

// 添加API路由 - 内容转换
app.post('/api/convert', express.json({ limit: '10mb' }), handleConvertRequest);

// 添加API路由 - 文件上传转换
app.post('/api/convert/file', upload.single('file'), handleFileConvertRequest);

// 启动服务器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 