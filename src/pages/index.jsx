import React from 'react';
import { useAppContext } from '../../pokenae.WebComponent/src/context/AppContext';
import CustomButton from '../../pokenae.WebComponent/src/components/CustomButton';

const Index = () => {
  const { showInfo, showSuccess, showWarning, showError } = useAppContext();

  return (
    <div>
      <a href={'./subpage'}>sub</a>
      <div>
        <CustomButton onClick={() => showInfo('This is an info message', 3)}>Show Info</CustomButton>
        <CustomButton onClick={() => showSuccess('This is a success message', 3)}>Show Success</CustomButton>
        <CustomButton onClick={() => showWarning('This is a warning message', 3)}>Show Warning</CustomButton>
        <CustomButton onClick={() => showError('This is an error message')}>Show Error</CustomButton>
      </div>
    </div>
  );
};

export default Index;