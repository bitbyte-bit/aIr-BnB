import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Plus, Send, X, CheckCircle, MapPin, Phone, Globe, Mail, UserPlus, UserMinus, MessageSquare, Paperclip, Edit2, Check, Briefcase, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import socket from '../socket';
import { Item, User, Comment, Business, Message } from '../types';

const ItemCard = ({ 
  item, 
  onLike, 
  onShare, 
  onSelect, 
  onBusinessClick 
}: { 
  item: Item; 
  onLike: (id: string) => any; 
  onShare: (item: Item) => any; 
  onSelect: (item: Item) => any;
  onBusinessClick: (id: number) => any;
  key?: React.Key;
}) => (
  <motion.div
    whileTap={{ scale: 0.98 }}
    onClick={() => onSelect(item)}
    className="group bg-white rounded-[2.5rem] overflow-hidden border border-neutral-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col cursor-pointer"
  >
    <div className="relative aspect-[4/5] overflow-hidden bg-neutral-50">
      <img
        src={item.image_url || `https://picsum.photos/seed/${item.id}/800/1000`}
        alt={item.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Quick Actions Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform duration-500">
        <button 
          onClick={(e) => { e.stopPropagation(); onLike(item.id); }}
          className="p-3 bg-white/90 backdrop-blur-xl rounded-2xl text-neutral-900 hover:bg-red-500 hover:text-white transition-all shadow-lg"
        >
          <Heart size={20} className={item.likes ? "fill-current" : ""} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onShare(item); }}
          className="p-3 bg-white/90 backdrop-blur-xl rounded-2xl text-neutral-900 hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Business Tag */}
      {item.business_name && (
        <div className="absolute bottom-4 left-4">
          <button 
            onClick={(e) => { e.stopPropagation(); onBusinessClick(item.business_id!); }}
            className="px-3 py-1.5 bg-white/90 backdrop-blur-xl text-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-500 hover:text-white transition-all"
          >
            {item.business_name}
          </button>
        </div>
      )}
    </div>
    
    <div className="p-6 flex-1 flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-xl font-bold text-neutral-900 line-clamp-1">{item.title}</h3>
        <div className="flex items-center gap-1 text-emerald-600">
          <Users size={14} />
          <span className="text-xs font-bold">{item.followers_count || 0}</span>
        </div>
      </div>
      <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed mb-4">{item.description}</p>
      
      <div className="mt-auto flex items-center gap-2 pt-4 border-t border-neutral-50">
        <button 
          onClick={(e) => { e.stopPropagation(); onSelect(item); }}
          className="flex-1 py-2.5 bg-neutral-900 text-white rounded-2xl text-xs font-bold hover:bg-neutral-800 transition-all active:scale-95"
        >
          View Details
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onSelect(item); /* Modal will show comments */ }}
          className="p-2.5 bg-neutral-100 text-neutral-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95"
        >
          <MessageCircle size={18} />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1 text-red-500">
          <Heart size={14} fill="currentColor" />
          <span className="text-xs font-bold">{item.likes || 0}</span>
        </div>
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  </motion.div>
);

