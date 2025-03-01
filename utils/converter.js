import puppeteer from 'puppeteer';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

// 使用 createRequire 来导入 CommonJS 模块
const require = createRequire(import.meta.url);
const htmlPdf = require('html-pdf');
const phantomjs = require('phantomjs-prebuilt');

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
 * 使用 html-pdf 库转换 HTML 到 PDF/PNG
 * @param {string} htmlContent - HTML内容
 * @param {string} format - 输出格式 (pdf 或 png)
 * @param {string} selector - CSS选择器
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<string>} 输出文件路径
 */
export function convertWithHtmlPdf(htmlContent, format, selector, outputPath) {
  return new Promise((resolve, reject) => {
    // 添加字体支持的CSS，但不影响原始布局
    const fontStyles = `
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
      /* 只添加字体，不修改其他样式 */
      .chinese-text-support {
        font-family: 'Noto Sans CJK SC', 'WQY Zen Hei', 'WQY Micro Hei', Arial, sans-serif;
      }
    `;
    
    // 保存原始HTML，以便在需要时恢复
    const originalHtmlContent = htmlContent;
    
    // 提取原始内容中的宽度和高度
    let originalWidth, originalHeight;
    
    // 尝试从HTML内容中提取宽度和高度
    if (htmlContent.includes('<html') && !selector) {
      // 如果是完整的HTML文档，尝试保留其原始尺寸
      const widthMatch = htmlContent.match(/width\s*[:=]\s*["']?([^"'\s;]+)/i);
      const heightMatch = htmlContent.match(/height\s*[:=]\s*["']?([^"'\s;]+)/i);
      
      if (widthMatch && widthMatch[1]) {
        originalWidth = widthMatch[1];
        // 确保有单位
        if (!isNaN(originalWidth) && !originalWidth.match(/[a-z%]/i)) {
          originalWidth = originalWidth + 'px';
        }
      }
      
      if (heightMatch && heightMatch[1]) {
        originalHeight = heightMatch[1];
        // 确保有单位
        if (!isNaN(originalHeight) && !originalHeight.match(/[a-z%]/i)) {
          originalHeight = originalHeight + 'px';
        }
      }
    }
    
    // 最小化对原始HTML的修改
    let processedHtml = htmlContent;
    
    // 只在必要时添加HTML结构
    if (!processedHtml.includes('<html')) {
      processedHtml = `<!DOCTYPE html><html><head><style>${fontStyles}</style></head><body class="chinese-text-support">${processedHtml}</body></html>`;
    } else if (!processedHtml.includes('<head>')) {
      processedHtml = processedHtml.replace('<html>', `<html><head><style>${fontStyles}</style></head>`);
    } else if (!processedHtml.includes(fontStyles)) {
      // 只添加字体样式，不修改其他内容
      processedHtml = processedHtml.replace('</head>', `<style>${fontStyles}</style></head>`);
    }
    
    // 设置转换选项，尽量保持原始布局
    const options = {
      // 使用原始尺寸或默认值
      width: originalWidth || '100%',
      height: originalHeight || '100%',
      // 保持原始比例，不进行缩放
      zoomFactor: '1.0',
      // 设置边距为0，避免影响原始布局
      border: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      },
      // 禁用页眉页脚
      header: {
        height: '0'
      },
      footer: {
        height: '0'
      },
      // 保持原始布局
      base: 'file:///' + process.cwd() + '/',
      type: format === 'pdf' ? 'pdf' : 'png',
      renderDelay: 2000, // 增加延迟以确保字体加载
      quality: '100',
      phantomPath: phantomjs.path,
      // 添加更多的PhantomJS选项以提高渲染质量
      phantomArgs: [
        '--web-security=false', 
        '--local-to-remote-url-access=true', 
        '--ignore-ssl-errors=true',
        '--debug=true'
      ]
    };
    
    // 如果指定了选择器，尝试使用更保守的方法来选择内容
    if (selector && selector !== 'body') {
      console.log(`使用选择器: ${selector}`);
      // 使用PhantomJS的clipRect功能而不是修改HTML
      options.paperSize = {
        width: originalWidth || '100%',
        height: originalHeight || '100%',
        margin: '0px'
      };
      options.captureSelector = selector;
    }
    
    console.log('使用html-pdf转换html到' + format);
    console.log('转换选项:', JSON.stringify(options, null, 2));
    
    htmlPdf.create(processedHtml, options).toFile(outputPath, (err, res) => {
      if (err) {
        console.error('html-pdf error:', err);
        reject(err);
      } else {
        console.log('html-pdf转换成功:', res);
        resolve(outputPath);
      }
    });
  });
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
    outputPath,
    scale = 2
  } = options;

  console.log(`使用Puppeteer转换${type}到${format}`);
  
  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

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
    
    // 根据内容类型处理
    if (type === 'html') {
      // 为HTML内容添加最小化样式，保留原始布局
      const htmlWithStyle = content.includes('<html') 
        ? content.replace('</head>', `
            <style>
              /* 保持固定宽度，防止响应式变化 */
              .container {
                width: ${fixedWidth}px !important;
                max-width: ${fixedWidth}px !important;
              }
              /* 禁用媒体查询，确保布局一致 */
              @media (max-width: 768px) {
                .content, .characters {
                  flex-direction: row !important;
                }
                .scene, .key-points {
                  min-width: initial !important;
                }
              }
            </style>
          </head>`)
        : `<!DOCTYPE html><html><head>
            <meta charset="UTF-8">
            <style>
              body { margin: 0; padding: 0; width: ${fixedWidth}px; }
            </style>
          </head><body>${content}</body></html>`;
      
      await page.setContent(htmlWithStyle, { waitUntil: 'networkidle0' });
      
    } else if (type === 'svg') {
      // 对于SVG，保留原始尺寸
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body, html { margin: 0; padding: 0; }
            svg { display: block; }
          </style>
        </head>
        <body>${content}</body>
        </html>
      `;
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    }
    
    // 等待渲染完成
    await new Promise(resolve => setTimeout(resolve, 1000)); // 增加等待时间确保渲染完成
    
    // 获取实际内容尺寸
    const dimensions = await page.evaluate(() => {
      // 获取文档或主要内容元素的尺寸
      const body = document.body;
      
      // 对于HTML，优先获取.container或.infographic元素的尺寸
      const container = document.querySelector('.container') || 
                        document.querySelector('.infographic') || 
                        document.querySelector('div') || 
                        body;
      
      const rect = container.getBoundingClientRect();
      
      // 获取实际内容尺寸
      return {
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height)
      };
    });
    
    console.log(`内容实际尺寸: width=${dimensions.width}, height=${dimensions.height}`);
    
    // 根据格式输出
    if (format === 'pdf') {
      await page.pdf({
        path: outputPath,
        width: dimensions.width + 'px',
        height: dimensions.height + 'px',
        printBackground: true,
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px'
        }
      });
    } else {
      // 调整视口以适应实际内容
      await page.setViewport({
        width: dimensions.width,
        height: dimensions.height,
        deviceScaleFactor: scale
      });
      
      // 截图
      await page.screenshot({
        path: outputPath,
        type: 'png',
        omitBackground: false,
        clip: {
          x: 0,
          y: 0,
          width: dimensions.width,
          height: dimensions.height
        }
      });
    }
    
    console.log('Puppeteer转换成功:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Puppeteer转换错误:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * HTML转换函数
 * @param {string} htmlContent - HTML内容
 * @param {string} format - 输出格式 (pdf 或 png)
 * @param {string} selector - CSS选择器
 * @returns {Promise<string>} 输出文件路径
 */
export async function convertHtml(htmlContent, format, selector, outputPath) {
  try {
    // 预处理HTML内容，移除可能的代码块标记
    htmlContent = preprocessContent(htmlContent, 'html');
    
    // 确保是完整的HTML文档
    if (!htmlContent.includes('<html')) {
      htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${htmlContent}</body></html>`;
    }
    
    // 使用Puppeteer转换
    await convertWithPuppeteer(htmlContent, format, {
      type: 'html',
      outputPath
    });
    
    return outputPath;
  } catch (error) {
    console.error('HTML conversion error:', error);
    throw error;
  }
}

/**
 * SVG转换函数
 * @param {string} svgContent - SVG内容
 * @param {string} format - 输出格式 (pdf 或 png)
 * @returns {Promise<string>} 输出文件路径
 */
export async function convertSvg(svgContent, format, outputPath) {
  try {
    // 预处理SVG内容，移除可能的代码块标记
    svgContent = preprocessContent(svgContent, 'svg');
    
    // 确保SVG内容有正确的SVG标签
    if (!svgContent.includes('<svg')) {
      throw new Error('Invalid SVG content');
    }
    
    // 确保SVG有命名空间
    if (!svgContent.includes('xmlns=')) {
      svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    // 使用Puppeteer转换SVG
    await convertWithPuppeteer(svgContent, format, {
      type: 'svg',
      outputPath
    });
    
    return outputPath;
  } catch (error) {
    console.error('SVG conversion error:', error);
    throw error;
  }
} 