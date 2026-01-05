'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import { AdminGuard } from '@/components/AdminGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Search, RefreshCw, Trash2, ShoppingCart, ShieldCheck } from 'lucide-react';

interface SoldRow {
  id: string;
  idea_id: string;
  user_id: string;
  is_paid: boolean;
  phone_number: string;
  company: string | null;
  manager: string | null;
  payment_deadline: string;
  created_at: string;
  updated_at: string;
  ideas?: { id: string; title: string; mmb_no: string; status: string } | null;
  profiles?: { id: string; display_name: string | null; role: string } | null;
}

export default function AdminSoldPage() {
  const [rows, setRows] = useState<SoldRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [reloading, setReloading] = useState(false);

  const fetchRows = async (params?: { q?: string }) => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (params?.q) query.set('q', params.q);
      const res = await fetch(`/api/admin/sold?${query.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || '取得に失敗しました');
      setRows(json.data || []);
    } catch (e: any) {
      toast({ title: 'エラー', description: e.message ?? '取得に失敗しました', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const onTogglePaid = async (id: string, next: boolean) => {
    try {
      const res = await fetch('/api/admin/sold', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isPaid: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || '更新に失敗しました');
      setRows(prev => prev.map(r => (r.id === id ? { ...r, is_paid: next, updated_at: new Date().toISOString() } : r)));
      toast({ title: '更新完了', description: `入金ステータスを${next ? '支払い済み' : '未払い'}にしました` });
    } catch (e: any) {
      toast({ title: 'エラー', description: e.message ?? '更新に失敗しました', variant: 'destructive' });
    }
  };

  const onCancel = async (id: string) => {
    try {
      if (!confirm('購入を取り消しますか？この操作は元に戻せません。')) return;
      const res = await fetch('/api/admin/sold', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || '取消に失敗しました');
      setRows(prev => prev.filter(r => r.id !== id));
      toast({ title: '取消完了', description: '購入を取り消しました（アイデアは再公開されます）' });
    } catch (e: any) {
      toast({ title: 'エラー', description: e.message ?? '取消に失敗しました', variant: 'destructive' });
    }
  };

  const onSearch = () => fetchRows({ q: search.trim() || undefined });
  const onReload = async () => {
    setReloading(true);
    await fetchRows({ q: search.trim() || undefined });
    setReloading(false);
  };

  const totalPaid = useMemo(() => rows.filter(r => r.is_paid).length, [rows]);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <Header />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                <span className="bg-gradient-primary bg-clip-text text-transparent">購入済みアイデア確認</span>
              </h1>
              <p className="text-muted-foreground">購入済みテーブルの確認、入金ステータス更新、購入取消を行います</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="電話番号 / 会社名 / 担当者名 で検索"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={onSearch} className="whitespace-nowrap">検索</Button>
              <Button variant="outline" onClick={onReload} className="flex items-center gap-2 whitespace-nowrap">
                <RefreshCw className={`h-4 w-4 ${reloading ? 'animate-spin' : ''}`} /> 再読込
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">合計件数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rows.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">支払い済み</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalPaid}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">未払い</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rows.length - totalPaid}</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">読み込み中...</div>
              ) : rows.length === 0 ? (
                <div className="text-sm text-muted-foreground">データがありません</div>
              ) : (
                rows.map(r => (
                  <div key={r.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={r.is_paid ? 'default' : 'secondary'} className="whitespace-nowrap">
                            {r.is_paid ? '支払い済み' : '未払い'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('ja-JP')}</span>
                        </div>
                        <div className="text-sm font-medium truncate flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          {r.ideas?.mmb_no ? <span className="text-muted-foreground">{r.ideas.mmb_no}</span> : null}
                          <span className="truncate">{r.ideas?.title || '(タイトル不明)'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          購入者: {r.profiles?.display_name || r.user_id}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          連絡先: {r.phone_number} / {r.company || '-'} / {r.manager || '-'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                          <Switch checked={r.is_paid} onCheckedChange={next => onTogglePaid(r.id, !!next)} />
                        </div>
                        <Button variant="outline" onClick={() => onCancel(r.id)} className="text-destructive flex items-center gap-2">
                          <Trash2 className="h-4 w-4" /> 取り消し
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}





