import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// リクエストスキーマ
const downloadLogsSchema = z.object({
  logType: z.enum(['login', 'blog_view', 'access', 'error', 'system']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// 管理者権限チェック関数
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: '認証が必要です', supabase: null } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: '管理者権限が必要です', supabase: null } as const;
  }

  return { supabase } as const;
}

// CSVエスケープ関数
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // ダブルクォートをエスケープ
  return `"${str.replace(/"/g, '""')}"`;
}

// ログイン履歴をCSV形式に変換
function convertLoginHistoryToCSV(data: any[]): string {
  const headers = [
    'ID',
    'ユーザーID',
    'ユーザー表示名',
    'ユーザーメールアドレス',
    'ログインステータス',
    'IPアドレス',
    'User-Agent',
    '失敗理由',
    'ログイン日時',
    '作成日時',
  ];

  const rows = data.map((log) => [
    log.id || '',
    log.user_id || '',
    log.user_display_name || '',
    log.user_email || '',
    log.login_status || '',
    log.ip_address || '',
    log.user_agent || '',
    log.failure_reason || '',
    log.login_at || '',
    log.created_at || '',
  ]);

  const csvRows = rows.map((row) => row.map(escapeCSV).join(','));
  return [headers.map(escapeCSV).join(','), ...csvRows].join('\n');
}

// ブログ閲覧履歴をCSV形式に変換
function convertBlogViewHistoryToCSV(data: any[]): string {
  const headers = [
    'ID',
    'ブログID',
    'ユーザーID',
    'ユーザー表示名',
    'ユーザーメールアドレス',
    'セッションID',
    'IPアドレス',
    'User-Agent',
    '閲覧日',
    '作成日時',
  ];

  const rows = data.map((log) => [
    log.id || '',
    log.blog_id || '',
    log.user_id || '',
    log.user_display_name || '',
    log.user_email || '',
    log.session_id || '',
    log.ip_address || '',
    log.user_agent || '',
    log.view_date || '',
    log.created_at || '',
  ]);

  const csvRows = rows.map((row) => row.map(escapeCSV).join(','));
  return [headers.map(escapeCSV).join(','), ...csvRows].join('\n');
}

// アクセスログをCSV形式に変換
function convertAccessLogsToCSV(data: any[]): string {
  const headers = [
    'ID',
    'ユーザーID',
    'ユーザー表示名',
    'ユーザーメールアドレス',
    'セッションID',
    'リクエストメソッド',
    'リクエストパス',
    'クエリパラメータ',
    'レスポンスステータス',
    'レスポンス時間(ms)',
    'IPアドレス',
    'User-Agent',
    'リファラー',
    '作成日時',
  ];

  const rows = data.map((log) => [
    log.id || '',
    log.user_id || '',
    log.user_display_name || '',
    log.user_email || '',
    log.session_id || '',
    log.request_method || '',
    log.request_path || '',
    log.request_query || '',
    log.response_status || '',
    log.response_time_ms || '',
    log.ip_address || '',
    log.user_agent || '',
    log.referer || '',
    log.created_at || '',
  ]);

  const csvRows = rows.map((row) => row.map(escapeCSV).join(','));
  return [headers.map(escapeCSV).join(','), ...csvRows].join('\n');
}

// エラーログをCSV形式に変換
function convertErrorLogsToCSV(data: any[]): string {
  const headers = [
    'ID',
    'ユーザーID',
    'ユーザー表示名',
    'ユーザーメールアドレス',
    'エラーレベル',
    'エラーコード',
    'エラーメッセージ',
    'スタックトレース',
    'リクエストパス',
    'リクエストメソッド',
    'IPアドレス',
    'User-Agent',
    '追加情報',
    '作成日時',
  ];

  const rows = data.map((log) => [
    log.id || '',
    log.user_id || '',
    log.user_display_name || '',
    log.user_email || '',
    log.error_level || '',
    log.error_code || '',
    log.error_message || '',
    log.error_stack || '',
    log.request_path || '',
    log.request_method || '',
    log.ip_address || '',
    log.user_agent || '',
    log.additional_info ? JSON.stringify(log.additional_info) : '',
    log.created_at || '',
  ]);

  const csvRows = rows.map((row) => row.map(escapeCSV).join(','));
  return [headers.map(escapeCSV).join(','), ...csvRows].join('\n');
}

