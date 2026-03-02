'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
// import { Button } from '@/components/ui/button'; // 現在未使用
import {
  MessageSquare,
  Shield,
  Zap,
  Users,
  Globe,
  Target,
  // ArrowRight, // 現在未使用
  // CheckCircle, // 現在未使用
} from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: MessageSquare,
      title: 'コラボレーション機能',
      description: 'LINE風のコメント機能で、アイデアをブラッシュアップ',
      gradient: 'bg-gradient-tertiary',
      hoverColor: 'group-hover:text-accent',
    },
    {
      icon: Shield,
      title: '安全な取引システム',
      description: '安心・安全な売買を実現',
      gradient: 'bg-gradient-secondary',
      hoverColor: 'group-hover:text-secondary',
    },
    {
      icon: Zap,
      title: '瞬時の検索・発見',
      description: '求めるアイデアを瞬時に発見',
      gradient: 'bg-primary',
      hoverColor: 'group-hover:text-primary',
    },
    {
      icon: Users,
      title: 'コミュニティ',
      description: '同じ志を持つクリエイターや企業とのネットワーキング',
      gradient: 'bg-gradient-tertiary',
      hoverColor: 'group-hover:text-accent',
    },
    {
      icon: Globe,
      title: 'グローバル展開',
      description: '日本から世界へ、あなたのアイデアを国際市場に',
      gradient: 'bg-secondary',
      hoverColor: 'group-hover:text-secondary',
    },
    {
      icon: Target,
      title: '的確なマッチング',
      description: '企業ニーズとアイデアを効率的にマッチング',
      gradient: 'bg-gradient-primary',
      hoverColor: 'group-hover:text-primary',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'アイデア投稿',
      description: 'あなたの革新的なアイデアを投稿し、概要版を公開',
    },
    {
      step: '02',
      title: 'コミュニティ協力',
      description: '他のユーザーからのコメントでアイデアをブラッシュアップ',
    },
    {
      step: '03',
      title: '詳細版作成',
      description: '完成されたアイデアの詳細版を作成し、価格を設定',
    },
    {
      step: '04',
      title: '収益化実現',
      description: '企業や個人がアイデアを購入し、継続的な収入を獲得',
    },
  ];

  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        {/* Features Grid */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              なぜアイデアマーケットが
            </span>
            <br />
            <span className="text-foreground">選ばれるのか</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            革新的な機能と信頼できるシステムで、あなたのアイデアビジネスを成功に導きます
          </p>
        </div>

        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-24">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="text-center pb-4">
                <div
                  className={`w-16 h-16 ${feature.gradient} rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform shadow-soft`}
                >
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className={`text-xl text-foreground ${feature.hoverColor} transition-colors`}>
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* How it Works */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-foreground">簡単</span>
            <span className="bg-gradient-secondary bg-clip-text text-transparent">
              4ステップ
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            シンプルなプロセスで、あなたのアイデアを価値ある資産に変換
          </p>
        </div>

        <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group animate-slide-in"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto shadow-glow group-hover:scale-110 transition-transform">
                    <span className="text-2xl font-bold text-white">
                      {step.step}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
