import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listApi } from '../services/api';

interface TwitterList {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  follower_count?: number;
  member_count?: number;
  private?: boolean;
  owner_id?: string;
}

interface TwitterListMember {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
}

const ListsPage: React.FC = () => {
  const navigate = useNavigate();
  const [ownedLists, setOwnedLists] = useState<TwitterList[]>([]);
  const [membershipLists, setMembershipLists] = useState<TwitterList[]>([]);
  const [selectedList, setSelectedList] = useState<TwitterList | null>(null);
  const [listTweets, setListTweets] = useState<Tweet[]>([]);
  const [listMembers, setListMembers] = useState<TwitterListMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'lists' | 'tweets' | 'members'>('lists');
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [showCacheInfo, setShowCacheInfo] = useState(false);
  const [listType, setListType] = useState<'owned' | 'memberships'>('owned');
  const [membershipsFetched, setMembershipsFetched] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Only fetch owned lists by default
      const [ownedResponse, cacheResponse] = await Promise.all([
        listApi.getUserLists(),
        listApi.getCacheStatus().catch(() => null) // Don't fail if cache status fails
      ]);

      setOwnedLists(ownedResponse.lists || []);
      setCacheStatus(cacheResponse);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch lists');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembershipLists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const membershipResponse = await listApi.getUserListMemberships();
      setMembershipLists(membershipResponse.lists || []);
      setMembershipsFetched(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch membership lists');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setLoading(true);
      await listApi.clearCache();
      // Refresh cache status after clearing
      const cacheResponse = await listApi.getCacheStatus();
      setCacheStatus(cacheResponse);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const formatCacheAge = (age?: number) => {
    if (!age) return 'Unknown';
    const minutes = Math.floor(age / 60000);
    const seconds = Math.floor((age % 60000) / 1000);
    return `${minutes}m ${seconds}s ago`;
  };


  const handleListClick = (list: TwitterList) => {
    setSelectedList(list);
    setView('tweets');
    // Don't auto-fetch tweets, let user click "Load Tweets" button
  };

  const handleLoadTweets = async (listId: string, limit: number = 1) => {
    try {
      setLoading(true);
      const response = await listApi.getListTweets(listId, limit);
      setListTweets(response.tweets || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch list tweets');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMembers = async (listId: string, limit: number = 20) => {
    try {
      setLoading(true);
      const response = await listApi.getListMembers(listId, limit);
      setListMembers(response.members || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch list members');
    } finally {
      setLoading(false);
    }
  };

  const renderListCard = (list: TwitterList, isOwned: boolean) => (
    <div
      key={list.id}
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={() => handleListClick(list)}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f7f9fa';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#1da1f2', fontSize: '18px' }}>
            {list.name}
          </h3>
          {list.description && (
            <p style={{ margin: '0 0 12px 0', color: '#657786', fontSize: '14px' }}>
              {list.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#657786' }}>
            <span>{list.member_count || 0} members</span>
            <span>{list.follower_count || 0} followers</span>
            {list.private && <span style={{ color: '#e0245e' }}>Private</span>}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#657786' }}>
          {isOwned ? 'Owned' : 'Member'}
        </div>
      </div>
    </div>
  );

  const renderTweetCard = (tweet: Tweet) => (
    <div
      key={tweet.id}
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: 'white',
      }}
    >
      <p style={{ margin: '0 0 12px 0', fontSize: '15px', lineHeight: '1.5' }}>
        {tweet.text}
      </p>
      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#657786' }}>
        <span>❤️ {tweet.public_metrics?.like_count || 0}</span>
        <span>🔁 {tweet.public_metrics?.retweet_count || 0}</span>
        <span>💬 {tweet.public_metrics?.reply_count || 0}</span>
        {tweet.created_at && (
          <span>{new Date(tweet.created_at).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );

  const renderMemberCard = (member: TwitterListMember) => (
    <div
      key={member.id}
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: 'white',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
        {member.profile_image_url && (
          <img
            src={member.profile_image_url}
            alt={member.name}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{member.name}</h4>
          <p style={{ margin: '0 0 8px 0', color: '#657786', fontSize: '14px' }}>
            @{member.username}
          </p>
          {member.description && (
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.4' }}>
              {member.description}
            </p>
          )}
          {member.public_metrics && (
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#657786' }}>
              <span>{member.public_metrics.followers_count} followers</span>
              <span>{member.public_metrics.following_count} following</span>
              <span>{member.public_metrics.tweet_count} tweets</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#657786' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: '0', color: '#1da1f2' }}>
          {view === 'lists' ? 'Your Lists' : 
           view === 'tweets' ? `${selectedList?.name} - Tweets` : 
           `${selectedList?.name} - Members`}
        </h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {cacheStatus && (
            <button
              onClick={() => setShowCacheInfo(!showCacheInfo)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              📊 Cache
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1da1f2',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Back to Home
          </button>
        </div>
      </div>

      {showCacheInfo && cacheStatus && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: '0', color: '#495057' }}>Cache Status</h3>
            <button
              onClick={handleClearCache}
              style={{
                padding: '4px 8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Clear All Cache
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
            <div>
              <strong>Owned Lists:</strong> {cacheStatus.cache?.ownedLists?.cached ? 
                <span style={{ color: '#28a745' }}>✅ Cached ({formatCacheAge(cacheStatus.cache.ownedLists.age)})</span> : 
                <span style={{ color: '#dc3545' }}>❌ Not cached</span>
              }
            </div>
            <div>
              <strong>Memberships:</strong> {cacheStatus.cache?.membershipLists?.cached ? 
                <span style={{ color: '#28a745' }}>✅ Cached ({formatCacheAge(cacheStatus.cache.membershipLists.age)})</span> : 
                <span style={{ color: '#dc3545' }}>❌ Not cached</span>
              }
            </div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
            Redis: {cacheStatus.redisConnected ? '🟢 Connected' : '🔴 Disconnected'} | 
            Last Updated: {new Date(cacheStatus.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          color: '#c62828',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
        }}>
          {error}
        </div>
      )}

      {view === 'lists' && (
        <div>
          {/* Tabs for switching between owned and membership lists */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginBottom: '20px',
            borderBottom: '2px solid #e1e8ed',
            paddingBottom: '0'
          }}>
            <button
              onClick={() => setListType('owned')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: listType === 'owned' ? '#1da1f2' : '#657786',
                border: 'none',
                borderBottom: listType === 'owned' ? '2px solid #1da1f2' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: listType === 'owned' ? 'bold' : 'normal',
                marginBottom: '-2px',
                transition: 'all 0.2s ease'
              }}
            >
              My Lists ({ownedLists.length})
            </button>
            <button
              onClick={() => {
                setListType('memberships');
                if (!membershipsFetched) {
                  fetchMembershipLists();
                }
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: listType === 'memberships' ? '#1da1f2' : '#657786',
                border: 'none',
                borderBottom: listType === 'memberships' ? '2px solid #1da1f2' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: listType === 'memberships' ? 'bold' : 'normal',
                marginBottom: '-2px',
                transition: 'all 0.2s ease'
              }}
            >
              Lists I'm Member Of {membershipsFetched && `(${membershipLists.length})`}
            </button>
          </div>

          {/* Show owned lists */}
          {listType === 'owned' && (
            <div>
              {ownedLists.length > 0 ? (
                ownedLists.map(list => renderListCard(list, true))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#657786' }}>
                  <p>You don't own any lists yet.</p>
                  <p>Create lists on Twitter to see them here!</p>
                </div>
              )}
            </div>
          )}

          {/* Show membership lists */}
          {listType === 'memberships' && (
            <div>
              {!membershipsFetched ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#657786' }}>
                  <p>Loading membership lists...</p>
                </div>
              ) : membershipLists.length > 0 ? (
                membershipLists.map(list => renderListCard(list, false))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#657786' }}>
                  <p>You're not a member of any lists.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'tweets' && selectedList && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setView('lists')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#657786',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                marginRight: '10px',
              }}
            >
              ← Back to Lists
            </button>
            <button
              onClick={() => {
                setView('members');
                handleLoadMembers(selectedList.id, 20);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1da1f2',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              View Members
            </button>
          </div>
          
          {listTweets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#657786', marginBottom: '20px' }}>
                Click to load tweets from this list
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleLoadTweets(selectedList.id, 1)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#1da1f2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Load 1 Tweet (Preview)
                </button>
                <button
                  onClick={() => handleLoadTweets(selectedList.id, 5)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Load 5 Tweets
                </button>
                <button
                  onClick={() => handleLoadTweets(selectedList.id, 20)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Load 20 Tweets
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <span style={{ color: '#657786' }}>
                  Showing {listTweets.length} tweets
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleLoadTweets(selectedList.id, listTweets.length + 5)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '15px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    +5 More
                  </button>
                  <button
                    onClick={() => setListTweets([])}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '15px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              {listTweets.map(renderTweetCard)}
            </div>
          )}
        </div>
      )}

      {view === 'members' && selectedList && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setView('lists')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#657786',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                marginRight: '10px',
              }}
            >
              ← Back to Lists
            </button>
            <button
              onClick={() => {
                setView('tweets');
                setListTweets([]); // Clear tweets when switching views
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1da1f2',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              View Tweets
            </button>
          </div>
          
          {listMembers.length > 0 ? (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <span style={{ color: '#657786' }}>
                  Showing {listMembers.length} members
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleLoadMembers(selectedList.id, listMembers.length + 20)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '15px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    +20 More
                  </button>
                  <button
                    onClick={() => setListMembers([])}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '15px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              {listMembers.map(renderMemberCard)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#657786' }}>
              No members loaded yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListsPage;