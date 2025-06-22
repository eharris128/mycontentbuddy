import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LocationState {
  tweetText?: string;
}

const ThankYou: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  const tweetText = state?.tweetText || 'No tweet text found';

  return (
    <div>
      <h2>Thank You!</h2>
      <p>Your tweet has been posted successfully:</p>
      
      <div style={{
        backgroundColor: '#f9f9f9',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '15px',
        margin: '20px 0',
        fontStyle: 'italic'
      }}>
        "{tweetText}"
      </div>

      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => navigate('/playground')}
          className="btn btn-small btn-success"
          style={{ marginRight: '10px' }}
        >
          Post Another Tweet
        </button>
        <button 
          onClick={() => navigate('/')}
          className="btn btn-small"
          style={{ 
            backgroundColor: '#6c757d', 
            borderColor: '#6c757d', 
            color: '#fff' 
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default ThankYou;