-- Migration: 20251220000003_create_access_error_system_logs
-- Description: アクセスログ、エラーログ、システムログテーブルの作成
-- 作成日: 2025-12-20

-- =================================================================
-- ENUM型の定義
-- =================================================================

-- エラーレベル
DO $$ BEGIN
    CREATE TYPE public.error_level AS ENUM ('debug', 'info', 'warning', 'error', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- システムログタイプ
DO $$ BEGIN
    CREATE TYPE public.system_log_type AS ENUM ('admin_action', 'scheduled_task', 'migration', 'config_change', 'maintenance', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =================================================================
-- アクセスログテーブル
-- =================================================================

CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    request_method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE等
    request_path TEXT NOT NULL, -- リクエストパス
    request_query TEXT, -- クエリパラメータ
    response_status INTEGER, -- HTTPステータスコード
    response_time_ms INTEGER, -- レスポンス時間（ミリ秒）
    ip_address INET,
    user_agent TEXT,
    referer TEXT, -- リファラー
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================================================
-- エラーログテーブル
-- =================================================================

CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    error_level public.error_level NOT NULL DEFAULT 'error',
    error_code VARCHAR(50), -- エラーコード
    error_message TEXT NOT NULL, -- エラーメッセージ
    error_stack TEXT, -- スタックトレース
    request_path TEXT, -- エラー発生時のパス
    request_method VARCHAR(10), -- リクエストメソッド
    request_body TEXT, -- リクエストボディ（機密情報は除外）
    ip_address INET,
    user_agent TEXT,
    additional_info JSONB, -- 追加情報
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================================================
-- システムログテーブル
-- =================================================================

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- 実行者（システムの場合はNULL）
    log_type public.system_log_type NOT NULL DEFAULT 'other',
    action VARCHAR(100) NOT NULL, -- 実行アクション
    target_table VARCHAR(100), -- 対象テーブル
    target_id TEXT, -- 対象ID
    description TEXT, -- 説明
    before_data JSONB, -- 変更前データ
    after_data JSONB, -- 変更後データ
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================================================
-- インデックス
-- =================================================================

-- アクセスログ
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON public.access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_request_path ON public.access_logs(request_path);
CREATE INDEX IF NOT EXISTS idx_access_logs_response_status ON public.access_logs(response_status);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON public.access_logs(ip_address);

-- エラーログ
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_level ON public.error_logs(error_level);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON public.error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_request_path ON public.error_logs(request_path);

-- システムログ
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_log_type ON public.system_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON public.system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_target_table ON public.system_logs(target_table);

-- =================================================================
-- RLS (Row Level Security) ポリシー
-- =================================================================

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- アクセスログ: 管理者のみ閲覧可能、システムは挿入可能
CREATE POLICY "access_logs_admin_select" ON public.access_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "access_logs_insert" ON public.access_logs
    FOR INSERT WITH CHECK (true);

-- エラーログ: 管理者のみ閲覧可能、システムは挿入可能
CREATE POLICY "error_logs_admin_select" ON public.error_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "error_logs_insert" ON public.error_logs
    FOR INSERT WITH CHECK (true);

-- システムログ: 管理者のみ閲覧可能、システムは挿入可能
CREATE POLICY "system_logs_admin_select" ON public.system_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "system_logs_insert" ON public.system_logs
    FOR INSERT WITH CHECK (true);

-- =================================================================
-- 管理者用関数（ユーザー情報を結合して取得）
-- =================================================================

-- アクセスログ取得関数
CREATE OR REPLACE FUNCTION public.get_access_logs_admin(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_display_name TEXT,
    user_email VARCHAR(255),
    session_id TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    request_query TEXT,
    response_status INTEGER,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.id,
        al.user_id,
        p.display_name AS user_display_name,
        u.email AS user_email,
        al.session_id,
        al.request_method,
        al.request_path,
        al.request_query,
        al.response_status,
        al.response_time_ms,
        al.ip_address,
        al.user_agent,
        al.referer,
        al.created_at
    FROM public.access_logs al
    LEFT JOIN public.profiles p ON al.user_id = p.id
    LEFT JOIN auth.users u ON p.id = u.id
    WHERE (p_start_date IS NULL OR al.created_at >= p_start_date)
      AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    ORDER BY al.created_at DESC;
END;
$$;

-- エラーログ取得関数
CREATE OR REPLACE FUNCTION public.get_error_logs_admin(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_display_name TEXT,
    user_email VARCHAR(255),
    error_level public.error_level,
    error_code VARCHAR(50),
    error_message TEXT,
    error_stack TEXT,
    request_path TEXT,
    request_method VARCHAR(10),
    ip_address INET,
    user_agent TEXT,
    additional_info JSONB,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        el.id,
        el.user_id,
        p.display_name AS user_display_name,
        u.email AS user_email,
        el.error_level,
        el.error_code,
        el.error_message,
        el.error_stack,
        el.request_path,
        el.request_method,
        el.ip_address,
        el.user_agent,
        el.additional_info,
        el.created_at
    FROM public.error_logs el
    LEFT JOIN public.profiles p ON el.user_id = p.id
    LEFT JOIN auth.users u ON p.id = u.id
    WHERE (p_start_date IS NULL OR el.created_at >= p_start_date)
      AND (p_end_date IS NULL OR el.created_at <= p_end_date)
    ORDER BY el.created_at DESC;
END;
$$;

-- システムログ取得関数
CREATE OR REPLACE FUNCTION public.get_system_logs_admin(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_display_name TEXT,
    user_email VARCHAR(255),
    log_type public.system_log_type,
    action VARCHAR(100),
    target_table VARCHAR(100),
    target_id TEXT,
    description TEXT,
    before_data JSONB,
    after_data JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sl.id,
        sl.user_id,
        p.display_name AS user_display_name,
        u.email AS user_email,
        sl.log_type,
        sl.action,
        sl.target_table,
        sl.target_id,
        sl.description,
        sl.before_data,
        sl.after_data,
        sl.ip_address,
        sl.created_at
    FROM public.system_logs sl
    LEFT JOIN public.profiles p ON sl.user_id = p.id
    LEFT JOIN auth.users u ON p.id = u.id
    WHERE (p_start_date IS NULL OR sl.created_at >= p_start_date)
      AND (p_end_date IS NULL OR sl.created_at <= p_end_date)
    ORDER BY sl.created_at DESC;
END;
$$;

-- 関数への実行権限を付与
GRANT EXECUTE ON FUNCTION public.get_access_logs_admin(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_error_logs_admin(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_logs_admin(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =================================================================
-- コメント
-- =================================================================

COMMENT ON TABLE public.access_logs IS 'アクセスログテーブル（ページアクセス記録用）';
COMMENT ON TABLE public.error_logs IS 'エラーログテーブル（エラー記録用）';
COMMENT ON TABLE public.system_logs IS 'システムログテーブル（管理操作・システムイベント記録用）';
