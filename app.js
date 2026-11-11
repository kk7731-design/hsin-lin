(() => {
  'use strict';
  const form = document.querySelector('#repair-form');
  const fields = document.querySelector('#form-fields');
  const submit = document.querySelector('#submit-button');
  const refresh = document.querySelector('#refresh-button');
  const list = document.querySelector('#repair-list');
  const formMessage = document.querySelector('#form-message');
  const listMessage = document.querySelector('#list-message');
  let client;
  let saving = false;

  function message(element, text, kind = '') {
    element.textContent = text;
    element.dataset.kind = kind;
    element.hidden = !text;
  }

  // 一律以文字節點呈現資料，避免將報修內容當成 HTML 執行。
  function node(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function render(rows) {
    list.replaceChildren();
    for (const row of rows) {
      const item = node('li', '', 'repair-card');
      const badges = node('div', '', 'badges');
      badges.append(node('span', row.category, 'badge'), node('span', `緊急：${row.urgency}`, row.urgency === '高' ? 'badge high' : 'badge'), node('span', row.status, 'badge'));
      const date = new Date(row.created_at);
      const time = node('time', Number.isNaN(date.getTime()) ? '時間不詳' : date.toLocaleString('zh-TW', { hour12: false }));
      if (!Number.isNaN(date.getTime())) time.dateTime = date.toISOString();
      const meta = node('p', '登記時間：', 'meta');
      meta.append(time);
      item.append(badges, node('h3', `${row.location} · ${row.reporter_name}`), node('p', row.description, 'description'), meta);
      list.append(item);
    }
  }

  async function loadRequests() {
    refresh.disabled = true;
    list.setAttribute('aria-busy', 'true');
    message(listMessage, '正在載入報修清單…');
    try {
      const { data, error } = await client.from('repair_requests')
        .select('id,created_at,reporter_name,location,category,description,urgency,status')
        .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(20);
      if (error) throw error;
      render(data || []);
      message(listMessage, data?.length ? '' : '目前沒有報修紀錄，歡迎新增第一筆。');
    } catch (error) {
      message(listMessage, `清單載入失敗，請重新整理再試。${list.children.length ? '下方保留上次載入的資料。' : ''} 原因：${error.message || '連線異常'}`, 'error');
    } finally {
      refresh.disabled = false;
      list.setAttribute('aria-busy', 'false');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!client || saving || !form.reportValidity()) return;
    const values = new FormData(form);
    // 僅送出有 INSERT 權限的五個欄位，status、id、created_at 使用資料庫預設值。
    const payload = Object.fromEntries(['reporter_name', 'location', 'category', 'description', 'urgency'].map(key => [key, String(values.get(key) || '').trim()]));
    if (Object.values(payload).some(value => !value)) {
      message(formMessage, '請完整填寫所有欄位，內容不可只有空白。', 'error');
      return;
    }
    saving = true;
    fields.disabled = true;
    submit.textContent = '送出中…';
    message(formMessage, '正在送出，請稍候…');
    try {
      const { error } = await client.from('repair_requests').insert(payload);
      if (error) throw error;
      form.reset();
      message(formMessage, '報修已成功送出！初始狀態為「待處理」。', 'success');
      await loadRequests();
    } catch (error) {
      message(formMessage, `送出失敗，填寫內容已保留；請先重新整理清單確認是否已有紀錄，再決定是否重試。原因：${error.message || '連線異常'}`, 'error');
    } finally {
      saving = false;
      fields.disabled = false;
      submit.textContent = '送出報修';
    }
  });
  refresh.addEventListener('click', loadRequests);

  try {
    const config = window.REPAIR_CONFIG || {};
    const url = new URL(config.supabaseUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.supabasePublishableKey || '')) throw new Error('設定格式不符');
    if (!window.supabase?.createClient) throw new Error('Supabase 程式庫未載入，請檢查網路後重試');
    client = window.supabase.createClient(url.href, config.supabasePublishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    fields.disabled = false;
    loadRequests();
  } catch (error) {
    message(document.querySelector('#config-message'), '目前尚未連上服務。請在 config.js 設定正確的 Supabase HTTPS 網址及 sb_publishable_ 公開金鑰，並確認 CDN 可正常載入。', 'error');
    message(listMessage, '服務設定完成後即可查看報修清單。');
  }
})();
