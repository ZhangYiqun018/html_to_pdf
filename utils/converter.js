import puppeteer from 'puppeteer';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// 设置__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 预处理HTML/SVG内容，移除可能的代码块标记
 * @param {string} content - 原始内容
 * @param {string} type - 内容类型 (html 或 svg)
 * @returns {string} 处理后的内容
 */
export function preprocessContent(content, type) {
  // 如果内容为空或不是字符串，直接返回原内容
  if (!content || typeof content !== 'string') {
    return content;
  }

  // 检查内容是否被代码块包围
  const htmlCodeBlockRegex = /^```html\s*\n([\s\S]*?)```\s*$/;
  const svgCodeBlockRegex = /^```svg\s*\n([\s\S]*?)```\s*$/;
  const genericCodeBlockRegex = /^```\s*\n([\s\S]*?)```\s*$/;
  
  let processedContent = content;
  
  if (type === 'html') {
    // 检查HTML代码块
    const htmlMatch = content.match(htmlCodeBlockRegex);
    if (htmlMatch && htmlMatch[1]) {
      processedContent = htmlMatch[1];
      console.log('已移除HTML代码块标记');
    } else {
      // 检查通用代码块
      const genericMatch = content.match(genericCodeBlockRegex);
      if (genericMatch && genericMatch[1] && 
          (content.includes('<html') || content.includes('<body') || content.includes('<div'))) {
        processedContent = genericMatch[1];
        console.log('已移除通用代码块标记');
      }
    }
  } else if (type === 'svg') {
    // 检查SVG代码块
    const svgMatch = content.match(svgCodeBlockRegex);
    if (svgMatch && svgMatch[1]) {
      processedContent = svgMatch[1];
      console.log('已移除SVG代码块标记');
    } else {
      // 检查通用代码块
      const genericMatch = content.match(genericCodeBlockRegex);
      if (genericMatch && genericMatch[1] && content.includes('<svg')) {
        processedContent = genericMatch[1];
        console.log('已移除通用代码块标记');
      }
    }
  }
  
  return processedContent;
}

/**
 * 使用 Puppeteer 转换 HTML/SVG 到 PDF/PNG
 * @param {string} content - HTML或SVG内容
 * @param {string} format - 输出格式 (pdf 或 png)
 * @param {Object} options - 转换选项
 * @returns {Promise<string>} 输出文件路径
 */
