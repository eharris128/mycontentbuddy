import React, { useState } from 'react';
import { api } from '../services/api';

interface TweetComposerProps {
  onTweetPosted?: () => void;
}

const TweetComposer: React.FC<TweetComposerProps> = ({ onTweetPosted }) => {
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsPosting(true);
    setError(null);
    setSuccess(false);

    try {
      await api.post('/api/tweet', { text: text.trim() });
      setText('');
      setSuccess(true);
      onTweetPosted?.();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Failed to post tweet:', error);
      setError(error.response?.data?.error || 'Failed to post tweet');
    } finally {
      setIsPosting(false);
    }
  };

  const characterCount = text.length;
  const remainingChars = 280 - characterCount;
  const isOverLimit = remainingChars < 0;

  return (
    <div style={{
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '16px',
      backgroundColor: '#f8f9fa',
      marginBottom: '20px'
    }}>
      <h4 style={{ marginBottom: '12px', color: '#1da1f2' }}>
        📝 Compose Tweet
      </h4>
      
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontSize: '16px',
            boxSizing: 'border-box'
          }}
          disabled={isPosting}
        />
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px'
        }}>
          <div style={{
            fontSize: '14px',
            color: isOverLimit ? '#dc3545' : remainingChars < 20 ? '#fd7e14' : '#6c757d'
          }}>
            {remainingChars} characters remaining
          </div>
          
          <button
            type="submit"
            disabled={isPosting || !text.trim() || isOverLimit}
            style={{
              backgroundColor: isPosting || !text.trim() || isOverLimit ? '#6c757d' : '#1da1f2',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isPosting || !text.trim() || isOverLimit ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {isPosting ? 'Posting...' : 'Tweet'}
          </button>
        </div>
      </form>

      {success && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          color: '#155724',
          fontSize: '14px'
        }}>
          ✅ Tweet posted successfully!
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24',
          fontSize: '14px'
        }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
};

export default TweetComposer;