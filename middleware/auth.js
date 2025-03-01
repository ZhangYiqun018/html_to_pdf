import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 从环境变量获取密钥，如果不存在则使用默认值（仅用于开发环境）
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

// 创建API密钥验证中间件
export const apiKeyAuth = (req, res, next) => {
  // 从请求头获取Bearer Token
  const bearerToken = req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
    ? req.headers.authorization.substring(7)
    : null;
  
  // 从请求头、查询参数或请求体中获取API密钥
  const apiKey = bearerToken || req.headers['x-api-key'] || req.query.api_key || (req.body && req.body.api_key);
  
  // 如果在开发环境中且没有设置API_KEY_REQUIRED，则跳过验证
  if (process.env.NODE_ENV === 'development' && process.env.API_KEY_REQUIRED !== 'true') {
    return next();
  }
  
  // 如果没有提供API密钥，返回401错误
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: '未提供认证凭据，请使用Bearer Token或API密钥'
    });
  }
  
  try {
    // 验证API密钥
    // 这里我们使用环境变量中的API_KEYS，它是一个逗号分隔的有效API密钥列表
    const validApiKeys = (process.env.API_KEYS || '').split(',').map(key => key.trim());
    
    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({
        success: false,
        error: '认证凭据无效'
      });
    }
    
    // API密钥有效，继续处理请求
    next();
  } catch (error) {
    console.error('认证错误:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
};

// 创建JWT令牌验证中间件（可用于更复杂的认证场景）
export const jwtAuth = (req, res, next) => {
  // 从请求头获取令牌
  const token = req.headers.authorization?.split(' ')[1];
  
  // 如果在开发环境中且没有设置JWT_AUTH_REQUIRED，则跳过验证
  if (process.env.NODE_ENV === 'development' && process.env.JWT_AUTH_REQUIRED !== 'true') {
    return next();
  }
  
  // 如果没有提供令牌，返回401错误
  if (!token) {
    return res.status(401).json({
      success: false,
      error: '未提供认证令牌'
    });
  }
  
  try {
    // 验证令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 将解码后的用户信息添加到请求对象中
    req.user = decoded;
    
    // 令牌有效，继续处理请求
    next();
  } catch (error) {
    console.error('JWT验证错误:', error);
    return res.status(401).json({
      success: false,
      error: '认证令牌无效或已过期'
    });
  }
};

// 创建IP白名单中间件
export const ipWhitelist = (req, res, next) => {
  // 如果在开发环境中且没有设置IP_WHITELIST_REQUIRED，则跳过验证
  if (process.env.NODE_ENV === 'development' && process.env.IP_WHITELIST_REQUIRED !== 'true') {
    return next();
  }
  
  // 获取客户端IP地址
  const clientIp = req.ip || req.connection.remoteAddress;
  
  // 从环境变量获取白名单IP列表
  const whitelistedIps = (process.env.WHITELISTED_IPS || '127.0.0.1,::1').split(',').map(ip => ip.trim());
  
  // 检查客户端IP是否在白名单中
  if (!whitelistedIps.includes(clientIp)) {
    console.warn(`IP访问被拒绝: ${clientIp}`);
    return res.status(403).json({
      success: false,
      error: '您的IP地址未被授权访问此服务'
    });
  }
  
  // IP在白名单中，继续处理请求
  next();
};

// 创建全局速率限制中间件
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP在windowMs时间内最多可以发送100个请求
  standardHeaders: true, // 返回标准的RateLimit头
  legacyHeaders: false, // 禁用旧版头
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试'
  }
});

// 创建API端点速率限制中间件（更严格）
export const apiRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 20, // 每个IP在windowMs时间内最多可以发送20个请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'API请求过于频繁，请稍后再试'
  }
});

// 创建用量配额跟踪中间件（简单实现，生产环境应使用Redis等存储）
const usageQuotas = new Map(); // 用于存储每个API密钥的使用情况

export const quotaLimit = (req, res, next) => {
  // 如果在开发环境中且没有设置QUOTA_LIMIT_REQUIRED，则跳过验证
  if (process.env.NODE_ENV === 'development' && process.env.QUOTA_LIMIT_REQUIRED !== 'true') {
    return next();
  }
  
  // 获取API密钥
  const apiKey = req.headers['x-api-key'] || req.query.api_key || (req.body && req.body.api_key);
  
  // 如果没有API密钥，跳过配额检查（应该已经被apiKeyAuth中间件拦截）
  if (!apiKey) {
    return next();
  }
  
  // 获取当前月份
  const currentMonth = new Date().toISOString().slice(0, 7); // 格式：YYYY-MM
  
  // 初始化或更新用量记录
  if (!usageQuotas.has(apiKey)) {
    usageQuotas.set(apiKey, {});
  }
  
  const userQuota = usageQuotas.get(apiKey);
  if (!userQuota[currentMonth]) {
    userQuota[currentMonth] = 0;
  }
  
  // 获取每月配额限制
  const monthlyQuota = parseInt(process.env.MONTHLY_QUOTA || '1000', 10);
  
  // 检查是否超出配额
  if (userQuota[currentMonth] >= monthlyQuota) {
    return res.status(429).json({
      success: false,
      error: '您已达到本月API使用配额限制'
    });
  }
  
  // 增加用量计数
  userQuota[currentMonth]++;
  
  // 在响应头中添加配额信息
  res.setHeader('X-RateLimit-Limit', monthlyQuota);
  res.setHeader('X-RateLimit-Remaining', monthlyQuota - userQuota[currentMonth]);
  res.setHeader('X-RateLimit-Reset', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString());
  
  // 继续处理请求
  next();
};

// 导出一个组合中间件，用于保护API路由
export const protectApi = [
  apiKeyAuth,
  apiRateLimit,
  quotaLimit
]; 