import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

const Playground: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isAuthenticated) {
    login('/playground');
    return <div>Redirecting to login...</div>;
  }

  const postRandomTweet = async () => {
    setIsPosting(true);
    setError(null);

    try {
      const response = await api.post('/api/tweet/random');
      const postedText = response.data.data.text;
      navigate('/thank-you', { state: { tweetText: postedText } });
    } catch (error: any) {
      console.error('Failed to post tweet:', error);
      setError(error.response?.data?.error || 'Failed to post tweet');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div>
      <h2>Playground</h2>
      <p>Click the button below to post a random tweet!</p>
      
      {error && (
        <div style={{ 
          color: '#d9534f', 
          backgroundColor: '#f2dede', 
          border: '1px solid #ebccd1',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      <button 
        onClick={postRandomTweet} 
        disabled={isPosting}
        className="btn btn-small btn-success"
        style={{ opacity: isPosting ? 0.6 : 1 }}
      >
        {isPosting ? 'Posting...' : 'Post Random Tweet'}
      </button>

      <div style={{ marginTop: '20px' }}>
        <a href="/" className="btn btn-small" style={{ 
          backgroundColor: '#6c757d', 
          borderColor: '#6c757d', 
          color: '#fff',
          textDecoration: 'none'
        }}>
          Back to Home
        </a>
      </div>
    </div>
  );
};

export default Playground;