import { createClient } from 'microcms-js-sdk';
import type { Blog, Category, MicroCMSListResponse, Author } from '../types/microcms';

// 環境変数の詳細な検証
export function validateMicroCMSConfig() {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;

  const errors: string[] = [];

  if (serviceDomain === undefined) {
    errors.push('MICROCMS_SERVICE_DOMAIN が設定されていません');
  } else if (serviceDomain.includes('.')) {
    errors.push(
      'MICROCMS_SERVICE_DOMAIN にはドメイン名（例: "ideamarket"）のみを設定してください。"https://" や ".microcms.io" は不要です'
    );
  }

  if (apiKey === undefined) {
    errors.push('MICROCMS_API_KEY が設定されていません');
  } else if (apiKey.length < 20) {
    errors.push(
      'MICROCMS_API_KEY が短すぎます。正しいAPIキーを設定してください'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    config: {
      serviceDomain,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : null,
    },
  };
}

// サーバーサイドでのみ実行されることを確認
if (typeof window !== 'undefined') {
  // クライアントサイドでは使用しない
}

const configValidation = validateMicroCMSConfig();

// microCMSクライアントを条件付きで作成
export const client = configValidation.isValid
  ? createClient({
      serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN!,
      apiKey: process.env.MICROCMS_API_KEY!,
    })
  : null;

// 型定義の再エクスポート（互換性のため）
export type { Blog, Category, Author } from '../types/microcms';

// microCMSの接続をテストする関数
export async function testMicroCMSConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!client) {
      return {
        success: false,
        error:
          'microCMSクライアントが初期化されていません。環境変数を確認してください。',
      };
    }

    // まずシンプルなAPIコールを試す
    const response = await client.get({
      endpoint: 'blogs',
      queries: {
        limit: 1,
      },
    });

    return { success: true };
  } catch (error: any) {
    let errorMessage = 'Unknown error';
    if (error.message?.includes('<!DOCTYPE')) {
      errorMessage =
        'HTMLレスポンスが返されました。APIエンドポイントまたは認証情報が間違っている可能性があります。';
    } else if (error.status === 401) {
      errorMessage = 'APIキーが無効です。';
    } else if (error.status === 404) {
      errorMessage =
        'エンドポイントが見つかりません。サービスドメインまたはエンドポイント名を確認してください。';
    } else {
      errorMessage = error.message || '接続に失敗しました。';
    }

    return { success: false, error: errorMessage };
  }
}

