import React from 'react';
import { useAuth } from '../hooks/useAuth';
import LoginPage from './LoginPage';

const HomePage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div>
      <h2>Welcome back!</h2>
      {user && (
        <div>
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Username:</strong> @{user.username}</p>
        </div>
      )}
      <div style={{ marginTop: '20px' }}>
        <a href="/playground" className="btn btn-small btn-success" style={{ marginRight: '10px' }}>
          Go to Playground
        </a>
        <button 
          onClick={logout} 
          className="btn btn-small"
          style={{ 
            backgroundColor: '#d9534f', 
            borderColor: '#d43f3a', 
            color: '#fff' 
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default HomePage;