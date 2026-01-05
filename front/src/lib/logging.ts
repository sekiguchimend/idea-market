/**
 * ログ記録ヘルパー関数
 */

// アクセスログを記録
export async function recordAccessLog(params: {
  requestMethod: string;
  requestPath: string;
  requestQuery?: string;
  responseStatus?: number;
  responseTimeMs?: number;
  referer?: string;
  sessionId?: string;
}): Promise<void> {
  try {
    await fetch('/api/logs/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error('アクセスログ記録失敗:', error);
  }
}

// エラーログを記録
export async function recordErrorLog(params: {
  errorLevel?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  errorCode?: string;
  errorMessage: string;
  errorStack?: string;
  requestPath?: string;
  requestMethod?: string;
  additionalInfo?: Record<string, any>;
}): Promise<void> {
  try {
    await fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorLevel: params.errorLevel || 'error',
        ...params,
      }),
    });
  } catch (error) {
    console.error('エラーログ記録失敗:', error);
  }
}

// システムログを記録
export async function recordSystemLog(params: {
  logType?: 'admin_action' | 'scheduled_task' | 'migration' | 'config_change' | 'maintenance' | 'other';
  action: string;
  targetTable?: string;
  targetId?: string;
  description?: string;
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
}): Promise<void> {
  try {
    await fetch('/api/logs/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logType: params.logType || 'other',
        ...params,
      }),
    });
  } catch (error) {
    console.error('システムログ記録失敗:', error);
  }
}

// Errorオブジェクトからエラーログを記録
export async function logError(
  error: Error | unknown,
  context?: {
    requestPath?: string;
    requestMethod?: string;
    additionalInfo?: Record<string, any>;
  }
): Promise<void> {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  await recordErrorLog({
    errorMessage: errorObj.message,
    errorStack: errorObj.stack,
    requestPath: context?.requestPath,
    requestMethod: context?.requestMethod,
    additionalInfo: context?.additionalInfo,
  });
}
