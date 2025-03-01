import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { globalRateLimit, ipWhitelist } from './middleware/auth.js';
import { htmlRoutes, svgRoutes, fileRoutes, apiRoutes } from './routes/index.js';

// 加载环境变量
dotenv.config();

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

// 路由
app.get('/', (req, res) => {
  res.render('index');
});

// SVG转换页面路由
app.get('/svg', (req, res) => {
  res.render('svg');
});

// 使用路由模块
app.use(htmlRoutes);
app.use(svgRoutes);
app.use(fileRoutes);
app.use('/api', apiRoutes);

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
const server = app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
}); 