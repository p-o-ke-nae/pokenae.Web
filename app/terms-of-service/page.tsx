import type { Metadata } from 'next';
import CustomHeader from '@/components/atoms/CustomHeader';

export const metadata: Metadata = {
  title: '利用規約 | pokenae',
  description: 'pokenaeの利用規約ページです。',
};

export default function TermsOfServicePage() {
  return (
    <main className="page-container">
      <header className="page-header">
        <CustomHeader>利用規約</CustomHeader>
      </header>
      <div className="legal-document">
        <section>
          <p>
            pokenae（以下「当サイト」）をご利用いただくにあたり、以下の利用規約をお読みください。
            当サイトをご利用いただいた場合、本規約に同意したものとみなします。
          </p>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">1. 利用条件</CustomHeader>
          <p>
            当サイトは、本規約に従ってご利用いただけます。当サイトのサービスを利用することにより、
            ユーザーは本規約の全条項に同意したものとみなします。
            本規約に同意いただけない場合は、当サイトの利用をお控えください。
          </p>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">2. 禁止事項</CustomHeader>
          <p>ユーザーは以下の行為を行うことを禁止します。</p>
          <ul>
            <li>法令または公序良俗に違反する行為</li>
            <li>当サイトのサーバーやネットワークに過大な負荷をかける行為</li>
            <li>当サイトの運営を妨害する行為</li>
            <li>他のユーザーまたは第三者に不利益・損害を与える行為</li>
            <li>不正アクセスやクラッキング等の行為</li>
            <li>当サイトのコンテンツを無断で複製・転載・改変する行為</li>
            <li>その他、当サイトが不適切と判断する行為</li>
          </ul>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">3. 免責事項</CustomHeader>
          <p>
            当サイトは、当サイトのコンテンツの正確性・完全性・有用性等について、いかなる保証も行いません。
            当サイトの利用によって生じた損害について、当サイトは一切の責任を負いません。
            また、当サイトはやむを得ない理由によりサービスを中断・終了する場合があります。
          </p>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">4. 知的財産権</CustomHeader>
          <p>
            当サイトに掲載されているコンテンツ（テキスト・画像・デザイン等）の著作権は、
            当サイトまたは正当な権利を有する第三者に帰属します。
            無断転載・複製・二次利用等は禁止します。
          </p>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">5. アカウントの管理</CustomHeader>
          <p>
            当サイトでは Google アカウントを利用したログイン機能を提供しています。
            ユーザーは自己の責任においてアカウントを管理し、不正利用が発覚した場合は直ちに当サイトにご連絡ください。
            アカウントの不正利用によって生じた損害について、当サイトは責任を負いません。
          </p>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">6. 規約の変更</CustomHeader>
          <p>
            当サイトは、必要に応じて本規約を変更することがあります。
            変更後の規約は当ページに掲載した時点から効力を生じます。
            重要な変更がある場合は、サイト上でお知らせします。
          </p>
        </section>

        <section>
          <CustomHeader level={2} variant="subtle">7. 準拠法・管轄裁判所</CustomHeader>
          <p>
            本規約は日本法に準拠します。本規約に関する紛争については、
            当サイト運営者の所在地を管轄する裁判所を専属的合意管轄裁判所とします。
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
