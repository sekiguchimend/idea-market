import { SupabaseClient } from '@supabase/supabase-js';

/**
 * サーバーサイド用ログ記録ヘルパー関数
 */

type SystemLogType = 'admin_action' | 'scheduled_task' | 'migration' | 'config_change' | 'maintenance' | 'other';
type ErrorLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

// システムログを記録（サーバーサイド）
export async function recordSystemLogServer(
  supabase: SupabaseClient,
  params: {
    userId?: string | null;
    logType?: SystemLogType;
    action: string;
    targetTable?: string;
    targetId?: string;
    description?: string;
    beforeData?: Record<string, any>;
    afterData?: Record<string, any>;
    ipAddress?: string | null;
  }
): Promise<void> {
  try {
    await supabase
      .from('system_logs')
      .insert({
        user_id: params.userId || null,
        log_type: params.logType || 'admin_action',
        action: params.action,
        target_table: params.targetTable || null,
        target_id: params.targetId || null,
        description: params.description || null,
        before_data: params.beforeData || null,
        after_data: params.afterData || null,
        ip_address: params.ipAddress || null,
      });
  } catch (error) {
    console.error('システムログ記録失敗:', error);
  }
}

// エラーログを記録（サーバーサイド）
export async function recordErrorLogServer(
  supabase: SupabaseClient,
  params: {
    userId?: string | null;
    errorLevel?: ErrorLevel;
    errorCode?: string;
    errorMessage: string;
    errorStack?: string;
    requestPath?: string;
    requestMethod?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    additionalInfo?: Record<string, any>;
  }
): Promise<void> {
  try {
    await supabase
      .from('error_logs')
      .insert({
        user_id: params.userId || null,
        error_level: params.errorLevel || 'error',
        error_code: params.errorCode || null,
        error_message: params.errorMessage,
        error_stack: params.errorStack || null,
        request_path: params.requestPath || null,
        request_method: params.requestMethod || null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
        additional_info: params.additionalInfo || null,
      });
  } catch (error) {
    console.error('エラーログ記録失敗:', error);
  }
}

// リクエストからIPアドレスを取得するヘルパー
export function getIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded
    ? forwarded.split(',')[0]
    : request.headers.get('x-real-ip') || null;
}
