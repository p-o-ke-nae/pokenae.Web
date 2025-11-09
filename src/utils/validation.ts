import styles from '../styles/Home.module.css';

export const validateFormData = async (formData, formMetaData, validateUrl) => {
  const newErrors = {};
  
  // クライアントサイドの検証
  formMetaData.forEach((field) => {
    if (field.status === 'required' && !formData[field.name]) {
      newErrors[field.name] = `${field.label} が入力されていません`;
      // エラーが発生したフィールドに .error クラスを付与
      const element = document.querySelector(`[name="${field.name}"]`);
      
      if (element) {
        element.classList.add(styles.error);
        // focus イベントで .error クラスを解除
        element.addEventListener('focus', () => {
          element.classList.remove(styles.error);
        });
        // blur イベントで再度検証
        element.addEventListener('blur', () => {
        //   if (!element.value && field.status === 'required') {
        //     element.classList.add('error');
            //   }
            element.classList.remove(styles.error);
        });
      }
    }
  });

  if (Object.keys(newErrors).length > 0) {
    return { isValid: false, errors: newErrors };
  }

  // サーバサイドの検証
  try {
    const response = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    const data = await response.json();
    if (!response.ok) {
      // サーバサイドのエラーも .error クラスを付与
      Object.keys(data.errors || {}).forEach((field) => {
        const element = document.querySelector(`[name="${field}"]`);
        if (element) {
          element.classList.add(styles.error);
          // focus イベントで .error クラスを解除
          element.addEventListener(styles.error, () => {
            element.classList.remove(styles.error);
          });
          // blur イベントで再度検証
          element.addEventListener('blur', () => {
            // if (!element.value && formMetaData.find(f => f.name === field).status === 'required') {
            //   element.classList.add('error');
              // }
            element.classList.remove(styles.error);
          });
        }
      });
      return { isValid: false, errors: data.errors || { server: 'Validation failed on server' } };
    }
  } catch (error) {
    return { isValid: false, errors: { server: 'Server validation error' } };
  }

  return { isValid: true, errors: {} };
};