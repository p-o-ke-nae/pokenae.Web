'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

type MessageType = 'info' | 'success' | 'warning' | 'error';

interface AppContextType {
  showInfo: (message: string | string[], duration?: number) => void;
  showSuccess: (message: string | string[], duration?: number) => void;
  showWarning: (message: string | string[], duration?: number) => void;
  showError: (message: string | string[], duration?: number) => void;
  showConfirm: (title: string, message: string) => Promise<boolean>;
  generateValidationMessage: (errors: Record<string, string>) => string;
  getMetaDataFromname: (metaData: any[], name: string) => any;
  setIsLoading: (loading: boolean) => void;
  isLoading: boolean;
  message: string[];
  messageType: MessageType;
  messageDuration: number;
  isConfirmOpen: boolean;
  confirmTitle: string;
  confirmMessage: string;
  handleConfirm: () => void;
  handleCancel: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [message, setMessage] = useState<string[]>([]);
  const [messageType, setMessageType] = useState<MessageType>('info');
  const [messageDuration, setMessageDuration] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [confirmTitle, setConfirmTitle] = useState<string>('');
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [onConfirmCallback, setOnConfirmCallback] = useState<((value: boolean) => void) | null>(null);

  const showInfo = (message: string | string[], duration?: number) => {
    showMessage(message, 'info', duration);
  };
  const showSuccess = (message: string | string[], duration?: number) => {
    showMessage(message, 'success', duration);
  };
  const showWarning = (message: string | string[], duration?: number) => {
    showMessage(message, 'warning', duration);
  };
  const showError = (message: string | string[], duration?: number) => {
    showMessage(message, 'error', duration);
  };
  const showMessage = (message: string | string[], messagetype: MessageType, duration?: number) => {
    setMessage([]);
    setTimeout(() => {
      setMessage(Array.isArray(message) ? message : [message]);
      setMessageType(messagetype);
      setMessageDuration(duration || 0);
    }, 0);
  };
  const showConfirm = (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmTitle(title);
      setConfirmMessage(message);
      setOnConfirmCallback(() => resolve);
      setIsConfirmOpen(true);
    });
  };
  const handleConfirm = () => {
    setIsConfirmOpen(false);
    if (onConfirmCallback) {
      onConfirmCallback(true);
    }
  };
  const handleCancel = () => {
    setIsConfirmOpen(false);
    if (onConfirmCallback) {
      onConfirmCallback(false);
    }
  };
  const generateValidationMessage = (errors: Record<string, string>) => {
    if (!errors || Object.keys(errors).length === 0) {
      return '';
    }
    return Object.entries(errors)
      .map(([field, message]) => `${message}`)
      .join('\n');
  };
  const getMetaDataFromname = (metaData: any[], name: string) => {
    const data = metaData.find((meta) => meta.name === name);
    if (!data) {
      throw new Error(`${name}というメタデータは見つかりませんでした． \n Metadata not found for ${name}`);
    }
    return {
      ...data,
    };
  };

  return (
    <AppContext.Provider
      value={{
        showInfo,
        showSuccess,
        showWarning,
        showError,
        showConfirm,
        generateValidationMessage,
        getMetaDataFromname,
        setIsLoading,
        isLoading,
        message,
        messageType,
        messageDuration,
        isConfirmOpen,
        confirmTitle,
        confirmMessage,
        handleConfirm,
        handleCancel,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
