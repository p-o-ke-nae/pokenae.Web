'use client';

import React from 'react';
import { 
  Layout,
  Callback
} from '@webcomponent/components';

// WebComponentの認証処理を直接使用することで、
// pokenae.Webでは認証ロジックを持たない
export default function CallbackPage() {
  return (
    <Layout>
      <Callback />
    </Layout>
  );
}
