import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// リクエストスキーマ
const errorLogSchema = z.object({
  errorLevel: z.enum(['debug', 'info', 'warning', 'error', 'critical']).default('error'),
  errorCode: z.string().optional(),
  errorMessage: z.string(),
  errorStack: z.string().optional(),
  requestPath: z.string().optional(),
  requestMethod: z.string().optional(),
  additionalInfo: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // リクエストボディを取得
    const body = await request.json();
    const validation = errorLogSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '無効なリクエストパラメータです' },
        { status: 400 }
      );
    }

    const { errorLevel, errorCode, errorMessage, errorStack, requestPath, requestMethod, additionalInfo } = validation.data;

    // IPアドレスとUser-Agentを取得
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded
      ? forwarded.split(',')[0]
      : request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    // ユーザー情報を取得
    const { data: { user } } = await supabase.auth.getUser();

    // エラーログを記録
    const { error } = await supabase
      .from('error_logs')
      .insert({
        user_id: user?.id || null,
        error_level: errorLevel,
        error_code: errorCode || null,
        error_message: errorMessage,
        error_stack: errorStack || null,
        request_path: requestPath || null,
        request_method: requestMethod || null,
        ip_address: ip,
        user_agent: userAgent,
        additional_info: additionalInfo || null,
      });

    if (error) {
      console.error('エラーログ記録エラー:', error);
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('エラーログ記録で予期しないエラー:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
