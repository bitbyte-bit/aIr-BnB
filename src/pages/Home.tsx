import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Plus, Send, X, CheckCircle, MapPin, Phone, Globe, Mail, UserPlus, UserMinus, MessageSquare, Paperclip, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import socket from '../socket';
import { Item, User, Comment, Business, Message } from '../types';

export default function Home({ user }: { user: User }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeComments, setActiveComments] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
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

  useEffect(() => {
    fetchItems();

    socket.on('engagement', ({ itemId, type, count, comment }) => {
      if (type === 'like') {
        setItems(prev => prev.map(item => 
          item.id === parseInt(itemId) ? { ...item, likes: count } : item
        ));
      } else if (type === 'comment') {
        setComments(prev => ({
          ...prev,
          [itemId]: [...(prev[itemId] || []), comment]
        }));
      }
    });

    socket.on('message', (msg: Message) => {
      if (selectedBusiness && (msg.sender_id === selectedBusiness.owner_id || msg.receiver_id === selectedBusiness.owner_id)) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => {
      socket.off('engagement');
      socket.off('message');
    };
  }, [selectedBusiness]);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (itemId: number) => {
    if (comments[itemId]) return;
    try {
      const res = await fetch(`/api/items/${itemId}/comments`);
      const data = await res.json();
      setComments(prev => ({ ...prev, [itemId]: data }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (itemId: number) => {
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

  const handlePostComment = async (itemId: number) => {
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
            newComments[parseInt(itemId)] = newComments[parseInt(itemId)].map(c => 
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

  const toggleComments = (itemId: number) => {
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
      const data = await res.json();
      setSelectedBusiness(data);
      
      const followRes = await fetch(`/api/businesses/${businessId}/follow-status/${user.id}`);
      const followData = await followRes.json();
      setIsFollowing(followData.isFollowing);
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
      if (res.ok) setIsFollowing(!isFollowing);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async () => {
    if (!selectedBusiness) return;
    try {
      const res = await fetch(`/api/messages/${user.id}/${selectedBusiness.owner_id}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
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

  const renderComments = (itemId: number, parentId: number | null = null, depth = 0) => {
    const itemComments = comments[itemId] || [];
    const filtered = itemComments.filter(c => c.parent_id === parentId);

    return filtered.map(comment => (
      <div key={comment.id} className={depth > 0 ? "ml-6 mt-2" : "mt-3"}>
        <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-neutral-900">{comment.user_name}</span>
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
          <h1 className="text-3xl font-bold tracking-tight">Discover</h1>
          <p className="text-neutral-500">Curated items for you</p>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white rounded-3xl overflow-hidden border border-neutral-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
          >
            <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
              <img
                src={item.image_url || `https://picsum.photos/seed/${item.id}/800/600`}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">{item.title}</h3>
                  {item.business_name && (
                    <button 
                      onClick={() => openBusinessProfile(item.business_id!)}
                      className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline"
                    >
                      By {item.business_name}
                      {item.is_approved ? <CheckCircle size={12} className="fill-emerald-100" /> : null}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleLike(item.id)}
                  className="flex items-center gap-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <Heart size={20} className={item.likes ? "fill-red-500 text-red-500" : ""} />
                  <span className="text-sm font-medium">{item.likes || 0}</span>
                </button>
              </div>
              <p className="text-neutral-600 text-sm line-clamp-2 mb-4">{item.description}</p>
              
              <div className="flex items-center gap-4 pt-4 border-t border-neutral-100 mt-auto">
                <button 
                  onClick={() => toggleComments(item.id)}
                  className={`flex items-center gap-2 transition-colors ${activeComments === item.id ? 'text-emerald-600' : 'text-neutral-500 hover:text-emerald-600'}`}
                >
                  <MessageCircle size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Discuss</span>
                </button>
                <button 
                  onClick={() => setSelectedItem(item)}
                  className="flex items-center gap-2 text-neutral-500 hover:text-emerald-600 transition-colors"
                >
                  <Globe size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Explore</span>
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
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment(item.id)}
                            className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          />
                          <button
                            onClick={() => handlePostComment(item.id)}
                            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                          >
                            <Send size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {renderComments(item.id)}
                        {(!comments[item.id] || comments[item.id].length === 0) && (
                          <p className="text-center text-xs text-neutral-400 py-4 italic">No comments yet. Be the first!</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

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
                      <p className="text-neutral-600 leading-relaxed">{selectedBusiness.description}</p>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
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
                          <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Socials</p>
                            <p className="text-sm font-bold text-neutral-900">{selectedBusiness.social_handles || 'Not specified'}</p>
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
      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
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
              className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="relative h-64 bg-neutral-100">
                <img 
                  src={selectedItem.image_url || `https://picsum.photos/seed/${selectedItem.id}/1200/800`} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-neutral-900 mb-2">{selectedItem.title}</h2>
                    {selectedItem.business_name && (
                      <button 
                        onClick={() => { setSelectedItem(null); openBusinessProfile(selectedItem.business_id!); }}
                        className="flex items-center gap-1 text-xs font-bold text-emerald-600 uppercase tracking-widest hover:underline"
                      >
                        By {selectedItem.business_name}
                        {selectedItem.is_approved ? <CheckCircle size={14} className="fill-emerald-100" /> : null}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleLike(selectedItem.id)}
                    className="flex flex-col items-center gap-1 text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Heart size={24} className={selectedItem.likes ? "fill-red-500 text-red-500" : ""} />
                    <span className="text-xs font-bold">{selectedItem.likes || 0}</span>
                  </button>
                </div>

                <p className="text-neutral-600 leading-relaxed mb-8">{selectedItem.description}</p>

                {/* Gallery */}
                {selectedItem.gallery && (
                  <div className="mb-8">
                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Product Gallery</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {JSON.parse(selectedItem.gallery).map((img: string, i: number) => (
                        <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-neutral-100">
                          <img src={img} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Fields */}
                {selectedItem.custom_fields && (
                  <div className="mb-8">
                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Specifications</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Object.entries(JSON.parse(selectedItem.custom_fields)).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{key}</span>
                          <span className="text-sm font-bold text-neutral-900">{(value as string)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments Section in Modal */}
                <div className="pt-8 border-t border-neutral-100">
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-6">Discussion</h4>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment(selectedItem.id)}
                        className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                      <button
                        onClick={() => handlePostComment(selectedItem.id)}
                        className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {renderComments(selectedItem.id)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
