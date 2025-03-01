# HTML/SVG转PDF/PNG API文档

本文档描述了如何使用HTML/SVG转PDF/PNG的API接口。

## 基本信息

- 基础URL: `https://your-domain.com`
- 所有API请求都需要使用HTTPS
- 响应格式: 文件下载或JSON（错误情况）

## 认证

目前API不需要认证。如果您需要添加认证，可以实现API密钥或其他认证机制。

## API端点

### 1. 内容转换API

将HTML或SVG内容转换为PDF或PNG格式。

**URL**: `/api/convert`

**方法**: `POST`

**内容类型**: `application/json`

**请求体参数**:

| 参数名   | 类型   | 必填 | 描述                                      |
|----------|--------|------|-------------------------------------------|
| content  | string | 是   | HTML或SVG内容                             |
| type     | string | 是   | 内容类型，可选值: `html` 或 `svg`         |
| format   | string | 是   | 输出格式，可选值: `pdf` 或 `png`          |
| selector | string | 否   | CSS选择器，用于裁剪HTML中的特定元素（仅适用于HTML类型） |
| width    | number | 否   | 视口宽度（像素）                          |
| height   | number | 否   | 视口高度（像素）                          |
| scale    | number | 否   | 设备缩放比例，默认为2                     |

**成功响应**:

- **状态码**: `200 OK`
- **内容类型**: `application/pdf` 或 `image/png`
- **内容**: 生成的PDF或PNG文件

**错误响应**:

- **状态码**: `400 Bad Request` 或 `500 Internal Server Error`
- **内容类型**: `application/json`
- **内容示例**:
  ```json
  {
    "error": "错误信息"
  }
  ```

**示例请求**:

```bash
curl -X POST https://your-domain.com/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<html><body><h1>Hello World</h1></body></html>",
    "type": "html",
    "format": "pdf",
    "selector": "body"
  }' \
  --output output.pdf
```

### 2. 文件上传转换API

通过上传HTML或SVG文件进行转换。

**URL**: `/api/convert/file`

**方法**: `POST`

**内容类型**: `multipart/form-data`

**请求参数**:

| 参数名   | 类型   | 必填 | 描述                                      |
|----------|--------|------|-------------------------------------------|
| file     | file   | 是   | 要上传的HTML或SVG文件                     |
| type     | string | 是   | 内容类型，可选值: `html` 或 `svg`         |
| format   | string | 是   | 输出格式，可选值: `pdf` 或 `png`          |
| selector | string | 否   | CSS选择器，用于裁剪HTML中的特定元素（仅适用于HTML类型） |
| width    | number | 否   | 视口宽度（像素）                          |
| height   | number | 否   | 视口高度（像素）                          |
| scale    | number | 否   | 设备缩放比例，默认为2                     |

**成功响应**:

- **状态码**: `200 OK`
- **内容类型**: `application/pdf` 或 `image/png`
- **内容**: 生成的PDF或PNG文件

**错误响应**:

- **状态码**: `400 Bad Request` 或 `500 Internal Server Error`
- **内容类型**: `application/json`
- **内容示例**:
  ```json
  {
    "error": "错误信息"
  }
  ```

**示例请求**:

```bash
curl -X POST https://your-domain.com/api/convert/file \
  -F "file=@example.html" \
  -F "type=html" \
  -F "format=png" \
  -F "selector=body" \
  --output output.png
```

## 使用示例

### Node.js示例

```javascript
const axios = require('axios');
const fs = require('fs');

// 内容转换示例
async function convertContent() {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://your-domain.com/api/convert',
      data: {
        content: '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>',
        type: 'svg',
        format: 'png'
      },
      responseType: 'arraybuffer'
    });
    
    fs.writeFileSync('output.png', response.data);
    console.log('文件已保存为output.png');
  } catch (error) {
    console.error('转换失败:', error.response?.data || error.message);
  }
}

// 文件上传转换示例
async function convertFile() {
  const FormData = require('form-data');
  const form = new FormData();
  
  form.append('file', fs.createReadStream('example.html'));
  form.append('type', 'html');
  form.append('format', 'pdf');
  form.append('selector', '#content');
  
  try {
    const response = await axios({
      method: 'post',
      url: 'https://your-domain.com/api/convert/file',
      data: form,
      headers: form.getHeaders(),
      responseType: 'arraybuffer'
    });
    
    fs.writeFileSync('output.pdf', response.data);
    console.log('文件已保存为output.pdf');
  } catch (error) {
    console.error('转换失败:', error.response?.data || error.message);
  }
}
```

### Python示例

```python
import requests

# 内容转换示例
def convert_content():
    url = 'https://your-domain.com/api/convert'
    data = {
        'content': '<html><body><h1>Hello World</h1></body></html>',
        'type': 'html',
        'format': 'pdf'
    }
    
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        with open('output.pdf', 'wb') as f:
            f.write(response.content)
        print('文件已保存为output.pdf')
    else:
        print(f'转换失败: {response.json().get("error")}')

# 文件上传转换示例
def convert_file():
    url = 'https://your-domain.com/api/convert/file'
    files = {'file': open('example.svg', 'rb')}
    data = {
        'type': 'svg',
        'format': 'png'
    }
    
    response = requests.post(url, files=files, data=data)
    
    if response.status_code == 200:
        with open('output.png', 'wb') as f:
            f.write(response.content)
        print('文件已保存为output.png')
    else:
        print(f'转换失败: {response.json().get("error")}')
```

## 注意事项

1. 请求体大小限制为10MB
2. 生成的文件会在服务器上临时存储，然后发送给客户端后删除
3. 对于复杂的HTML/SVG，可能需要更长的处理时间
4. 确保CSS选择器正确，否则可能无法找到要裁剪的元素
5. SVG应包含有效的XML声明和SVG命名空间 