-- 報修登記系統建表草案：僅供審閱，本檔不會自動執行。
-- 適用 Supabase 的全新資料表；刻意不使用 IF NOT EXISTS，避免略過既有且不相符的結構。
-- 文字長度為本次設計選定值，正式上線前應再確認業務需求。
BEGIN;

-- 建立資料表：所有欄位必填，識別碼及建立時間由資料庫自動產生。
CREATE TABLE public.repair_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    reporter_name text NOT NULL,
    location text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    urgency text NOT NULL DEFAULT '中',
    status text NOT NULL DEFAULT '待處理',

    -- CHECK 第一層資料完整性：限制文字長度並拒絕只有空白字元的內容。
    CONSTRAINT repair_requests_reporter_name_check CHECK (
        char_length(reporter_name) BETWEEN 1 AND 100
        AND reporter_name ~ '[^[:space:]]'
    ),
    CONSTRAINT repair_requests_location_check CHECK (
        char_length(location) BETWEEN 1 AND 200
        AND location ~ '[^[:space:]]'
    ),
    CONSTRAINT repair_requests_description_check CHECK (
        char_length(description) BETWEEN 1 AND 5000
        AND description ~ '[^[:space:]]'
    ),

    -- CHECK 值域限制：精確比對選項，同時限制這三個文字欄位的長度。
    CONSTRAINT repair_requests_category_check CHECK (
        category IN ('設備', '網路', '環境', '其他')
        AND char_length(category) = 2
    ),
    CONSTRAINT repair_requests_urgency_check CHECK (
        urgency IN ('低', '中', '高') AND char_length(urgency) = 1
    ),
    CONSTRAINT repair_requests_status_check CHECK (
        status IN ('待處理', '處理中', '已完成')
        AND char_length(status) = 3
    )
);

-- GRANT 存取入口：不依賴新資料表的自動授權，先清除公開及一般客戶端角色的表格權限。
-- 僅授權 anon；登入後的 authenticated 角色不在本次示範範圍內。
REVOKE ALL PRIVILEGES ON TABLE public.repair_requests FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE public.repair_requests TO anon;

-- 僅准新增表單需要的五個欄位；省略 urgency 時使用「中」。
-- 不准傳入 id、created_at 或 status，避免偽造系統欄位；status 固定使用預設「待處理」。
-- 不授予 UPDATE、DELETE、TRUNCATE 或表格層級的 INSERT 權限。
GRANT INSERT (reporter_name, location, category, description, urgency)
    ON TABLE public.repair_requests TO anon;

-- RLS 資料列授權：GRANT 通過後仍須符合政策；沒有修改、刪除政策。
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;

-- 匿名公開清單：使用 anon 的任何人均可讀取所有資料列及已授權欄位。
CREATE POLICY repair_requests_anon_select
    ON public.repair_requests
    FOR SELECT
    TO anon
    USING (true);

-- 匿名新增：即使日後擴增欄位授權，新增資料的狀態仍必須為「待處理」。
CREATE POLICY repair_requests_anon_insert
    ON public.repair_requests
    FOR INSERT
    TO anon
    WITH CHECK (status = '待處理');

-- 原子化提交：未來人工執行時，建表與三層限制應一併成功。
COMMIT;
