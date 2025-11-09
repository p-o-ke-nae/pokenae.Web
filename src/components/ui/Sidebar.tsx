import React from 'react';

const Sidebar = ({ pageList }) => {
  return (
    <aside style={{ display: 'inline-block', width: '15%',  backgroundColor: '#f0f0f0', float: 'left' }}>
      <div>サイドバー</div>
      <ul>
        {pageList.map(page => (
          <li key={page.id}>{page.name}</li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
