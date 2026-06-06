# description

## Supabase 前端配置与使用

1. 在 Supabase 控制台中创建表 `words`，字段示例：
	- `id` (主键, e.g. uuid 或 int)
	- `word` (text)
	- `definition` (text)
	- `example` (text)

2. 复制 `assets/js/config.example.js` 为 `assets/js/config.js`，并将 `SUPABASE_URL` 与 `SUPABASE_ANON_KEY` 填入其中。

3. 安全注意：客户端只能使用 Supabase 的 ANON（public）key，切勿在前端暴露 `service_role` key。`assets/js/config.js` 已被加入 `.gitignore`，请不要提交真实密钥。

4. 运行：在浏览器中打开 `index.html`，页面会加载 `./assets/js/app.js`，可以在页面中登录/注册、新增单词或使用“查询”功能检索。

5. 当前 RLS 策略要求新增单词时带上当前用户 ID。页面中已经集成登录和注册功能：
   - 登录后才能新增单词
   - 查询单词为公开功能

6. 若需帮助创建 Supabase 表或为 `words` 配置权限策略，我可以继续帮你完成。
