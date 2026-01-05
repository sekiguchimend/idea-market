'use client';

import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, FileText } from 'lucide-react';
import { LogType } from '@/lib/supabase/logs';
import { generateLogFileName } from '@/lib/utils/logExport';
import { useToast } from '@/hooks/use-toast';

interface LogDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogDownloadModal({
  open,
  onOpenChange,
}: LogDownloadModalProps) {
  const [logType, setLogType] = useState<LogType>('login');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // APIから直接CSVをダウンロード
      const response = await fetch('/api/admin/logs/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logType,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast({
          title: 'エラー',
          description: errorData.error || 'ログデータの取得に失敗しました',
          variant: 'destructive',
        });
        return;
      }

      // CSVデータを取得
      const csvContent = await response.text();

      if (!csvContent || csvContent.trim().length === 0) {
        toast({
          title: '警告',
          description: '指定された条件に一致するログがありません',
          variant: 'destructive',
        });
        return;
      }

      // ファイル名を生成
      const fileName = generateLogFileName(logType, startDate, endDate);

      // ダウンロード
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // 行数をカウント（ヘッダーを除く）
      const lines = csvContent.split('\n').filter((line) => line.trim());
      const rowCount = Math.max(0, lines.length - 1);

      toast({
        title: '成功',
        description: `${rowCount}件のログをダウンロードしました`,
      });

      // モーダルを閉じる
      onOpenChange(false);
    } catch (error) {
      console.error('ログダウンロードエラー:', error);
      toast({
        title: 'エラー',
        description: 'ログのダウンロードに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ログダウンロード設定
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="logType">ログの種類</Label>
              <Select
                value={logType}
                onValueChange={(value: any) => setLogType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="login">ログインログ</SelectItem>
                  <SelectItem value="blog_view">ブログ閲覧履歴</SelectItem>
                  <SelectItem value="access">アクセスログ</SelectItem>
                  <SelectItem value="error">エラーログ</SelectItem>
                  <SelectItem value="system">システムログ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">開始日</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endDate">終了日</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ダウンロード中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  ログをダウンロード
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
