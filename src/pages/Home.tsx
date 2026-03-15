import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Plus, Send, X, CheckCircle, MapPin, Phone, Globe, Mail, UserPlus, UserMinus, MessageSquare, Paperclip, Edit2, Check, Briefcase, Users, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import socket from '../socket';
import { playNotificationAlert } from '../utils/notificationSound';
import { Item, User, Comment, Business, Message } from '../types';
import { useToast } from '../components/Toast';
import OpenGraphMeta from '../components/OpenGraphMeta';
import ReviewModal from '../components/ReviewModal';

export default function Home({ user }: { user: User }) {
  const { itemId } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');
  const [commentAttachment, setCommentAttachment] = useState<string | null>(null);
  
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [liveActivities, setLiveActivities] = useState<{ id: number; text: string; type: string }[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ items: Item[]; businesses: Business[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [reviewItem, setReviewItem] = useState<Item | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const itemsRef = React.useRef(items);
  itemsRef.current = items;

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
        // Also update comments_count
        setItems(prev => prev.map(item =>
          item.id === itemId ? { ...item, comments_count: (item.comments_count || 0) + 1 } : item
        ));
      } else if (type === 'share') {
        setItems(prev => prev.map(item =>
          item.id === itemId ? { ...item, shares_count: count } : item
        ));
      }

      // Live Activity Toast
      const activityId = Date.now();
      const item = itemsRef.current.find(i => i.id === itemId);
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
        // Play vibration and beep sound when notification is received
        playNotificationAlert();
        
        const activityId = Date.now();
        // Handle both 'text' and 'body' properties for notification data
        const notificationText = data.text || data.body || 'New notification';
        setLiveActivities(prev => [...prev, { id: activityId, text: notificationText, type: data.type || 'notification' }]);
        setTimeout(() => setLiveActivities(prev => prev.filter(a => a.id !== activityId)), 5000);
      }
    });

    return () => {
      socket.off('engagement');
      socket.off('message');
      socket.off('notification');
    };
  }, [selectedBusiness, user.id]);

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

    // Track share in backend
    try {
      await fetch(`/api/items/${item.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
    } catch (err) {
      console.error('Failed to track share:', err);
    }

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
        showToast('Link copied to clipboard!', 'success');
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

  const handlePostComment = async (itemId: string, attachment?: string | null) => {
    if (!newComment.trim() && !attachment) return;
    try {
      const res = await fetch(`/api/items/${itemId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          userName: user.name, 
          text: newComment,
          parentId: replyTo?.id,
          attachment: attachment || commentAttachment
        }),
      });
      if (res.ok) {
        setNewComment('');
        setReplyTo(null);
        setCommentAttachment(null);
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

  const openBusinessProfile = async (businessId: string) => {
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
              {comment.attachment && (
                <div className="mb-2">
                  {comment.attachment.match(/^data:image\/\w+/)?.[0] ? (
                    <img 
                      src={comment.attachment} 
                      alt="Attachment" 
                      className="max-w-full h-auto rounded-lg max-h-48 object-contain"
                    />
                  ) : comment.attachment.match(/^data:video\/\w+/)?.[0] ? (
                    <video 
                      src={comment.attachment} 
                      controls 
                      className="max-w-full h-auto rounded-lg max-h-48"
                    />
                  ) : comment.attachment.match(/^data:audio\/\w+/)?.[0] ? (
                    <audio 
                      src={comment.attachment} 
                      controls 
                      className="w-full"
                    />
                  ) : (
                    <a 
                      href={comment.attachment} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-neutral-100 rounded-lg text-sm text-emerald-600 hover:bg-neutral-200"
                    >
                      <Paperclip size={14} /> View Attachment
                    </a>
                  )}
                </div>
              )}
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
    <>
      {selectedItem && (
        <OpenGraphMeta
          title={`${selectedItem.title} - Vitu`}
          description={selectedItem.description}
          image={selectedItem.image_url}
          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/item/${selectedItem.id}`}
          type="article"
        />
      )}
      <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">Discover</h1>
          <p className="text-neutral-500 font-medium">Find the best local services and products.</p>
        </div>
      </header>

      {/* What are you looking for section */}
      <section className="bg-emerald-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl shadow-emerald-100 overflow-hidden relative">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-none">
            What are you <br /> looking for?
          </h2>
          <form onSubmit={handleSearch} className="relative group">
            <input
              type="text"
              placeholder="Search for retailers, motor spares, food..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 pr-16 py-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder:text-white/60 focus:bg-white focus:text-neutral-900 focus:placeholder:text-neutral-400 outline-none transition-all shadow-lg"
            />
            <button 
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white text-emerald-600 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md group-focus-within:bg-emerald-600 group-focus-within:text-white"
            >
              {isSearching ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Plus size={20} />}
            </button>
          </form>
          <div className="flex flex-wrap gap-2 mt-6">
            {['Retailer', 'Motor Spare', 'Blocker', 'Repairer', 'Transporter', 'Food Deliverer'].map(tag => (
              <button 
                key={tag}
                onClick={() => { setSearchQuery(tag); }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-colors border border-white/10"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
      </section>

      {/* Live Activity Toasts */}
      <div className="fixed bottom-20 left-4 md:left-72 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {liveActivities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              className="bg-white border border-neutral-100 px-5 py-4 rounded-[2rem] shadow-xl flex items-center gap-4 min-w-[300px] pointer-events-auto"
            >
              <div className={`p-2.5 rounded-full flex-shrink-0 ${
                activity.type === 'like' ? 'bg-red-50 text-red-500' : 
                'bg-blue-50 text-blue-500'
              }`}>
                {activity.type === 'like' ? <Heart size={18} fill="currentColor" /> : 
                 <MessageSquare size={18} />}
              </div>
              <p className="text-sm font-bold text-neutral-800 leading-tight">{activity.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {searchResults ? (
        <div className="space-y-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-neutral-900">Search Results for "{searchQuery}"</h3>
            <button 
              onClick={() => { setSearchResults(null); setSearchQuery(''); }}
              className="text-sm font-bold text-emerald-600 hover:underline"
            >
              Clear Results
            </button>
          </div>

          {searchResults.businesses.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Businesses</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {searchResults.businesses.map(biz => (
                  <motion.div
                    key={biz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => openBusinessProfile(biz.id)}
                    className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-neutral-100 overflow-hidden flex-shrink-0">
                      {biz.logo ? (
                        <img src={biz.logo} alt={biz.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400"><Briefcase size={24} /></div>
                      )}
                    </div>
                    <div>
                      <h5 className="font-bold text-neutral-900">{biz.name}</h5>
                      <p className="text-xs text-neutral-500 line-clamp-1">{biz.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md uppercase tracking-wider">{biz.type}</span>
                      </div>
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
                  <div key={item.id} className={`bg-white rounded-[2.5rem] border-2 overflow-hidden shadow-sm hover:shadow-xl transition-all group ${
                    item.subscription_plan === 'Lifetime' ? 'border-yellow-400' :
                    item.subscription_plan === 'Standard' ? 'border-emerald-500' :
                    item.subscription_plan === 'Starter' ? 'border-orange-400' :
                    item.subscription_status === 'active' ? 'border-neutral-200' : 'border-red-400'
                  }`}>
                    <div className="relative aspect-square overflow-hidden">
                      <img 
                        src={item.image_url} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 cursor-pointer"
                        referrerPolicy="no-referrer"
                        onClick={() => { setReviewItem(item); setIsReviewModalOpen(true); }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <button 
                          onClick={() => handleLike(item.id)}
                          className="p-3 bg-white/80 backdrop-blur-md rounded-2xl text-neutral-900 hover:bg-emerald-600 hover:text-white transition-all shadow-lg flex items-center gap-2"
                        >
                          <Heart size={20} className={item.likes ? 'fill-current' : ''} />
                          <span className="text-sm font-bold">{item.likes || 0}</span>
                        </button>
                        <div className="p-3 bg-white/80 backdrop-blur-md rounded-2xl text-neutral-900 shadow-lg flex items-center gap-2">
                          <Users size={20} className="text-emerald-600" />
                          <span className="text-sm font-bold">{item.followers_count || 0}</span>
                        </div>
                        {item.average_rating ? (
                          <div className="p-3 bg-white/80 backdrop-blur-md rounded-2xl text-neutral-900 shadow-lg flex items-center gap-2">
                            <Star size={20} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-bold">{Number(item.average_rating).toFixed(1)}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <button 
                          onClick={() => item.business_id && openBusinessProfile(item.business_id)}
                          className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline"
                        >
                          {item.business_name}
                        </button>
                      </div>
                      <h3 className="text-xl font-bold text-neutral-900 mb-2">{item.title}</h3>
                      <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed mb-4">{item.description}</p>
                    </div>
                  </div>
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
        <div className="grid gap-6 sm:grid-cols-2">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group bg-white rounded-3xl overflow-hidden border-2 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col ${
              item.subscription_plan === 'Lifetime' ? 'border-yellow-400 shadow-yellow-100' :
              item.subscription_plan === 'Standard' ? 'border-emerald-500 shadow-emerald-100' :
              item.subscription_plan === 'Starter' ? 'border-orange-400 shadow-orange-100' :
              item.subscription_status === 'active' ? 'border-neutral-200' : 'border-red-400 shadow-red-100'
            }`}
          >
            <div className={`aspect-[4/3] overflow-hidden bg-neutral-100 ${
              item.subscription_plan === 'Lifetime' ? 'ring-4 ring-yellow-100' :
              item.subscription_plan === 'Standard' ? 'ring-4 ring-emerald-100' :
              item.subscription_plan === 'Starter' ? 'ring-4 ring-orange-100' :
              item.subscription_status === 'active' ? '' : 'ring-4 ring-red-100'
            }`}>
              <img
                src={item.image_url || `https://picsum.photos/seed/${item.id}/800/600`}
                alt={item.title}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                referrerPolicy="no-referrer"
                onClick={() => { setReviewItem(item); setIsReviewModalOpen(true); }}
              />
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">{item.title}</h3>
                  {item.business_name && (
                    <div className="flex items-center gap-2 mt-1">
                      <button 
                        onClick={() => openBusinessProfile(item.business_id!)}
                        className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline"
                      >
                        By {item.business_name}
                        {item.is_approved ? <CheckCircle size={12} className="fill-emerald-100" /> : null}
                      </button>
                      {item.subscription_plan && (
                        <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full uppercase ${
                          item.subscription_plan === 'Lifetime' ? 'bg-yellow-100 text-yellow-700' :
                          item.subscription_plan === 'Standard' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {item.subscription_plan}
                        </span>
                      )}
                      {!item.subscription_status && (
                        <span className="px-2 py-0.5 text-[8px] font-bold rounded-full bg-red-100 text-red-700 uppercase">
                          Free
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Users size={18} className="text-emerald-500" />
                    <span className="text-sm font-medium">{item.followers_count || 0}</span>
                  </div>
                  {item.average_rating ? (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={18} className="fill-current" />
                      <span className="text-sm font-medium">{Number(item.average_rating).toFixed(1)}</span>
                    </div>
                  ) : null}
                  <button
                    onClick={() => handleLike(item.id)}
                    className="flex items-center gap-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Heart size={20} className={item.likes ? "fill-red-500 text-red-500" : ""} />
                    <span className="text-sm font-medium">{item.likes || 0}</span>
                  </button>
                </div>
              </div>
              <p className="text-neutral-600 text-sm line-clamp-2 mb-4">{item.description}</p>
              
              <div className="flex items-center gap-4 pt-4 border-t border-neutral-100 mt-auto">
                <button 
                  onClick={() => toggleComments(item.id)}
                  className={`flex items-center gap-2 transition-colors ${activeComments === item.id ? 'text-emerald-600' : 'text-neutral-500 hover:text-emerald-600'}`}
                >
                  <MessageCircle size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wider">{item.comments_count || 0}</span>
                </button>
                <button 
                  onClick={() => setSelectedItem(item)}
                  className="flex items-center gap-2 text-neutral-500 hover:text-emerald-600 transition-colors"
                >
                  <Globe size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Explore</span>
                </button>
                <button 
                  onClick={() => handleShare(item)}
                  className="flex items-center gap-2 text-neutral-500 hover:text-emerald-600 transition-colors"
                >
                  <Share2 size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wider">{item.shares_count || 0}</span>
                </button>
              </div>

              <AnimatePresence>
                {activeComments === item.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 space-y-4">
                      <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {renderComments(item.id)}
                        {(!comments[item.id] || comments[item.id].length === 0) && (
                          <p className="text-center text-xs text-neutral-400 py-4 italic">No comments yet. Be the first!</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        {replyTo && (
                          <div className="flex items-center justify-between px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                              Replying to {replyTo.user_name}
                            </span>
                            <button 
                              onClick={() => setReplyTo(null)}
                              className="text-neutral-400 hover:text-neutral-600"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment(item.id)}
                            className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          />
                          <label className="p-2 text-neutral-400 hover:text-emerald-600 cursor-pointer transition-colors">
                            <input
                              type="file"
                              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // In production, upload to server/cloud storage
                                  // For now, use base64 as placeholder
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    setCommentAttachment(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                            <Paperclip size={18} />
                          </label>
                          {commentAttachment && (
                            <div className="relative">
                              <img src={commentAttachment} alt="Attachment" className="w-10 h-10 object-cover rounded-lg" />
                              <button
                                onClick={() => setCommentAttachment(null)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              handlePostComment(item.id);
                              setCommentAttachment(null);
                            }}
                            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                          >
                            <Send size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
      )}

      {/* Business Profile Modal */}
      <AnimatePresence>
        {selectedBusiness && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="relative h-32 bg-emerald-600">
                <button 
                  onClick={() => { setSelectedBusiness(null); setIsMessaging(false); }}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="absolute -bottom-10 left-8 w-24 h-24 rounded-3xl bg-white p-1 shadow-lg overflow-hidden">
                  <div className="w-full h-full rounded-[1.25rem] bg-neutral-100 overflow-hidden">
                    {selectedBusiness.logo && <img src={selectedBusiness.logo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                  </div>
                </div>
              </div>

              <div className="pt-14 px-8 pb-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      {selectedBusiness.name}
                      {selectedBusiness.is_approved ? <CheckCircle size={20} className="text-emerald-500" /> : null}
                    </h2>
                    <p className="text-neutral-500 text-sm">{selectedBusiness.is_approved ? 'Verified Business' : 'Pending Verification'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleFollow}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        isFollowing ? 'bg-neutral-100 text-neutral-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                    <button 
                      onClick={() => { setIsMessaging(!isMessaging); if (!isMessaging) fetchMessages(); }}
                      className={`p-2 rounded-xl transition-all ${isMessaging ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                    >
                      <MessageSquare size={20} />
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {isMessaging ? (
                    <motion.div
                      key="messaging"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="h-64 bg-neutral-50 rounded-2xl p-4 overflow-y-auto flex flex-col gap-3">
                        {messages.map((m) => (
                          <div 
                            key={m.id} 
                            className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                              m.sender_id === user.id 
                                ? 'bg-emerald-600 text-white self-end rounded-tr-none' 
                                : 'bg-white border border-neutral-200 text-neutral-900 self-start rounded-tl-none'
                            }`}
                          >
                            {m.text && <p>{m.text}</p>}
                            {m.attachment && (
                              <img src={m.attachment} className="mt-2 rounded-lg max-h-32 object-cover" referrerPolicy="no-referrer" />
                            )}
                            <span className={`text-[10px] block mt-1 ${m.sender_id === user.id ? 'text-emerald-100' : 'text-neutral-400'}`}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleSendMessage} className="space-y-2">
                        {attachment && (
                          <div className="relative inline-block">
                            <img src={attachment} className="w-16 h-16 rounded-lg object-cover" />
                            <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"><X size={10} /></button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <label className="p-3 bg-neutral-100 text-neutral-500 rounded-xl hover:bg-neutral-200 cursor-pointer transition-colors">
                            <Paperclip size={20} />
                            <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                          </label>
                          <input 
                            type="text" 
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                          />
                          <button type="submit" className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
                            <Send size={20} />
                          </button>
                        </div>
                      </form>
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
      {/* Product Detail Modal - Full Window */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-bottom border-neutral-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
                <h2 className="text-lg font-black text-neutral-900 truncate max-w-[200px] md:max-w-md">
                  {selectedItem.title}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLike(selectedItem.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors"
                >
                  <Heart size={18} className={selectedItem.likes ? "fill-red-500 text-red-500" : "text-neutral-600"} />
                  <span className="text-sm font-bold">{selectedItem.likes || 0}</span>
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

      {/* Review Modal */}
      <ReviewModal 
        item={reviewItem} 
        user={user} 
        isOpen={isReviewModalOpen} 
        onClose={() => { setIsReviewModalOpen(false); setReviewItem(null); }}
      />
    </div>
    </>
  );
}
