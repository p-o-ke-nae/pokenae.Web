import type { Metadata } from 'next';
import CustomHeader from '@/components/atoms/CustomHeader';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | pokenae',
  description: 'pokenaeのプライバシーポリシーページです。',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="page-container">
      <header className="page-header">
        <CustomHeader>プライバシーポリシー</CustomHeader>
      </header>
      <div className="legal-document">
        <section>
          <p>
            pokenae（以下「当サイト」）は、ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
          </p>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">1. 収集する情報</CustomHeader>
          <p>
            当サイトでは、Google OAuth2 を利用したログイン機能を提供しています。ログイン時に、Google
            アカウントの氏名・メールアドレス・プロフィール画像などの情報を取得する場合があります。
            これらの情報は、当サイトのサービス提供のためにのみ利用します。
          </p>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">2. アクセス解析ツールについて</CustomHeader>
          <p>
            当サイトでは、アクセス状況を把握するためにアクセス解析ツールを使用することがあります。
            アクセス解析ツールはトラフィックデータの収集のために Cookie を使用しています。
            このトラフィックデータは匿名で収集されており、個人を特定するものではありません。
            Cookie の収集を望まない場合は、ブラウザの設定により Cookie を無効にすることが可能です。
            Cookie を無効にした場合でも、当サイトをご利用いただけますが、一部機能が制限される場合があります。
          </p>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">3. 個人情報の利用目的</CustomHeader>
          <p>当サイトが個人情報を収集・利用する目的は以下のとおりです。</p>
          <ul>
            <li>当サイトのサービス提供・運営のため</li>
            <li>ユーザーからのお問い合わせへの対応のため</li>
            <li>当サイトの改善・新機能の開発のため</li>
            <li>不正利用の防止および安全性の確保のため</li>
          </ul>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">4. 第三者への提供</CustomHeader>
          <p>
            当サイトは、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
          </p>
          <ul>
            <li>ユーザー本人の同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>人の生命・身体・財産の保護のために必要な場合</li>
          </ul>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">5. 個人情報の安全管理</CustomHeader>
          <p>
            当サイトは、収集した個人情報を適切に管理し、不正アクセス・紛失・破損・改ざん・漏洩などが
            生じないよう、合理的な安全対策を講じます。
          </p>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">6. プライバシーポリシーの変更</CustomHeader>
          <p>
            当サイトは、必要に応じて本プライバシーポリシーを変更することがあります。
            変更した場合は、当ページにて掲載します。重要な変更がある場合は、サイト上でお知らせします。
          </p>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">7. お問い合わせ</CustomHeader>
          <p>
            本プライバシーポリシーに関するお問い合わせは、当サイトの管理者までご連絡ください。
          </p>
        </section>

        <section className="legal-document__footer">
          <p>
            制定日：2025年1月1日
          </p>
        </section>
      </div>
    </main>
  );
}
