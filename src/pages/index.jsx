import React from 'react';
import { useAppContext } from '../../pokenae.WebComponent/src/context/AppContext';

const Index = () => {
  const { showInfo, showSuccess, showWarning, showError } = useAppContext();

  return (
    <div>
      <a href={'./subpage'}>sub</a>
      <div>
        <button onClick={() => showInfo('This is an info message', 3000)}>Show Info</button>
        <button onClick={() => showSuccess('This is a success message', 3000)}>Show Success</button>
        <button onClick={() => showWarning('This is a warning message', 3000)}>Show Warning</button>
        <button onClick={() => showError('This is an error message', 3000)}>Show Error</button>
      </div>
    </div>
  );
};

export default Index;