// システムログをCSV形式に変換
function convertSystemLogsToCSV(data: any[]): string {
  const headers = [
    'ID',
    'ユーザーID',
    'ユーザー表示名',
    'ユーザーメールアドレス',
    'ログタイプ',
    'アクション',
    '対象テーブル',
    '対象ID',
    '説明',
    '変更前データ',
    '変更後データ',
    'IPアドレス',
    '作成日時',
  ];

  const rows = data.map((log) => [
    log.id || '',
    log.user_id || '',
    log.user_display_name || '',
    log.user_email || '',
    log.log_type || '',
    log.action || '',
    log.target_table || '',
    log.target_id || '',
    log.description || '',
    log.before_data ? JSON.stringify(log.before_data) : '',
    log.after_data ? JSON.stringify(log.after_data) : '',
    log.ip_address || '',
    log.created_at || '',
  ]);

  const csvRows = rows.map((row) => row.map(escapeCSV).join(','));
  return [headers.map(escapeCSV).join(','), ...csvRows].join('\n');
}


export async function POST(request: NextRequest) {
  try {
    // 管理者権限チェック
    const adminCheck = await requireAdmin();
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }
    const supabase = adminCheck.supabase!;

    // リクエストボディを取得
    const body = await request.json();
    const validation = downloadLogsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '無効なリクエストパラメータです', details: validation.error },
        { status: 400 }
      );
    }

    const { logType, startDate, endDate } = validation.data;

    let data: any[] = [];
    let csvContent = '';

    // ログタイプに応じてデータを取得
    switch (logType) {
      case 'login': {
        // ログイン履歴を取得（関数を使用）
        const startDateTime = startDate ? new Date(startDate).toISOString() : null;
        const endDateTime = endDate
          ? new Date(endDate + 'T23:59:59.999Z').toISOString()
          : null;

        const { data: loginData, error: loginError } = await supabase.rpc(
          'get_login_history_admin',
          {
            p_start_date: startDateTime,
            p_end_date: endDateTime,
          }
        );

        if (loginError) {
          console.error('ログイン履歴取得エラー:', loginError);
          // 関数が存在しない場合はビューから取得を試みる
          let query = supabase
            .from('login_history_admin')
            .select('*')
            .order('login_at', { ascending: false })
            .limit(10000);

          if (startDate) {
            query = query.gte('login_at', startDate);
          }
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            query = query.lte('login_at', endDateTime.toISOString());
          }

          const { data: fallbackData, error: fallbackError } = await query;

          if (fallbackError) {
            return NextResponse.json(
              { error: 'ログイン履歴の取得に失敗しました', details: fallbackError },
              { status: 500 }
            );
          }

          data = fallbackData || [];
        } else {
          data = loginData || [];
        }

        csvContent = convertLoginHistoryToCSV(data);
        break;
      }

      case 'blog_view': {
        // ブログ閲覧履歴を取得（関数を使用）
        const startDateTime = startDate ? new Date(startDate).toISOString() : null;
        const endDateTime = endDate
          ? new Date(endDate + 'T23:59:59.999Z').toISOString()
          : null;

        const { data: blogViewData, error: blogViewError } = await supabase.rpc(
          'get_blog_view_history_admin',
          {
            p_start_date: startDateTime,
            p_end_date: endDateTime,
          }
        );

        if (blogViewError) {
          console.error('ブログ閲覧履歴取得エラー:', blogViewError);
          // 関数が存在しない場合はビューから取得を試みる
          let query = supabase
            .from('blog_view_history_admin')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10000);

          if (startDate) {
            query = query.gte('created_at', startDate);
          }
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            query = query.lte('created_at', endDateTime.toISOString());
          }

          const { data: fallbackData, error: fallbackError } = await query;

          if (fallbackError) {
            return NextResponse.json(
              { error: 'ブログ閲覧履歴の取得に失敗しました', details: fallbackError },
              { status: 500 }
            );
          }

          data = fallbackData || [];
        } else {
          data = blogViewData || [];
        }

        csvContent = convertBlogViewHistoryToCSV(data);
        break;
      }

      case 'access': {
        // アクセスログを取得
        const startDateTime = startDate ? new Date(startDate).toISOString() : null;
        const endDateTime = endDate
          ? new Date(endDate + 'T23:59:59.999Z').toISOString()
          : null;

        const { data: accessData, error: accessError } = await supabase.rpc(
          'get_access_logs_admin',
          {
            p_start_date: startDateTime,
            p_end_date: endDateTime,
          }
        );

        if (accessError) {
          console.error('アクセスログ取得エラー:', accessError);
          // 関数が存在しない場合はテーブルから直接取得
          let query = supabase
            .from('access_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10000);

          if (startDate) {
            query = query.gte('created_at', startDate);
          }
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            query = query.lte('created_at', endDateTime.toISOString());
          }

          const { data: fallbackData, error: fallbackError } = await query;

          if (fallbackError) {
            return NextResponse.json(
              { error: 'アクセスログの取得に失敗しました', details: fallbackError },
              { status: 500 }
            );
          }

          data = fallbackData || [];
        } else {
          data = accessData || [];
        }

        csvContent = convertAccessLogsToCSV(data);
        break;
      }

      case 'error': {
        // エラーログを取得
        const startDateTime = startDate ? new Date(startDate).toISOString() : null;
        const endDateTime = endDate
          ? new Date(endDate + 'T23:59:59.999Z').toISOString()
          : null;

        const { data: errorData, error: errorLogError } = await supabase.rpc(
          'get_error_logs_admin',
          {
            p_start_date: startDateTime,
            p_end_date: endDateTime,
          }
        );

        if (errorLogError) {
          console.error('エラーログ取得エラー:', errorLogError);
          // 関数が存在しない場合はテーブルから直接取得
          let query = supabase
            .from('error_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10000);

          if (startDate) {
            query = query.gte('created_at', startDate);
          }
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            query = query.lte('created_at', endDateTime.toISOString());
          }

          const { data: fallbackData, error: fallbackError } = await query;

          if (fallbackError) {
            return NextResponse.json(
              { error: 'エラーログの取得に失敗しました', details: fallbackError },
              { status: 500 }
            );
          }

          data = fallbackData || [];
        } else {
          data = errorData || [];
        }

        csvContent = convertErrorLogsToCSV(data);
        break;
      }

      case 'system': {
        // システムログを取得
        const startDateTime = startDate ? new Date(startDate).toISOString() : null;
        const endDateTime = endDate
          ? new Date(endDate + 'T23:59:59.999Z').toISOString()
          : null;

        const { data: systemData, error: systemError } = await supabase.rpc(
          'get_system_logs_admin',
          {
            p_start_date: startDateTime,
            p_end_date: endDateTime,
          }
        );

        if (systemError) {
          console.error('システムログ取得エラー:', systemError);
          // 関数が存在しない場合はテーブルから直接取得
          let query = supabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10000);

          if (startDate) {
            query = query.gte('created_at', startDate);
          }
          if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            query = query.lte('created_at', endDateTime.toISOString());
          }

          const { data: fallbackData, error: fallbackError } = await query;

          if (fallbackError) {
            return NextResponse.json(
              { error: 'システムログの取得に失敗しました', details: fallbackError },
              { status: 500 }
            );
          }

          data = fallbackData || [];
        } else {
          data = systemData || [];
        }

        csvContent = convertSystemLogsToCSV(data);
        break;
      }

      default:
        return NextResponse.json(
          { error: 'サポートされていないログタイプです' },
          { status: 400 }
        );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: '指定された条件に一致するログがありません' },
        { status: 404 }
      );
    }

    // CSVファイルとして返す
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${logType}_logs_${startDate || 'all'}_${endDate || 'all'}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('ログダウンロードエラー:', error);
    return NextResponse.json(
      { error: 'ログのダウンロードに失敗しました', details: error.message },
      { status: 500 }
    );
  }
}

