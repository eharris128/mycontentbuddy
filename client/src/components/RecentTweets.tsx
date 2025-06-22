import React, { useState } from 'react';
import { api } from '../services/api';

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
}

const RecentTweets: React.FC = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsRateLimited(false);
      
      const response = await api.get('/api/timeline?limit=5');
      setTweets(response.data.tweets || []);
      setLastFetch(new Date());
      setHasInitialLoad(true);
    } catch (error: any) {
      console.error('Failed to fetch timeline:', error);
      
      if (error.response?.status === 429) {
        setIsRateLimited(true);
        setError(`Timeline rate limited. Cache refreshes every 5 minutes.`);
      } else {
        setError(error.response?.data?.error || 'Failed to load timeline');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Show initial load button if no timeline has been loaded yet
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
            🕐 Timeline
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
            Load your recent timeline to see the latest tweets
          </div>
          <div style={{
            fontSize: '12px',
            color: '#657786',
            marginBottom: '20px'
          }}>
            💡 Timeline data is cached for 5 minutes to conserve API limits
          </div>
          <button
            onClick={fetchTimeline}
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
            Load Timeline
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
        Loading timeline...
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
            Timeline data is cached for 5 minutes to avoid rate limits.
            {lastFetch && (
              <div>Last updated: {lastFetch.toLocaleTimeString()}</div>
            )}
          </div>
        )}
        {!isRateLimited && (
          <button
            onClick={fetchTimeline}
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
          🕐 Recent Timeline ({tweets.length} tweets)
        </h4>
      </div>

      {tweets.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#657786'
        }}>
          No tweets found in your timeline. Try refreshing or check back later!
        </div>
      ) : (
        <div>
          {tweets.map((tweet, index) => (
            <div
              key={tweet.id}
              style={{
                padding: '16px',
                borderBottom: index < tweets.length - 1 ? '1px solid #e1e8ed' : 'none'
              }}
            >
              <div style={{
                fontSize: '14px',
                lineHeight: '1.4',
                color: '#14171a',
                marginBottom: '8px'
              }}>
                {tweet.text}
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#657786'
              }}>
                <span>{formatDate(tweet.created_at)}</span>
                
                {tweet.public_metrics && (
                  <div style={{
                    display: 'flex',
                    gap: '12px'
                  }}>
                    <span title="Replies">
                      💬 {formatNumber(tweet.public_metrics.reply_count)}
                    </span>
                    <span title="Retweets">
                      🔄 {formatNumber(tweet.public_metrics.retweet_count)}
                    </span>
                    <span title="Likes">
                      ❤️ {formatNumber(tweet.public_metrics.like_count)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        padding: '12px 16px',
        textAlign: 'center',
        borderTop: '1px solid #e1e8ed',
        backgroundColor: '#f8f9fa'
      }}>
        <button
          onClick={fetchTimeline}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#6c757d' : '#1da1f2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '12px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh Timeline'}
        </button>
        {lastFetch && (
          <div style={{
            fontSize: '10px',
            color: '#657786',
            marginTop: '4px'
          }}>
            Last updated: {lastFetch.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentTweets;