# 云生小楼后台管理

基于 React、Vite、Ant Design 和 CloudBase Web SDK 的运营后台。

## 功能范围

- CloudBase 用户名密码登录
- `admin_users` 白名单校验
- 经营概览
- 民宿资料维护：`hotel_profile`
- 房型维护：`rooms`
- 单日房态、价格、库存维护：`room_calendar`
- 订单查询和详情：`orders`
- 人工退款记录：`refund_records`

## 环境变量

在 `backend/.env.local` 中配置：

```bash
VITE_CLOUDBASE_ENV_ID=cloud1-d0g2qu0y4d5f7abad
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_CLOUDBASE_ACCESS_KEY=你的 CloudBase Publishable Key
```

`VITE_CLOUDBASE_ACCESS_KEY` 需要在 CloudBase 控制台或 MCP 的 `manageAppAuth(action="ensurePublishableKey")` 获取。

## 登录前置条件

1. CloudBase 应用侧认证需要启用用户名密码登录。
2. 后台账号需要存在于 CloudBase Auth 用户中。
3. `admin_users` 集合需要加入该账号的 `uid` 白名单。

示例：

```json
{
  "_id": "后台用户 uid",
  "uid": "后台用户 uid",
  "name": "经营者",
  "role": "owner",
  "enabled": true
}
```

当前小程序云函数里的 `admin_users.openid` 仍用于小程序 OpenID 管理接口；Web 后台优先使用 `uid` 校验。

## 本地运行

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
```
