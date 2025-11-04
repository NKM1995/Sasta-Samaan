import React from 'react';
import Admin from '../Admin'; // Admin.jsx is at src/Admin.jsx already
export default function AdminPanel(){ 
  // We'll render Admin as a full page
  return (
    <div style={{padding:20}}>
      <Admin onClose={() => { /* for page, we may navigate back later */ }} />
    </div>
  );
}
