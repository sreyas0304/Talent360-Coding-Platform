// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Primary from './pages/Primary.jsx';
import Play from './pages/Play.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Primary />} />
        <Route path="/play" element={<Play />} />
        <Route path="/play/:qid" element={<Play />} />
      </Routes>
    </BrowserRouter>
  );
}
