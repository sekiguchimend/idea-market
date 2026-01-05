import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// リクエストスキーマ
const systemLogSchema = z.object({
  logType: z.enum(['admin_action', 'scheduled_task', 'migration', 'config_change', 'maintenance', 'other']).default('other'),
  action: z.string(),
  targetTable: z.string().optional(),
  targetId: z.string().optional(),
  description: z.string().optional(),
  beforeData: z.record(z.any()).optional(),
  afterData: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // リクエストボディを取得
    const body = await request.json();
    const validation = systemLogSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: '無効なリクエストパラメータです' },
        { status: 400 }
      );
    }

    const { logType, action, targetTable, targetId, description, beforeData, afterData } = validation.data;

    // IPアドレスを取得
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded
      ? forwarded.split(',')[0]
      : request.headers.get('x-real-ip') || null;

    // ユーザー情報を取得
    const { data: { user } } = await supabase.auth.getUser();

    // システムログを記録
    const { error } = await supabase
      .from('system_logs')
      .insert({
        user_id: user?.id || null,
        log_type: logType,
        action: action,
        target_table: targetTable || null,
        target_id: targetId || null,
        description: description || null,
        before_data: beforeData || null,
        after_data: afterData || null,
        ip_address: ip,
      });

    if (error) {
      console.error('システムログ記録エラー:', error);
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('システムログ記録で予期しないエラー:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
