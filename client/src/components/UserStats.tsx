import React, { useState } from 'react';
import { api } from '../services/api';

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  created_at?: string;
}

const UserStats: React.FC = () => {
  const [user, setUser] = useState<TwitterUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsRateLimited(false);
      
      const response = await api.get('/auth/profile');
      setUser(response.data.data);
      setHasInitialLoad(true);
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      
      if (error.response?.status === 429) {
        setIsRateLimited(true);
        const waitTime = error.response?.data?.waitTimeSeconds || 0;
        setError(`Rate limited. ${waitTime > 0 ? `Try again in ${Math.ceil(waitTime / 3600)} hours.` : 'Try again later.'}`);
      } else {
        setError(error.response?.data?.error || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show initial load button if no profile has been loaded yet
  if (!hasInitialLoad && !loading && !error) {
    return (
      <div style={{
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        marginBottom: '20px'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e1e8ed',
          backgroundColor: '#f8f9fa'
        }}>
          <h4 style={{ margin: 0, color: '#1da1f2' }}>
            👤 Profile
          </h4>
        </div>
        
        <div style={{
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '16px',
            color: '#14171a',
            marginBottom: '12px'
          }}>
            Load your Twitter profile to see your stats
          </div>
          <div style={{
            fontSize: '12px',
            color: '#657786',
            marginBottom: '20px'
          }}>
            💡 Profile data is cached for 30 minutes to conserve API limits
          </div>
          <button
            onClick={fetchUserProfile}
            style={{
              backgroundColor: '#1da1f2',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            Load Profile
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        Loading profile...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        border: `1px solid ${isRateLimited ? '#ffeaa7' : '#f5c6cb'}`,
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: isRateLimited ? '#fff3cd' : '#f8d7da',
        color: isRateLimited ? '#856404' : '#721c24'
      }}>
        {isRateLimited ? '⏱️' : '❌'} {error}
        {isRateLimited && (
          <div style={{ marginTop: '10px', fontSize: '12px' }}>
            This endpoint has a very low rate limit. Your profile data will be cached for 30 minutes once loaded.
          </div>
        )}
        {!isRateLimited && (
          <button
            onClick={fetchUserProfile}
            style={{
              marginLeft: '12px',
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: 'transparent',
              border: '1px solid currentColor',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  }) : null;

  return (
    <div style={{
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '20px',
      backgroundColor: '#ffffff',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        {user.profile_image_url && (
          <img
            src={user.profile_image_url}
            alt={user.name}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              marginRight: '12px'
            }}
          />
        )}
        <div>
          <h3 style={{ margin: 0, color: '#1da1f2' }}>{user.name}</h3>
          <p style={{ margin: 0, color: '#657786', fontSize: '14px' }}>
            @{user.username}
          </p>
        </div>
      </div>

      {user.description && (
        <p style={{
          marginBottom: '16px',
          color: '#14171a',
          lineHeight: '1.4'
        }}>
          {user.description}
        </p>
      )}

      {user.public_metrics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1da1f2' }}>
              {formatNumber(user.public_metrics.followers_count)}
            </div>
            <div style={{ fontSize: '12px', color: '#657786' }}>Followers</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1da1f2' }}>
              {formatNumber(user.public_metrics.following_count)}
            </div>
            <div style={{ fontSize: '12px', color: '#657786' }}>Following</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1da1f2' }}>
              {formatNumber(user.public_metrics.tweet_count)}
            </div>
            <div style={{ fontSize: '12px', color: '#657786' }}>Tweets</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1da1f2' }}>
              {formatNumber(user.public_metrics.listed_count)}
            </div>
            <div style={{ fontSize: '12px', color: '#657786' }}>Listed</div>
          </div>
        </div>
      )}

      {joinDate && (
        <div style={{
          fontSize: '12px',
          color: '#657786',
          borderTop: '1px solid #e1e8ed',
          paddingTop: '12px'
        }}>
          📅 Joined {joinDate}
        </div>
      )}
    </div>
  );
};

export default UserStats;