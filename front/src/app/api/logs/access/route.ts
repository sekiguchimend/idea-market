import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// リクエストスキーマ
const accessLogSchema = z.object({
  requestMethod: z.string(),
  requestPath: z.string(),
  requestQuery: z.string().optional(),
  responseStatus: z.number().optional(),
  responseTimeMs: z.number().optional(),
  referer: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // リクエストボディを取得
    const body = await request.json();
    const validation = accessLogSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '無効なリクエストパラメータです' },
        { status: 400 }
      );
    }

    const { requestMethod, requestPath, requestQuery, responseStatus, responseTimeMs, referer, sessionId } = validation.data;

    // IPアドレスとUser-Agentを取得
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded
      ? forwarded.split(',')[0]
      : request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    // ユーザー情報を取得
    const { data: { user } } = await supabase.auth.getUser();

    // アクセスログを記録
    const { error } = await supabase
      .from('access_logs')
      .insert({
        user_id: user?.id || null,
        session_id: sessionId || null,
        request_method: requestMethod,
        request_path: requestPath,
        request_query: requestQuery || null,
        response_status: responseStatus || null,
        response_time_ms: responseTimeMs || null,
        ip_address: ip,
        user_agent: userAgent,
        referer: referer || null,
      });

    if (error) {
      console.error('アクセスログ記録エラー:', error);
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('アクセスログ記録で予期しないエラー:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
