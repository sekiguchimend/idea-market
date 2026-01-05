import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ERROR_CODES, createError } from '@/lib/constants/error-codes';
import { recordSystemLogServer, getIpFromRequest } from '@/lib/server-logging';

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const updatableFields = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().trim().max(200).nullable().optional(),
  email: z.string().email().max(320).nullable().optional(),
  bank_name: z.string().trim().max(200).nullable().optional(),
  branch_name: z.string().trim().max(200).nullable().optional(),
  account_type: z.enum(['ordinary', 'current']).nullable().optional(),
  account_number: z.string().trim().max(64).nullable().optional(),
  account_holder: z.string().trim().max(200).nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  birth_date: z.string().trim().max(32).nullable().optional(),
  prefecture: z
    .enum([
      'hokkaido', 'aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima',
      'ibaraki', 'tochigi', 'gunma', 'saitama', 'chiba', 'tokyo', 'kanagawa',
      'niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano', 'gifu',
      'shizuoka', 'aichi', 'mie', 'shiga', 'kyoto', 'osaka', 'hyogo', 'nara',
      'wakayama', 'tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi',
      'tokushima', 'kagawa', 'ehime', 'kochi', 'fukuoka', 'saga', 'nagasaki',
      'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa',
    ])
    .nullable()
    .optional(),
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
    if (adminErr) return NextResponse.json({ error: adminErr }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.API_001, parsed.error.flatten()) },
        { status: 400 }
      );
    }

    const { q, limit = 50, offset = 0 } = parsed.data;

    // profilesテーブルをベースにuser_detailsをLEFT JOINして全ユーザーを取得
    let query = supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        role,
        created_at,
        updated_at,
        user_details (
          id,
          full_name,
          email,
          bank_name,
          branch_name,
          account_type,
          account_number,
          account_holder,
          gender,
          birth_date,
          prefecture,
          created_at,
          updated_at
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (q) {
      query = query.or(
        `display_name.ilike.%${q}%`
      );
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.DB_002, error) },
        { status: 500 }
      );
    }

    // フロントエンド用にデータを整形
    const formattedData = data?.map((profile: any) => {
      const details = Array.isArray(profile.user_details) 
        ? profile.user_details[0] 
        : profile.user_details;
      return {
        user_id: profile.id,
        display_name: profile.display_name,
        role: profile.role,
        profile_created_at: profile.created_at,
        // user_detailsの情報（存在しない場合はnull）
        id: details?.id || null,
        full_name: details?.full_name || null,
        email: details?.email || null,
        bank_name: details?.bank_name || null,
        branch_name: details?.branch_name || null,
        account_type: details?.account_type || null,
        account_number: details?.account_number || null,
        account_holder: details?.account_holder || null,
        gender: details?.gender || null,
        birth_date: details?.birth_date || null,
        prefecture: details?.prefecture || null,
        created_at: details?.created_at || profile.created_at,
        updated_at: details?.updated_at || profile.updated_at,
      };
    });

    return NextResponse.json({ success: true, data: formattedData, count });
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
    const parsed = updatableFields.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.API_001, parsed.error.flatten()) },
        { status: 400 }
      );
    }

    const { user_id, ...updates } = parsed.data;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: createError(ERROR_CODES.API_001, '変更項目がありません') },
        { status: 400 }
      );
    }

    // 既存のuser_detailsがあるか確認
    const { data: existing } = await supabase
      .from('user_details')
      .select('id')
      .eq('user_id', user_id)
      .single();

    let data;
    let error;

    if (existing) {
      // 既存のレコードを更新
      const result = await supabase
        .from('user_details')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .select('*')
        .single();
      data = result.data;
      error = result.error;
    } else {
      // 新規レコードを作成
      const result = await supabase
        .from('user_details')
        .insert({ 
          user_id, 
          ...updates, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .select('*')
        .single();
      data = result.data;
      error = result.error;
    }

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
      action: existing ? 'UPDATE_USER_DETAILS' : 'CREATE_USER_DETAILS',
      targetTable: 'user_details',
      targetId: user_id,
      description: `ユーザー詳細情報を${existing ? '更新' : '作成'}しました`,
      afterData: updates,
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





