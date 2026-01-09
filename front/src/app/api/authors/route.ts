import { NextRequest, NextResponse } from 'next/server';
import { getAuthors, createAuthor } from '@/lib/microcms';

// タイムアウト付きでPromiseを実行
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('リクエストがタイムアウトしました')), ms)
  );
  return Promise.race([promise, timeout]);
};

export async function GET(_request: NextRequest) {
  try {
    // 5秒でタイムアウト
    const authors = await withTimeout(getAuthors(), 5000);

    return NextResponse.json(authors);
  } catch (error: any) {
    console.error('著者取得エラー:', error.message);
    // エラー時は空のリストを返す
    return NextResponse.json({
      contents: [],
      totalCount: 0,
      offset: 0,
      limit: 100,
    });
  }
}

// 新しく追加するPOSTメソッド
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, name } = body;

    // バリデーション
    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json(
        { error: 'user_idは必須です' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'name（著者名）は必須です' },
        { status: 400 }
      );
    }

    // 既存の著者をチェック
    const existingAuthors = await getAuthors();
    const authorExists = existingAuthors.contents.some(
      author => author.user_id === user_id
    );

    if (authorExists) {
      return NextResponse.json(
        { message: '既に著者として登録されています', user_id },
        { status: 200 }
      );
    }

    // microCMSに著者を作成（user_idとnameを送信）
    const newAuthor = await createAuthor({ user_id, name });

    return NextResponse.json(
      {
        message: '著者の登録が完了しました',
        author: newAuthor,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: '著者の登録に失敗しました',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
