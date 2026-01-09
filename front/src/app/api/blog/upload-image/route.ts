import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 画像アップロード
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // FormDataからファイルを取得
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    // ファイルタイプのバリデーション
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です。JPEG、PNG、WebP、GIFのみ対応しています。' },
        { status: 400 }
      );
    }

    // ファイルサイズのバリデーション（最大10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ファイルサイズが大きすぎます。最大10MBまでのファイルを選択してください。' },
        { status: 400 }
      );
    }

    // ファイル名を生成
    const fileExt = file.name.split('.').pop();
    const fileName = `blog-images/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Supabaseストレージにアップロード
    const { data, error } = await supabase.storage
      .from('blog-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase Storageアップロードエラー:', error);
      return NextResponse.json(
        { error: 'ファイルのアップロードに失敗しました', details: error.message },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('blog-images')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    return NextResponse.json({
      success: true,
      url: imageUrl,
      path: data.path,
      image: {
        url: imageUrl,
        width: 0,
        height: 0,
      },
    });
  } catch (error: any) {
    console.error('画像アップロードエラー:', error);
    return NextResponse.json(
      { error: '画像のアップロードに失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
