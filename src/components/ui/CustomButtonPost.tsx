import React from 'react';
import CustomButton from './CustomButton';
import { validateFormData } from '../../utils/validation'; // 検証処理関数をインポート

const CustomButtonPost = ({ url, params, useFetch = true, validateUrl, formMetaData, onSuccess, onError, setIsLoading, children }) => {
  const onClick = async (event) => {
    if (useFetch) {
      event.preventDefault();
    }
    setIsLoading(true); // ローディング状態を設定
    
    // 検証処理を実行
    if (validateUrl) {
      try {
        const { isValid, errors } = await validateFormData(params, formMetaData, validateUrl);
        if (!isValid) {
          onError({ message: 'Validation failed', errors });
          setIsLoading(false);
          return;
        }
      } catch (error) {
        onError(error);
        setIsLoading(false); // ローディング状態を解除
        return;
      } finally {
        
      }
    }
    
    if (useFetch) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        onSuccess(data);
      } catch (error) {
        onError(error);
      } finally {
        setIsLoading(false); // ローディング状態を解除
      }
    }
    
  };

  return (
    <CustomButton onClick={onClick}>
      {children}
    </CustomButton>
  );
};

export default CustomButtonPost;