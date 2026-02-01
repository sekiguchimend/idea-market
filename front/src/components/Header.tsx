'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Menu,
  X,
  LogIn,
  LogOut,
  User,
  Lightbulb,
  ShoppingCart,
  Search,
} from 'lucide-react';
import { LoginModal } from '@/components/auth/LoginModal';
import { useAuth } from '@/contexts/StableAuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuth();
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const router = useRouter();

  const truncateText = (text: string, maxLength: number) => {
    const chars = Array.from(text);
    if (chars.length <= maxLength) return text;
    return chars.slice(0, maxLength).join('') + '...';
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = headerSearchQuery.trim();
    if (!q) return;
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('type', 'keyword');
    router.push(`/search?${params.toString()}`);
    if (isMenuOpen) setIsMenuOpen(false);
  };

  // ユーザーメニューコンポーネント
  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">
            {truncateText(
              profile?.display_name || user?.email?.split('@')[0] || 'ユーザー',
              6
            )}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            プロフィール
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/my/ideas" className="flex items-center">
            <Lightbulb className="mr-2 h-4 w-4" />
            マイアイデア
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/my/purchases" className="flex items-center">
            <ShoppingCart className="mr-2 h-4 w-4" />
            購入履歴
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Image
                src="/idea_logo.png"
                alt="アイデアマーケット Logo"
                width={32}
                height={32}
                className="transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-md scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
              アイデアマーケット
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              href="/ideas"
              className="text-foreground/80 hover:text-primary transition-colors"
            >
              アイデア一覧
            </Link>
            <Link
              href="/idea-buy"
              className="text-foreground/80 hover:text-primary transition-colors"
            >
              アイデア購入
            </Link>
            <Link
              href="/about"
              className="text-foreground/80 hover:text-primary transition-colors"
            >
              アイデアマーケットについて
            </Link>
            <Link
              href="/blog"
              className="text-foreground/80 hover:text-primary transition-colors"
            >
              ブログ
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Desktop Search */}
            <form onSubmit={handleHeaderSearch} className="flex items-center gap-2">
              <Input
                placeholder="アイデア検索..."
                value={headerSearchQuery}
                onChange={e => setHeaderSearchQuery(e.target.value)}
                className="w-64"
              />
              <Button type="submit" size="sm" disabled={!headerSearchQuery.trim()}>
                <Search className="h-4 w-4 mr-2" />
                検索
              </Button>
            </form>
            {loading ? (
              <Button variant="outline" size="sm" disabled>
                読み込み中...
              </Button>
            ) : user ? (
              <UserMenu />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLoginModalOpen(true)}
              >
                <LogIn className="h-4 w-4 mr-2" />
                ログイン
              </Button>
            )}
            <Button variant="hero" size="sm" asChild>
              <Link href="/ideas/new">アイデア投稿</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Search */}
        <div className="lg:hidden mt-4">
          <form onSubmit={handleHeaderSearch} className="flex items-center gap-2">
            <Input
              placeholder="アイデア検索..."
              value={headerSearchQuery}
              onChange={e => setHeaderSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={!headerSearchQuery.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden mt-4 p-4 bg-card rounded-lg border shadow-soft animate-fade-in">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/ideas"
                className="text-foreground/80 hover:text-primary transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                アイデア一覧
              </Link>
              <Link
                href="/idea-buy"
                className="text-foreground/80 hover:text-primary transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                アイデア購入
              </Link>
              <Link
                href="/about-ideas"
                className="text-foreground/80 hover:text-primary transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                アイデアとは
              </Link>
              <Link
                href="/about"
                className="text-foreground/80 hover:text-primary transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                サービス案内
              </Link>
              <Link
                href="/blog"
                className="text-foreground/80 hover:text-primary transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                ブログ
              </Link>
              <div className="flex flex-col space-y-2 pt-4 border-t">
                {loading ? (
                  <Button variant="outline" size="sm" disabled>
                    読み込み中...
                  </Button>
                ) : user ? (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href="/profile"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        プロフィール
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="text-red-600"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      ログアウト
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsLoginModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    ログイン
                  </Button>
                )}
                <Button variant="hero" size="sm" asChild>
                  <Link href="/ideas/new" onClick={() => setIsMenuOpen(false)}>
                    アイデア投稿
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />
    </header>
  );
};

export default Header;
