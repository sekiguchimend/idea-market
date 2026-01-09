import { createClient } from './supabase/server';

/**
 * 著者情報の型定義
 */
export interface AuthorInfo {
  id: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  isRegistered: boolean;
}

/**
 * 著者なしの場合のデフォルト値
 */
const UNKNOWN_AUTHOR: AuthorInfo = {
  id: 'unknown',
  display_name: '著者なし',
  avatar_url: undefined,
  bio: undefined,
  isRegistered: false,
};

/**
 * ブログ記事のuser_idから著者情報を取得する
 * microCMSのブログのuser_idフィールドからSupabaseのユーザーIDを取得し、profilesから情報を取得
 * @param blogUserId ブログ記事のuser_idフィールド（オブジェクトまたは文字列）
 * @returns 著者情報
 */
export async function getAuthorByBlogUserId(blogUserId: string | { user_id: string } | undefined): Promise<AuthorInfo> {
  try {
    // user_idが未設定の場合は著者なし
    if (!blogUserId) {
      return UNKNOWN_AUTHOR;
    }

    // SupabaseのユーザーIDを取得（オブジェクトの場合は.user_id、文字列の場合はそのまま）
    const supabaseUserId = typeof blogUserId === 'object' ? blogUserId.user_id : blogUserId;

    if (!supabaseUserId) {
      return UNKNOWN_AUTHOR;
    }

    // サーバー用Supabaseクライアントを作成
    const supabase = await createClient();

    // Supabaseのprofilesテーブルから著者情報を取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', supabaseUserId)
      .single();

    // user_detailsから氏名とメールアドレスを取得
    const { data: userDetails } = await supabase
      .from('user_details')
      .select('full_name, email')
      .eq('user_id', supabaseUserId)
      .single();

    // 優先順位: full_name > display_name > email（最初の5文字）> 著者なし
    let displayName: string | null = null;
    if (userDetails?.full_name) {
      displayName = userDetails.full_name;
    } else if (profile?.display_name) {
      displayName = profile.display_name;
    } else if (userDetails?.email) {
      // メールアドレスは最初の5文字 + "..." で表示
      displayName = userDetails.email.substring(0, 5) + '...';
    }

    // 表示する名前がない場合は著者なし
    if (!displayName) {
      return UNKNOWN_AUTHOR;
    }

    return {
      id: supabaseUserId,
      display_name: displayName,
      avatar_url: undefined,
      bio: undefined,
      isRegistered: true,
    };

  } catch (error) {
    // エラー時は著者なし
    return UNKNOWN_AUTHOR;
  }
}

/**
 * 複数のブログ記事の著者情報を一括取得する（パフォーマンス向上のため）
 * microCMSのブログのuser_idフィールドからSupabaseのユーザーIDを取得し、profilesから情報を取得
 * @param blogUserIds ブログ記事のuser_idフィールドの配列（オブジェクトまたは文字列）
 * @returns 著者情報のマップ（key: supabaseUserId, value: AuthorInfo）
 */
export async function getAuthorsByBlogUserIds(
  blogUserIds: (string | { user_id: string } | undefined)[]
): Promise<Map<string, AuthorInfo>> {
  const authorMap = new Map<string, AuthorInfo>();

  try {
    // SupabaseのユーザーIDを抽出
    const supabaseUserIds: string[] = [];
    for (const blogUserId of blogUserIds) {
      if (!blogUserId) continue;
      const id = typeof blogUserId === 'object' ? blogUserId.user_id : blogUserId;
      if (id) supabaseUserIds.push(id);
    }

    if (supabaseUserIds.length === 0) {
      return authorMap;
    }

    // サーバー用Supabaseクライアントを作成
    const supabase = await createClient();

    // Supabaseからプロフィール情報を一括取得
    const uniqueUserIds = [...new Set(supabaseUserIds)];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', uniqueUserIds);

    // user_detailsから氏名とメールアドレスを一括取得
    const { data: userDetailsList } = await supabase
      .from('user_details')
      .select('user_id, full_name, email')
      .in('user_id', uniqueUserIds);

    // データをマップに格納
    for (const userId of supabaseUserIds) {
      const profile = profiles?.find((p: any) => p.id === userId);
      const userDetails = userDetailsList?.find((u: any) => u.user_id === userId);

      // 優先順位: full_name > display_name > email（最初の5文字）> 著者なし
      let displayName: string | null = null;
      if (userDetails?.full_name) {
        displayName = userDetails.full_name;
      } else if (profile?.display_name) {
        displayName = profile.display_name;
      } else if (userDetails?.email) {
        // メールアドレスは最初の5文字 + "..." で表示
        displayName = userDetails.email.substring(0, 5) + '...';
      }

      if (displayName) {
        authorMap.set(userId, {
          id: userId,
          display_name: displayName,
          avatar_url: undefined,
          bio: undefined,
          isRegistered: true,
        });
      } else {
        authorMap.set(userId, UNKNOWN_AUTHOR);
      }
    }

  } catch (error) {
    // エラー時は著者なし
    for (const blogUserId of blogUserIds) {
      if (blogUserId) {
        const id = typeof blogUserId === 'object' ? blogUserId.user_id : blogUserId;
        if (id) authorMap.set(id, UNKNOWN_AUTHOR);
      }
    }
  }

  return authorMap;
}
