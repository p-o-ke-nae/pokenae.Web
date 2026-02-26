import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | pokenae',
  description: 'pokenaeのプライバシーポリシーページです。',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">
          プライバシーポリシー
        </h1>

        <div className="space-y-8 text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <section>
            <p>
              pokenae（以下「当サイト」）は、ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
              1. 収集する情報
            </h2>
            <p>
              当サイトでは、Google OAuth2 を利用したログイン機能を提供しています。ログイン時に、Google
              アカウントの氏名・メールアドレス・プロフィール画像などの情報を取得する場合があります。
              これらの情報は、当サイトのサービス提供のためにのみ利用します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
              2. アクセス解析ツールについて
            </h2>
            <p>
              当サイトでは、アクセス状況を把握するためにアクセス解析ツールを使用することがあります。
              アクセス解析ツールはトラフィックデータの収集のために Cookie を使用しています。
              このトラフィックデータは匿名で収集されており、個人を特定するものではありません。
              Cookie の収集を望まない場合は、ブラウザの設定により Cookie を無効にすることが可能です。
              Cookie を無効にした場合でも、当サイトをご利用いただけますが、一部機能が制限される場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
              3. 個人情報の利用目的
            </h2>
            <p>当サイトが個人情報を収集・利用する目的は以下のとおりです。</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>当サイトのサービス提供・運営のため</li>
              <li>ユーザーからのお問い合わせへの対応のため</li>
              <li>当サイトの改善・新機能の開発のため</li>
              <li>不正利用の防止および安全性の確保のため</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
              4. 第三者への提供
            </h2>
            <p>
              当サイトは、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>ユーザー本人の同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命・身体・財産の保護のために必要な場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
              5. 個人情報の安全管理
            </h2>
            <p>
              当サイトは、収集した個人情報を適切に管理し、不正アクセス・紛失・破損・改ざん・漏洩などが
              生じないよう、合理的な安全対策を講じます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
              6. プライバシーポリシーの変更
            </h2>
            <p>
              当サイトは、必要に応じて本プライバシーポリシーを変更することがあります。
              変更した場合は、当ページにて掲載します。重要な変更がある場合は、サイト上でお知らせします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
              7. お問い合わせ
            </h2>
            <p>
              本プライバシーポリシーに関するお問い合わせは、当サイトの管理者までご連絡ください。
            </p>
          </section>

          <section className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              制定日：2025年1月1日
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
