import React from 'react';
import styles from './CustomButton.module.css';

const CustomButtonNavigation = ({ url, children }) => {
  return (
    <a href={url } className={`${styles.custombutton} ${styles[`custombutton-navigation`]}`} >
        <div>
            {children}
        </div>
    </a>
  );
};

export default CustomButtonNavigation;