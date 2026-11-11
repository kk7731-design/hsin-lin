// 僅可填入 Supabase Project URL 與公開的 publishable key；禁止填入 secret 或 service_role 金鑰。
// Project URL 請從 Supabase 專案的 Connect 或 API 設定取得，格式為 https://專案代碼.supabase.co。
// 目前提供的網址不是有效 URL，且另一個值是 secret，因此保留空白，等待正確設定。
window.REPAIR_CONFIG = Object.freeze({
  supabaseUrl: '',
  supabasePublishableKey: ''
});