export async function convertWithPuppeteer(content, format, options = {}) {
  const {
    type = 'html',
    selector = null,
    outputPath,
    scale = 2
  } = options;

  console.log(`使用Puppeteer转换${type}到${format}`);
  
  // 预处理内容
  content = preprocessContent(content, type);
  
  // 确保HTML内容是完整的HTML文档
  if (type === 'html' && !content.includes('<html')) {
    content = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${content}</body></html>`;
  }
  
  // 启动浏览器，支持自定义Chrome路径
  const launchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  };
  
  // 如果设置了PUPPETEER_EXECUTABLE_PATH环境变量，使用它作为Chrome路径
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log(`使用自定义Chrome路径: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();
    
    // 设置固定宽度，让响应式设计以一致的方式渲染
    const fixedWidth = 1200; // 设置一个固定宽度，与您HTML中的max-width一致
    
    // 设置初始视口
    await page.setViewport({
      width: fixedWidth,
      height: 800, // 初始高度，后面会根据内容调整
      deviceScaleFactor: scale
    });
    
    // 添加字体支持
    await page.evaluateOnNewDocument(() => {
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: 'WQY Zen Hei';
          src: local('WenQuanYi Zen Hei');
        }
        @font-face {
          font-family: 'WQY Micro Hei';
          src: local('WenQuanYi Micro Hei');
        }
        @font-face {
          font-family: 'Noto Sans CJK SC';
          src: local('Noto Sans CJK SC');
        }
        body {
          font-family: 'Noto Sans CJK SC', 'WQY Zen Hei', 'WQY Micro Hei', Arial, sans-serif;
        }
      `;
      document.head.appendChild(style);
    });
    
    // 根据内容类型设置页面内容
    if (type === 'html') {
      await page.setContent(content, { waitUntil: 'networkidle0' });
    } else if (type === 'svg') {
      // 将SVG包装在HTML中
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { margin: 0; padding: 0; }
            svg { display: block; }
          </style>
        </head>
        <body>${content}</body>
        </html>
      `;
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    }
    
    // 等待一段时间确保所有内容都已加载
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 获取内容的实际尺寸
    let dimensions;
    
    if (selector) {
      // 如果提供了选择器，只获取选择器指定元素的尺寸
      dimensions = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return null;
        
        const { width, height } = element.getBoundingClientRect();
        return { width, height };
      }, selector);
      
      if (!dimensions) {
        throw new Error(`找不到选择器 "${selector}" 指定的元素`);
      }
    } else {
      // 否则获取整个内容的尺寸
      dimensions = await page.evaluate(() => {
        // 对于SVG，获取SVG元素的尺寸
        const svgElement = document.querySelector('svg');
        if (svgElement) {
          const { width, height } = svgElement.getBoundingClientRect();
          return { width, height };
        }
        
        // 对于HTML，获取body的尺寸
        const body = document.body;
        const html = document.documentElement;
        
        const width = Math.max(
          body.scrollWidth, body.offsetWidth,
          html.clientWidth, html.scrollWidth, html.offsetWidth
        );
        
        const height = Math.max(
          body.scrollHeight, body.offsetHeight,
          html.clientHeight, html.scrollHeight, html.offsetHeight
        );
        
        return { width, height };
      });
    }
    
    console.log(`内容实际尺寸: width=${dimensions.width}, height=${dimensions.height}`);
    
    // 调整页面视口以匹配内容尺寸
    await page.setViewport({
      width: Math.ceil(dimensions.width),
      height: Math.ceil(dimensions.height),
      deviceScaleFactor: scale
    });
    
    // 根据格式生成输出
    if (format === 'pdf') {
      const pdfOptions = {
        printBackground: true,
        format: 'A4',
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        preferCSSPageSize: true
      };
      
      // 如果提供了选择器，只截取选择器指定的元素
      if (selector) {
        const clip = await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (!element) return null;
          
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }, selector);
        
        if (clip) {
          pdfOptions.width = clip.width;
          pdfOptions.height = clip.height;
        }
      } else {
        pdfOptions.width = dimensions.width;
        pdfOptions.height = dimensions.height;
      }
      
      const pdfBuffer = await page.pdf(pdfOptions);
      await fs.writeFile(outputPath, pdfBuffer);
    } else {
      // PNG格式
      const screenshotOptions = {
        type: 'png',
        omitBackground: false,
        path: outputPath
      };
      
      // 如果提供了选择器，只截取选择器指定的元素
      if (selector) {
        const clip = await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (!element) return null;
          
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }, selector);
        
        if (clip) {
          screenshotOptions.clip = {
            x: clip.x,
            y: clip.y,
            width: clip.width,
            height: clip.height
          };
        }
      }
      
      await page.screenshot(screenshotOptions);
    }
    
    console.log(`Puppeteer转换成功: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Puppeteer转换错误:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * 转换HTML到PDF或PNG
 * @param {string} htmlContent - HTML内容
 * @param {string} format - 输出格式 (pdf 或 png)
 * @param {string} selector - CSS选择器，用于选择特定元素
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<string>} 输出文件路径
 */
export async function convertHtml(htmlContent, format = 'pdf', selector = null, outputPath = null) {
  try {
    // 验证参数
    if (!htmlContent) {
      throw new Error('HTML内容不能为空');
    }
    
    if (!['pdf', 'png'].includes(format)) {
      throw new Error('输出格式必须是pdf或png');
    }
    
    // 使用Puppeteer进行转换
    return await convertWithPuppeteer(htmlContent, format, {
      type: 'html',
      selector: selector,
      outputPath: outputPath
    });
  } catch (error) {
    console.error('HTML转换错误:', error);
    throw error;
  }
}

/**
 * 转换SVG到PDF或PNG
 * @param {string} svgContent - SVG内容
 * @param {string} format - 输出格式 (pdf 或 png)
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<string>} 输出文件路径
 */
export async function convertSvg(svgContent, format = 'png', outputPath = null) {
  try {
    // 验证参数
    if (!svgContent) {
      throw new Error('SVG内容不能为空');
    }
    
    if (!svgContent.includes('<svg')) {
      throw new Error('Invalid SVG content');
    }
    
    if (!['pdf', 'png'].includes(format)) {
      throw new Error('输出格式必须是pdf或png');
    }
    
    // 使用Puppeteer进行转换
    return await convertWithPuppeteer(svgContent, format, {
      type: 'svg',
      outputPath: outputPath
    });
  } catch (error) {
    console.error('SVG转换错误:', error);
    throw error;
  }
} 