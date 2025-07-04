import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import Playground from './components/Playground';
import ThankYou from './components/ThankYou';
import ListsPage from './components/ListsPage';

function App() {
  return (
    <AuthProvider>
      <div className="container">
        <h1>My Content Buddy</h1>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/lists" element={<ListsPage />} />
        </Routes>
        <hr />
      </div>
    </AuthProvider>
  );
}

export default App;