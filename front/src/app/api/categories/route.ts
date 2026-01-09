import { NextRequest, NextResponse } from 'next/server';
import { getCategories } from '@/lib/microcms';

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
    const categories = await withTimeout(getCategories(), 5000);

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('カテゴリ取得エラー:', error.message);
    // エラー時は空のカテゴリリストを返す（UIがブロックされないように）
    return NextResponse.json({
      contents: [],
      totalCount: 0,
      offset: 0,
      limit: 100,
    });
  }
}
