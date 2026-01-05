'use client';

import { AdminGuard } from '@/components/AdminGuard';
import { LogDownloadModal } from '@/components/admin/LogDownloadModal';
import { TermsEditModal } from '@/components/admin/TermsEditModal';
import { IdeaManagementModal } from '@/components/admin/IdeaManagementModal';
import { DocumentEditor } from '@/components/admin/DocumentEditor';
// import { LogInputModal } from '@/components/admin/LogInputModal'
import { useState } from 'react';
import { EditableDocument } from '@/types/admin';

export default function AdminPage() {
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [termsEditModalOpen, setTermsEditModalOpen] = useState(false);
  const [ideaManagementModalOpen, setIdeaManagementModalOpen] = useState(false);
  const [documentEditorOpen, setDocumentEditorOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<EditableDocument | null>(null);
  // const [logInputModalOpen, setLogInputModalOpen] = useState(false)

  const handleDocumentSelect = (documentType: EditableDocument) => {
    setSelectedDocument(documentType);
    setDocumentEditorOpen(true);
  };

  return (
    <AdminGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">
            管理者ダッシュボード
          </h1>

          <div className="space-y-4">
            {/* 広告手動入力 */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      広告手動入力
                    </h2>
                    <p className="text-gray-600 text-sm">
                      サイト内の広告を手動で入力・管理します
                    </p>
                  </div>
                </div>
                <button
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                  onClick={() => handleDocumentSelect('advertising')}
                >
                  管理画面
                </button>
              </div>
            </div>

            {/* 規約等手動入力 */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      規約等手動入力
                    </h2>
                    <p className="text-gray-600 text-sm">
                      利用規約やプライバシーポリシーを管理します
                    </p>
                  </div>
                </div>
                <button
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                  onClick={() => setTermsEditModalOpen(true)}
                >
                  管理画面
                </button>
              </div>
            </div>

            {/* 登録者情報修正 */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      登録者情報修正
                    </h2>
                    <p className="text-gray-600 text-sm">
                      ユーザーの登録情報を修正・管理します
                    </p>
                  </div>
                </div>
                <a
                  href="/admin/users"
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                >
                  管理画面
                </a>
              </div>
            </div>

            {/* 最終アイデア修正 */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      最終アイデア修正
                    </h2>
                    <p className="text-gray-600 text-sm">
                      ユーザーが投稿した最終アイデアを修正・管理します
                    </p>
                  </div>
                </div>
                <button
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                  onClick={() => setIdeaManagementModalOpen(true)}
                >
                  管理画面
                </button>
              </div>
            </div>

            {/* ログ入力（一時的に無効化） */}
            {/* <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">ログ入力</h2>
                    <p className="text-gray-600 text-sm">監査ログやシステムログを手動で入力・記録します</p>
                  </div>
                </div>
                <button 
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                  onClick={() => setLogInputModalOpen(true)}
                >
                  管理画面
                </button>
              </div>
            </div> */}

            {/* 期限切れアイデア管理 */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      改善意見の募集期限切れ
                    </h2>
                    <p className="text-gray-600 text-sm">
                      期限切れのアイデアを自動的に検出し、ステータスを更新します
                    </p>
                  </div>
                </div>
                <a
                  href="/admin/overdue"
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                >
                  管理画面
                </a>
              </div>
            </div>

            {/* ログダウンロード */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      ログダウンロード
                    </h2>
                    <p className="text-gray-600 text-sm">
                      システムログやアクセスログをダウンロードします
                    </p>
                  </div>
                </div>
                <button
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                  onClick={() => setLogModalOpen(true)}
                >
                  管理画面
                </button>
              </div>
            </div>

            {/* 購入済みアイデア確認 */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">購入済みアイデア確認</h2>
                    <p className="text-gray-600 text-sm">購入済みテーブルの確認、入金ステータス更新、購入取消を行います</p>
                  </div>
                </div>
                <a
                  href="/admin/sold"
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                >
                  管理画面
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ログダウンロードモーダル */}
      <LogDownloadModal open={logModalOpen} onOpenChange={setLogModalOpen} />

      {/* 規約等編集モーダル */}
      <TermsEditModal
        open={termsEditModalOpen}
        onOpenChange={setTermsEditModalOpen}
        onDocumentSelect={handleDocumentSelect}
      />

      {/* 最終アイデア修正モーダル */}
      <IdeaManagementModal
        open={ideaManagementModalOpen}
        onOpenChange={setIdeaManagementModalOpen}
      />

      {/* 文書編集画面 */}
      <DocumentEditor
        open={documentEditorOpen}
        onOpenChange={setDocumentEditorOpen}
        documentType={selectedDocument}
      />

      {/* ログ入力モーダル（一時的に無効化） */}
      {/* <LogInputModal 
          open={logInputModalOpen} 
          onOpenChange={setLogInputModalOpen} 
        /> */}
    </AdminGuard>
  );
}
