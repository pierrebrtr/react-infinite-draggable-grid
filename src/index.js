import ReactDOM from 'react-dom/client'
import React, { Suspense } from 'react'
import './App.css'
import App from './App'



const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
