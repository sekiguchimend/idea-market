'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  getIdeaById,
  getCommentsByIdeaId,
  createComment,
  deleteIdea,
  checkUserPurchasedIdea,
} from '@/lib/supabase/ideas';
import {
  Calendar,
  Edit,
  MessageSquare,
  User,
  Clock,
  Trash2,
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  CreditCard,
  Users,
  CheckCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/StableAuthContext';
import GoogleAdsense from '@/components/GoogleAdsense';
import { getFileUrl } from '@/lib/supabase/storage';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  // DialogTrigger, // 現在未使用
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { IdeaDetail, Comment, AttachmentInfo } from '@/types/ideas';
import { purchaseIdea } from '@/lib/supabase/ideas';
import { validateNoProfanity } from '@/lib/utils/profanity-filter';

// 購入フォームの型定義
interface PurchaseFormData {
  companyOrName: string;
  industry: string;
  contactPerson: string;
  phoneNumber: string;
  formalDocumentation: 'required' | 'not_required';
}

interface PurchaseFormErrors {
  companyOrName?: string;
  contactPerson?: string;
  phoneNumber?: string;
}

export default function IdeaDetailPage() {
  const [idea, setIdea] = useState<IdeaDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<AttachmentInfo[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  
  // 購入フォーム関連の状態
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<1 | 2>(1); // 購入フローのステップ管理
  const [purchaseFormData, setPurchaseFormData] = useState<PurchaseFormData>({
    companyOrName: '',
    industry: '',
    contactPerson: '',
    phoneNumber: '',
    formalDocumentation: 'not_required',
  });
  const [purchaseFormErrors, setPurchaseFormErrors] = useState<PurchaseFormErrors>({});
  const [isPurchaseSubmitting, setIsPurchaseSubmitting] = useState(false);
  const [hasPurchased, setHasPurchased] = useState<boolean>(false);
  const [checkingPurchase, setCheckingPurchase] = useState<boolean>(false);
  
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const ideaId = params.id as string;

  // 価格フォーマット関数
  const formatPrice = (price: number | string | null): string => {
    if (!price) return '価格未設定';
    const numPrice = typeof price === 'number' ? price : parseInt(price, 10);
    return `¥${numPrice.toLocaleString()}`;
  };

  // 購入可能かどうかを判定
  const canPurchase = () => {
    if (!idea) return false;
    // 独占契約でsoldoutの場合は購入不可
    if (idea.is_exclusive && idea.status === 'soldout') {
      return false;
    }
    // closed状態の場合は購入可能
    return idea.status === 'closed';
  };

  // 購入ボタン押下時の処理
  const handlePurchase = () => {
    if (!user) {
      toast({
        title: 'ログインが必要です',
        description: '購入するにはログインしてください。',
        variant: 'destructive',
      });
      return;
    }
    if (!canPurchase()) {
      toast({
        title: '購入できません',
        description: 'このアイデアは購入できません。',
        variant: 'destructive',
      });
      return;
    }
    setIsPurchaseModalOpen(true);
  };

  // 購入フォームの入力処理
  const handlePurchaseFormChange = (field: keyof PurchaseFormData, value: string) => {
    // 電話番号は数字のみ保持
    if (field === 'phoneNumber') {
      value = value.replace(/\D/g, '');
    }
    setPurchaseFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // エラーをクリア
    if (purchaseFormErrors[field as keyof PurchaseFormErrors]) {
      setPurchaseFormErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  // 購入フォームのバリデーション
  const validatePurchaseForm = (): boolean => {
    const newErrors: PurchaseFormErrors = {};

    if (!purchaseFormData.companyOrName.trim()) {
      newErrors.companyOrName = '企業名またはお名前は必須です';
    }

    if (!purchaseFormData.contactPerson.trim()) {
      newErrors.contactPerson = 'ご担当者様は必須です';
    }

    if (!purchaseFormData.phoneNumber.trim()) {
      newErrors.phoneNumber = '電話番号は必須です';
    } else if (!/^\d+$/.test(purchaseFormData.phoneNumber)) {
      newErrors.phoneNumber = '数字のみで入力してください（ハイフン不可）';
    }

    setPurchaseFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 合計金額計算
  const calculateTotalAmount = () => {
    const basePrice = Number(idea?.price) || 0;
    const formalDocumentationFee = purchaseFormData.formalDocumentation === 'required' ? 25000 : 0;
    return basePrice + formalDocumentationFee;
  };

  // 購入フォーム送信処理（第1ステップ）
  const handlePurchaseFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePurchaseForm()) {
      return;
    }

    // 第1ステップから第2ステップ（支払い画面）に進む
    setPurchaseStep(2);
  };

  // 最終的な注文確定処理
  const handleOrderConfirmation = async () => {
    try {
      setIsPurchaseSubmitting(true);
      if (!user) {
        toast({
          title: 'ログインが必要です',
          description: '購入するにはログインしてください。',
          variant: 'destructive',
        });
        return;
      }

      // Supabase RPC を呼び出し（sold作成 + ideasを更新）
      const { error: purchaseError } = await purchaseIdea({
        ideaId,
        userId: user.id,
        phoneNumber: purchaseFormData.phoneNumber,
        company: purchaseFormData.companyOrName,
        manager: purchaseFormData.contactPerson,
      });

      if (purchaseError) {
        let errorMessage = '購入処理に失敗しました。';
        if (purchaseError.code === '23505') {
          errorMessage = 'このアイデアは既に売り切れです。';
        }
        toast({
          title: 'エラー',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: '注文情報を受け付けました',
        description: 'ご入力いただいた情報で注文を進めさせていただきます。',
      });

      // アイデア情報を再取得して最新の状態を反映
      const { data: updatedIdea } = await getIdeaById(ideaId);
      if (updatedIdea) {
        setIdea(updatedIdea);
        // 購入済み状態を更新
        setHasPurchased(true);
      } else {
        // 再取得に失敗した場合、ローカル状態を更新
        // 独占契約の場合はsoldout、通常購入の場合はpurchase_countを更新
        setIdea(prev => {
          if (!prev) return prev;
          if (prev.is_exclusive) {
            return { ...prev, status: 'soldout' };
          } else {
            return { ...prev, purchase_count: (prev.purchase_count || 0) + 1 };
          }
        });
      }

      // フォームをリセット
      setPurchaseFormData({
        companyOrName: '',
        industry: '',
        contactPerson: '',
        phoneNumber: '',
        formalDocumentation: 'not_required',
      });
      setPurchaseFormErrors({});
      setPurchaseStep(1);
      setIsPurchaseModalOpen(false);

    } catch (error) {
      toast({
        title: 'エラー',
        description: '注文処理中にエラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsPurchaseSubmitting(false);
    }
  };

  // 支払い画面から戻る処理
  const handleBackToForm = () => {
    setPurchaseStep(1);
  };

  const loadAttachments = useCallback(async () => {
    if (!idea || !idea.attachments || idea.attachments.length === 0) {
      return;
    }

    try {
      setLoadingAttachments(true);

      const attachmentsWithUrls = await Promise.all(
        idea.attachments.map(async filePath => {
          const url = await getFileUrl(filePath);
          // ファイル拡張子から画像かどうかを判定
          const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(filePath);
          // ファイル名を取得
          const fileName = filePath.split('/').pop() || filePath;

          return {
            path: filePath,
            url,
            isImage,
            fileName,
          };
        })
      );

      setAttachmentUrls(attachmentsWithUrls);
    } catch (error) {
      toast({
        title: 'エラー',
        description: '添付ファイルの読み込みに失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setLoadingAttachments(false);
    }
  }, [idea]);

  const openGallery = (index: number) => {
    setSelectedImageIndex(index);
    setIsGalleryOpen(true);
  };

  const closeGallery = () => {
    setIsGalleryOpen(false);
    setSelectedImageIndex(null);
  };

  const goToPrevImage = () => {
    const imageFiles = attachmentUrls.filter(file => file.isImage);
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    } else if (selectedImageIndex !== null) {
      setSelectedImageIndex(imageFiles.length - 1);
    }
  };

  const goToNextImage = () => {
    const imageFiles = attachmentUrls.filter(file => file.isImage);
    if (
      selectedImageIndex !== null &&
      selectedImageIndex < imageFiles.length - 1
    ) {
      setSelectedImageIndex(selectedImageIndex + 1);
    } else if (selectedImageIndex !== null) {
      setSelectedImageIndex(0);
    }
  };

  const fetchIdea = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getIdeaById(ideaId);

      if (error) {
        toast({
          title: 'エラー',
          description: 'アイデアの取得に失敗しました。',
          variant: 'destructive',
        });
        router.push('/ideas');
        return;
      }

      if (!data) {
        toast({
          title: 'エラー',
          description: 'アイデアが見つかりませんでした。',
          variant: 'destructive',
        });
        router.push('/ideas');
        return;
      }

      setIdea(data);
    } catch (error) {
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました。',
        variant: 'destructive',
      });
      router.push('/ideas');
    } finally {
      setLoading(false);
    }
  }, [ideaId, router]);

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await getCommentsByIdeaId(ideaId);

      if (error) {
        return;
      }

      if (data) {
        setComments(data);
      } else {
        setComments([]);
      }
    } catch (error) {
      // エラーは無視
    }
  }, [ideaId]);

  // データ取得とコンポーネントマウント時の処理
  useEffect(() => {
    fetchIdea();
    fetchComments();
  }, [fetchIdea, fetchComments]);

  // 購入済みチェック
  useEffect(() => {
    const checkPurchase = async () => {
      if (!user || !ideaId) {
        setHasPurchased(false);
        return;
      }

      try {
        setCheckingPurchase(true);
        const purchased = await checkUserPurchasedIdea(user.id, ideaId);
        setHasPurchased(purchased);
      } catch (error) {
        setHasPurchased(false); // エラー時は購入可能として扱う
      } finally {
        setCheckingPurchase(false);
      }
    };

    checkPurchase();
  }, [user, ideaId]);

  // アイデアが変更された時に添付ファイルを読み込む
  useEffect(() => {
    if (idea) {
      loadAttachments();
    }
  }, [idea, loadAttachments]);

  const handleEditIdea = () => {
    if (!user) {
      toast({
        title: 'ログインが必要です',
        description: '編集するにはログインしてください。',
        variant: 'destructive',
      });
      router.push(
        `/login?redirect=${encodeURIComponent(`/ideas/${ideaId}/edit`)}`
      );
      return;
    }

    if (idea && idea.author_id !== user.id) {
      toast({
        title: '権限エラー',
        description: 'このアイデアの編集権限がありません。',
        variant: 'destructive',
      });
      return;
    }

    router.push(`/ideas/${ideaId}/edit`);
  };

  const handleDeleteIdea = async () => {
    if (!user) {
      toast({
        title: 'ログインが必要です',
        description: '削除するにはログインしてください。',
        variant: 'destructive',
      });
      return;
    }

    if (idea && idea.author_id !== user.id) {
      toast({
        title: '権限エラー',
        description: 'このアイデアの削除権限がありません。',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await deleteIdea(ideaId);

      if (error) {
        toast({
          title: 'エラー',
          description: 'アイデアの削除に失敗しました。',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: '成功',
        description: 'アイデアを削除しました。',
      });

      router.push('/my/ideas');
    } catch (error) {
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました。',
        variant: 'destructive',
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: 'ログインが必要です',
        description: 'コメントを投稿するにはログインしてください。',
        variant: 'destructive',
      });
      return;
    }

    if (!commentText.trim()) {
      toast({
        title: 'エラー',
        description: 'コメント内容を入力してください。',
        variant: 'destructive',
      });
      return;
    }

    // 30字以上のバリデーション
    if (commentText.trim().length < 30) {
      toast({
        title: 'エラー',
        description: 'コメントは30字以上で入力してください。',
        variant: 'destructive',
      });
      return;
    }

    // 不適切な言葉チェック
    const profanityCheck = validateNoProfanity(commentText.trim());
    if (!profanityCheck.valid) {
      toast({
        title: 'エラー',
        description: profanityCheck.error || '不適切な言葉が含まれています。',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCommentSubmitting(true);
      const { data, error } = await createComment(
        ideaId,
        commentText.trim(),
        user.id
      );

      if (error) {
        toast({
          title: 'エラー',
          description: 'コメントの投稿に失敗しました。',
          variant: 'destructive',
        });
        return;
      }

      if (data) {
        // コメント投稿成功
        setCommentText('');
        toast({
          title: '成功',
          description: 'コメントを投稿しました。',
        });

        // コメント一覧を再取得
        fetchComments();
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                アイデア詳細を読み込み中...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold mb-4">
                アイデアが見つかりません
              </h1>
              <p className="text-muted-foreground mb-6">
                指定されたアイデアは存在しないか、削除された可能性があります。
              </p>
              <Button onClick={() => router.push('/ideas')}>
                アイデア一覧に戻る
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ユーザーがアイデアの作成者かどうかチェック
  const isAuthor = user && idea.author_id === user.id;
  const imageFiles = attachmentUrls.filter(file => file.isImage);

  return (
    <>
      {/* 画像ギャラリーモーダル */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
          <VisuallyHidden>
            <DialogTitle>画像ギャラリー</DialogTitle>
          </VisuallyHidden>
          {selectedImageIndex !== null && imageFiles[selectedImageIndex] && (
            <div className="relative w-full h-full">
              {/* ボタン */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
                onClick={closeGallery}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* 画像表示 */}
              <div className="w-full h-full flex items-center justify-center bg-black">
                <Image
                  src={imageFiles[selectedImageIndex].url}
                  alt={imageFiles[selectedImageIndex].fileName}
                  width={800}
                  height={600}
                  className="max-w-full max-h-full object-contain"
                  unoptimized
                />
              </div>

              {/* ナビゲーションボタン */}
              {imageFiles.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={goToPrevImage}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={goToNextImage}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* 画像情報 */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/70 text-white p-3 rounded-lg">
                  <p className="text-sm font-medium">
                    {imageFiles[selectedImageIndex].fileName}
                  </p>
                  <p className="text-xs text-gray-300">
                    {selectedImageIndex + 1} / {imageFiles.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 購入フォームモーダル */}
      <Dialog 
        open={isPurchaseModalOpen} 
        onOpenChange={(open) => {
          setIsPurchaseModalOpen(open);
          if (!open) {
            setPurchaseStep(1); // モーダルを閉じるときはステップをリセット
          }
        }}
      >
        <DialogContent className="max-w-lg w-full max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {purchaseStep === 1 ? '注文者情報入力' : 'お支払い情報'}
            </DialogTitle>
            <DialogDescription>
              {purchaseStep === 1 
                ? '以下の情報をご入力ください。' 
                : 'お支払い方法をご確認ください。'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0 px-1">
          {purchaseStep === 1 ? (
            <form id="purchase-form" onSubmit={handlePurchaseFormSubmit} className="space-y-4">
            {/* 企業名またはお名前 */}
            <div className="space-y-2">
              <Label htmlFor="companyOrName">
                企業名またはお名前 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyOrName"
                type="text"
                value={purchaseFormData.companyOrName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePurchaseFormChange('companyOrName', e.target.value)}
                placeholder="株式会社○○ または 山田太郎"
                className={purchaseFormErrors.companyOrName ? 'border-red-500' : ''}
              />
              {purchaseFormErrors.companyOrName && (
                <p className="text-red-500 text-sm">{purchaseFormErrors.companyOrName}</p>
              )}
            </div>

            {/* 業種 */}
            <div className="space-y-2">
              <Label htmlFor="industry">
                業種
              </Label>
              <Input
                id="industry"
                type="text"
                value={purchaseFormData.industry}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePurchaseFormChange('industry', e.target.value)}
                placeholder="IT、製造業、サービス業など"
              />
            </div>

            {/* ご担当者様 */}
            <div className="space-y-2">
              <Label htmlFor="contactPerson">
                ご担当者様 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contactPerson"
                type="text"
                value={purchaseFormData.contactPerson}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePurchaseFormChange('contactPerson', e.target.value)}
                placeholder="田中一郎"
                className={purchaseFormErrors.contactPerson ? 'border-red-500' : ''}
              />
              {purchaseFormErrors.contactPerson && (
                <p className="text-red-500 text-sm">{purchaseFormErrors.contactPerson}</p>
              )}
            </div>

            {/* 電話番号 */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                電話番号 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={purchaseFormData.phoneNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePurchaseFormChange('phoneNumber', e.target.value)}
                placeholder="09012345678"
                className={purchaseFormErrors.phoneNumber ? 'border-red-500' : ''}
              />
              {purchaseFormErrors.phoneNumber && (
                <p className="text-red-500 text-sm">{purchaseFormErrors.phoneNumber}</p>
              )}
            </div>

            {/* 正式文章化 */}
            <div className="space-y-3">
              <Label>正式文章化</Label>
              <p className="text-sm text-muted-foreground">
                アイデア内容を運営がビジネス文書として整理・清書するサービスです。
              </p>
              <RadioGroup
                value={purchaseFormData.formalDocumentation}
                onValueChange={(value: 'required' | 'not_required') =>
                  handlePurchaseFormChange('formalDocumentation', value)
                }
                className="flex flex-col gap-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_required" id="not_required" />
                  <Label htmlFor="not_required">不要</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="required" id="required" />
                  <Label htmlFor="required">必要（+25,000円）</Label>
                </div>
              </RadioGroup>
            </div>

            </form>
          ) : (
            // 第2ステップ: 支払い情報画面
            <div className="space-y-4">
              {/* 注文情報確認 */}
              <div className="space-y-3">
                <h3 className="font-medium text-lg">注文情報</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>企業名/お名前:</span>
                    <span>{purchaseFormData.companyOrName}</span>
                  </div>
                  {purchaseFormData.industry && (
                    <div className="flex justify-between">
                      <span>業種:</span>
                      <span>{purchaseFormData.industry}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>ご担当者様:</span>
                    <span>{purchaseFormData.contactPerson}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>電話番号:</span>
                    <span>{purchaseFormData.phoneNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>正式文章化:</span>
                    <span>{purchaseFormData.formalDocumentation === 'required' ? '必要' : '不要'}</span>
                  </div>
                </div>
              </div>

              {/* 料金情報 */}
              <div className="space-y-3">
                <h3 className="font-medium text-lg">料金詳細</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>基本料金:</span>
                    <span>¥{(Number(idea?.price) || 0).toLocaleString()}</span>
                  </div>
                  {purchaseFormData.formalDocumentation === 'required' && (
                    <div className="flex justify-between">
                      <span>正式文章化費用:</span>
                      <span>¥25,000</span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>合計金額:</span>
                    <span>¥{calculateTotalAmount().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* 支払い方法 */}
              <div className="space-y-3">
                <h3 className="font-medium text-lg">お支払い方法</h3>
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <p className="font-medium">
                    お支払いは以下の口座にお振込みでお願いします
                  </p>

                  
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">銀行:</span> GMOあおぞらネット銀行</div>
                    <div><span className="font-medium">支店:</span> 法人営業部</div>
                    <div><span className="font-medium">口座種別:</span> 普通</div>
                    <div><span className="font-medium">口座番号:</span> 1421634</div>
                  </div>
                  
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="text-s text-black-500">
                  文章化不要の場合は入金確認後1週間以内、文章化必要の場合は入金後20日以内に文章をご入力いただいたアドレスに送信します
              </p>
              </div>
            </div>
          )}
          </div>
          
          {/* ボタン部分 - 固定 */}
          <div className="flex-shrink-0 flex gap-3 pt-4 border-t">
            {purchaseStep === 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  disabled={isPurchaseSubmitting}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  form="purchase-form"
                  disabled={isPurchaseSubmitting}
                  className="flex-1"
                >
                  {isPurchaseSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      処理中...
                    </>
                  ) : (
                    '次に進む'
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToForm}
                  disabled={isPurchaseSubmitting}
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button
                  type="button"
                  onClick={handleOrderConfirmation}
                  disabled={isPurchaseSubmitting}
                  className="flex-1"
                >
                  {isPurchaseSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      処理中...
                    </>
                  ) : (
                    '注文を確定する'
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* メインコンテンツ */}
              <div className="xl:col-span-3">
                {/* アイデア詳細 */}
                <Card className="mb-8">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-xs">
                          {idea.mmb_no}
                        </Badge>
                        <Badge
                          variant={
                            idea.status === 'published'
                              ? 'default'
                              : idea.status === 'soldout'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {idea.status === 'published'
                            ? '公開中'
                            : (idea.status as any) === 'overdue'
                              ? '期限切れ'
                              : idea.status === 'closed'
                                ? '完成'
                                : idea.status === 'soldout'
                                  ? '売り切れ'
                                  : 'その他'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(idea.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>

                    <CardTitle className="text-2xl md:text-3xl mb-4">
                      {idea.title}
                    </CardTitle>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>
                          by {idea.profiles?.display_name || 'Unknown'}
                        </span>
                      </div>
                      {idea.deadline && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            議論期限:{' '}
                            {new Date(idea.deadline).toLocaleDateString(
                              'ja-JP'
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="prose max-w-none mb-6">
                      <h3 className="text-lg font-semibold mb-3">概要</h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {idea.summary}
                      </p>
                    </div>

                    {/* 完成したアイデアの詳細表示 */}
                    {(idea.status as any) === 'completed' && idea.detail && (
                      <div className="prose max-w-none mb-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          最終アイデア詳細
                        </h3>
                        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {idea.detail}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 添付ファイル表示 */}
                    {(attachmentUrls.length > 0 || loadingAttachments) && (
                      <div className="prose max-w-none mb-6">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          添付ファイル{' '}
                          {attachmentUrls.length > 0 &&
                            `(${attachmentUrls.length})`}
                        </h3>

                        {loadingAttachments ? (
                          <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-2 text-muted-foreground">
                              添付ファイルを読み込み中...
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* 画像ファイル */}
                            {attachmentUrls.filter(file => file.isImage)
                              .length > 0 && (
                              <div>
                                <h4 className="text-md font-medium mb-3 flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  画像ファイル (
                                  {
                                    attachmentUrls.filter(file => file.isImage)
                                      .length
                                  }
                                  )
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {attachmentUrls
                                    .filter(file => file.isImage)
                                    .map((file, index) => (
                                      <div
                                        key={index}
                                        className="group relative cursor-pointer"
                                        onClick={() => openGallery(index)}
                                      >
                                        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                          <Image
                                            src={file.url}
                                            alt={file.fileName || '添付画像'}
                                            width={400}
                                            height={300}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            unoptimized
                                          />
                                        </div>
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-red-500/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            className="bg-red-500 hover:bg-red-600 text-white pointer-events-none"
                                          >
                                            <Eye className="h-4 w-4 mr-1" />
                                            拡大
                                          </Button>
                                        </div>
                                        <div className="absolute bottom-2 left-2 right-2">
                                          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded truncate">
                                            {file.fileName}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* PDFファイル */}
                            {attachmentUrls.filter(file => !file.isImage)
                              .length > 0 && (
                              <div>
                                <h4 className="text-md font-medium mb-3 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  ドキュメントファイル (
                                  {
                                    attachmentUrls.filter(file => !file.isImage)
                                      .length
                                  }
                                  )
                                </h4>
                                <div className="space-y-2">
                                  {attachmentUrls
                                    .filter(file => !file.isImage)
                                    .map((file, index) => {
                                      const fileExtension =
                                        file.fileName
                                          .split('.')
                                          .pop()
                                          ?.toUpperCase() || 'FILE';

                                      return (
                                        <div
                                          key={index}
                                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                              <span className="text-xs font-bold text-primary">
                                                {fileExtension}
                                              </span>
                                            </div>
                                            <div>
                                              <p className="font-medium text-sm">
                                                {file.fileName}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                クリックしてダウンロード
                                              </p>
                                            </div>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              window.open(file.url, '_blank')
                                            }
                                          >
                                            <Download className="h-4 w-4 mr-1" />
                                            ダウンロード
                                          </Button>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div className="flex flex-wrap gap-3 pt-6 border-t">
                      {isAuthor &&
                        (idea.status === 'published' ? (
                          <Button
                            variant="outline"
                            onClick={handleEditIdea}
                            className="flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            編集する
                          </Button>
                        ) : (idea.status as any) === 'completed' ? (
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-2 px-3 py-2"
                          >
                            <FileText className="h-4 w-4" />
                            完成済み
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            disabled
                            className="flex items-center gap-2"
                            title="このアイデアは編集できません"
                          >
                            <Edit className="h-4 w-4" />
                            編集不可
                          </Button>
                        ))}
                      <Button
                        variant="outline"
                        onClick={() => router.push('/ideas')}
                      >
                        一覧に戻る
                      </Button>
                      {isAuthor && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              className="flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              削除する
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                アイデアを削除しますか？
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                この操作は取り消すことができません。このアイデアとそれに関連するすべてのコメントが完全に削除されます。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteIdea}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                削除する
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {idea.status === 'soldout' && (
                        <Badge className="bg-red-100 text-red-800">売り切れ</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* コメント欄または購入セクション */}
                {idea.status === 'closed' ? (
                  /* 購入セクション */
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        アイデア購入
                      </CardTitle>
                      <CardDescription>
                        {idea.is_exclusive 
                          ? 'このアイデアは独占契約です。1回のみ購入可能です。'
                          : 'このアイデアは完成済みです。詳細を購入してビジネスにお役立てください。'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* 独占契約バッジ */}
                        {idea.is_exclusive && (
                          <div className="flex justify-center">
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                              独占契約
                            </Badge>
                          </div>
                        )}

                        {/* 購入回数表示（通常購入の場合） */}
                        {!idea.is_exclusive && idea.purchase_count > 0 && (
                          <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <Users className="h-5 w-5 text-blue-600" />
                            <div className="text-center">
                              <p className="text-sm text-blue-900 font-medium">
                                <span className="text-lg font-bold text-blue-700">{idea.purchase_count}</span>
                                <span className="ml-1">人が購入済み</span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 価格表示 */}
                        <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border-2 border-primary/20">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <CreditCard className="h-6 w-6 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">価格</span>
                          </div>
                          <div className="text-3xl font-bold text-primary">
                            {formatPrice(idea.price)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {idea.is_exclusive
                              ? '購入すると詳細なアイデア内容をご覧いただけます（1回のみ購入可能）'
                              : '購入すると詳細なアイデア内容をご覧いただけます'}
                          </p>
                        </div>

                        {/* 購入ボタン */}
                        <div className="flex flex-col gap-3">
                          {idea.is_exclusive && hasPurchased ? (
                            <div className="text-center p-4 bg-muted rounded-lg">
                              <p className="text-sm font-medium text-muted-foreground">
                                このアイデアは売り切れです
                              </p>
                            </div>
                          ) : hasPurchased ? (
                            <>
                              <Button
                                className="w-full text-lg py-6 bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                                size="lg"
                                disabled={true}
                              >
                                <CheckCircle className="h-5 w-5 mr-2" />
                                購入済みです
                              </Button>
                              <p className="text-xs text-muted-foreground text-center">
                                このアイデアは既に購入済みです
                              </p>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={handlePurchase}
                                className="w-full text-lg py-6"
                                size="lg"
                                disabled={idea.is_exclusive && hasPurchased || checkingPurchase}
                              >
                                <ShoppingCart className="h-5 w-5 mr-2" />
                                このアイデアを購入する
                              </Button>
                              <p className="text-xs text-muted-foreground text-center">
                                ※ 購入後は返金できませんのでご注意ください
                              </p>
                            </>
                          )}
                        </div>

                        {/* コメント履歴（読み取り専用） */}
                        {comments && comments.length > 0 && (
                          <div className="pt-6 border-t">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <MessageSquare className="h-5 w-5" />
                              開発時のコメント履歴 ({comments.length})
                            </h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              {comments.map(comment => {
                                const isIdeaAuthor = comment.author_id === idea.author_id;
                                return (
                                  <div
                                    key={comment.id}
                                    className={`flex ${isIdeaAuthor ? 'justify-start' : 'justify-end'}`}
                                  >
                                    <div className={`max-w-[70%] ${isIdeaAuthor ? 'order-2' : 'order-1'}`}>
                                      <div className={`flex items-center gap-2 mb-2 ${isIdeaAuthor ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`flex items-center gap-1 ${isIdeaAuthor ? 'flex-row' : 'flex-row-reverse'}`}>
                                          <User className="h-3 w-3" />
                                          <span className="text-xs font-medium">
                                            {comment.profiles?.display_name || 'Unknown'}
                                            {isIdeaAuthor && (
                                              <span className="ml-1 text-blue-600">（制作者）</span>
                                            )}
                                          </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                                        </span>
                                      </div>
                                      <div className="relative">
                                        <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                                          isIdeaAuthor
                                            ? 'bg-red-500 text-white'
                                            : 'bg-gray-100 text-gray-900'
                                        }`}>
                                          {comment.text}
                                        </div>
                                      </div>
                                    </div>
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                      isIdeaAuthor
                                        ? 'bg-red-500 text-white order-1 mr-3'
                                        : 'bg-gray-300 text-gray-700 order-2 ml-3'
                                    }`}>
                                      {(comment.profiles?.display_name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* 通常のコメント欄 */
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        コメント ({comments.length})
                      </CardTitle>
                      <CardDescription>
                        {idea.status === 'published'
                          ? 'このアイデアについてディスカッションしましょう'
                          : (idea.status as any) === 'overdue'
                            ? '期限切れのため新しいコメントは投稿できません'
                            : '完成したアイデアのコメント履歴です'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      {comments && comments.length > 0 ? (
                        <div className="space-y-6">
                          {comments.map(comment => {
                            const isIdeaAuthor =
                              comment.author_id === idea.author_id;

                            return (
                              <div
                                key={comment.id}
                                className={`flex ${isIdeaAuthor ? 'justify-start' : 'justify-end'}`}
                              >
                                <div
                                  className={`max-w-[70%] ${isIdeaAuthor ? 'order-2' : 'order-1'}`}
                                >
                                  {/* ユーザー情報 */}
                                  <div
                                    className={`flex items-center gap-2 mb-2 ${isIdeaAuthor ? 'justify-start' : 'justify-end'}`}
                                  >
                                    <div
                                      className={`flex items-center gap-1 ${isIdeaAuthor ? 'flex-row' : 'flex-row-reverse'}`}
                                    >
                                      <User className="h-3 w-3" />
                                      <span className="text-xs font-medium">
                                        {comment.profiles?.display_name ||
                                          'Unknown'}
                                        {isIdeaAuthor && (
                                          <span className="ml-1 text-blue-600">
                                            （制作者）
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(
                                        comment.created_at
                                      ).toLocaleDateString('ja-JP')}
                                    </span>
                                  </div>

                                  {/* 吹き出し */}
                                  <div className="relative">
                                    <div
                                      className={`
                                  px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap
                                  ${
                                    isIdeaAuthor
                                      ? 'bg-red-500 text-white'
                                      : 'bg-gray-100 text-gray-900'
                                  }
                                `}
                                    >
                                      {comment.text}
                                    </div>
                                  </div>
                                </div>

                                {/* アバター部分 */}
                                <div
                                  className={`
                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                            ${
                              isIdeaAuthor
                                ? 'bg-red-500 text-white order-1 mr-3'
                                : 'bg-gray-300 text-gray-700 order-2 ml-3'
                            }
                          `}
                                >
                                  {(comment.profiles?.display_name || 'U')
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            まだコメントがありません。最初のコメントを投稿してみませんか？
                          </p>
                        </div>
                      )}

                      {/* コメント投稿フォーム */}
                      <div className="mt-6 pt-6 border-t">
                        {idea.status === 'published' ? (
                          user ? (
                            <div className="space-y-4">
                              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-900">
                                  コメントは３０字以上でお願いします。投稿者の参考になり、アイデアがブラッシュアップされ、購入者が現れることが、みなさんの利益につながります。
                                </p>
                              </div>
                              <Textarea
                                placeholder="コメントを入力してください（30字以上）..."
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                rows={3}
                                className="resize-none"
                              />
                              {commentText.trim().length > 0 && commentText.trim().length < 30 && (
                                <p className="text-sm text-red-500">
                                  あと{30 - commentText.trim().length}字必要です
                                </p>
                              )}
                              <div className="flex justify-end">
                                <Button
                                  onClick={handleSubmitComment}
                                  disabled={
                                    !commentText.trim() || commentText.trim().length < 30 || commentSubmitting
                                  }
                                  className="flex items-center gap-2"
                                >
                                  {commentSubmitting ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      投稿中...
                                    </>
                                  ) : (
                                    <>
                                      <MessageSquare className="h-4 w-4" />
                                      コメントを投稿
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-muted-foreground mb-4">
                                コメントを投稿するにはログインが必要です
                              </p>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  router.push(
                                    `/login?redirect=${encodeURIComponent(`/ideas/${ideaId}`)}`
                                  )
                                }
                              >
                                ログイン
                              </Button>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <p className="text-muted-foreground">
                                {(idea.status as any) === 'overdue'
                                  ? '期限切れのアイデアにはコメントできません。'
                                  : (idea.status as any) === 'completed'
                                    ? '完成したアイデアにはコメントできません。'
                                    : 'このアイデアにはコメントできません。'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* サイドバー（広告エリア） */}
              <div className="xl:col-span-1">
                <div className="sticky top-8 space-y-6">
                  {/* メイン広告 */}
                  <Card className="p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">
                      スポンサー
                    </h3>
                    <GoogleAdsense
                      adSlot="7718612763"
                      style={{
                        display: 'block',
                        minHeight: '300px',
                        width: '100%',
                      }}
                    />
                  </Card>

                  {/* 関連情報カード */}
                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-3">
                      このアイデアについて
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div>
                        投稿日:{' '}
                        {new Date(idea.created_at).toLocaleDateString('ja-JP')}
                      </div>
                      <div>コメント数: {comments.length}</div>
                      {idea.deadline && (
                        <div>
                          議論期限:{' '}
                          {new Date(idea.deadline).toLocaleDateString('ja-JP')}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
