'use client';

import React, { useEffect, useState } from 'react';
import styles from './CustomMessageArea.module.css';

const CustomMessageArea = ({ message, type, duration }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message && message.length > 0) {
      setVisible(true);
      if (duration > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
        }, duration * 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [message, type, duration]);

  const closeMessage = () => {
    setVisible(false);
  };

  // APIエラー専用の表示判定
  const isApiError = type === 'error' && message && message.some(msg => 
    msg.includes('API') || msg.includes('デモモード') || msg.includes('接続')
  );

  return (
    <div className={`${styles['custommessagearea-container']} ${visible ? styles.visible : styles.hidden}`}>
      <div className={ `${styles.custommessagearea} ${visible ? styles.visible : styles.hidden} ${styles[`message-${type}`]}`}>
        <button type="button" className={`${styles['close-button']}`} onClick={closeMessage} >×</button>
        <div className={styles.alert}>
          <strong>{isApiError ? 'API接続状況' : type}</strong>
          <ul>
            {message && message.map((msg, index) => (
              <li key={index}>{msg}</li>
            ))}
          </ul>
          {isApiError && (
            <div style={{ marginTop: '10px', fontSize: '0.9em', opacity: 0.8 }}>
              詳細な診断は <code>/api-test</code> ページで実行できます
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomMessageArea;