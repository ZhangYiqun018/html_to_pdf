# 在Dify中集成HTML/SVG转PDF/PNG工具

本文档说明如何将HTML/SVG转PDF/PNG API服务作为自定义工具集成到Dify平台中。

## 准备工作

1. 确保API服务已经部署并可以通过公网访问，例如 `https://htmlpdf.zeabur.app`
2. 确保你有Dify平台的账号并有权限添加自定义工具
3. 获取API密钥（详见下文）

## 获取API密钥

为了保护API服务不被滥用，所有API请求都需要提供有效的API密钥。获取API密钥的方法如下：

1. 如果你是服务管理员，可以运行以下命令生成新的API密钥：
   ```bash
   node tools/generate-api-key.js
   ```

2. 生成的API密钥会自动添加到`.env`文件中，并在控制台输出。请妥善保管这个密钥。

3. 如果你是API服务的用户，请联系服务管理员获取API密钥。

## 集成方法

### 方法一：使用OpenAPI规范

1. 将`openapi.yaml`文件部署到你的服务器上，使其可以通过URL访问，例如 `https://htmlpdf.zeabur.app/openapi.yaml`
2. 登录Dify平台
3. 进入"开发"→"工具"页面
4. 点击"添加工具"→"自定义工具"
5. 选择"OpenAPI"选项
6. 在URL字段中输入你的OpenAPI文件URL，例如 `https://htmlpdf.zeabur.app/openapi.yaml`
7. 点击"导入"
8. 配置工具名称、描述等信息
9. **重要**：在"认证"部分，选择"Bearer Token"，并输入你的API密钥
10. 点击"保存"完成集成

### 方法二：使用ChatGPT Plugin规范

1. 将`ai-plugin.json`和`openapi.yaml`文件部署到你的服务器上
2. 登录Dify平台
3. 进入"开发"→"工具"页面
4. 点击"添加工具"→"自定义工具"
5. 选择"ChatGPT Plugin"选项
6. 在URL字段中输入你的Plugin Manifest URL，例如 `https://htmlpdf.zeabur.app/.well-known/ai-plugin.json`
7. 点击"导入"
8. 配置工具名称、描述等信息
9. **重要**：在"认证"部分，选择"Bearer Token"，并输入你的API密钥
10. 点击"保存"完成集成

## 重要说明：在Dify中使用返回URL的API端点

由于Dify和AI助手无法直接处理二进制文件响应，我们提供了专门的API端点，它们不直接返回文件内容，而是返回包含文件URL的JSON响应。这些端点特别适合在Dify等AI平台中使用：

- `/api/convert/url` - 将HTML/SVG内容转换为PDF/PNG并返回文件URL
- `/api/convert/file/url` - 上传HTML/SVG文件并转换为PDF/PNG并返回文件URL

这些端点返回的JSON响应包含以下字段：
```json
{
  "success": true,
  "fileUrl": "https://htmlpdf.zeabur.app/output/12345678-1234-1234-1234-123456789012.pdf",
  "fileName": "12345678-1234-1234-1234-123456789012.pdf",
  "fileType": "application/pdf"
}
```

**在Dify中使用时，请确保使用这些返回URL的端点，而不是直接返回文件的端点。**

## 使用示例

在Dify应用中，可以通过以下方式使用这个工具：

### 示例1：将HTML转换为PDF并获取URL

```
我需要将以下HTML内容转换为PDF并获取下载链接:
<html><body><h1>Hello World</h1><p>This is a test</p></body></html>
```

### 示例2：将SVG转换为PNG并获取URL

```
请将这个SVG图形转换为PNG图像并提供下载链接:
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="80" fill="blue"/></svg>
```

### 示例3：使用选择器只转换特定内容并获取URL

```
将以下HTML中的.content部分转换为PDF并提供下载链接:
<html><body><div class="header">标题</div><div class="content">这是主要内容</div><div class="footer">页脚</div></body></html>
```

## 速率限制和配额

为了防止API滥用，我们实施了以下限制：

1. **速率限制**：每个IP地址每5分钟最多可以发送20个API请求
2. **月度配额**：每个API密钥每月有使用次数限制（默认为1000次）

如果你需要更高的限制，请联系服务管理员。

## 注意事项

1. 确保你的API服务支持CORS，以便Dify可以正常访问
2. 所有API请求都需要提供有效的API密钥
3. 转换大型HTML/SVG内容可能需要较长时间，请确保设置了合理的超时时间
4. 在Dify中使用时，AI助手会返回文件的URL，用户可以通过点击URL下载生成的文件 