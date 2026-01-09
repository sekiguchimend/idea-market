import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { client } from '@/lib/microcms';

// ブログ記事の作成
export async function POST(request: NextRequest) {
  try {
    // リクエストボディの取得と解析
    let body;
    let rawBody = '';

    try {
      rawBody = await request.text();
      body = JSON.parse(rawBody);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'JSONフォーマットが正しくありません' },
        { status: 400 }
      );
    }

    // リクエストボディのバリデーション
    const { title, content, publishedAt, category, user_id } = body;

    // デバッグ: コンテンツに画像が含まれているか確認
    if (content && typeof content === 'string') {
      const imageMatches = content.match(/<img[^>]*>/gi);
      if (imageMatches && imageMatches.length > 0) {
        console.log('API: 画像タグが検出されました:', imageMatches.length, '個');
        console.log('API: 最初の画像タグ:', imageMatches[0]);
        console.log('API: コンテンツの長さ:', content.length);
      } else {
        console.warn('API: 警告 - コンテンツに画像タグが含まれていません');
        console.log('API: コンテンツの最初の500文字:', content.substring(0, 500));
      }
    }

    // 必須フィールドチェック
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!content) missingFields.push('content');
    if (!user_id) missingFields.push('user_id');

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: '必須フィールドが不足しています',
          missingFields,
          receivedFields: Object.keys(body),
        },
        { status: 400 }
      );
    }

    // microCMSに送信するデータを準備
    // user_idにはSupabaseのユーザーIDをそのまま保存
    const createData: any = {
      title,
      content,
      user_id: user_id, // SupabaseのユーザーIDをそのまま設定
    };

    // publishedAtが提供されている場合のみ追加
    if (publishedAt) {
      createData.publishedAt = publishedAt;
    }

    // categoryが提供されている場合のみ追加
    if (category) {
      createData.category = category;
    }

    // microCMSにブログ記事を作成
    if (!client) {
      throw new Error('microCMSクライアントが初期化されていません。');
    }
    
    // デバッグ: 送信するデータを確認
    console.log('microCMSに送信するデータ:');
    console.log('- title:', createData.title);
    console.log('- content length:', createData.content?.length);
    const imageTagsInCreateData = createData.content?.match(/<img[^>]*>/gi);
    if (imageTagsInCreateData) {
      console.log('- 画像タグ数:', imageTagsInCreateData.length);
      console.log('- 最初の画像タグ:', imageTagsInCreateData[0]);
    }
    
    const response = await client.create({
      endpoint: 'blogs',
      content: createData,
    });
    
    // デバッグ: microCMSからのレスポンスを確認
    console.log('microCMSからのレスポンス:');
    console.log('- response.id:', response.id);
    // 注: create()メソッドはIDのみを返すため、contentは含まれません
    // 送信データの確認は上記で既に実施済み

    // キャッシュ無効化処理
    try {
      // ブログ一覧ページのキャッシュを無効化
      revalidatePath('/blog');

      // 作成された記事の詳細ページのキャッシュも無効化
      revalidatePath(`/blog/${response.id}`);

      // ホームページのキャッシュも無効化（ブログが表示される場合）
      revalidatePath('/');
    } catch (revalidateError) {
      // キャッシュ無効化エラーは致命的ではないので続行
    }

    return NextResponse.json({
      success: true,
      message: 'ブログ記事が正常に作成されました',
      data: response,
      blogId: response.id,
    });
  } catch (error: any) {
    // microCMSエラーの詳細解析
    let errorMessage = 'ブログ記事の作成に失敗しました';
    let statusCode = 500;

    if (error.status) {
      statusCode = error.status;

      switch (error.status) {
        case 400:
          errorMessage =
            'リクエストデータが無効です。フィールドの値を確認してください。';
          break;
        case 401:
          errorMessage =
            'APIキーが無効です。microCMSの設定を確認してください。';
          break;
        case 403:
          errorMessage = 'アクセスが拒否されました。権限を確認してください。';
          break;
        case 404:
          errorMessage = 'microCMSのエンドポイントが見つかりません。';
          break;
        case 429:
          errorMessage =
            'リクエスト制限に達しました。しばらく待ってから再試行してください。';
          break;
        default:
          errorMessage = `microCMSエラー (${error.status}): ${error.message}`;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error.message,
        status: error.status,
      },
      { status: statusCode }
    );
  }
}
