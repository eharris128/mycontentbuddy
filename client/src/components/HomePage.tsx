import React from 'react';
import { useAuth } from '../hooks/useAuth';
import LoginPage from './LoginPage';

const HomePage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout, forceRefreshAuth } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div>
      <h2>🎉 Welcome back!</h2>
      
      {/* Authentication Status */}
      <div style={{ 
        backgroundColor: '#d4edda', 
        border: '1px solid #c3e6cb', 
        borderRadius: '4px', 
        padding: '10px', 
        marginBottom: '20px' 
      }}>
        <strong>✅ Successfully logged in!</strong>
      </div>

      {/* User Information */}
      {user && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '4px', 
          padding: '15px', 
          marginBottom: '20px' 
        }}>
          <h3>Your Twitter Profile:</h3>
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Username:</strong> @{user.username}</p>
        </div>
      )}

      {/* Action Buttons */}
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
            color: '#fff',
            marginRight: '10px'
          }}
        >
          Logout
        </button>
        <button 
          onClick={forceRefreshAuth} 
          className="btn btn-small"
          style={{ 
            backgroundColor: '#6c757d', 
            borderColor: '#6c757d', 
            color: '#fff' 
          }}
        >
          Refresh Auth
        </button>
      </div>
    </div>
  );
};

export default HomePage;