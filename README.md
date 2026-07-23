# 新加坡全渠道经营看板

第一版使用 Google Sheets 导出的数据快照生成日级经营数据，并通过 Cloudflare Workers Static Assets 发布。

## 指标口径

- Shopee 销售：`DMS shopee店铺实收GMV` 的 `实收GMV（人民币）`
- Shopee 补贴：同表的 `平台补贴`
- TikTok：`DMS TIKTOK 店铺实收gmv` 的实收 GMV 与平台补贴
- Lazada：销售计入全渠道及货架销售，补贴暂不计算
- 货架销售：Shopee + Lazada

## 本地运行

```bash
npm install
npm run data
npm run dev
```

## 构建与发布

```bash
npm run build
npx wrangler deploy
```
## 登录保护

看板通过 Cloudflare Pages Functions 的 HTTP Basic Auth 保护，未登录用户无法访问页面或 `data/dashboard.json`。

在 Cloudflare Pages 项目中进入 **Settings → Variables and Secrets → Add**，添加生产环境变量：

- `DASHBOARD_USER`：自定义登录用户名
- `DASHBOARD_PASSWORD`：自定义登录密码（选择加密 Secret）

保存后重新部署。浏览器打开看板时会弹出登录框；不要把密码提交到 GitHub。
