'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import { AdminGuard } from '@/components/AdminGuard';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Search, RefreshCw, Save } from 'lucide-react';

type UserDetail = {
  user_id: string;
  display_name: string | null;
  role: 'admin' | 'member';
  profile_created_at: string;
  id: string | null;
  full_name: string | null;
  email: string | null;
  bank_name: string | null;
  branch_name: string | null;
  account_type: 'ordinary' | 'current' | null;
  account_number: string | null;
  account_holder: string | null;
  gender: 'male' | 'female' | 'other' | null;
  birth_date: string | null;
  prefecture:
    | 'hokkaido' | 'aomori' | 'iwate' | 'miyagi' | 'akita' | 'yamagata' | 'fukushima'
    | 'ibaraki' | 'tochigi' | 'gunma' | 'saitama' | 'chiba' | 'tokyo' | 'kanagawa'
    | 'niigata' | 'toyama' | 'ishikawa' | 'fukui' | 'yamanashi' | 'nagano' | 'gifu'
    | 'shizuoka' | 'aichi' | 'mie' | 'shiga' | 'kyoto' | 'osaka' | 'hyogo' | 'nara'
    | 'wakayama' | 'tottori' | 'shimane' | 'okayama' | 'hiroshima' | 'yamaguchi'
    | 'tokushima' | 'kagawa' | 'ehime' | 'kochi' | 'fukuoka' | 'saga' | 'nagasaki'
    | 'kumamoto' | 'oita' | 'miyazaki' | 'kagoshima' | 'okinawa' | null;
  created_at: string;
  updated_at: string;
};

const PREFS: Array<UserDetail['prefecture']> = [
  'hokkaido','aomori','iwate','miyagi','akita','yamagata','fukushima',
  'ibaraki','tochigi','gunma','saitama','chiba','tokyo','kanagawa',
  'niigata','toyama','ishikawa','fukui','yamanashi','nagano','gifu',
  'shizuoka','aichi','mie','shiga','kyoto','osaka','hyogo','nara',
  'wakayama','tottori','shimane','okayama','hiroshima','yamaguchi',
  'tokushima','kagawa','ehime','kochi','fukuoka','saga','nagasaki',
  'kumamoto','oita','miyazaki','kagoshima','okinawa',
];

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [reloading, setReloading] = useState(false);

  const fetchRows = async (params?: { q?: string }) => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (params?.q) query.set('q', params.q);
      query.set('limit', '20');
      const res = await fetch(`/api/admin/user-details?${query.toString()}`);
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

  const onSearch = () => fetchRows({ q: search.trim() || undefined });
  const onReload = async () => { setReloading(true); await fetchRows({ q: search.trim() || undefined }); setReloading(false); };

  const onSave = async (row: UserDetail) => {
    try {
      setSavingId(row.user_id);
      const res = await fetch('/api/admin/user-details', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: row.user_id,
          full_name: row.full_name,
          email: row.email,
          bank_name: row.bank_name,
          branch_name: row.branch_name,
          account_type: row.account_type,
          account_number: row.account_number,
          account_holder: row.account_holder,
          gender: row.gender,
          birth_date: row.birth_date,
          prefecture: row.prefecture,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || '保存に失敗しました');
      toast({ title: '保存完了', description: '登録者情報を更新しました' });
    } catch (e: any) {
      toast({ title: 'エラー', description: e.message ?? '保存に失敗しました', variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const setRowValue = (user_id: string, key: keyof UserDetail, value: any) => {
    setRows(prev => prev.map(r => (r.user_id === user_id ? { ...r, [key]: value } : r)));
  };

  const total = useMemo(() => rows.length, [rows]);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                <span className="bg-gradient-primary bg-clip-text text-transparent">登録者情報修正</span>
              </h1>
              <p className="text-muted-foreground">ユーザー情報を一覧・検索・編集できます</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="氏名 / メール / 口座名義 で検索" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button onClick={onSearch} className="whitespace-nowrap">検索</Button>
              <Button variant="outline" onClick={onReload} className="flex items-center gap-2 whitespace-nowrap">
                <RefreshCw className={`h-4 w-4 ${reloading ? 'animate-spin' : ''}`} /> 再読込
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">件数</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-sm text-muted-foreground">読み込み中...</div>
              ) : rows.length === 0 ? (
                <div className="text-sm text-muted-foreground">データがありません</div>
              ) : (
                rows.map(r => (
                  <div key={r.user_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    {/* ユーザー基本情報ヘッダー */}
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{r.display_name || '未設定'}</div>
                        <div className="text-xs text-muted-foreground">登録日: {new Date(r.profile_created_at).toLocaleDateString('ja-JP')}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${r.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {r.role === 'admin' ? '管理者' : 'メンバー'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">氏名</Label>
                        <Input value={r.full_name || ''} onChange={e => setRowValue(r.user_id, 'full_name', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">メール</Label>
                        <Input value={r.email || ''} onChange={e => setRowValue(r.user_id, 'email', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">銀行名</Label>
                        <Input value={r.bank_name || ''} onChange={e => setRowValue(r.user_id, 'bank_name', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">支店名</Label>
                        <Input value={r.branch_name || ''} onChange={e => setRowValue(r.user_id, 'branch_name', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">口座種別</Label>
                        <Select value={r.account_type || undefined} onValueChange={v => setRowValue(r.user_id, 'account_type', v)}>
                          <SelectTrigger><SelectValue placeholder="未選択" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ordinary">普通</SelectItem>
                            <SelectItem value="current">当座</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">口座番号</Label>
                        <Input value={r.account_number || ''} onChange={e => setRowValue(r.user_id, 'account_number', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">口座名義</Label>
                        <Input value={r.account_holder || ''} onChange={e => setRowValue(r.user_id, 'account_holder', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">性別</Label>
                        <Select value={r.gender || undefined} onValueChange={v => setRowValue(r.user_id, 'gender', v)}>
                          <SelectTrigger><SelectValue placeholder="未選択" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">男性</SelectItem>
                            <SelectItem value="female">女性</SelectItem>
                            <SelectItem value="other">その他</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">生年月日</Label>
                        <Input type="date" value={r.birth_date || ''} onChange={e => setRowValue(r.user_id, 'birth_date', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">都道府県</Label>
                        <Select value={r.prefecture || undefined} onValueChange={v => setRowValue(r.user_id, 'prefecture', v)}>
                          <SelectTrigger><SelectValue placeholder="未選択" /></SelectTrigger>
                          <SelectContent>
                            {PREFS.map(p => (
                              <SelectItem key={p as string} value={p as string}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button onClick={() => onSave(r)} disabled={savingId === r.user_id} className="flex items-center gap-2">
                        <Save className="h-4 w-4" /> {savingId === r.user_id ? '保存中...' : '保存'}
                      </Button>
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





