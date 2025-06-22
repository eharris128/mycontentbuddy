import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  usagePercent: number;
  isExpired: boolean;
  resetTime: string;
  timeUntilReset: number;
}

interface RateLimitOverview {
  totalEndpoints: number;
  rateLimitedEndpoints: number;
  healthyEndpoints: number;
  nearLimitEndpoints: number;
}

interface RateLimitData {
  overview: RateLimitOverview;
  categories: {
    users: Record<string, RateLimit>;
    tweets: Record<string, RateLimit>;
    timeline: Record<string, RateLimit>;
    search: Record<string, RateLimit>;
    other: Record<string, RateLimit>;
  };
  totalEndpoints: number;
  lastUpdated: string;
}

const RateLimitDashboard: React.FC = () => {
  const [data, setData] = useState<RateLimitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchRateLimits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/auth/rate-limits/overview');
      setData(response.data);
      setLastRefresh(new Date());
    } catch (error: any) {
      console.error('Failed to fetch rate limits:', error);
      setError(error.response?.data?.error || 'Failed to load rate limits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchRateLimits, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatTimeUntilReset = (seconds: number): string => {
    if (seconds <= 0) return 'Reset now';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusColor = (rateLimit: RateLimit): string => {
    if (rateLimit.isExpired) return '#28a745'; // Green - reset
    if (rateLimit.remaining === 0) return '#dc3545'; // Red - exhausted
    if (rateLimit.usagePercent >= 80) return '#ffc107'; // Yellow - warning
    return '#17a2b8'; // Blue - healthy
  };

  const getStatusText = (rateLimit: RateLimit): string => {
    if (rateLimit.isExpired) return 'Reset';
    if (rateLimit.remaining === 0) return 'Exhausted';
    if (rateLimit.usagePercent >= 80) return 'Near Limit';
    return 'Healthy';
  };

  const renderRateLimitCard = (endpoint: string, rateLimit: RateLimit) => {
    const statusColor = getStatusColor(rateLimit);
    const statusText = getStatusText(rateLimit);
    
    return (
      <div
        key={endpoint}
        style={{
          border: `2px solid ${statusColor}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px',
          backgroundColor: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h5 style={{ margin: 0, fontSize: '14px', color: '#333' }}>
            {endpoint}
          </h5>
          <span style={{
            color: statusColor,
            fontWeight: 'bold',
            fontSize: '12px',
            backgroundColor: `${statusColor}20`,
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            {statusText}
          </span>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            height: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: statusColor,
              height: '100%',
              width: `${rateLimit.usagePercent}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
          <span>{rateLimit.remaining} / {rateLimit.limit} remaining</span>
          <span>Resets in {formatTimeUntilReset(rateLimit.timeUntilReset)}</span>
        </div>
      </div>
    );
  };

  const renderCategory = (categoryName: string, rateLimits: Record<string, RateLimit>) => {
    const endpoints = Object.keys(rateLimits);
    if (endpoints.length === 0) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{
          margin: '0 0 12px 0',
          padding: '8px 12px',
          backgroundColor: '#f8f9fa',
          borderLeft: '4px solid #1da1f2',
          fontSize: '16px',
          color: '#333'
        }}>
          {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} ({endpoints.length})
        </h4>
        {endpoints.map(endpoint => renderRateLimitCard(endpoint, rateLimits[endpoint]))}
      </div>
    );
  };

  if (loading && !data) {
    return (
      <div style={{
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        Loading rate limits...
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: '#1da1f2' }}>
            📊 Rate Limit Dashboard
          </h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', color: '#666' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ marginRight: '4px' }}
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchRateLimits}
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
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {error ? (
          <div style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '12px',
            color: '#721c24',
            marginBottom: '16px'
          }}>
            ❌ {error}
          </div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Load your rate limit information to monitor API usage
            </p>
            <button
              onClick={fetchRateLimits}
              style={{
                backgroundColor: '#1da1f2',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Load Rate Limits
            </button>
          </div>
        ) : (
          <>
            {/* Overview stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1da1f2' }}>
                  {data.overview.totalEndpoints}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Endpoints</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {data.overview.healthyEndpoints}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Healthy</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
                  {data.overview.nearLimitEndpoints}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Near Limit</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                  {data.overview.rateLimitedEndpoints}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Rate Limited</div>
              </div>
            </div>

            {/* Categories */}
            {renderCategory('Users', data.categories.users)}
            {renderCategory('Timeline', data.categories.timeline)}
            {renderCategory('Tweets', data.categories.tweets)}
            {renderCategory('Search', data.categories.search)}
            {renderCategory('Other', data.categories.other)}

            {/* Last updated */}
            <div style={{
              textAlign: 'center',
              fontSize: '12px',
              color: '#666',
              borderTop: '1px solid #e1e8ed',
              paddingTop: '12px'
            }}>
              {lastRefresh && (
                <>Last updated: {lastRefresh.toLocaleTimeString()}</>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RateLimitDashboard;