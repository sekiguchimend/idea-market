import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ERROR_CODES, createError } from '@/lib/constants/error-codes';
import { recordSystemLogServer, getIpFromRequest } from '@/lib/server-logging';

// 入力スキーマ
const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const patchBodySchema = z.object({
  id: z.string().uuid(),
  isPaid: z.boolean(),
});

const deleteBodySchema = z.object({
  id: z.string().uuid(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: createError(ERROR_CODES.AUTH_001, authError), supabase } as const;
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileError || !profile || profile.role !== 'admin') {
    return { error: createError(ERROR_CODES.AUTH_002, profileError), supabase } as const;
  }
  return { supabase } as const;
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, error: adminErr } = await requireAdmin();
    if (adminErr) {
      return NextResponse.json({ error: adminErr }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parse = listQuerySchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });
    if (!parse.success) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.API_001, parse.error.flatten()) },
        { status: 400 }
      );
    }
    const { q, limit = 50, offset = 0 } = parse.data;

    // sold一覧 + 関連情報
    let query = supabase
      .from('sold')
      .select(
        `
        *,
        ideas(id, title, mmb_no, status),
        profiles(id, display_name, role)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (q) {
      // 簡易検索: idea.mmb_no or idea.title or phone/company/manager
      // Supabaseのクエリ制限のため、ORでのリレーション検索は簡易対応
      query = query.or(
        `phone_number.ilike.%${q}%,company.ilike.%${q}%,manager.ilike.%${q}%`
      );
    }

    const { data, error, count } = await query as any;
    if (error) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.DB_002, error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data, count });
  } catch (e) {
    return NextResponse.json(
      { error: createError(ERROR_CODES.SYS_001, String(e)) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, error: adminErr } = await requireAdmin();
    if (adminErr) return NextResponse.json({ error: adminErr }, { status: 403 });

    const body = await request.json();
    const parse = patchBodySchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.API_001, parse.error.flatten()) },
        { status: 400 }
      );
    }
    const { id, isPaid } = parse.data;

    const { data, error } = await supabase
      .from('sold')
      .update({ is_paid: isPaid, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.DB_002, error) },
        { status: 500 }
      );
    }

    // システムログを記録
    const { data: { user } } = await supabase.auth.getUser();
    await recordSystemLogServer(supabase, {
      userId: user?.id,
      logType: 'admin_action',
      action: 'UPDATE_SOLD_STATUS',
      targetTable: 'sold',
      targetId: id,
      description: `購入済みアイデアの入金ステータスを${isPaid ? '入金済み' : '未入金'}に変更しました`,
      afterData: { is_paid: isPaid },
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      { error: createError(ERROR_CODES.SYS_001, String(e)) },
      { status: 500 }
    );
  }
}

// 購入取消: sold削除 + ideas.status を published に戻す
export async function DELETE(request: NextRequest) {
  try {
    const { supabase, error: adminErr } = await requireAdmin();
    if (adminErr) return NextResponse.json({ error: adminErr }, { status: 403 });

    const body = await request.json();
    const parse = deleteBodySchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.API_001, parse.error.flatten()) },
        { status: 400 }
      );
    }
    const { id } = parse.data;

    // soldレコードを取得して関連idea_idを取得
    const { data: soldRow, error: fetchErr } = await supabase
      .from('sold')
      .select('id, idea_id')
      .eq('id', id)
      .single();
    if (fetchErr || !soldRow) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.DB_002, fetchErr || 'not found') },
        { status: 404 }
      );
    }

    // 削除
    const { error: delErr } = await supabase.from('sold').delete().eq('id', id);
    if (delErr) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.DB_002, delErr) },
        { status: 500 }
      );
    }

    // ideas を published に戻す（明示的な仕様: 取消時に再公開）
    const { error: updErr } = await supabase
      .from('ideas')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', soldRow.idea_id);
    if (updErr) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.DB_002, updErr) },
        { status: 500 }
      );
    }

    // システムログを記録
    const { data: { user } } = await supabase.auth.getUser();
    await recordSystemLogServer(supabase, {
      userId: user?.id,
      logType: 'admin_action',
      action: 'CANCEL_PURCHASE',
      targetTable: 'sold',
      targetId: id,
      description: `購入を取り消しました（アイデアID: ${soldRow.idea_id}）`,
      beforeData: { sold_id: id, idea_id: soldRow.idea_id },
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: createError(ERROR_CODES.SYS_001, String(e)) },
      { status: 500 }
    );
  }
}


