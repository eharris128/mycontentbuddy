import React, { useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/user/profile');
      setUser(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      setError(error.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

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
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: '#f8d7da',
        color: '#721c24'
      }}>
        ❌ {error}
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