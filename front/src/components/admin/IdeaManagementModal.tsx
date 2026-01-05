'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// import { Badge } from '@/components/ui/badge';
import { getIdeasWithDetail } from '@/lib/supabase/ideas';
import { IdeaDetail } from '@/types/ideas';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit } from 'lucide-react';

interface IdeaManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IdeaManagementModal({
  open,
  onOpenChange,
}: IdeaManagementModalProps) {
  const [ideas, setIdeas] = useState<IdeaDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // アイデア一覧を取得
  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await getIdeasWithDetail();
      if (error) {
        toast({
          variant: 'destructive',
          title: 'エラー',
          description: 'アイデアの取得に失敗しました',
        });
      } else {
        setIdeas(data || []);
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: '予期しないエラーが発生しました',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchIdeas();
    }
  }, [open, fetchIdeas]);

  // ステータスに応じたバッジの色を返す
  // const getStatusBadgeVariant = (status: string) => {
  //   switch (status) {
  //     case 'published':
  //       return 'default';
  //     case 'closed':
  //       return 'secondary';
  //     case 'overdue':
  //       return 'destructive';
  //     default:
  //       return 'outline';
  //   }
  // };

  // ステータスを日本語に変換
  // const getStatusText = (status: string) => {
  //   switch (status) {
  //     case 'published':
  //       return '公開中';
  //     case 'closed':
  //       return '完了';
  //     case 'overdue':
  //       return '期限切れ';
  //     default:
  //       return status;
  //   }
  // };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl">最終アイデア修正</DialogTitle>
          <DialogDescription>
            編集する場合は各行の編集ボタンをクリックしてください。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">読み込み中...</span>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">CMT番号</TableHead>
                    <TableHead className="w-48">タイトル</TableHead>
                    <TableHead className="w-64">概要</TableHead>
                    <TableHead className="w-64">詳細</TableHead>
                    <TableHead className="w-32">作成者</TableHead>
                    <TableHead className="w-20">価格</TableHead>
                    <TableHead className="w-32">作成日</TableHead>
                    <TableHead className="w-24">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ideas.map(idea => (
                    <TableRow key={idea.id}>
                      <TableCell className="font-mono text-sm">
                        {idea.mmb_no}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{idea.title}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {idea.summary}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {idea.detail}
                        </div>
                      </TableCell>
                      <TableCell>
                        {idea.profiles?.display_name || '不明'}
                      </TableCell>
                      <TableCell>
                        {idea.price
                          ? `${Number(idea.price).toLocaleString()}円`
                          : '未設定'}
                      </TableCell>
                      <TableCell>
                        {new Date(idea.created_at).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => {
                            onOpenChange(false);
                            window.location.href = `/admin/${idea.id}/submit`;
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {ideas.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              detailがnullでないアイデアはありません
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
