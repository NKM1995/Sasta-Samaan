import React from 'react';

export default function SearchBar({value, onChange, onEnter}) {
  return (
    <input
      placeholder="Search product / brand / category"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && onEnter) onEnter(); }}
      style={{padding:8, borderRadius:6, border:'1px solid #ccc', width:'100%'}}
    />
  );
}
