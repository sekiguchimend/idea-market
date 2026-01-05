import { getBlog, getBlogs, Blog } from '@/lib/microcms';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Eye, Edit, User } from 'lucide-react';
import { getBlogViewCount } from '@/lib/supabase/blog-views';
import { BlogViewTracker } from '@/components/BlogViewTracker';
import { BlogDetailPageProps } from '@/types/blog';
import { getAuthorByBlogUserId } from '@/lib/blog-author';
import { AuthorInfo } from '@/components/blog/AuthorInfo';

// ISR: 60秒ごとにページを再検証して閲覧数を更新
export const revalidate = 60;

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  try {
    const { id } = await params;
    const blog = await getBlog(id);
    
    // デバッグ: コンテンツに画像が含まれているか確認
    if (blog.content && typeof blog.content === 'string') {
      const imageMatches = blog.content.match(/<img[^>]*>/gi);
      if (imageMatches && imageMatches.length > 0) {
        console.log('ブログコンテンツに画像タグが検出されました:', imageMatches.length, '個');
        console.log('最初の画像タグ:', imageMatches[0]);
      }
    }
    
    const viewCount = await getBlogViewCount(id);
    
    // 著者情報を取得
    const author = await getAuthorByBlogUserId(blog.user_id);

    // 読了時間の計算（簡易版）
    const readingTime = Math.ceil(
      blog.content.replace(/<[^>]*>/g, '').length / 400
    );

    // コンテンツの改行を適切に処理 - MicroCMSの各種パターンに対応
    // 画像タグを一時的に保護
    const imagePlaceholders: string[] = [];
    let contentWithProtectedImages = blog.content.replace(/<img[^>]*>/gi, (match) => {
      const placeholder = `__IMAGE_PLACEHOLDER_${imagePlaceholders.length}__`;
      imagePlaceholders.push(match);
      return placeholder;
    });

    // 改行処理
    let processedContent = contentWithProtectedImages
      .replace(/<p><\/p>/g, '<br>') // 空のpタグを改行に変換
      .replace(/<p>\s*<\/p>/g, '<br>') // 空白のみのpタグを改行に変換
      .replace(/<p>&nbsp;<\/p>/g, '<br>') // &nbsp;のみのpタグを改行に変換
      .replace(/<p><br><\/p>/g, '<br>') // brタグのみのpタグを改行に変換
      .replace(/<p><br\/><\/p>/g, '<br>') // 自己終了brタグのpタグを改行に変換
      .replace(/(<\/p>)\s*(<p>)/g, '$1<br>$2') // 連続するpタグ間に改行を追加
      .replace(/\r\n/g, '\n') // Windows改行を統一
      .replace(/\r/g, '\n') // Mac改行を統一
      .replace(/\n/g, '<br>'); // 残りの改行をBRタグに変換

    // 画像タグを復元
    imagePlaceholders.forEach((imageTag, index) => {
      processedContent = processedContent.replace(
        `__IMAGE_PLACEHOLDER_${index}__`,
        imageTag
      );
    });

    return (
      <div className="min-h-screen bg-gradient-subtle">
        {/* 閲覧数記録コンポーネント */}
        <BlogViewTracker blogId={id} />

        <div className="container mx-auto px-4 py-8">
          {/* 戻るボタンと編集ボタン */}
          <div className="mb-8 flex justify-between items-center">
            <Button variant="ghost" asChild>
              <Link href="/blog" className="group">
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                ブログ一覧に戻る
              </Link>
            </Button>

            {/* 編集ボタン（全ユーザー利用可能） */}
            <Button variant="outline" asChild>
              <Link href={`/blog/edit/${id}`} className="group">
                <Edit className="h-4 w-4 mr-2" />
                記事を編集
              </Link>
            </Button>
          </div>

          <article className="max-w-4xl mx-auto">
            {/* ヘッダー */}
            <header className="mb-12 text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                {blog.title}
              </h1>

              {/* 著者情報 */}
              <div className="mb-6 flex justify-center">
                <AuthorInfo author={author} showBio={true} />
              </div>

              <div className="flex items-center justify-center gap-6 text-muted-foreground flex-wrap">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <time dateTime={blog.publishedAt}>
                    {new Date(blog.publishedAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>

                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />約{readingTime}分で読めます
                </div>

                {/* 閲覧数を追加 */}
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  {viewCount.view_count.toLocaleString()}回閲覧
                </div>
              </div>
            </header>

            {/* アイキャッチ画像 */}
            {blog.image && (
              <div className="mb-12 rounded-2xl overflow-hidden shadow-elegant">
                <Image
                  src={blog.image.url}
                  alt={blog.title}
                  width={blog.image.width}
                  height={blog.image.height}
                  className="w-full h-64 md:h-96 object-cover"
                  priority
                />
              </div>
            )}

            {/* 記事本文 */}
            <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-8 md:p-12 shadow-soft">
              <div
                className="text-foreground/90 leading-relaxed
                  [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-foreground
                  [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:text-foreground
                  [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:text-foreground
                  [&_p]:mb-4 [&_p]:leading-relaxed
                  [&_a]:text-primary [&_a]:hover:underline
                  [&_strong]:font-semibold [&_strong]:text-foreground
                  [&_em]:italic
                  [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4
                  [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4
                  [&_li]:mb-1
                  [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:mb-4
                  [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-primary
                  [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-4
                  [&_img]:rounded-lg [&_img]:shadow-soft [&_img]:mb-4 [&_img]:max-w-full [&_img]:h-auto [&_img]:block [&_img]:mx-auto
                  [&_.blog-content-image]:rounded-lg [&_.blog-content-image]:shadow-soft [&_.blog-content-image]:mb-4 [&_.blog-content-image]:max-w-full [&_.blog-content-image]:h-auto [&_.blog-content-image]:block [&_.blog-content-image]:mx-auto [&_.blog-content-image]:my-5"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            </div>

            {/* フッター */}
            <footer className="mt-16 pt-8 border-t border-border/50 text-center">
              <Button variant="hero" size="lg" asChild>
                <Link href="/blog">
                  他の記事も読む
                  <ArrowLeft className="h-5 w-5 ml-2 rotate-180" />
                </Link>
              </Button>
            </footer>
          </article>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}

// 静的生成のためのパス生成
export async function generateStaticParams() {
  try {
    const { contents: blogs } = await getBlogs();

    return blogs.map((blog: Blog) => ({
      id: blog.id,
    }));
  } catch {
    return [];
  }
}

// メタデータ生成
export async function generateMetadata({ params }: BlogDetailPageProps) {
  try {
    const { id } = await params;
    const blog = await getBlog(id);

    // HTMLタグと改行コードを除去してメタデータ用のテキストを生成
    const cleanText = blog.content
      .replace(/<[^>]*>/g, '')
      .replace(/\n|\r\n|\r/g, ' ')
      .substring(0, 160);

    return {
      title: `${blog.title} | アイデアマーケット ブログ`,
      description: cleanText,
      openGraph: {
        title: blog.title,
        description: cleanText,
        images: blog.image ? [blog.image.url] : [],
        type: 'article',
        publishedTime: blog.publishedAt,
      },
    };
  } catch {
    return {
      title: 'ブログ記事が見つかりません | アイデアマーケット',
    };
  }
}
