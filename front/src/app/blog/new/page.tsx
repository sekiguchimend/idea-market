'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Category, Author } from '@/lib/microcms';
import {
  ArrowLeft,
  Save,
  Eye,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image,
  Type,
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentUser, getProfile } from '@/lib/supabase/auth';

// 現在のユーザー情報を取得（IDとdisplay_name）
const getCurrentUserInfo = async (): Promise<{ id: string; displayName: string } | null> => {
  const { user, error } = await getCurrentUser();
  if (error || !user) {
    console.error('ユーザ情報取得エラー:', error);
    return null;
  }

  // プロファイルからdisplay_nameを取得
  const { data: profile, error: profileError } = await getProfile(user.id);
  if (profileError) {
    console.error('プロファイル取得エラー:', profileError);
  }

  // メールアドレスは最初の5文字 + "..." で表示
  const emailDisplayName = user.email ? user.email.substring(0, 5) + '...' : '名無し';

  return {
    id: user.id,
    displayName: profile?.display_name || emailDisplayName,
  };
};



interface BlogCreateData {
  title: string;
  content: string;
  category: string;
  user_id: string;
  publishedAt?: string;
}

export default function BlogNewPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [authorsLoaded, setAuthorsLoaded] = useState(false);
  const [formData, setFormData] = useState<BlogCreateData>({
    title: '',
    content: '',
    category: '',
    user_id: '',
  });
  const [preview, setPreview] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  
  // 著者登録の実行フラグを追加
  const authorCheckExecutedRef = useRef(false);

  // カテゴリデータを取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        setCategories(data.contents || []);
      } catch (error) {
        console.error('カテゴリの取得に失敗しました:', error);
        // エラー時もUIをブロックしない
      } finally {
        setCategoriesLoaded(true);
      }
    };
    fetchCategories();
  }, []);

  // 著者データを取得
  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const response = await fetch('/api/authors');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        setAuthors(data.contents || []);
        setAuthorsLoaded(true); // 読み込み完了フラグを設定
      } catch (error) {
        console.error('著者の取得に失敗しました:', error);
        toast({
          title: 'エラー',
          description: '著者の取得に失敗しました',
          variant: 'destructive',
        });
      }
    };
    fetchAuthors();
  }, []);

  // 現在のユーザーが著者として登録されているかをチェック、登録されていない場合はmicroCMSに登録する
  // 注意: 著者登録に失敗してもブログ作成は可能（user_idはSupabaseから取得）
  useEffect(() => {
    const checkAuthor = async () => {
      // 既に実行済みの場合は何もしない
      if (authorCheckExecutedRef.current) {
        return;
      }

      try {
        const userInfo = await getCurrentUserInfo();
        if (userInfo === null) {
          console.error('ユーザー情報が取得できませんでした');
          authorCheckExecutedRef.current = true; // 再試行を防ぐ
          return;
        }

        if (!authors.map((author) => author.user_id).includes(userInfo.id)) {
          // 実行フラグを設定
          authorCheckExecutedRef.current = true;

          const response = await fetch('/api/authors', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: userInfo.id,
              name: userInfo.displayName, // Supabaseから取得した表示名を送信
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            // 著者登録失敗はログに記録するが、ブログ作成は続行可能
            console.warn('著者登録に失敗しました（ブログ作成は可能です）:', data.error || data.details);
            return;
          }

          // 成功した場合、著者リストを再取得して状態を更新
          if (data.author) {
            setAuthors(prevAuthors => [...prevAuthors, data.author]);
          }
        } else {
          // 既に登録済みの場合もフラグを設定
          authorCheckExecutedRef.current = true;
        }
      } catch (error) {
        // 著者登録失敗はログに記録するが、ブログ作成は続行可能
        console.warn('著者登録処理でエラーが発生しました（ブログ作成は可能です）:', error);
        authorCheckExecutedRef.current = true; // 再試行を防ぐ
      }
    };

    // 著者データが読み込まれ、まだ実行されていない場合のみ実行
    if (authorsLoaded && !authorCheckExecutedRef.current) {
      checkAuthor();
    }
  }, [authorsLoaded, authors]);

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'エラー',
        description: 'タイトルと内容は必須です',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: 'エラー',
        description: 'カテゴリの選択は必須です',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 現在のユーザー情報を取得
      const userInfo = await getCurrentUserInfo();
      if (!userInfo) {
        throw new Error('ユーザー情報が取得できませんでした。ログインしてください。');
      }
      const currentUserId = userInfo.id;

      // エディターから最新のコンテンツを取得（画像を含む）
      let finalContent = formData.content;
      if (editableRef.current) {
        finalContent = editableRef.current.innerHTML;
        console.log('エディターから取得したコンテンツ:', finalContent.substring(0, 200));
      }

      // コンテンツ内の画像が正しく含まれているか確認
      const contentHasImages = finalContent.includes('<img');
      if (contentHasImages) {
        const imageTags = finalContent.match(/<img[^>]*>/gi);
        console.log('画像が含まれています:', imageTags?.length, '個');
        console.log('画像タグ:', imageTags);
      } else {
        console.warn('警告: コンテンツに画像が含まれていません');
      }

      const submitData = {
        ...formData,
        content: finalContent, // エディターから取得した最新のコンテンツを使用
        status: 'PUBLISH',
        user_id: currentUserId,
        publishedAt: new Date().toISOString(),
        ...(formData.category && { category: formData.category }),
      };

      const response = await fetch('/api/blog/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ブログ記事の作成に失敗しました');
      }

      toast({
        title: '成功',
        description: 'ブログ記事が公開されました',
      });

      // 作成された記事の詳細ページにリダイレクト
      if (result.blogId) {
        router.push(`/blog/${result.blogId}`);
      } else {
        router.push('/blog');
      }
    } catch (error: any) {
      console.error('ブログ作成エラー:', error);
      toast({
        title: 'エラー',
        description: error.message || 'ブログ記事の作成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof BlogCreateData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // 編集可能プレビューのコンテンツが変更された時のハンドラー
  const handleEditablePreviewChange = () => {
    if (editableRef.current) {
      const newContent = editableRef.current.innerHTML;
      setFormData(prev => ({
        ...prev,
        content: newContent,
      }));
      
      // 既存の画像にクリックイベントを追加
      const images = editableRef.current.querySelectorAll('img');
      images.forEach((img) => {
        // 既にイベントリスナーが追加されているかチェック
        if (!img.hasAttribute('data-image-click-handler')) {
          img.setAttribute('data-image-click-handler', 'true');
          img.setAttribute('contenteditable', 'false');
          img.style.cursor = 'pointer';
          img.addEventListener('click', (e) => {
            e.preventDefault();
            const shouldDelete = window.confirm('この画像を削除しますか？\n\n削除する場合は「OK」、キャンセルする場合は「キャンセル」をクリックしてください。');
            if (shouldDelete && img.parentNode) {
              img.remove();
              handleEditablePreviewChange();
            }
          });
        }
      });
    }
  };

  // 選択範囲を取得するヘルパー関数
  const getSelectionRange = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    return selection.getRangeAt(0);
  };

  // 選択テキストを指定タグで囲む関数
  const wrapSelectionWithTag = (tagName: string) => {
    const range = getSelectionRange();
    if (!range || range.collapsed) return;

    try {
      const element = document.createElement(tagName);
      element.appendChild(range.extractContents());
      range.insertNode(element);

      // 選択範囲をクリア
      window.getSelection()?.removeAllRanges();
      handleEditablePreviewChange();
    } catch (error) {
      console.error('テキストのフォーマットに失敗しました:', error);
    }
  };

  // ブロック要素で囲む関数
  const wrapSelectionWithBlock = (tagName: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();

      if (selectedText) {
        const element = document.createElement(tagName);
        element.textContent = selectedText;
        range.deleteContents();
        range.insertNode(element);
      } else {
        // 選択がない場合は新しいブロック要素を挿入
        const element = document.createElement(tagName);
        element.textContent =
          tagName === 'h1'
            ? '見出し1'
            : tagName === 'h2'
              ? '見出し2'
              : tagName === 'h3'
                ? '見出し3'
                : tagName === 'blockquote'
                  ? '引用テキスト'
                  : '新しい段落';
        range.insertNode(element);
      }

      selection.removeAllRanges();
      handleEditablePreviewChange();
    } catch (error) {
      console.error('ブロック要素の作成に失敗しました:', error);
    }
  };

  // リスト作成関数
  const createList = (listType: 'ul' | 'ol') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();

      const listElement = document.createElement(listType);
      const listItem = document.createElement('li');
      listItem.textContent = selectedText || 'リスト項目';
      listElement.appendChild(listItem);

      if (selectedText) {
        range.deleteContents();
      }
      range.insertNode(listElement);

      selection.removeAllRanges();
      handleEditablePreviewChange();
    } catch (error) {
      console.error('リストの作成に失敗しました:', error);
    }
  };

  // WYSIWYGエディターのフォーマット処理
  const wysiwygFormatHandlers = {
    bold: () => wrapSelectionWithTag('strong'),
    italic: () => wrapSelectionWithTag('em'),
    h1: () => wrapSelectionWithBlock('h1'),
    h2: () => wrapSelectionWithBlock('h2'),
    h3: () => wrapSelectionWithBlock('h3'),
    paragraph: () => wrapSelectionWithBlock('p'),
    ul: () => createList('ul'),
    ol: () => createList('ol'),
    quote: () => wrapSelectionWithBlock('blockquote'),
    link: () => {
      // TODO: モーダル化してより良いUI/UXを実装する
      // eslint-disable-next-line no-alert
      const url = window.prompt('リンクURLを入力してください:');
      if (url) {
        const range = getSelectionRange();
        if (range) {
          try {
            const linkElement = document.createElement('a');
            linkElement.href = url;
            linkElement.textContent = range.toString() || url;

            if (range.toString()) {
              range.deleteContents();
            }
            range.insertNode(linkElement);

            window.getSelection()?.removeAllRanges();
            handleEditablePreviewChange();
          } catch (error) {
            console.error('リンクの作成に失敗しました:', error);
          }
        }
      }
    },
    image: async () => {
      // ファイル選択ダイアログを開く
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/jpg,image/png,image/webp,image/gif';
      input.style.display = 'none';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // ファイルサイズチェック（10MB）
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast({
            title: 'エラー',
            description: 'ファイルサイズが大きすぎます。最大10MBまでのファイルを選択してください。',
            variant: 'destructive',
          });
          return;
        }

        // ローディング表示
        const range = getSelectionRange();
        let loadingElement: HTMLDivElement | null = null;
        if (range) {
          loadingElement = document.createElement('div');
          loadingElement.textContent = '画像をアップロード中...';
          loadingElement.style.padding = '10px';
          loadingElement.style.border = '1px dashed #ccc';
          loadingElement.style.borderRadius = '4px';
          loadingElement.style.color = '#666';
          range.insertNode(loadingElement);
          window.getSelection()?.removeAllRanges();
        }

        try {
          // FormDataを作成
          const formData = new FormData();
          formData.append('file', file);

          // APIにアップロード
          const response = await fetch('/api/blog/upload-image', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || '画像のアップロードに失敗しました');
          }

          // ローディング要素を削除
          if (loadingElement && loadingElement.parentNode) {
            loadingElement.remove();
          }

          // 画像を挿入
          if (range) {
            const imgElement = document.createElement('img');
            imgElement.src = result.url;
            imgElement.alt = '画像';
            imgElement.className = 'blog-content-image';
            imgElement.style.maxWidth = '100%';
            imgElement.style.height = 'auto';
            imgElement.style.display = 'block';
            imgElement.style.margin = '20px auto';
            imgElement.style.borderRadius = '8px';
            imgElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            imgElement.style.cursor = 'pointer';
            imgElement.setAttribute('contenteditable', 'false');
            
            // 画像をクリックしたときの処理（削除や編集）
            imgElement.addEventListener('click', (e) => {
              e.preventDefault();
              const shouldDelete = window.confirm('この画像を削除しますか？\n\n削除する場合は「OK」、キャンセルする場合は「キャンセル」をクリックしてください。');
              if (shouldDelete && imgElement.parentNode) {
                imgElement.remove();
                handleEditablePreviewChange();
              }
            });
            
            // 画像の読み込みエラーハンドリング
            imgElement.onerror = () => {
              imgElement.style.display = 'none';
              const errorDiv = document.createElement('div');
              errorDiv.textContent = '画像の読み込みに失敗しました';
              errorDiv.style.padding = '10px';
              errorDiv.style.border = '1px dashed #ccc';
              errorDiv.style.borderRadius = '4px';
              errorDiv.style.color = '#999';
              errorDiv.style.textAlign = 'center';
              imgElement.parentNode?.replaceChild(errorDiv, imgElement);
            };

            // 画像のサイズを取得して設定
            const img = new window.Image();
            img.onload = () => {
              imgElement.width = img.width;
              imgElement.height = img.height;
              handleEditablePreviewChange();
            };
            img.onerror = () => {
              console.error('画像の読み込みに失敗しました:', result.url);
            };
            img.src = result.url;

            range.insertNode(imgElement);
            window.getSelection()?.removeAllRanges();
            handleEditablePreviewChange();

            toast({
              title: '成功',
              description: '画像をアップロードしました',
            });
          }
        } catch (error: any) {
          console.error('画像のアップロードに失敗しました:', error);
          
          // ローディング要素を削除
          if (loadingElement && loadingElement.parentNode) {
            loadingElement.remove();
          }

          toast({
            title: 'エラー',
            description: error.message || '画像のアップロードに失敗しました',
            variant: 'destructive',
          });
        }
      };

      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    },
  };

  return (
    <div className="min-h-screen bg-gradient-subtle py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/blog"
            className="inline-flex items-center text-primary hover:text-primary/80 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ブログ一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">新しい記事を作成</h1>
        </div>

        <div className="space-y-6">
          {/* メインフォーム */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>記事の詳細</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* タイトル */}
                <div className="space-y-2">
                  <Label htmlFor="title">タイトル *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => handleInputChange('title', e.target.value)}
                    placeholder="記事のタイトルを入力してください"
                    className="text-lg"
                  />
                </div>

                {/* カテゴリ */}
                <div className="space-y-2">
                  <Label htmlFor="category">カテゴリ *</Label>
                  <Select
                    value={formData.category || ''}
                    onValueChange={value =>
                      handleInputChange('category', value)
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="カテゴリを選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{category.name}</span>
                            {category.description && (
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {category.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categories.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {categoriesLoaded
                        ? 'カテゴリがありません（microCMSでカテゴリを作成してください）'
                        : 'カテゴリを読み込み中...'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>記事コンテンツ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* ビジュアルエディター用ツールバー */}
                <div className="border rounded-lg p-3 bg-muted/50">
                  <div className="flex flex-wrap gap-2">
                    {/* テキストフォーマット */}
                    <div className="flex gap-1 border-r pr-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={wysiwygFormatHandlers.bold}
                        title="太字 (Ctrl+B)"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={wysiwygFormatHandlers.italic}
                        title="斜体 (Ctrl+I)"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* 見出し */}
                    <div className="flex gap-1 border-r pr-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={wysiwygFormatHandlers.h1}
                        title="見出し1"
                      >
                        <Heading1 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={wysiwygFormatHandlers.h2}
                        title="見出し2"
                      >
                        <Heading2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={wysiwygFormatHandlers.h3}
                        title="見出し3"
                      >
                        <Heading3 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={wysiwygFormatHandlers.paragraph}
                        title="段落"
                      >
                        <Type className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* リスト */}
                    <div className="flex gap-1 border-r pr-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={wysiwygFormatHandlers.ul}
                        title="箇条書きリスト"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={wysiwygFormatHandlers.ol}
                        title="番号付きリスト"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* その他 */}
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={wysiwygFormatHandlers.quote}
                        title="引用"
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={wysiwygFormatHandlers.link}
                        title="リンク"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={wysiwygFormatHandlers.image}
                        title="画像"
                      >
                        <Image className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mt-2 p-2 bg-blue-100 dark:bg-blue-900 rounded">
                    💡 ショートカット: Ctrl+B (太字), Ctrl+I (斜体) |
                    直接テキストをクリックして編集できます
                  </div>
                </div>

                {/* 常時編集可能エリア */}
                <div className="border rounded-lg p-6 bg-background min-h-[400px]">
                  <h3
                    className="text-2xl font-bold mb-6 border-b border-transparent hover:border-muted transition-colors cursor-text"
                    contentEditable={true}
                    onBlur={e => {
                      handleInputChange(
                        'title',
                        e.currentTarget.textContent || ''
                      );
                    }}
                    suppressContentEditableWarning={true}
                  >
                    {formData.title || 'タイトルを入力してください'}
                  </h3>

                  <div
                    ref={editableRef}
                    contentEditable={true}
                    onInput={handleEditablePreviewChange}
                    className="prose prose-sm max-w-none min-h-[300px] outline-none cursor-text
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
                      [&_img]:rounded-lg [&_img]:shadow-soft [&_img]:mb-4 [&_img]:max-w-full [&_img]:h-auto [&_img]:block [&_img]:mx-auto [&_img]:my-5
                      [&_.blog-content-image]:rounded-lg [&_.blog-content-image]:shadow-soft [&_.blog-content-image]:mb-4 [&_.blog-content-image]:max-w-full [&_.blog-content-image]:h-auto [&_.blog-content-image]:block [&_.blog-content-image]:mx-auto [&_.blog-content-image]:my-5
                      focus:ring-2 focus:ring-primary focus:ring-opacity-50 rounded-lg"
                    suppressContentEditableWarning={true}
                  >
                    {!formData.content && (
                      <p className="text-muted-foreground">
                        コンテンツを入力してください...
                      </p>
                    )}
                  </div>

                  <div className="mt-4 text-sm text-muted-foreground flex justify-between">
                    <span>
                      ✏️ 直接クリックして編集 | ツールバーでフォーマット
                    </span>
                    <span>{formData.content?.length || 0} / 50,000文字</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* プレビュー */}
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle>プレビュー</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-white">
                  <h3 className="text-xl font-bold mb-3">
                    {formData.title || 'タイトルなし'}
                  </h3>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: formData.content || '<p>内容がありません</p>',
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* アクションと記事情報 */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* アクション */}
            <Card>
              <CardHeader>
                <CardTitle>アクション</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setPreview(!preview)}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {preview ? 'プレビューを閉じる' : 'プレビューを表示'}
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? '公開中...' : '記事を公開する'}
                </Button>
              </CardContent>
            </Card>

            {/* 記事情報 */}
            <Card>
              <CardHeader>
                <CardTitle>記事情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">文字数:</span>
                    <span>{formData.content?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">カテゴリ:</span>
                    <span className={!formData.category ? 'text-red-500' : ''}>
                      {formData.category
                        ? categories.find(cat => cat.id === formData.category)
                            ?.name || '不明'
                        : '未選択（必須）'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ステータス:</span>
                    <span>公開予定</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
