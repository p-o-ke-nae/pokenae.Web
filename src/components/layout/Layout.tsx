"use client";
import React, { useEffect, useState, ReactNode } from 'react';
import CustomMessageArea from '../ui/CustomMessageArea';
import CustomLoading from '../ui/CustomLoading';
import CustomMessageDialog from '../ui/CustomMessageDialog';
import { useAppContext } from '../../context/AppContext';
import { checkPermissions } from '../../utils/permissions';
import { PageModeProvider, PageModes, PageMode } from '../../context/PageModeContext';
import { fetchPageTitle, fetchPageList, fetchCategories } from '../../utils/api';
import Header from './Header';
import Footer from './Footer';
import RightSidebar from './RightSidebar';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const {
    message,
    messageType,
    messageDuration,
    isLoading,
    isConfirmOpen,
    confirmTitle,
    confirmMessage,
    handleConfirm,
    handleCancel,
  } = useAppContext();

  const [permissions, setPermissions] = useState<any>(null);
  const [pageMode, setPageMode] = useState<PageMode>(PageModes.READ_ONLY);
  const [pageTitle, setPageTitle] = useState<string>('');
  const [pageList, setPageList] = useState<any[]>([]);
  const [recommendedPages, setRecommendedPages] = useState<any[]>([]);
  const [pageRankings, setPageRankings] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchPermissions = async () => {
      const userPermissions = await checkPermissions();
      setPermissions(userPermissions);
      // TODO: Implement proper permission check
      setPageMode(PageModes.READ_ONLY);
    };

    const fetchData = async () => {
      const title = await fetchPageTitle();
      const pages = await fetchPageList();
      const categories = await fetchCategories();
      setPageTitle(title);
      setPageList(pages);
      setCategories(categories);
      setRecommendedPages(pages.slice(0, 3)); // 仮のデータ
      setPageRankings(pages.slice(0, 3)); // 仮のデータ
    };

    fetchPermissions();
    fetchData();
  }, []);

  if (!permissions) {
    return <CustomLoading isLoading={true} />;
  }

  return (
    <PageModeProvider value={pageMode}>
      <div className={styles.container}>
        <Header categories={categories} />
        <div className={styles.content}>
          <div className={styles.leftSidebarPlaceholder}></div> {/* 左サイドバーの幅を残す */}
          <main className={styles.mainContent}>
            <CustomMessageArea
              message={message}
              type={messageType}
              duration={messageDuration}
            />
            <CustomLoading isLoading={isLoading} />
            {isConfirmOpen && (
              <CustomMessageDialog
                title={confirmTitle}
                message={confirmMessage}
                isConfirmOpen={isConfirmOpen}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            )}
            {children}
          </main>
          <div className={styles.rightSidebar}>
            <RightSidebar recommendedPages={recommendedPages} pageRankings={pageRankings} />
          </div>
        </div>
        <Footer pageList={pageList} />
      </div>
    </PageModeProvider>
  );
};

export default Layout;