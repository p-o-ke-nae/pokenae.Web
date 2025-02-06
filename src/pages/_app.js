import React from 'react';
import { AppProvider } from '../../pokenae.WebComponent/src/context/AppContext';
import Layout from '../../pokenae.WebComponent/src/components/Layout';
import '../app/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <AppProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AppProvider>
  );
}

export default MyApp;