// モックデータ（開発・テスト用）
const mockBlogs: MicroCMSListResponse<Blog> = {
  contents: [
    {
      id: 'mock-1',
      title: 'サンプルブログ記事 1',
      content:
        '<p>これはサンプルのブログ記事です。microCMSに実際のデータがない場合に表示されます。</p>',
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-2',
      title: 'サンプルブログ記事 2',
      content:
        '<p>microCMSの設定を確認してください。blogsエンドポイントが作成されていない可能性があります。</p>',
      publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1日前
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  totalCount: 2,
  offset: 0,
  limit: 3,
};

// microCMSからブログ一覧を取得
export async function getBlogs(): Promise<MicroCMSListResponse<Blog>> {
  try {
    if (!client) {
      return mockBlogs;
    }

    const response = await client.get({
      endpoint: 'blogs',
      queries: {
        orders: '-publishedAt',
        limit: 100,
      },
    });
    return response;
  } catch (error: any) {
    // より具体的なエラーメッセージを提供
    if (error.message?.includes('<!DOCTYPE') || error.status === 404) {
      return mockBlogs;
    }

    // その他のエラーの場合はモックデータを返す
    return mockBlogs;
  }
}

// microCMSからカテゴリ一覧を取得
export async function getCategories(): Promise<MicroCMSListResponse<Category>> {
  try {
    if (!client) {
      return {
        contents: [],
        totalCount: 0,
        offset: 0,
        limit: 100,
      };
    }

    const response = await client.get({
      endpoint: 'categories',
      queries: {
        orders: 'name',
        limit: 100,
      },
    });
    return response;
  } catch (error: any) {
    // HTMLレスポンスやエンドポイント不存在の場合は空のリストを返す
    if (error.message?.includes('<!DOCTYPE') || error.status === 404) {
      return {
        contents: [],
        totalCount: 0,
        offset: 0,
        limit: 100,
      };
    }

    return {
      contents: [],
      totalCount: 0,
      offset: 0,
      limit: 100,
    };
  }
}

// カテゴリごとのブログ記事を取得
export async function getBlogsByCategory(
  categoryId: string
): Promise<MicroCMSListResponse<Blog>> {
  try {
    if (!client) {
      return {
        contents: [],
        totalCount: 0,
        offset: 0,
        limit: 100,
      };
    }

    const response = await client.get({
      endpoint: 'blogs',
      queries: {
        filters: `category[equals]${categoryId}`,
        orders: '-publishedAt',
        limit: 100,
      },
    });
    return response;
  } catch (error: any) {
    // HTMLレスポンスやエンドポイント不存在の場合は空のリストを返す
    if (error.message?.includes('<!DOCTYPE') || error.status === 404) {
      return {
        contents: [],
        totalCount: 0,
        offset: 0,
        limit: 100,
      };
    }

    return {
      contents: [],
      totalCount: 0,
      offset: 0,
      limit: 100,
    };
  }
}

// microCMSから単一のブログ記事を取得
export async function getBlog(id: string): Promise<Blog> {
  try {
    if (!client) {
      // リクエストされたIDに基づいてモックデータを返す
      const mockBlog = mockBlogs.contents.find(blog => blog.id === id);
      if (mockBlog) {
        return mockBlog;
      }

      // IDが見つからない場合は最初のモックデータを返す
      return {
        ...mockBlogs.contents[0],
        id,
        title: `サンプル記事 (ID: ${id})`,
        content:
          '<p>これはモックデータです。microCMSでblogsエンドポイントを作成してください。</p>',
      };
    }

    const response = await client.get({
      endpoint: 'blogs',
      contentId: id,
    });
    return response;
  } catch (error: any) {
    // HTMLレスポンスやエンドポイント不存在の場合はモックデータを返す
    if (error.message?.includes('<!DOCTYPE') || error.status === 404) {
      // リクエストされたIDに基づいてモックデータを返す
      const mockBlog = mockBlogs.contents.find(blog => blog.id === id);
      if (mockBlog) {
        return mockBlog;
      }

      // IDが見つからない場合は最初のモックデータを返す
      return {
        ...mockBlogs.contents[0],
        id,
        title: `サンプル記事 (ID: ${id})`,
        content:
          '<p>これはモックデータです。microCMSでblogsエンドポイントを作成してください。</p>',
      };
    }

    return {
      ...mockBlogs.contents[0],
      id,
      title: `エラー時のサンプル記事 (ID: ${id})`,
      content:
        '<p>microCMSへの接続でエラーが発生しました。設定を確認してください。</p>',
    };
  }
}

//microCMSからuidを取得
export async function getAuthors(): Promise<MicroCMSListResponse<Author>> {
  try {
    if (!client) {
      return {
        contents: [],
        totalCount: 0,
        offset: 0,
        limit: 100,
      };
    }

    const response = await client.get({
      endpoint: 'authors',
      queries: {
        orders: 'user_id',
        limit: 100,
      },
    });
    return response;
  } catch (error: any) {
    // HTMLレスポンスやエンドポイント不存在の場合は空のリストを返す
    if (error.message?.includes('<!DOCTYPE') || error.status === 404) {
      return {
        contents: [],
        totalCount: 0,
        offset: 0,
        limit: 100,
      };
    }

    return {
      contents: [],
      totalCount: 0,
      offset: 0,
      limit: 100,
    };
  }
}

/**
 * microCMSに新しい著者を作成する
 * @param authorData 著者データ（user_idとname）
 * @returns 作成された著者データ
 */
export async function createAuthor(authorData: { user_id: string; name: string }): Promise<Author> {
  try {
    if (!client) {
      throw new Error('microCMSクライアントが利用できません');
    }

    const response = await client.create({
      endpoint: 'authors',
      content: {
        user_id: authorData.user_id,
        name: authorData.name,
      },
    });

    return {
      id: response.id,
      user_id: authorData.user_id,
      name: authorData.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw new Error(`著者の作成に失敗しました: ${error.message}`);
  }
}