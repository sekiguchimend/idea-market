import { User, UserCheck, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AuthorInfo as AuthorInfoType } from '@/lib/blog-author';

interface AuthorInfoProps {
  author: AuthorInfoType;
  className?: string;
  showBio?: boolean;
}

/**
 * 表示名から頭文字を取得する
 */
function getInitials(displayName: string): string {
  // メールアドレスの場合は最初の1文字を大文字で
  if (displayName.includes('@')) {
    return displayName.charAt(0).toUpperCase();
  }
  // それ以外は空白で分割して各単語の頭文字を取得
  return displayName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || displayName.charAt(0).toUpperCase();
}

/**
 * ブログ記事の著者情報を表示するコンポーネント
 */
export function AuthorInfo({
  author,
  className = '',
  showBio = false
}: AuthorInfoProps) {
  const initials = getInitials(author.display_name);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* アバター */}
      <Avatar className="h-8 w-8">
        <AvatarImage src={author.avatar_url} alt={author.display_name} />
        <AvatarFallback className="text-xs">
          {author.isRegistered ? initials : <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* 著者情報 */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {author.display_name}
          </span>
          
          {/* 登録状態バッジ */}
          {author.isRegistered ? (
            <Badge variant="secondary" className="text-xs h-5">
              <UserCheck className="h-3 w-3 mr-1" />
              登録済み
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs h-5">
              <UserX className="h-3 w-3 mr-1" />
              未登録
            </Badge>
          )}
        </div>
        
        {/* バイオ（オプション） */}
        {showBio && author.bio && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {author.bio}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * ブログ記事一覧で使用する簡略版の著者情報コンポーネント
 */
export function AuthorInfoCompact({ author, className = '' }: AuthorInfoProps) {
  const initials = getInitials(author.display_name);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 小さなアバター */}
      <Avatar className="h-6 w-6">
        <AvatarImage src={author.avatar_url} alt={author.display_name} />
        <AvatarFallback className="text-xs">
          {author.isRegistered ? initials : <User className="h-3 w-3" />}
        </AvatarFallback>
      </Avatar>

      {/* 著者名のみ */}
      <span className="text-xs text-muted-foreground">
        {author.display_name}
      </span>
      
      {/* 未登録の場合のみアイコン表示 */}
      {!author.isRegistered && (
        <UserX className="h-3 w-3 text-muted-foreground/60" />
      )}
    </div>
  );
}

/**
 * 著者情報読み込み中の表示
 */
export function AuthorInfoSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* アバタースケルトン */}
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      
      {/* テキストスケルトン */}
      <div className="flex flex-col gap-1">
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}

/**
 * 著者情報読み込みエラー時の表示
 */
export function AuthorInfoError({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-muted-foreground ${className}`}>
      <Avatar className="h-8 w-8">
        <AvatarFallback>
          <UserX className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex flex-col">
        <span className="text-sm">著者情報を読み込めませんでした</span>
        <span className="text-xs text-muted-foreground/60">
          しばらくしてから再度お試しください
        </span>
      </div>
    </div>
  );
}
