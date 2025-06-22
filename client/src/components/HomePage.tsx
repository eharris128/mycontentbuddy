import React from 'react';
import { useAuth } from '../hooks/useAuth';
import LoginPage from './LoginPage';
import TweetComposer from './TweetComposer';
import UserStats from './UserStats';
import RecentTweets from './RecentTweets';
import RateLimitDashboard from './RateLimitDashboard';

const HomePage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout, forceRefreshAuth } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#1da1f2', marginBottom: '10px' }}>
          🎉 Welcome to Your Twitter Dashboard!
        </h2>
        
        {/* Quick Status */}
        <div style={{ 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb', 
          borderRadius: '8px', 
          padding: '12px', 
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <strong>✅ Successfully connected to Twitter!</strong>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          flexWrap: 'wrap',
          marginBottom: '30px'
        }}>
          <a 
            href="/playground" 
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Go to Playground
          </a>
          <button 
            onClick={logout} 
            style={{ 
              backgroundColor: '#dc3545', 
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
          <button 
            onClick={forceRefreshAuth} 
            style={{ 
              backgroundColor: '#6c757d', 
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Refresh Auth
          </button>
        </div>
      </div>

      {/* Twitter Dashboard Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Left Column - User Stats */}
        <div>
          <UserStats />
        </div>

        {/* Right Column - Tweet Composer */}
        <div>
          <TweetComposer onTweetPosted={() => {
            // Tweet posted successfully - timeline will need manual refresh
            console.log('Tweet posted! Timeline can be refreshed manually.');
          }} />
        </div>
      </div>

      {/* Full Width - Recent Timeline */}
      <RecentTweets />

      {/* Rate Limit Dashboard */}
      <RateLimitDashboard />

      {/* Legacy User Info for Fallback */}
      {user && (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '8px', 
          padding: '16px',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          <details>
            <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
              🔍 Raw User Data (for debugging)
            </summary>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Username:</strong> @{user.username}</p>
          </details>
        </div>
      )}
    </div>
  );
};

export default HomePage;