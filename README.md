# 智能任务助手 Chrome 扩展

一个功能强大的智能科研助手Chrome浏览器扩展，提供GPU资源查询、任务管理、知识库检索、图片识别等多种功能。

## 项目简介

智能任务助手是一个面向科研人员和学生的高效工具，通过AI智能助手帮助用户：
- 实时查询GPU资源状态并获取合理的资源分配建议
- 管理和追踪科研任务
- 通过知识库检索相关文献和资料
- 支持图片文字识别（OCR）
- 基于用户信息推荐相关论文和研究人员
- 可视化知识图谱展示

## 主要功能

### 1. 多模式智能对话系统

#### 任务助手模式（默认）
- 实时获取集群GPU资源状态
- 根据任务复杂度和资源需求，智能推荐合适的GPU队列
- 提供专业的资源分配建议和任务规划指导

#### 知识库助手模式
- 基于本地向量数据库进行知识检索
- 支持上传文档到知识库（.doc, .docx, .pdf, .txt）
- 快速查找相关研究资料和文献

#### 图片识别模式
- 使用PaddleOCR进行高精度文字识别
- 支持多种图片格式
- 可对识别出的文字进行进一步问答

### 2. 对话管理
- 创建、删除、切换多个对话会话
- 历史对话记录持久化存储
- 对话标题自动生成和编辑
- 支持搜索历史对话

### 3. 用户系统
- 用户注册和登录
- 支持学号和真实姓名验证
- 用户关联信息推荐

### 4. 文件上传
- 支持上传多种文档格式
- 自动文档向量化和嵌入
- 集成向量数据库进行智能检索

### 5. 任务监控
- 实时监控用户的GPU使用情况
- 显示当前运行的进程和显存占用
- 任务状态追踪

### 6. 知识图谱
- 可视化展示研究主题和关联信息
- 交互式图谱浏览
- 节点和关系可视化

### 7. 智能推荐
- 基于用户信息推荐论文
- 推荐相关研究方向的合作者
- 智能问题补全和建议

## 技术架构

### 前端技术
- **框架**: 原生 JavaScript (ES6+)
- **UI**: HTML5 + CSS3
- **库**:
  - marked.js: Markdown渲染
  - highlight.js: 代码高亮
  - DOMPurify: HTML内容净化
  - vis-network: 知识图谱可视化

### 后端技术
- **Web框架**: Flask
- **数据库**: MySQL + SQLAlchemy ORM
- **OCR引擎**: PaddleOCR
- **AI模型**: 集成大语言模型API（支持自定义模型-暂未完善）
- **向量数据库**: AnythingLLM向量检索

### 扩展技术
- **Manifest Version**: 3
- **权限**: storage, activeTab, scripting, <all_urls>

## 安装部署

### 前置要求

1. Chrome/Edge浏览器（支持Manifest V3）
2. Python 3.8+
3. MySQL 5.7+ 或 8.0+
4. Node.js（可选，用于某些依赖）

### 后端部署步骤

1. **克隆项目**
```bash
git clone https://github.com/MRDOCTOROO/project-b.git
cd project-b
```

2. **创建Python虚拟环境**
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

3. **安装Python依赖**
```bash
cd flaskapi
pip install -r requirements.txt
```

4. **配置数据库**
```bash
# 编辑 flaskapi/app.py 中的数据库连接字符串
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://用户名:密码@主机:端口/数据库名?charset=utf8mb4'
```

5. **初始化数据库**
```bash
python app.py
```
首次运行会自动创建所有数据表。

6. **启动Flask服务器**
```bash
python app.py
```
默认运行在 `http://0.0.0.0:5000`

### Chrome扩展安装步骤

1. 打开Chrome浏览器，进入扩展管理页面：
   - 地址栏输入 `chrome://extensions/`
   - 或者菜单 → 更多工具 → 扩展程序

2. 开启"开发者模式"（右上角开关）

3. 点击"加载已解压的扩展程序"

4. 选择项目根目录（包含manifest.json的目录）

5. 扩展安装完成，可以在浏览器工具栏看到扩展图标

## 使用说明

