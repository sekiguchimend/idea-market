'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/StableAuthContext';
import { supabase } from '@/lib/supabase/client';
import { Mail, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// フォームスキーマ（モーダルと同じ）
const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'メールアドレスは必須です')
      .email('正しいメールアドレス形式で入力してください'),
    password: z
      .string()
      .min(12, 'パスワードは12文字以上で入力してください')
      .max(128, 'パスワードは128文字以内で入力してください')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'パスワードは英大文字、英小文字、数字、記号を含む必要があります'
      ),
    confirmPassword: z.string().min(1, 'パスワード確認は必須です'),

    termsAgreed: z
      .boolean()
      .refine(val => val === true, '利用規約に同意してください'),
    privacyAgreed: z
      .boolean()
      .refine(val => val === true, 'プライバシーポリシーに同意してください'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupForm() {
  const _router = useRouter();
  const [signupMethod, setSignupMethod] = useState<'select' | 'email'>(
    'select'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    // watch, // 現在未使用
    // reset, // 現在未使用
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      termsAgreed: false,
      privacyAgreed: false,
    },
  });

  const handleSocialSignup = async (provider: 'google' /* | 'facebook' */) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?type=signup`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Social signup error:', error);
        toast({
          title: '登録エラー',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Social signup error:', error);
      toast({
        title: '登録エラー',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error: any) => {
    if (!error) return '不明なエラーが発生しました';

    const message = error.message || error.error_description || String(error);

    // 具体的なエラーメッセージのマッピング
    if (
      message.includes('already registered') ||
      message.includes('User already registered')
    ) {
      return 'このメールアドレスは既に登録されています';
    }
    if (message.includes('Invalid email')) {
      return '正しいメールアドレスを入力してください';
    }
    if (message.includes('Password')) {
      return 'パスワードの形式が正しくありません';
    }
    if (message.includes('Network') || message.includes('fetch')) {
      return 'ネットワークエラーが発生しました。しばらくしてから再試行してください。';
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return 'リクエストが多すぎます。しばらくしてから再試行してください。';
    }

    return message;
  };

  const handleEmailSignup = async (data: SignupFormData) => {
    try {
      setLoading(true);
      const { error } = await signUp(data.email, data.password);

      if (error) {
        toast({
          title: '登録エラー',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      } else {
        toast({
          title: '登録完了',
          description:
            '確認メールを送信しました。メールボックスをご確認ください。',
          duration: 5000,
        });
        // メール確認を待つため、リダイレクトしない
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: '登録エラー',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  I
                </span>
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                アイデアマーケット
              </span>
            </Link>
          </div>
          <CardTitle>
            {signupMethod === 'select' ? '新規登録' : 'アカウント作成'}
          </CardTitle>
          <CardDescription>
            {signupMethod === 'select'
              ? '登録方法を選択してください'
              : 'アカウント情報を入力してください'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signupMethod === 'select' ? (
            <div className="space-y-4">
              {/* Google 登録 */}
              <Button
                onClick={() => handleSocialSignup('google')}
                disabled={loading}
                variant="outline"
                className="w-full h-12 text-base"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Googleで登録
              </Button>

              {/* Facebook 登録 - 無効化中 */}
              {/*
              <Button
                onClick={() => handleSocialSignup('facebook')}
                disabled={loading}
                variant="outline"
                className="w-full h-12 text-base"
              >
                <svg className="w-5 h-5 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebookで登録
              </Button>
              */}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    または
                  </span>
                </div>
              </div>

              {/* メール登録 */}
              <Button
                onClick={() => setSignupMethod('email')}
                disabled={loading}
                variant="outline"
                className="w-full h-12 text-base"
              >
                <Mail className="w-5 h-5 mr-3" />
                メールで登録
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                既にアカウントをお持ちの方は{' '}
                <Button variant="link" className="p-0 h-auto text-sm" asChild>
                  <Link href="/login">こちらからログイン</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(handleEmailSignup)}
              className="space-y-4"
            >
              {/* 戻るボタン */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSignupMethod('select')}
                className="mb-4 p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                戻る
              </Button>

              {/* メールアドレス */}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* パスワード */}
              <div className="space-y-2">
                <Label htmlFor="password">パスワード *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="12文字以上で英大小文字・数字・記号(@$!%*?&)を含む"
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    パスワードの要件：
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• 12文字以上、128文字以内</li>
                    <li>• 英大文字を含む</li>
                    <li>• 英小文字を含む</li>
                    <li>• 数字を含む</li>
                    <li>• 記号（@$!%*?&）を含む</li>
                  </ul>
                </div>
              </div>

              {/* パスワード確認 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード確認 *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="パスワードを再入力"
                    {...register('confirmPassword')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* 利用規約同意 */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="termsAgreed"
                    onCheckedChange={checked =>
                      setValue('termsAgreed', !!checked)
                    }
                    className="mt-1"
                  />
                  <Label htmlFor="termsAgreed" className="text-sm leading-5">
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      利用規約
                    </Link>
                    に同意する *
                  </Label>
                </div>
                {errors.termsAgreed && (
                  <p className="text-sm text-destructive">
                    {errors.termsAgreed.message}
                  </p>
                )}

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacyAgreed"
                    onCheckedChange={checked =>
                      setValue('privacyAgreed', !!checked)
                    }
                    className="mt-1"
                  />
                  <Label htmlFor="privacyAgreed" className="text-sm leading-5">
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      プライバシーポリシー
                    </Link>
                    に同意する *
                  </Label>
                </div>
                {errors.privacyAgreed && (
                  <p className="text-sm text-destructive">
                    {errors.privacyAgreed.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登録中...' : 'アカウントを作成'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                既にアカウントをお持ちの方は{' '}
                <Button variant="link" className="p-0 h-auto text-sm" asChild>
                  <Link href="/login">こちらからログイン</Link>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
