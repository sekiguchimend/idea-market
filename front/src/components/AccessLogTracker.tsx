'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { recordAccessLog } from '@/lib/logging';

/**
 * アクセスログ記録コンポーネント
 * ページ遷移時にアクセスログを自動記録する
 */
export function AccessLogTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startTimeRef = useRef<number>(Date.now());
  const previousPathRef = useRef<string>('');

  useEffect(() => {
    // セッションIDを取得または生成
    const getSessionId = (): string => {
      if (typeof window === 'undefined') return '';

      let sessionId = sessionStorage.getItem('access_session_id');
      if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        sessionStorage.setItem('access_session_id', sessionId);
      }
      return sessionId;
    };

    // 同じパスへの重複記録を防ぐ
    const currentPath = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
    if (currentPath === previousPathRef.current) {
      return;
    }
    previousPathRef.current = currentPath;

    // 前のページの滞在時間を計算
    const responseTimeMs = Date.now() - startTimeRef.current;
    startTimeRef.current = Date.now();

    // アクセスログを記録
    recordAccessLog({
      requestMethod: 'GET',
      requestPath: pathname,
      requestQuery: searchParams.toString() || undefined,
      responseStatus: 200,
      responseTimeMs: responseTimeMs > 0 ? responseTimeMs : undefined,
      referer: typeof document !== 'undefined' ? document.referrer : undefined,
      sessionId: getSessionId(),
    });
  }, [pathname, searchParams]);

  return null;
}