### 初次使用

1. **注册账号**
   - 点击扩展图标打开主界面
   - 系统会自动跳转到登录页面
   - 点击"注册"标签，填写：
     - 学号（作为用户名）
     - 设置密码
     - 真实姓名
   - 点击注册按钮完成注册

2. **登录系统**
   - 在登录页面输入学号和密码
   - 点击登录进入主界面

### 基本操作

#### 创建新对话
1. 点击左上角的"+"按钮
2. 系统会自动创建一个新的对话会话
3. 在输入框中输入问题或任务描述
4. 点击"发送"或按Enter键发送消息

#### 切换对话模式
- **任务助手模式**（默认）：用于查询GPU资源和任务规划
  - 模式切换按钮处于关闭状态
  - 顶部显示"任务助手模式"

- **知识库助手模式**：用于检索文献和知识
  - 点击右上角的模式切换按钮
  - 顶部显示"知识库助手模式"

#### 上传文件
1. 点击输入框上方的附件图标
2. 选择要上传的文件（支持.doc, .docx, .pdf, .txt）
3. 文件会自动上传到知识库并进行向量化
4. 上传完成后可以在知识库模式下检索内容

#### 图片识别
1. 点击输入框上方的图片上传图标
2. 选择要识别的图片
3. 系统自动切换到"图片识别模式"
4. 识别完成后可以对图片内容进行提问

#### 论文推荐
1. 点击输入框上方的书籍图标
2. 系统会根据用户的真实姓名推荐相关论文
3. 推荐结果会显示在对话中

### 高级功能

#### 任务监控
1. 点击左侧边栏的"任务监控"按钮
2. 查看当前GPU使用情况
3. 监控运行的进程和资源占用

#### 知识图谱
1. 点击左侧边栏的"知识图谱"按钮
2. 查看研究主题的可视化图谱
3. 点击节点查看详细信息

#### 设置
1. 点击左侧边栏的"设置"按钮
2. 配置自定义AI模型（可选）
   - 填写API地址
   - 输入API密钥
   - 设置模型名称
3. 保存配置

#### 搜索历史对话
1. 在左侧搜索框输入关键词
2. 系统自动过滤显示匹配的对话
3. 点击对话查看详细内容

#### 删除对话
1. 将鼠标悬停在对话上
2. 点击删除按钮（垃圾桶图标）
3. 确认删除对话及其所有消息

## API接口文档

### 用户认证接口

#### 注册
- **URL**: `POST /api/register`
- **参数**: 
  - `username`: 学号
  - `password`: 密码
  - `relname`: 真实姓名
- **返回**: 注册成功/失败信息

#### 登录
- **URL**: `POST /api/login`
- **参数**:
  - `username`: 学号
  - `password`: 密码
- **返回**: 用户ID和登录状态

### 对话管理接口

#### 创建对话
- **URL**: `POST /api/create_chat`
- **参数**:
  - `user_id`: 用户ID
  - `title`: 对话标题
- **返回**: 对话ID

#### 获取对话列表
- **URL**: `GET /api/get_chats?user_id={user_id}`
- **返回**: 所有对话的列表

#### 获取对话内容
- **URL**: `GET /api/get_chat?user_id={user_id}&chat_id={chat_id}`
- **返回**: 对话中的所有消息

#### 保存消息
- **URL**: `POST /api/save_chat`
- **参数**:
  - `user_id`: 用户ID
  - `chat_id`: 对话ID
  - `message`: 消息内容
  - `sender`: 发送者（'user'或'ai'）
- **返回**: 保存状态

#### 删除对话
- **URL**: `DELETE /api/delete_chat?user_id={user_id}&chat_id={chat_id}`
- **返回**: 删除状态

#### 更新对话标题
- **URL**: `POST /api/update_chat_title`
- **参数**:
  - `user_id`: 用户ID
  - `chat_id`: 对话ID
  - `title`: 新标题
- **返回**: 更新状态

### 其他功能接口

#### 用户验证
- **URL**: `POST /api/users/verify`
- **参数**:
  - `user_id`: 用户ID（可选）
  - `real_name`: 真实姓名（可选）
