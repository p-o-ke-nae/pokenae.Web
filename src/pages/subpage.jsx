import React from 'react';
import { useAppContext } from '../../pokenae.WebComponent/src/context/AppContext';

const SubPage = () => {
  const { showInfo, showSuccess, showWarning, showError } = useAppContext();

  return (
    <div>
      <h1>Sub Page</h1>
      <div>
        <button onClick={() => showInfo('This is an info message on subpage', 3000)}>Show Info</button>
        <button onClick={() => showSuccess('This is a success message on subpage', 3000)}>Show Success</button>
        <button onClick={() => showWarning('This is a warning message on subpage', 3000)}>Show Warning</button>
        <button onClick={() => showError('This is an error message on subpage', 3000)}>Show Error</button>
      </div>
    </div>
  );
};

export default SubPage;
