// microCMS関連の型定義

/** microCMSのコンテンツ共通フィールド */
export interface MicroCMSContentBase {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** microCMSの画像フィールド */
export interface MicroCMSImageField {
  url: string;
  width: number;
  height: number;
}

/** microCMSのカテゴリ型定義 */
export interface Category extends MicroCMSContentBase {
  name: string;
  description?: string;
  image?: MicroCMSImageField;
  eyecatch?: MicroCMSImageField;
}

/** microCMSのブログ記事型定義 */
export interface Blog extends MicroCMSContentBase {
  title: string;
  content: string;
  category?: Category;
  user_id?: string | { user_id: string };  // 文字列またはコンテンツ参照オブジェクト
  image?: MicroCMSImageField;
  publishedAt: string;
}

/** microCMSの作者型定義 */
export interface Author extends MicroCMSContentBase {
  user_id: string;
  name?: string;
}
/** microCMSのAPIレスポンス型 */
export interface MicroCMSListResponse<T> {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
}

/** microCMSのクエリパラメータ型 */
export interface MicroCMSQuery {
  orders?: string;
  limit?: number;
  offset?: number;
  filters?: string;
  fields?: string;
  depth?: number;
}