- **返回**: 用户信息

#### 智能建议
- **URL**: `GET /api/suggestions?q={query}`
- **返回**: 相关问题建议列表

#### OCR识别
- **URL**: `POST /ocr`
- **参数**: 图片文件
- **返回**: 识别出的文字列表

## 项目结构

```
project-b/
├── manifest.json              # Chrome扩展配置文件
├── background.js             # 后台服务脚本
├── icons/                    # 图标资源
│   ├── icon48.png
│   └── icon128.png
├── lib/                      # 第三方库
│   ├── highlight.min.js
│   ├── marked.min.js
│   ├── purify.min.js
│   └── vis-network.min.js
├── popup/                    # 前端界面
│   ├── popup.html           # 主界面
│   ├── popup.css            # 样式文件
│   ├── popup.js             # 主逻辑
│   ├── login/               # 登录注册模块
│   ├── monitoring/          # 任务监控模块
│   ├── relation/            # 知识图谱模块
│   ├── settings/            # 设置模块
│   └── upfile/              # 文件上传模块
└── flaskapi/                # 后端API
    ├── app.py               # Flask应用主文件
    └── requirements.txt     # Python依赖
```

## 配置说明

### 数据库配置
在 `flaskapi/app.py` 中修改数据库连接：
```python
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://用户名:密码@主机:端口/数据库名?charset=utf8mb4'
```

### GPU监控配置
在 `popup/popup.js` 中修改GPU监控地址：
```javascript
const urls = [
    "http://10.100.1.98:8000/g1",
    "http://10.100.1.98:8000/g2",
    "http://10.100.1.98:8000/g3"
];
```

### AI模型配置
- **默认模型**: 使用内置的AnythingLLM workspace
- **自定义模型**: 在设置页面配置
  - API地址：支持OpenAI格式的API
  - API密钥：对应的认证密钥
  - 模型名称：如"gpt-4", "claude-3"等

## 常见问题

### Q: 扩展无法加载？
A: 请确保：
1. 已开启Chrome的"开发者模式"
2. 选择了正确的项目根目录
3. manifest.json格式正确

### Q: 登录失败？
A: 请检查：
1. 数据库是否正常运行
2. Flask服务器是否启动
3. 用户名和密码是否正确
4. 网络连接是否正常

### Q: GPU资源无法查询？
A: 请检查：
1. GPU监控服务是否正常运行
2. 网络是否可以访问监控地址
3. 防火墙设置是否允许

### Q: OCR识别失败？
A: 请检查：
1. PaddleOCR是否正确安装
2. 图片格式是否支持
3. 图片是否清晰可读

### Q: 文件上传失败？
A: 请检查：
1. 文件格式是否支持（.doc, .docx, .pdf, .txt）
2. 文件大小是否在限制范围内
3. 向量数据库服务是否正常运行

## 开发指南

### 添加新功能
1. 在相应的模块目录下创建HTML/CSS/JS文件
2. 在manifest.json中添加必要的权限
3. 实现功能逻辑
4. 测试功能是否正常

### 修改样式
- 主要样式文件：`popup/popup.css`
- 各模块样式：`popup/*/module.css`

### 调试技巧
1. 在Chrome中打开扩展的"背景页"查看后台日志
2. 使用Chrome DevTools调试前端代码
3. 查看Flask控制台输出调试后端

## 许可证

本项目采用 MIT 许可证。

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

## 联系方式

如有问题或建议，请通过以下方式联系：
- 邮箱：<20241513023@sspu.edu.cn> or <gsj2002m@gmail.com>
- GitHub Issues: https://github.com/MRDOCTOROO/project-b/issues

## 更新日志

### v1.0 (2024)
- 初始版本发布
- 实现基础对话功能
- 支持GPU资源查询
- 添加知识库检索功能
- 支持图片OCR识别
- 用户系统完善
- 任务监控功能
- 知识图谱可视化

## 致谢

感谢所有为本项目做出贡献的开发者和使用者！

特别感谢以下开源项目：
- PaddleOCR
- marked.js
- highlight.js
- vis-network
