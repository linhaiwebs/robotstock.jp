# 环境配置检查清单

## ✅ 已完成的配置更新

### 1. 移除 Supabase 配置
- ✅ 从 `.env` 中移除所有 `VITE_SUPABASE_*` 变量
- ✅ 项目现在使用 SQLite 作为本地数据库
- ✅ 数据库文件位置：`server/data/database.db`

### 2. 开发环境配置 (.env)
```bash
# API 配置
VITE_API_URL=http://localhost:3001
VITE_USE_PROXY=false

# 后端服务器
API_PORT=3001
NODE_ENV=development

# AI 服务
SILICONFLOW_API_KEY=your_siliconflow_api_key_here
SILICONFLOW_API_URL=https://api.siliconflow.cn/v1/chat/completions
SILICONFLOW_MODEL=Qwen/Qwen2.5-7B-Instruct

# 安全
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# CORS
CORS_ORIGIN=

# 代理
TRUST_PROXY=false
```

### 3. 生产环境配置 (.env.production)
```bash
# API 配置
VITE_API_URL=
VITE_USE_PROXY=true

# 后端服务器
API_PORT=3001
NODE_ENV=production

# AI 服务
SILICONFLOW_API_KEY=your_siliconflow_api_key_here
SILICONFLOW_API_URL=https://api.siliconflow.cn/v1/chat/completions
SILICONFLOW_MODEL=Qwen/Qwen2.5-7B-Instruct

# 安全（必须使用强密钥）
JWT_SECRET=your-super-secret-jwt-key-change-in-production-RANDOM-STRING-HERE

# CORS（设置为您的域名）
CORS_ORIGIN=https://japanaistock.jp

# 代理（Nginx/Cloudflare）
TRUST_PROXY=true
```

## 📋 部署前检查清单

### 必须配置的环境变量

1. **SILICONFLOW_API_KEY** ⚠️ 必须配置
   - 获取方式: https://siliconflow.cn/
   - 用于 AI 股票诊断功能
   - 未配置时会使用模拟响应

2. **JWT_SECRET** ⚠️ 生产环境必须更改
   - 用于管理员登录认证
   - 生产环境必须使用强随机字符串
   - 推荐长度：至少 32 字符

3. **CORS_ORIGIN** ⚠️ 生产环境建议配置
   - 开发环境：可留空或设置为 `http://localhost:5173`
   - 生产环境：设置为实际域名，如 `https://japanaistock.jp`

### 可选配置

1. **SILICONFLOW_API_KEYS** (可选)
   - 多个 API Key 用逗号分隔
   - 用于轮换请求，避免单个 key 限流

2. **TRUST_PROXY** (可选)
   - 使用 Nginx/Cloudflare 等反向代理时设置为 `true`
   - 本地开发设置为 `false`

## 🔧 数据库配置

- **类型**: SQLite
- **位置**: `server/data/database.db`
- **初始化**: 自动创建（首次运行时）
- **管理员账户**: 
  - 使用 `npm run create-admin` 创建
  - 默认用户名: `admin`
  - 默认密码: `admin123` （首次登录后请修改）

## 🚀 启动命令

### 开发环境
```bash
# 同时启动前端和后端
npm run dev:all

# 或分别启动
npm run server  # 后端服务器
npm run dev     # 前端开发服务器
```

### 生产环境
```bash
# 构建并启动
npm run start

# 或分步执行
npm run build      # 构建前端
npm run start:prod # 启动生产服务器
```

## 📊 股票数据

- **数据源**: `public/assets/stock.json`
- **股票数量**: 3,887 支日本股票
- **加载方式**: 前端自动预加载
- **搜索功能**: 实时本地搜索，支持代码和名称

## 🔐 安全提醒

1. ⚠️ 生产环境必须更改 `JWT_SECRET`
2. ⚠️ 不要将 `.env` 文件提交到代码仓库
3. ⚠️ 定期更新管理员密码
4. ⚠️ 配置 CORS 限制访问来源
5. ⚠️ 使用 HTTPS（生产环境）

## 📝 配置验证

运行以下命令验证配置是否正确：

```bash
# 检查构建
npm run build

# 检查数据库
npm run create-admin

# 启动服务器测试
npm run server
```
