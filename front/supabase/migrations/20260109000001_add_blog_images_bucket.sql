-- Migration: 20260109000001_add_blog_images_bucket
-- Description: ブログ画像用ストレージバケット追加
-- 作成日: 2026-01-09

-- =================================================================
-- blog-images ストレージバケットの作成
-- =================================================================

-- ストレージバケットの作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- ストレージポリシーの設定
-- 公開アクセス（誰でも画像を閲覧可能）
CREATE POLICY "Blog Images Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'blog-images');

-- 認証済みユーザーはアップロード可能
CREATE POLICY "Authenticated users can upload blog images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'blog-images' AND auth.role() = 'authenticated');

-- 認証済みユーザーは更新可能
CREATE POLICY "Authenticated users can update blog images" ON storage.objects
FOR UPDATE USING (bucket_id = 'blog-images' AND auth.role() = 'authenticated');

-- 認証済みユーザーは削除可能
CREATE POLICY "Authenticated users can delete blog images" ON storage.objects
FOR DELETE USING (bucket_id = 'blog-images' AND auth.role() = 'authenticated');