export default function Home({ user }: { user: User }) {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');
  
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [liveActivities, setLiveActivities] = useState<{ id: string; text: string; type: string }[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ items: Item[]; businesses: Business[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchItems();

    socket.on('engagement', ({ itemId, type, count, comment, userName }) => {
      if (type === 'like') {
        setItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, likes: count } : item
        ));
      } else if (type === 'comment') {
        setComments(prev => ({
          ...prev,
          [itemId]: [...(prev[itemId] || []), comment]
        }));
      }

      // Live Activity Toast
      const activityId = Date.now().toString();
      const item = items.find(i => i.id === itemId);
      const activityText = type === 'like' 
        ? `${userName || 'Someone'} liked ${item?.title || 'an item'}`
        : `${userName || 'Someone'} commented on ${item?.title || 'an item'}`;
      
      setLiveActivities(prev => [...prev, { id: activityId, text: activityText, type }]);
      setTimeout(() => setLiveActivities(prev => prev.filter(a => a.id !== activityId)), 5000);
    });

    socket.on('message', (msg: Message) => {
      if (selectedBusiness && (msg.sender_id === selectedBusiness.owner_id || msg.receiver_id === selectedBusiness.owner_id)) {
        setMessages(prev => [...prev, msg]);
      }
    });

    socket.on('notification', (data) => {
      if (data.receiver_id === user.id) {
        const activityId = Date.now().toString();
        setLiveActivities(prev => [...prev, { id: activityId, text: data.text, type: data.type || 'notification' }]);
        setTimeout(() => setLiveActivities(prev => prev.filter(a => a.id !== activityId)), 5000);
      }
    });

    return () => {
      socket.off('engagement');
      socket.off('message');
      socket.off('notification');
    };
  }, [selectedBusiness, items, user.id]);

  useEffect(() => {
    if (itemId && items.length > 0) {
      const item = items.find(i => i.id === itemId);
      if (item) setSelectedItem(item);
    }
  }, [itemId, items]);

  useEffect(() => {
    if (selectedItem) {
      if (itemId !== selectedItem.id) {
        navigate(`/item/${selectedItem.id}`, { replace: true });
      }
    } else if (itemId) {
      navigate('/', { replace: true });
    }
  }, [selectedItem, itemId, navigate]);

  const handleShare = async (item: Item) => {
    const shareUrl = `${window.location.origin}/item/${item.id}`;
    const shareData = {
      title: item.title,
      text: item.description,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Error copying link:', err);
      }
    }
  };

  const fetchItems = async (retries = 3) => {
    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error('Failed to fetch items');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      if (retries > 0) {
        console.warn(`Retrying fetchItems... (${retries} left)`);
        setTimeout(() => fetchItems(retries - 1), 1000);
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (itemId: string) => {
    if (comments[itemId]) return;
    try {
      const res = await fetch(`/api/items/${itemId}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      setComments(prev => ({ ...prev, [itemId]: data }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (itemId: string) => {
    try {
      await fetch(`/api/items/${itemId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (itemId: string) => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/items/${itemId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          userName: user.name, 
          text: newComment,
          parentId: replyTo?.id
        }),
      });
      if (res.ok) {
        setNewComment('');
        setReplyTo(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText }),
      });
      if (res.ok) {
        setComments(prev => {
          const newComments = { ...prev };
          Object.keys(newComments).forEach(itemId => {
            newComments[itemId] = newComments[itemId].map(c => 
              c.id === commentId ? { ...c, text: editText } : c
            );
          });
          return newComments;
        });
        setEditingComment(null);
        setEditText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComments = (itemId: string) => {
    if (activeComments === itemId) {
      setActiveComments(null);
      setReplyTo(null);
    } else {
      setActiveComments(itemId);
      fetchComments(itemId);
    }
  };

  const openBusinessProfile = async (businessId: number) => {
    try {
      const res = await fetch(`/api/businesses/${businessId}`);
      if (!res.ok) throw new Error('Failed to fetch business');
      const data = await res.json();
      setSelectedBusiness(data);
      
      const followRes = await fetch(`/api/businesses/${businessId}/follow-status/${user.id}`);
      if (followRes.ok) {
        const followData = await followRes.json();
        setIsFollowing(followData.isFollowing);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async () => {
    if (!selectedBusiness) return;
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const url = isFollowing 
        ? `/api/businesses/${selectedBusiness.id}/follow/${user.id}`
        : `/api/businesses/${selectedBusiness.id}/follow`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        setIsFollowing(!isFollowing);
        setSelectedBusiness(prev => {
          if (!prev) return null;
          return {
            ...prev,
            followers_count: (prev.followers_count || 0) + (isFollowing ? -1 : 1)
          };
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async () => {
    if (!selectedBusiness) return;
    try {
      const res = await fetch(`/api/messages/${user.id}/${selectedBusiness.owner_id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || (!newMessage.trim() && !attachment)) return;
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          receiver_id: selectedBusiness.owner_id,
          text: newMessage,
          attachment
        }),
      });
      setNewMessage('');
      setAttachment(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachment(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const renderComments = (itemId: number, parentId: number | null = null, depth = 0) => {
    const itemComments = comments[itemId] || [];
    const filtered = itemComments.filter(c => c.parent_id === parentId);

    return filtered.map(comment => (
      <div key={comment.id} className={depth > 0 ? "ml-6 mt-2" : "mt-3"}>
        <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
          <div className="flex items-center justify-between mb-1">
            <span 
              className="text-xs font-bold text-neutral-900 cursor-pointer hover:text-emerald-600 transition-colors"
              onClick={() => window.location.href = `/profile/${comment.user_id}`}
            >
              {comment.user_name}
            </span>
            <span className="text-[10px] text-neutral-400">
              {new Date(comment.created_at).toLocaleString()}
            </span>
          </div>
          
          {editingComment?.id === comment.id ? (
            <div className="flex gap-2 mt-1">
              <input 
                type="text" 
                value={editText} 
                onChange={(e) => setEditText(e.target.value)}
                className="flex-1 px-2 py-1 text-sm bg-white border border-neutral-200 rounded-lg outline-none"
                autoFocus
              />
              <button onClick={() => handleEditComment(comment.id)} className="p-1 text-emerald-600"><Check size={16} /></button>
              <button onClick={() => setEditingComment(null)} className="p-1 text-neutral-400"><X size={16} /></button>
            </div>
          ) : (
            <>
              <p className="text-sm text-neutral-600 leading-relaxed">{comment.text}</p>
              <div className="flex items-center gap-3 mt-1">
                <button 
                  onClick={() => setReplyTo(comment)}
                  className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline"
                >
                  Reply
                </button>
                {comment.user_id === user.id && (
                  <button 
                    onClick={() => { setEditingComment(comment); setEditText(comment.text); }}
                    className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    <Edit2 size={10} /> Edit
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        {renderComments(itemId, comment.id, depth + 1)}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">Discover</h1>
          <p className="text-neutral-500 font-medium">Find the best local services and products.</p>
        </div>
      </header>

      {/* Search Header (Native Style) */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-neutral-100 md:relative md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-none md:border-none">
        <form onSubmit={handleSearch} className="relative group">
          <input 
            type="text" 
            placeholder="Search items, businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-neutral-100 border-none rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
            <Plus size={20} className="rotate-45" /> {/* Search-like icon */}
          </div>
        </form>
      </div>

      {/* Hero Section (Native Style) */}
      {!searchResults && (
        <>
          <section className="relative overflow-hidden rounded-[2.5rem] bg-neutral-900 text-white p-8 md:p-16 shadow-2xl shadow-emerald-900/20 mb-8">
            <div className="relative z-10 max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-emerald-500/20"
              >
                <CheckCircle size={12} />
                Verified Local Businesses
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight"
              >
                Discover your <br />
                <span className="text-emerald-400">Neighborhood</span>
              </motion.h1>
              <p className="text-neutral-400 text-sm md:text-lg leading-relaxed mb-10 max-w-md">
                Support local businesses, find unique products, and connect with your community in one place.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Handmade', 'Vintage', 'Art', 'Local'].map(tag => (
                  <button 
                    key={tag}
                    onClick={() => { setSearchQuery(tag); }}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold transition-all border border-white/10 active:scale-95"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px]" />
          </section>

          {/* Categories Filter (Native Horizontal Scroll) */}
          <div className="mb-10 -mx-4 px-4 overflow-x-auto no-scrollbar flex gap-3">
            {['All', 'Food', 'Fashion', 'Tech', 'Home', 'Beauty', 'Services', 'Art'].map((cat) => (
              <button
                key={cat}
                className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${
                  cat === 'All' ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-200' : 'bg-white border border-neutral-100 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Live Activity Toasts (Native Style) */}
      <div className="fixed bottom-24 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none md:left-auto md:right-8 md:bottom-8 md:w-80">
        <AnimatePresence>
          {liveActivities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/90 backdrop-blur-xl border border-neutral-200 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 pointer-events-auto"
            >
              <div className={`p-2 rounded-xl flex-shrink-0 ${
                activity.type === 'like' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
              }`}>
                {activity.type === 'like' ? <Heart size={16} fill="currentColor" /> : <MessageSquare size={16} />}
              </div>
              <p className="text-xs font-bold text-neutral-800 leading-tight">{activity.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {searchResults ? (
        <div className="space-y-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-neutral-900">Results for "{searchQuery}"</h3>
            <button 
              onClick={() => { setSearchResults(null); setSearchQuery(''); }}
              className="text-sm font-bold text-emerald-600 hover:underline"
            >
              Clear
            </button>
          </div>

          {searchResults.businesses.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Businesses</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                {searchResults.businesses.map(biz => (
                  <motion.div 
                    key={biz.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedBusiness(biz); setIsMessaging(false); }}
                    className="p-5 bg-white border border-neutral-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
                  >
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-bold text-xl">
                      {biz.name[0]}
                    </div>
                    <div>
                      <h5 className="font-bold text-neutral-900">{biz.name}</h5>
                      <p className="text-xs text-neutral-500 line-clamp-1">{biz.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {searchResults.items.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Products & Services</h4>
              <div className="grid gap-6 sm:grid-cols-2">
                {searchResults.items.map(item => (
                  <ItemCard 
                    key={item.id} 
                    item={item} 
                    onLike={handleLike}
                    onShare={handleShare}
                    onSelect={setSelectedItem}
                    onBusinessClick={openBusinessProfile}
                  />
                ))}
              </div>
            </div>
          )}

          {searchResults.items.length === 0 && searchResults.businesses.length === 0 && (
            <div className="text-center py-20 bg-neutral-100 rounded-[2.5rem] border-2 border-dashed border-neutral-200">
              <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
                <X size={32} />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">No results found</h3>
              <p className="text-neutral-500">Try searching for something else or check your spelling.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Featured Businesses (Native Horizontal Scroll) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-bold text-neutral-900">Local Businesses</h3>
              <button className="text-xs font-bold text-emerald-600">See All</button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
              {items.reduce((acc: Business[], item) => {
                if (!acc.find(b => b.id === item.business_id)) {
                  acc.push({ id: item.business_id, name: item.business_name, description: '', owner_id: item.owner_id } as Business);
                }
                return acc;
              }, []).map(biz => (
                <motion.div
                  key={biz.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSelectedBusiness(biz); setIsMessaging(false); }}
                  className="flex-shrink-0 w-32 flex flex-col items-center gap-2"
                >
                  <div className="w-20 h-20 bg-white border border-neutral-100 rounded-[2rem] shadow-sm flex items-center justify-center text-emerald-600 font-bold text-2xl">
                    {biz.name[0]}
                  </div>
                  <span className="text-xs font-bold text-neutral-900 text-center line-clamp-1">{biz.name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Main Feed (Native Style) */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 px-1">Recent Discoveries</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-[2.5rem] h-80 animate-pulse border border-neutral-100" />
                ))
              ) : (
                items.map(item => (
                  <ItemCard 
                    key={item.id} 
                    item={item} 
                    onLike={handleLike}
                    onShare={handleShare}
                    onSelect={setSelectedItem}
                    onBusinessClick={openBusinessProfile}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Business Profile Modal (Native Sheet Style) */}
      <AnimatePresence>
        {selectedBusiness && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 md:items-center"
            onClick={() => { setSelectedBusiness(null); setIsMessaging(false); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="md:hidden flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-neutral-200 rounded-full" />
              </div>

              <div className="relative h-40 bg-neutral-900">
                {selectedBusiness.logo ? (
                  <img src={selectedBusiness.logo} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-emerald-600 opacity-50" />
                )}
                <button 
                  onClick={() => { setSelectedBusiness(null); setIsMessaging(false); }}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="absolute -bottom-12 left-8 w-28 h-28 rounded-[2rem] bg-white p-1.5 shadow-2xl">
                  <div className="w-full h-full rounded-[1.5rem] bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-4xl">
                    {selectedBusiness.name[0]}
                  </div>
                </div>
              </div>

              <div className="pt-16 px-8 pb-8 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-3xl font-bold flex items-center gap-2 text-neutral-900">
                        {selectedBusiness.name}
                        {selectedBusiness.is_approved ? <CheckCircle size={24} className="text-emerald-500" /> : null}
                      </h2>
                      <p className="text-neutral-500 font-medium">
                        {selectedBusiness.type || 'Local Business'} • Verified
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleFollow}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                          isFollowing ? 'bg-neutral-100 text-neutral-600' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        }`}
                      >
                        {isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
                        {isFollowing ? 'Unfollow' : 'Follow'}
                      </button>
                      <button 
                        onClick={() => { setIsMessaging(!isMessaging); if (!isMessaging) fetchMessages(); }}
                        className={`p-3 rounded-2xl transition-all active:scale-95 ${isMessaging ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-600'}`}
                      >
                        <MessageSquare size={24} />
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {isMessaging ? (
                    <motion.div 
                      key="messaging"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col h-[500px]"
                    >
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50/50 rounded-3xl mb-4">
                        {messages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                              <MessageSquare size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900">Start a conversation</h3>
                            <p className="text-sm text-neutral-500 max-w-[200px]">Ask about products, services, or just say hello!</p>
                          </div>
                        ) : (
                          messages.map((msg) => (
                            <div 
                              key={msg.id} 
                              className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[80%] p-4 rounded-3xl text-sm shadow-sm ${
                                msg.sender_id === user.id 
                                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                                  : 'bg-white text-neutral-900 rounded-tl-none border border-neutral-100'
                              }`}>
                                {msg.attachment && (
                                  <img 
                                    src={msg.attachment} 
                                    className="rounded-xl mb-2 max-h-48 w-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                                <p className="leading-relaxed">{msg.text}</p>
                                <p className={`text-[10px] mt-2 font-medium ${msg.sender_id === user.id ? 'text-emerald-100' : 'text-neutral-400'}`}>
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <div className="p-4 bg-white border-t border-neutral-100">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-2 bg-neutral-50 rounded-[2rem] border border-neutral-200 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                          <label className="p-2.5 text-neutral-400 hover:text-emerald-600 cursor-pointer transition-colors">
                            <Paperclip size={20} />
                            <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                          </label>
                          <input
                            type="text"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-sm px-2"
                          />
                          <button 
                            type="submit"
                            disabled={!newMessage.trim() && !attachment}
                            className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all active:scale-95"
                          >
                            <Send size={20} />
                          </button>
                        </form>
                        {attachment && (
                          <div className="mt-3 relative inline-block">
                            <img src={attachment} className="h-20 w-20 object-cover rounded-2xl border-2 border-emerald-500" />
                            <button 
                              onClick={() => setAttachment(null)}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-neutral-600 leading-relaxed">{selectedBusiness.description}</p>
                        <button 
                          onClick={() => window.location.href = `/profile/${selectedBusiness.owner_id}`}
                          className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <Users size={14} /> View Owner
                        </button>
                      </div>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl">
                          <Users size={18} className="text-emerald-500" />
                          <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Followers</p>
                            <p className="text-sm font-bold text-neutral-900">{selectedBusiness.followers_count || 0}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl">
                          <MapPin size={18} className="text-emerald-500" />
                          <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Location</p>
                            <p className="text-sm font-bold text-neutral-900">{selectedBusiness.address || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl">
                          <Phone size={18} className="text-emerald-500" />
                          <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Telephone</p>
                            <p className="text-sm font-bold text-neutral-900">{selectedBusiness.tel || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl">
                          <Mail size={18} className="text-emerald-500" />
                          <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Contact</p>
                            <p className="text-sm font-bold text-neutral-900 truncate">{selectedBusiness.contacts || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl">
                          <Globe size={18} className="text-emerald-500" />
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Socials</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {(() => {
                                try {
                                  const handles = selectedBusiness.social_handles ? JSON.parse(selectedBusiness.social_handles) : [];
                                  if (Array.isArray(handles) && handles.length > 0) {
                                    return handles.map((h: any, i: number) => (
                                      <a 
                                        key={i} 
                                        href={h.url.startsWith('http') ? h.url : `https://${h.url}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                                      >
                                        {h.platform}
                                      </a>
                                    ));
                                  }
                                } catch (e) {}
                                return <p className="text-sm font-bold text-neutral-900">Not specified</p>;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Product Detail Modal (Native Sheet Style) */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col md:inset-x-auto md:right-0 md:w-[500px] md:shadow-2xl"
          >
            {/* Native Sheet Handle (Mobile Only) */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-neutral-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
                <h2 className="text-lg font-bold text-neutral-900 truncate max-w-[200px]">
                  {selectedItem.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLike(selectedItem.id)}
                  className="p-2.5 bg-neutral-100 hover:bg-red-50 text-neutral-600 hover:text-red-500 rounded-2xl transition-all active:scale-90"
                >
                  <Heart size={20} className={selectedItem.likes ? "fill-current" : ""} />
                </button>
                <button
                  onClick={() => handleShare(selectedItem)}
                  className="p-2.5 bg-neutral-100 hover:bg-emerald-50 text-neutral-600 hover:text-emerald-500 rounded-2xl transition-all active:scale-90"
                >
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-4xl mx-auto">
                {/* Hero Image */}
                <div className="relative aspect-video md:aspect-[21/9] bg-neutral-100 overflow-hidden md:rounded-b-[3rem]">
                  <img 
                    src={selectedItem.image_url || `https://picsum.photos/seed/${selectedItem.id}/1200/800`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="p-6 md:p-12">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-4">
                        {selectedItem.business_name && (
                          <button 
                            onClick={() => { setSelectedItem(null); openBusinessProfile(selectedItem.business_id!); }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                          >
                            {selectedItem.business_name}
                            {selectedItem.is_approved ? <CheckCircle size={14} className="fill-emerald-100" /> : null}
                          </button>
                        )}
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                          {new Date(selectedItem.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h1 className="text-4xl md:text-6xl font-black text-neutral-900 mb-6 leading-tight">
                        {selectedItem.title}
                      </h1>
                      <p className="text-lg text-neutral-600 leading-relaxed">
                        {selectedItem.description}
                      </p>
                    </div>
                  </div>

                  {/* Gallery Grid */}
                  {selectedItem.gallery && (
                    <div className="mb-16">
                      <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <div className="h-px flex-1 bg-neutral-100"></div>
                        Product Gallery
                        <div className="h-px flex-1 bg-neutral-100"></div>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {JSON.parse(selectedItem.gallery).map((img: string, i: number) => (
                          <motion.div 
                            key={i} 
                            whileHover={{ scale: 1.02 }}
                            className="aspect-square rounded-[2rem] overflow-hidden border border-neutral-100 shadow-sm"
                          >
                            <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Specifications */}
                  {selectedItem.custom_fields && (
                    <div className="mb-16">
                      <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <div className="h-px flex-1 bg-neutral-100"></div>
                        Specifications
                        <div className="h-px flex-1 bg-neutral-100"></div>
                      </h4>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(JSON.parse(selectedItem.custom_fields)).map(([key, value]) => (
                          <div key={key} className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100">
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{key}</p>
                            <p className="text-lg font-black text-neutral-900">{(value as string)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discussion */}
                  <div className="pt-16 border-t border-neutral-100">
                    <div className="max-w-2xl mx-auto">
                      <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-8 text-center">Discussion</h4>
                      
                      <div className="mb-12">
                        <div className="flex gap-3 p-2 bg-neutral-50 border border-neutral-200 rounded-[1.5rem] focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                          <input
                            type="text"
                            placeholder="Share your thoughts..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment(selectedItem.id)}
                            className="flex-1 px-4 py-3 bg-transparent outline-none text-sm"
                          />
                          <button
                            onClick={() => handlePostComment(selectedItem.id)}
                            className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all active:scale-95"
                          >
                            <Send size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-8">
                        {renderComments(selectedItem.id)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
