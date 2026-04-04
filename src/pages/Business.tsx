import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Briefcase, Plus, TrendingUp, Package, Heart, Save, Camera, MapPin, Phone, Globe, Edit3, Trash2, Users, AlertCircle, CheckCircle, Inbox, MessageSquare, ShieldCheck, Share2, Power, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Business, Message, SocialHandle } from '../types';
import ProfileCodes from '../components/ProfileCodes';
import BillingModal from '../components/BillingModal';
import EditItemModal from '../components/EditItemModal';
import { useToast } from '../components/Toast';

export default function BusinessPage({ user, business, onUpdate }: { user: User; business: Business | null; onUpdate: () => void }) {
  const [name, setName] = useState(business?.name || '');
  const { showToast } = useToast();
  const [description, setDescription] = useState(business?.description || '');
  const [logo, setLogo] = useState(business?.logo || '');
  const [address, setAddress] = useState(business?.address || '');
  const [contacts, setContacts] = useState(business?.contacts || '');
  const [socialHandles, setSocialHandles] = useState<SocialHandle[]>([]);
  const [tel, setTel] = useState(business?.tel || '');
  const [type, setType] = useState(business?.type || '');
  
  const [availableTypes, setAvailableTypes] = useState<string[]>(['Retailer', 'Motor Spare', 'Blocker', 'Repairer', 'Transporter', 'Food Deliverer']);
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [customType, setCustomType] = useState('');
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<{ totalItems: number; totalLikes: number; totalFollowers: number; likesByDay: any[] } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'inbox'>('details');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [businessItems, setBusinessItems] = useState<any[]>([]);
  const [requestingApproval, setRequestingApproval] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    image_url: '',
    gallery: [] as string[],
    customFields: [] as { key: string; value: string }[],
    type: 'product' as 'product' | 'service',
    price: '',
    discount: ''
  });
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const itemImageInputRef = useRef<HTMLInputElement>(null);
  const [showProfileCodes, setShowProfileCodes] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingStats, setBillingStats] = useState({ itemCount: 0, totalLikes: 0, needsBilling: false });
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    fetchBusinessTypes();
  }, []);

  useEffect(() => {
    if (business) {
      fetchAnalytics();
      checkBillingStatus();
      setName(business.name);
      setDescription(business.description);
      setLogo(business.logo || '');
      setAddress(business.address || '');
      setContacts(business.contacts || '');
      try {
        setSocialHandles(business.social_handles ? JSON.parse(business.social_handles) : []);
      } catch (e) {
        setSocialHandles([]);
      }
      setTel(business.tel || '');
      setType(business.type || '');
      if (activeTab === 'inbox') fetchMessages();
      if (activeTab === 'items') fetchBusinessItems();
    }
  }, [business, activeTab]);

  const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, onSuccess: (data: any) => void, onError?: (err: any) => void) => {
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        const data = await res.json();
        onSuccess(data);
      } else {
        throw new Error(`Request failed: ${res.status}`);
      }
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchWithRetry(url, options, retries - 1, onSuccess, onError), 1000);
      } else {
        console.error(`Failed to fetch from ${url}:`, err);
        if (onError) onError(err);
      }
    }
  };

  const fetchBusinessTypes = async () => {
    fetchWithRetry('/api/business-types', {}, 0, (data) => setAvailableTypes(data));
  };

  const fetchBusinessItems = async (retries = 3) => {
    if (!business) return;
    fetchWithRetry(`/api/businesses/${business.id}/items`, {}, retries, (data) => setBusinessItems(Array.isArray(data) ? data : []), () => setBusinessItems([]));
  };

  const fetchMessages = async (retries = 3) => {
    if (!business) return;
    fetchWithRetry(`/api/messages/business/${business.id}`, {}, retries, (data) => setMessages(data));
  };

  const fetchAnalytics = async (retries = 3) => {
    if (!business) return;
    fetchWithRetry(`/api/businesses/${business.id}/analytics`, {}, retries, (data) => setAnalytics(data));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addToCart = (item: any) => {
    if (item.type === 'product') {
      setCart(prev => {
        if (prev.find(cartItem => cartItem.id === item.id)) {
          showToast('Product already in cart', 'info');
          return prev;
        } else {
          showToast('Product added to cart', 'success');
          return [...prev, item];
        }
      });
    } else {
      showToast('Only products can be added to cart', 'info');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !replyText.trim() || !business) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user?.id,
          receiver_id: replyingTo.sender_id,
          text: replyText,
        }),
      });

      if (res.ok) {
        setReplyText('');
        setReplyingTo(null);
        showToast('Reply sent!', 'success');
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  };

  const handleRegisterOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const method = business ? 'PUT' : 'POST';
    const endpoint = business ? `/api/businesses/${business.id}` : '/api/businesses';
    
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: user?.id,
          name,
          description,
          logo,
          address,
          contacts,
          social_handles: JSON.stringify(socialHandles),
          tel,
          type: isAddingCustomType ? customType : type
        }),
      });
      if (res.ok) {
        onUpdate();
        setIsEditingProfile(false);
        if (business) showToast('Business profile updated!', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update business', 'error');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestApproval = async () => {
    if (!business) return;
    setRequestingApproval(true);
    try {
      // 1. Get Admin ID
      const adminRes = await fetch('/api/admin/id');
      const { id: adminId } = await adminRes.json();
      
      if (!adminId) throw new Error('Admin not found');

      // 2. Send message to Admin
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user?.id,
          receiver_id: adminId,
          text: `Hello Admin, I would like to request approval for my business: ${business.name}. Please review my profile.`,
        }),
      });

      showToast('Approval request sent to the master admin!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to send request. Please try again later.', 'error');
    } finally {
      setRequestingApproval(false);
    }
  };

  const handlePostItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    if (!newItem.image_url) {
      showToast('Please upload an image for the item', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          business_id: business.id,
          gallery: JSON.stringify(newItem.gallery),
          custom_fields: JSON.stringify(newItem.customFields.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {})),
          discount: newItem.discount || null
        }),
      });
      if (res.ok) {
        setNewItem({ title: '', description: '', image_url: '', gallery: [], customFields: [], type: 'product', price: '', discount: '' });
        showToast('Item posted successfully!', 'success');
        fetchAnalytics();
        fetchBusinessItems();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setNewItem(prev => ({ ...prev, gallery: [...prev.gallery, reader.result as string] }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const addCustomField = () => {
    setNewItem(prev => ({ ...prev, customFields: [...prev.customFields, { key: '', value: '' }] }));
  };

  const updateCustomField = (index: number, key: string, value: string) => {
    const updated = [...newItem.customFields];
    updated[index] = { key, value };
    setNewItem(prev => ({ ...prev, customFields: updated }));
  };

  const removeCustomField = (index: number) => {
    setNewItem(prev => ({ ...prev, customFields: prev.customFields.filter((_, i) => i !== index) }));
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchBusinessItems();
        fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleItemStatus = async (itemId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) {
        const updatedItem = await res.json();
        if (updatedItem && updatedItem.id) {
          setBusinessItems(prev => {
            if (!Array.isArray(prev)) return [];
            return prev.map(item => item.id === itemId ? updatedItem : item);
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const checkBillingStatus = async () => {
    if (!business) return;
    try {
      const res = await fetch(`/api/businesses/${business.id}/billing-status`);
      if (res.ok) {
        const data = await res.json();
        setBillingStats(data);
        if (data.needsBilling) {
          setShowBillingModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to check billing status:', err);
    }
  };

  if (!business || isEditingProfile) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {business ? 'Edit Business Profile' : 'Register Business'}
            </h1>
            <p className="text-neutral-500">
              {business ? 'Update your business information' : 'Start showcasing your products on Vitu'}
            </p>
          </div>
          {business && (
            <button 
              onClick={() => setIsEditingProfile(false)}
              className="px-4 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Cancel
            </button>
          )}
        </header>

        <form onSubmit={handleRegisterOrUpdate} className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm space-y-6">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-neutral-100 border-2 border-neutral-200 shadow-sm">
                {logo ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    <Briefcase size={32} />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
              >
                <Camera size={16} />
              </button>
              <input
                type="file"
                ref={logoInputRef}
                onChange={(e) => handleImageUpload(e, setLogo)}
                accept="image/*"
                className="hidden"
              />
            </div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Business Logo</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Business Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Business St, City"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Telephone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  type="tel"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  placeholder="+1 234 567 890"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Contacts/Email</label>
              <input
                type="text"
                value={contacts}
                onChange={(e) => setContacts(e.target.value)}
                placeholder="contact@business.com"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Business Type</label>
              <div className="flex gap-2">
                {!isAddingCustomType ? (
                  <select
                    required
                    value={type}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        setIsAddingCustomType(true);
                      } else {
                        setType(e.target.value);
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                  >
                    <option value="">Select Type</option>
                    {availableTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="ADD_NEW" className="text-emerald-600 font-bold">+ Add New Type</option>
                  </select>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Enter new business type"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustomType(false);
                        setCustomType('');
                      }}
                      className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Social Handles</label>
                <button
                  type="button"
                  onClick={() => setSocialHandles([...socialHandles, { platform: '', url: '' }])}
                  className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Add Handle
                </button>
              </div>
              <div className="space-y-3">
                {socialHandles.map((handle, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Platform (e.g. TikTok)"
                        value={handle.platform}
                        onChange={(e) => {
                          const newHandles = [...socialHandles];
                          newHandles[index].platform = e.target.value;
                          setSocialHandles(newHandles);
                        }}
                        className="w-full px-4 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                        <input
                          type="url"
                          placeholder="Link URL"
                          value={handle.url}
                          onChange={(e) => {
                            const newHandles = [...socialHandles];
                            newHandles[index].url = e.target.value;
                            setSocialHandles(newHandles);
                          }}
                          className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSocialHandles(socialHandles.filter((_, i) => i !== index))}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {socialHandles.length === 0 && (
                  <p className="text-xs text-neutral-400 italic ml-1">No social handles added yet.</p>
                )}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {loading ? 'Processing...' : business ? 'Update Business' : 'Register Business'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-neutral-100">
            {business.logo ? (
              <img src={business.logo} alt={business.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                <Briefcase size={24} />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{business.name}</h1>
            <p className="text-neutral-500">Business Management Dashboard</p>
          </div>
        </div>
        <button 
          onClick={() => setIsEditingProfile(true)}
          className="p-3 bg-neutral-100 text-neutral-600 rounded-2xl hover:bg-neutral-200 transition-colors"
        >
          <Edit3 size={20} />
        </button>
        <button 
          onClick={() => setShowProfileCodes(true)}
          className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-colors"
        >
          <Share2 size={20} />
        </button>
      </header>

      {/* Approval Status Banner */}
      {!business.is_approved && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex items-center gap-4"
        >
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-amber-900">Pending Approval</h3>
            <p className="text-sm text-amber-700">Your business profile is currently being reviewed by our team. You'll be able to post items once approved.</p>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-neutral-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'details' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'items' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Items
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'inbox' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Inbox
        </button>
      </div>

      {activeTab === 'details' && (
        <div className="space-y-10">
          {/* Business Details Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
            <h3 className="text-xl font-bold mb-6">Business Information</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-2xl">
                <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600"><MapPin size={20} /></div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Address</p>
                  <p className="text-sm font-medium text-neutral-700">{business.address || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-2xl">
                <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600"><Phone size={20} /></div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Telephone</p>
                  <p className="text-sm font-medium text-neutral-700">{business.tel || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-2xl">
                <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600"><MessageSquare size={20} /></div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Contact Email</p>
                  <p className="text-sm font-medium text-neutral-700">{business.contacts || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-2xl">
                <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600"><Globe size={20} /></div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Social / Web</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(() => {
                      try {
                        const handles = JSON.parse(business.social_handles || '[]');
                        if (Array.isArray(handles) && handles.length > 0) {
                          return handles.map((h: any, i: number) => (
                            <a
                              key={i}
                              href={h.url?.startsWith('http') ? h.url : `https://${h.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                            >
                              {h.platform}
                            </a>
                          ));
                        }
                      } catch (e) {
                        console.error('Error parsing social handles:', e);
                      }
                      return <p className="text-sm font-medium text-neutral-700">Not provided</p>;
                    })()}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">About</p>
              <p className="text-sm text-neutral-700 leading-relaxed">{business.description}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600">
                <Package size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Your Items</p>
                <p className="text-2xl font-black">{analytics?.totalItems || 0}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-blue-50 text-blue-600">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Followers</p>
                <p className="text-2xl font-black">{analytics?.totalFollowers || 0}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-red-50 text-red-600">
                <Heart size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Likes</p>
                <p className="text-2xl font-black">{analytics?.totalLikes || 0}</p>
              </div>
            </div>
          </div>

          {/* Analytics Chart */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold">Performance Trends</h3>
              <TrendingUp size={20} className="text-emerald-500" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.likesByDay || []}>
                  <defs>
                    <linearGradient id="colorLikesBusiness" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorLikesBusiness)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inbox' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-neutral-900">Business Inbox</h2>
            <button onClick={() => fetchMessages()} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors">
              <TrendingUp size={20} />
            </button>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 overflow-hidden shadow-sm">
            {messages.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-16 h-16 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox size={32} />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">No messages yet</h3>
                <p className="text-neutral-500">When users contact your business, their messages will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {messages.map(msg => (
                  <div key={msg.id} className={`p-6 flex flex-col gap-4 hover:bg-neutral-50 transition-colors ${!msg.is_read ? 'bg-emerald-50/30' : ''}`}>
                    <div className="flex gap-4">
                      <div 
                        className="w-12 h-12 rounded-2xl bg-neutral-100 overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                        onClick={() => window.location.href = `/profile/${msg.sender_id}`}
                      >
                        {msg.sender_avatar ? (
                          <img src={msg.sender_avatar} alt={msg.sender_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400"><Users size={20} /></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 
                            className="font-bold text-neutral-900 cursor-pointer hover:text-emerald-600 transition-colors"
                            onClick={() => window.location.href = `/profile/${msg.sender_id}`}
                          >
                            {msg.sender_name}
                          </h4>
                          <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 leading-relaxed">{msg.text}</p>
                        {msg.attachment && (
                          <div className="mt-3 p-2 bg-white border border-neutral-200 rounded-xl inline-block">
                            <img src={msg.attachment} alt="Attachment" className="max-h-32 rounded-lg" />
                          </div>
                        )}
                        
                        <div className="mt-4">
                          {replyingTo?.id === msg.id ? (
                            <form onSubmit={handleSendReply} className="space-y-3">
                              <textarea
                                autoFocus
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={`Reply to ${msg.sender_name}...`}
                                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm resize-none"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                                >
                                  Send Reply
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReplyingTo(null)}
                                  className="px-4 py-2 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-xl hover:bg-neutral-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              <MessageSquare size={14} />
                              Reply
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="space-y-10">
          {/* Post New Item */}
          <div className={`bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm ${!business.is_approved ? 'opacity-70 grayscale' : ''}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <Plus size={20} />
              </div>
              <h3 className="text-xl font-bold">Post New Item</h3>
              {!business.is_approved && (
                <span className="ml-auto text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                  <AlertCircle size={12} /> Locked until approved
                </span>
              )}
            </div>
            <form onSubmit={handlePostItem} className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Title</label>
                <input
                  type="text"
                  required
                  disabled={!business.is_approved}
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:cursor-not-allowed"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Main Image</label>
                <div 
                  onClick={() => business.is_approved && itemImageInputRef.current?.click()}
                  className={`w-full h-32 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center gap-2 transition-all overflow-hidden ${business.is_approved ? 'cursor-pointer hover:bg-neutral-100' : 'cursor-not-allowed'}`}
                >
                  {newItem.image_url ? (
                    <img src={newItem.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <>
                      <Camera size={24} className="text-neutral-400" />
                      <span className="text-xs font-medium text-neutral-500">Click to upload image</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  ref={itemImageInputRef}
                  onChange={(e) => handleImageUpload(e, (val) => setNewItem({ ...newItem, image_url: val }))}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Description</label>
                <textarea
                  required
                  disabled={!business.is_approved}
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Type</label>
                <select
                  disabled={!business.is_approved}
                  value={newItem.type}
                  onChange={(e) => setNewItem({ ...newItem, type: e.target.value as 'product' | 'service' })}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:cursor-not-allowed"
                >
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Price (UGX)</label>
                <input
                  type="number"
                  disabled={!business.is_approved}
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Discount (%)</label>
                <input
                  type="number"
                  disabled={!business.is_approved}
                  value={newItem.discount}
                  onChange={(e) => setNewItem({ ...newItem, discount: e.target.value })}
                  placeholder="0"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:cursor-not-allowed"
                />
              </div>

              {/* Gallery Upload */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Product Gallery</label>
                <div className="flex flex-wrap gap-4 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                  {newItem.gallery.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-neutral-200">
                      <img src={img} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setNewItem(prev => ({ ...prev, gallery: prev.gallery.filter((_, idx) => idx !== i) }))}
                        className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <label className={`w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg transition-colors ${business.is_approved ? 'cursor-pointer hover:border-emerald-500' : 'cursor-not-allowed'}`}>
                    <Plus size={20} className="text-neutral-400" />
                    <span className="text-[10px] text-neutral-400 font-bold uppercase">Add</span>
                    <input type="file" multiple className="hidden" onChange={handleGalleryUpload} accept="image/*" disabled={!business.is_approved} />
                  </label>
                </div>
              </div>

              {/* Custom Fields */}
              <div className="space-y-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Custom Fields</label>
                  <button 
                    type="button"
                    onClick={addCustomField}
                    disabled={!business.is_approved}
                    className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    + Add Field
                  </button>
                </div>
                <div className="space-y-2">
                  {newItem.customFields.map((field, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Field Name"
                        disabled={!business.is_approved}
                        value={field.key}
                        onChange={(e) => updateCustomField(i, e.target.value, field.value)}
                        className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        disabled={!business.is_approved}
                        value={field.value}
                        onChange={(e) => updateCustomField(i, field.key, e.target.value)}
                        className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed"
                      />
                      <button 
                        type="button"
                        onClick={() => removeCustomField(i)}
                        disabled={!business.is_approved}
                        className="p-2 text-neutral-400 hover:text-red-500 disabled:opacity-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  disabled={loading || !business.is_approved}
                  className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Posting...' : 'Post Item'}
                </button>
                {!business.is_approved && (
                  <button
                    type="button"
                    onClick={handleRequestApproval}
                    disabled={requestingApproval}
                    className="px-6 py-4 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 active:scale-[0.98] transition-all flex items-center gap-2 whitespace-nowrap"
                  >
                    <ShieldCheck size={20} />
                    {requestingApproval ? 'Sending...' : 'Request Approval'}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Business Items List */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold px-2">Your Posted Items</h3>
            {businessItems.length === 0 ? (
              <div className="bg-white p-12 rounded-[2.5rem] border border-neutral-200 text-center">
                <Package size={48} className="mx-auto text-neutral-300 mb-4" />
                <p className="text-neutral-500">You haven't posted any items yet.</p>
              </div>
            ) : (
              <div className="grid gap-6 grid-cols-2">
                {businessItems.map(item => (
                  <div key={item.id} className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm group">
                    <div className="aspect-square overflow-hidden relative">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                          onClick={() => handleToggleItemStatus(item.id, item.is_active !== false)}
                          className={`p-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm transition-colors ${item.is_active !== false ? 'text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'text-neutral-500 hover:bg-neutral-600 hover:text-white'}`}
                          title={item.is_active !== false ? 'Deactivate' : 'Activate'}
                        >
                          <Power size={18} />
                        </button>
                        <button 
                          onClick={() => setEditingItem(item)}
                          className="p-2 bg-white/90 backdrop-blur-sm text-neutral-700 rounded-xl shadow-sm hover:bg-emerald-600 hover:text-white transition-colors"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-xl shadow-sm hover:bg-red-600 hover:text-white transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                     <div className="p-4">
                       <h4 className="font-bold text-neutral-900 mb-1">{item.title}</h4>
                        <p className="text-xs text-neutral-500 line-clamp-2">{item.description}</p>
                      <div className="mt-4 flex items-center justify-between">
                        {item.type === 'product' ? (
                          <>
                            <span className="text-lg font-bold text-emerald-600">UGX {item.price}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                              title="Add to Cart"
                            >
                              <ShoppingCart size={16} />
                            </button>
                          </>
                        ) : item.type === 'service' ? (
                          <>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                            <button
                              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                              title="Negotiate"
                            >
                              <MessageSquare size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                            <div className={`flex items-center gap-1 ${item.is_active !== false ? 'text-emerald-600' : 'text-red-500'}`}>
                              {item.is_active !== false ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                              <span className="text-[10px] font-bold uppercase">{item.is_active !== false ? 'Live' : 'Inactive'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Codes Modal */}
      {business && (
        <ProfileCodes
          isOpen={showProfileCodes}
          onClose={() => setShowProfileCodes(false)}
          profileType="business"
          profileId={business.id}
          profileName={business.name}
        />
      )}

      {/* Billing Modal */}
      {business && (
        <BillingModal
          isOpen={showBillingModal}
          onClose={() => setShowBillingModal(false)}
          businessId={business.id}
          businessName={business.name}
          itemCount={billingStats.itemCount}
          totalLikes={billingStats.totalLikes}
        />
      )}

      {/* Edit Item Modal */}
      <EditItemModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSave={(updatedItem) => {
          setBusinessItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        }}
      />
    </div>
  );
}
