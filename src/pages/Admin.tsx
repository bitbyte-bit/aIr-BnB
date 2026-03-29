import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, Package, Heart, TrendingUp, Plus, Shield, Briefcase, Trash2, AlertTriangle, CheckCircle, XCircle, CreditCard, Save, Eye, Mail, Phone, Calendar, BarChart2, MessageCircle, X, Edit2, Check, Camera, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnalyticsData, User, Business } from '../types';
import { useToast } from '../components/Toast';
import { useCurrency } from '../context/CurrencyContext';
import TermsPage from './Terms';
import PrivacyPage from './Privacy';

interface UserDetails {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  bio: string;
  profile_picture: string;
  created_at: string;
  business_id: number;
  business_name: string;
  business_description: string;
  business_phone: string;
  performance: {
    itemsCount: number;
    likesCount: number;
    commentsCount: number;
    businessesCount: number;
  };
  businesses: Business[];
  recentItems: any[];
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'businesses' | 'billing' | 'subscriptions' | 'pending' | 'terms' | 'privacy'>('analytics');
  const { showToast } = useToast();
  const { formatCurrency } = useCurrency();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [billingPlans, setBillingPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [pendingSubscriptions, setPendingSubscriptions] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [newItem, setNewItem] = useState({ 
    title: '', 
    description: '', 
    image_url: '',
    gallery: [] as string[],
    customFields: [] as { key: string; value: string }[]
  });
  const [pendingBusinesses, setPendingBusinesses] = useState<any[]>([]);
  const [registerBusinessModal, setRegisterBusinessModal] = useState(false);
  const [registerBusinessOwner, setRegisterBusinessOwner] = useState({ email: '', password: '', name: '' });
  const [registerBusiness, setRegisterBusiness] = useState({ name: '', description: '', type: '', logo: '', address: '', contacts: '', social_handles: '', tel: '' });
  const [registerBusinessLoading, setRegisterBusinessLoading] = useState(false);
  const [registerBusinessError, setRegisterBusinessError] = useState<string | null>(null);
  const [registerBusinessSuccess, setRegisterBusinessSuccess] = useState<{
    ownerId: number;
    businessId: number;
    passcode: string;
    ownerEmail: string;
    ownerName: string;
    ownerPassword: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [editingTerms, setEditingTerms] = useState(false);
  const [editingPrivacy, setEditingPrivacy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const itemImageInputRef = React.useRef<HTMLInputElement>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

   useEffect(() => {
     fetchAnalytics();
     fetchUsers();
     fetchBusinesses();
     if (activeTab === 'billing') {
       fetchBillingPlans();
     }
     if (activeTab === 'subscriptions') {
       fetchPendingSubscriptions();
     }
     if (activeTab === 'businesses') {
       fetchPendingBusinesses();
     }
     if (activeTab === 'terms') {
       fetchTermsContent();
     }
     if (activeTab === 'privacy') {
       fetchPrivacyContent();
     }
   }, [activeTab]);

   const fetchAnalytics = async () => {
     try {
       const res = await fetch('/api/admin/analytics');
       if (!res.ok) throw new Error('Failed to fetch analytics');
       const data = await res.json();
       setAnalytics(data);
     } catch (err) {
       console.error(err);
     } finally {
       setLoading(false);
     }
   };

   const fetchPendingBusinesses = async () => {
     try {
       const res = await fetch('/api/admin/pending-businesses');
       if (!res.ok) throw new Error('Failed to fetch pending businesses');
       const data = await res.json();
       setPendingBusinesses(data);
     } catch (err) {
       console.error('Error fetching pending businesses:', err);
     }
   };

   const fetchTermsContent = async () => {
     try {
       const res = await fetch('/api/admin/terms');
       if (res.ok) {
         const data = await res.json();
         setTermsContent(data.content || '');
       }
     } catch (err) {
       console.error('Error fetching terms:', err);
     }
   };

   const fetchPrivacyContent = async () => {
     try {
       const res = await fetch('/api/admin/privacy');
       if (res.ok) {
         const data = await res.json();
         setPrivacyContent(data.content || '');
       }
     } catch (err) {
       console.error('Error fetching privacy:', err);
     }
   };

   const saveTermsContent = async () => {
     try {
       const res = await fetch('/api/admin/terms', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ content: termsContent })
       });
       if (res.ok) {
         showToast('Terms of service updated successfully!', 'success');
         setEditingTerms(false);
       } else {
         showToast('Failed to update terms', 'error');
       }
     } catch (err) {
       console.error('Error saving terms:', err);
       showToast('Failed to update terms', 'error');
     }
   };

   const savePrivacyContent = async () => {
     try {
       const res = await fetch('/api/admin/privacy', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ content: privacyContent })
       });
       if (res.ok) {
         showToast('Privacy policy updated successfully!', 'success');
         setEditingPrivacy(false);
       } else {
         showToast('Failed to update privacy policy', 'error');
       }
     } catch (err) {
       console.error('Error saving privacy:', err);
       showToast('Failed to update privacy policy', 'error');
     }
   };

    const handleRegisterBusiness = async () => {
      if (!registerBusinessOwner.email || !registerBusinessOwner.name || !registerBusinessOwner.password) {
        setRegisterBusinessError('Owner email, name, and password are required');
        return;
      }
      
      // Generate a 6-digit OTP for the owner password (ignore provided password for security)
      const ownerPassword = Math.floor(100000 + Math.random() * 900000).toString();
      
      setRegisterBusinessLoading(true);
      setRegisterBusinessError(null);
      setRegisterBusinessSuccess(null);
      
      try {
        const res = await fetch('/api/admin/register-business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminUserId: 1, // Assuming admin user ID is 1, in a real app this would come from auth
            owner: {
              ...registerBusinessOwner,
              password: ownerPassword // Use generated OTP instead of provided password
            },
            business: registerBusiness
          }),
        });
        
        const data = await res.json();
        
        if (res.ok) {
          setRegisterBusinessSuccess({
            ownerId: data.ownerId,
            businessId: data.businessId,
            passcode: data.passcode,
            ownerEmail: registerBusinessOwner.email,
            ownerName: registerBusinessOwner.name,
            ownerPassword: ownerPassword, // Show the generated OTP
          });
          setRegisterBusinessModal(false);
          // Reset form
          setRegisterBusinessOwner({ email: '', password: '', name: '' });
          setRegisterBusiness({ name: '', description: '', type: '', logo: '', address: '', contacts: '', social_handles: '', tel: '' });
          // Refresh pending businesses
          fetchPendingBusinesses();
          showToast('Business registered successfully! Please provide the OTP to the user.', 'success');
        } else {
          setRegisterBusinessError(data.error || 'Failed to register business');
        }
      } catch (err) {
        console.error('Error registering business:', err);
        setRegisterBusinessError('Network error. Please try again.');
      } finally {
        setRegisterBusinessLoading(false);
      }
    };

  const fetchBillingPlans = async () => {
    try {
      const res = await fetch('/api/admin/billing-settings');
      if (res.ok) {
        const data = await res.json();
        setBillingPlans(data);
      }
    } catch (err) {
      console.error('Failed to fetch billing plans:', err);
    }
  };

  const fetchPendingSubscriptions = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions/pending');
      if (res.ok) {
        const data = await res.json();
        setPendingSubscriptions(data);
      }
    } catch (err) {
      console.error('Failed to fetch pending subscriptions:', err);
    }
  };

  const handleApproveSubscription = async (subscriptionId: number, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`Subscription ${status} successfully!`, 'success');
        fetchPendingSubscriptions();
      }
    } catch (err) {
      console.error('Failed to update subscription:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserDetails = async (userId: number) => {
    setUserDetailsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/details`);
      if (!res.ok) throw new Error('Failed to fetch user details');
      const data = await res.json();
      setSelectedUser(data);
    } catch (err) {
      console.error('Error fetching user details:', err);
      showToast('Failed to fetch user details', 'error');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const res = await fetch('/api/admin/businesses');
      if (!res.ok) throw new Error('Failed to fetch businesses');
      const data = await res.json();
      setBusinesses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, image_url: reader.result as string }));
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegisterBusiness(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.image_url) {
      showToast('Please upload an image for the item', 'error');
      return;
    }
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          gallery: JSON.stringify(newItem.gallery),
          custom_fields: JSON.stringify(newItem.customFields.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}))
        }),
      });
      if (res.ok) {
        setNewItem({ title: '', description: '', image_url: '', gallery: [], customFields: [] });
        showToast('Item posted successfully!', 'success');
        fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
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

  const handleUpdateUserStatus = async (userId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveBusiness = async (businessId: number, is_approved: boolean) => {
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved }),
      });
      if (res.ok) fetchBusinesses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBusiness = async (businessId: number) => {
    if (!confirm('Are you sure you want to delete this business?')) return;
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`, { method: 'DELETE' });
      if (res.ok) fetchBusinesses();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return null;

  const stats = [
    { label: 'Total Users', value: analytics?.totalUsers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Items', value: analytics?.totalItems || 0, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Likes', value: analytics?.totalLikes || 0, icon: Heart, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-neutral-500">Manage your platform and community</p>
        </div>
       <div className="flex bg-neutral-100 p-1 rounded-2xl">
         {(['analytics', 'users', 'businesses', 'billing', 'subscriptions', 'pending', 'terms', 'privacy'] as const).map((tab) => (
           <button
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
               activeTab === tab ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
             }`}
           >
             {tab}
           </button>
         ))}
       </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            {/* Stats Grid */}
            <div className="grid gap-6 sm:grid-cols-3">
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ y: -5 }}
                  className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center gap-4"
                >
                  <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-2xl font-black">{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">Engagement Trends</h3>
                  <TrendingUp size={20} className="text-emerald-500" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.likesByDay}>
                      <defs>
                        <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
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
                      <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorLikes)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
                <h3 className="text-xl font-bold mb-8">Likes Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.likesByDay}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Post New Item */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Plus size={20} />
                </div>
                <h3 className="text-xl font-bold">Post New Item</h3>
              </div>
              <form onSubmit={handlePostItem} className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Title</label>
                  <input
                    type="text"
                    required
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Main Image</label>
                  <div 
                    onClick={() => itemImageInputRef.current?.click()}
                    className="w-full h-32 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-neutral-100 transition-all overflow-hidden"
                  >
                    {newItem.image_url ? (
                      <img src={newItem.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : uploadingImage ? (
                      <Loader2 size={24} className="animate-spin text-emerald-600" />
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
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    required
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
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
                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
                      <Plus size={20} className="text-neutral-400" />
                      <span className="text-[10px] text-neutral-400 font-bold uppercase">Add</span>
                      <input type="file" multiple className="hidden" onChange={handleGalleryUpload} accept="image/*" />
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
                      className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline"
                    >
                      + Add Field
                    </button>
                  </div>
                  <div className="space-y-2">
                    {newItem.customFields.map((field, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Field Name (e.g. Size)"
                          value={field.key}
                          onChange={(e) => updateCustomField(i, e.target.value, field.value)}
                          className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. XL)"
                          value={field.value}
                          onChange={(e) => updateCustomField(i, field.key, e.target.value)}
                          className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button 
                          type="button"
                          onClick={() => removeCustomField(i)}
                          className="p-2 text-neutral-400 hover:text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="md:col-span-2 py-4 bg-neutral-900 text-white font-bold rounded-xl hover:bg-black active:scale-[0.98] transition-all"
                >
                  Post Item
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden"
          >
            {/* Responsive table with horizontal scroll on mobile */}
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px] md:min-w-0">
                <thead>
                  <tr className="border-bottom border-neutral-100 bg-neutral-50">
                    <th className="px-4 md:px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">User</th>
                    <th className="px-4 md:px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Type</th>
                    <th className="px-4 md:px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Status</th>
                    <th className="px-4 md:px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 md:px-6 py-4">
                        <div className="font-bold text-neutral-900">{u.name}</div>
                        <div className="text-xs text-neutral-500">{u.email}</div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          u.business_id ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {u.business_id ? `Business` : 'User'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          u.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                          u.status === 'warned' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-1 md:gap-2">
                          <button 
                            onClick={() => fetchUserDetails(u.id)} 
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" 
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button onClick={() => handleUpdateUserStatus(u.id, 'warned')} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Warn"><AlertTriangle size={16} /></button>
                          <button onClick={() => handleUpdateUserStatus(u.id, 'suspended')} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg hidden sm:inline-flex" title="Suspend"><Shield size={16} /></button>
                          <button onClick={() => handleUpdateUserStatus(u.id, 'banned')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg hidden sm:inline-flex" title="Ban"><XCircle size={16} /></button>
                          <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

         {activeTab === 'businesses' && (
           <motion.div
             key="businesses"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden"
           >
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-6 border-b border-neutral-100">
               <div>
                 <h2 className="text-xl font-bold text-neutral-900">Registered Businesses</h2>
                 <p className="text-sm text-neutral-500">Manage businesses and owner account credentials</p>
               </div>
               <button
                 onClick={() => setRegisterBusinessModal(true)}
                 className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
               >
                 Register New Business
               </button>
             </div>

             {registerBusinessSuccess && (
               <div className="p-5 border-b border-neutral-100 bg-emerald-50 text-sm text-neutral-700">
                 <h3 className="font-bold text-neutral-900 mb-2">New Business Credentials</h3>
                 <p>Owner: <strong>{registerBusinessSuccess.ownerName}</strong></p>
                 <p>Email: <strong>{registerBusinessSuccess.ownerEmail}</strong></p>
                 <p>Password: <strong>{registerBusinessSuccess.ownerPassword}</strong></p>
                 <p>One-Time Passcode: <strong>{registerBusinessSuccess.passcode}</strong></p>
                 <p className="mt-2 text-xs text-neutral-500">This one-time passcode expires in 1 hour and is required for first login to complete setup.</p>
                 <button
                   onClick={() => setRegisterBusinessSuccess(null)}
                   className="mt-3 px-3 py-1 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300"
                 >
                   Dismiss
                 </button>
               </div>
             )}

             <table className="w-full text-left">
               <thead>
                 <tr className="border-bottom border-neutral-100 bg-neutral-50">
                   <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Business</th>
                   <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Performance</th>
                   <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Approval</th>
                   <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-neutral-100">
                 {businesses.map((b: any) => (
                   <tr key={b.id} className="hover:bg-neutral-50 transition-colors">
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                           {b.logo && <img src={b.logo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                         </div>
                         <div>
                           <div className="font-bold text-neutral-900">{b.name}</div>
                           <div className="text-[10px] text-neutral-400 uppercase tracking-widest">{b.contacts}</div>
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-4">
                       <div className="flex gap-4">
                         <div className="text-center">
                           <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Items</p>
                           <p className="text-sm font-black text-neutral-900">{b.item_count || 0}</p>
                         </div>
                         <div className="text-center">
                           <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Followers</p>
                           <p className="text-sm font-black text-emerald-600">{b.follower_count || 0}</p>
                         </div>
                         <div className="text-center">
                           <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Likes</p>
                           <p className="text-sm font-black text-red-600">{b.like_count || 0}</p>
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-4">
                       {b.is_approved ? (
                         <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase tracking-widest">
                           <CheckCircle size={14} /> Approved
                         </span>
                       ) : (
                         <span className="flex items-center gap-1 text-neutral-400 text-[10px] font-bold uppercase tracking-widest">
                           <Shield size={14} /> Pending
                         </span>
                       )}
                     </td>
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                         {!b.is_approved ? (
                           <button onClick={() => handleApproveBusiness(b.id, true)} className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 uppercase tracking-widest">Approve</button>
                         ) : (
                           <button onClick={() => handleApproveBusiness(b.id, false)} className="px-3 py-1 bg-neutral-200 text-neutral-600 text-[10px] font-bold rounded-lg hover:bg-neutral-300 uppercase tracking-widest">Revoke</button>
                         )}
                         <button onClick={() => handleDeleteBusiness(b.id)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={16} /></button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </motion.div>
         )}
         {activeTab === 'pending' && (
           <motion.div
             key="pending"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden"
           >
             <div className="space-y-6">
               <h2 className="text-xl font-bold text-neutral-900">Pending Business Approvals</h2>
               <p className="text-sm text-neutral-500">
                 Review and approve businesses that have submitted documents for verification
               </p>
               {pendingBusinesses.length === 0 ? (
                 <div className="p-12 bg-neutral-50 rounded-2xl border border-neutral-200 text-center">
                   <CheckCircle size={48} className="mx-auto text-emerald-300 mb-4" />
                   <p className="text-neutral-500">No pending businesses to review</p>
                 </div>
               ) : (
                 <div className="space-y-4">
                   {pendingBusinesses.map((business) => (
                     <div key={business.id} className="p-6 bg-white rounded-2xl border border-neutral-200">
                       <div className="flex items-start justify-between">
                         <div className="flex-1">
                           <h4 className="font-bold text-neutral-900">{business.name}</h4>
                           <p className="text-sm text-neutral-500">
                             Type: <span className="font-bold">{business.type || 'Not specified'}</span>
                           </p>
                           <p className="text-sm text-neutral-500">
                             Location: <span className="font-bold">{business.address || 'Not specified'}</span>
                           </p>
                           <p className="text-xs text-neutral-400 mt-1">
                             Submitted: {new Date(business.created_at).toLocaleDateString()}
                           </p>
                         </div>
                         <div className="flex gap-2">
                           <button
                             onClick={() => handleApproveBusiness(business.id, true)}
                             className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-1"
                           >
                             <CheckCircle size={16} />
                             Approve
                           </button>
                           <button
                             onClick={() => handleApproveBusiness(business.id, false)}
                             className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 flex items-center gap-1"
                           >
                             <XCircle size={16} />
                             Reject
                           </button>
                         </div>
                       </div>
                       {business.national_id_front || business.national_id_back || business.nin_number || business.businessLogo || business.location || business.businessType || business.ownersPic || business.telephone || business.alternative_phone_number ? (
                         <div className="mt-4 pt-4 border-t border-neutral-100">
                           <p className="text-sm font-bold text-neutral-700 mb-2">Documents Submitted:</p>
                           <div className="space-y-2">
                             {business.national_id_front && (
                               <div className="flex items-center">
                                 <span className="text-xs font-bold text-neutral-400 mr-2">National ID Front:</span>
                                 <span className="text-xs text-neutral-600">✓ Uploaded</span>
                               </div>
                             )}
                             {business.national_id_back && (
                               <div className="flex items-center">
                                 <span className="text-xs font-bold text-neutral-400 mr-2">National ID Back:</span>
                                 <span className="text-xs text-neutral-600">✓ Uploaded</span>
                               </div>
                             )}
                             {business.nin_number && (
                               <div className="flex items-center">
                                 <span className="text-xs font-bold text-neutral-400 mr-2">NIN Number:</span>
                                 <span className="text-xs text-neutral-600">✓ Uploaded</span>
                               </div>
                             )}
                             {business.businessLogo && (
                               <div className="flex items-center">
                                 <span className="text-xs font-bold text-neutral-400 mr-2">Business Logo:</span>
                                 <span className="text-xs text-neutral-600">✓ Uploaded</span>
                               </div>
                             )}
                             {business.location && (
                               <div className="flex items-center">
                                 <span className="text-xs font-bold text-neutral-400 mr-2">Location:</span>
                                 <span className="text-xs text-neutral-600">✓ Uploaded</span>
                               </div>
                             )}
                             {business.businessType && (
                               <div className="flex items-center">
                                 <span className="text-xs font-bold text-neutral-400 mr-2">Business Type:</span>
                                 <span className="text-xs text-neutral-600">✓ Uploaded</span>
                               </div>
                             )}
                             {business.ownersPic && (
                               <div className="flex items-center">
                                 <span className="text-xs font-bold text-neutral-400 mr-2">Owner's Picture:</span>
                                 <span className="text-xs text-neutral-600">✓ Uploaded</span>
                               </div>
                             )}
                             {business.telephone && (
                               <div className="flex items-center">
                                 <span className="text-xs font-bold text-neutral-400 mr-2">Telephone:</span>
                                 <span className="text-xs text-neutral-600">✓ Uploaded</span>
                               </div>
                             )}
                             {business.alternative_phone_number && (
                               <div className="flex items-center">
                                 <span className="text-xs font-bold text-neutral-400 mr-2">Alternative Phone:</span>
                                 <span className="text-xs text-neutral-600">✓ Uploaded</span>
                               </div>
                             )}
                           </div>
                         </div>
                       ) : (
                         <div className="p-4 bg-neutral-50 text-sm text-neutral-500">
                           No documents submitted yet
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               )}
             </div>
           </motion.div>
         )}
         {activeTab === 'billing' && (
          <motion.div
            key="billing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">Billing Plans & Payment Settings</h3>
                  <p className="text-sm text-neutral-500">Manage subscription plans and payment links</p>
                </div>
              </div>

              <div className="space-y-6">
                {billingPlans.map((plan) => (
                  <div key={plan.id} className="p-6 bg-neutral-50 rounded-2xl border border-neutral-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-neutral-900">{plan.name}</h4>
                        <p className="text-sm text-neutral-500">{plan.description}</p>
                      </div>
                      <button
                        onClick={() => setEditingPlan(editingPlan?.id === plan.id ? null : plan)}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700"
                      >
                        {editingPlan?.id === plan.id ? 'Cancel' : 'Edit'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-neutral-400">Monthly:</span>
                        <span className="font-bold text-neutral-900 ml-2">{formatCurrency(plan.monthly_price || 0)}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Yearly:</span>
                        <span className="font-bold text-neutral-900 ml-2">{formatCurrency(plan.yearly_price || 0)}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Lifetime:</span>
                        <span className="font-bold text-neutral-900 ml-2">{formatCurrency(plan.lifetime_price || 0)}</span>
                      </div>
                    </div>

                    {editingPlan?.id === plan.id && (
                      <div className="mt-6 pt-6 border-t border-neutral-200 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Monthly Price (UGX)</label>
                            <input
                              type="number"
                              value={editingPlan.monthly_price}
                              onChange={(e) => setEditingPlan({ ...editingPlan, monthly_price: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Yearly Price (UGX)</label>
                            <input
                              type="number"
                              value={editingPlan.yearly_price}
                              onChange={(e) => setEditingPlan({ ...editingPlan, yearly_price: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Lifetime Price (UGX)</label>
                            <input
                              type="number"
                              value={editingPlan.lifetime_price}
                              onChange={(e) => setEditingPlan({ ...editingPlan, lifetime_price: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Monthly Payment Link</label>
                            <input
                              type="url"
                              value={editingPlan.monthly_payment_link || ''}
                              onChange={(e) => setEditingPlan({ ...editingPlan, monthly_payment_link: e.target.value })}
                              placeholder="https://payment.example.com/monthly"
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Yearly Payment Link</label>
                            <input
                              type="url"
                              value={editingPlan.yearly_payment_link || ''}
                              onChange={(e) => setEditingPlan({ ...editingPlan, yearly_payment_link: e.target.value })}
                              placeholder="https://payment.example.com/yearly"
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Lifetime Payment Link</label>
                            <input
                              type="url"
                              value={editingPlan.lifetime_payment_link || ''}
                              onChange={(e) => setEditingPlan({ ...editingPlan, lifetime_payment_link: e.target.value })}
                              placeholder="https://payment.example.com/lifetime"
                              className="w-full px-3 py-2 border border-neutral-200 rounded-lg"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Description</label>
                          <input
                            type="text"
                            value={editingPlan.description}
                            onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg"
                          />
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/admin/billing-plans/${plan.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name: editingPlan.name,
                                  description: editingPlan.description,
                                  monthly_price: editingPlan.monthly_price,
                                  yearly_price: editingPlan.yearly_price,
                                  lifetime_price: editingPlan.lifetime_price,
                                  features: editingPlan.features,
                                  monthly_payment_link: editingPlan.monthly_payment_link,
                                  yearly_payment_link: editingPlan.yearly_payment_link,
                                  lifetime_payment_link: editingPlan.lifetime_payment_link
                                })
                              });
                              if (res.ok) {
                                showToast('Plan updated successfully!', 'success');
                                fetchBillingPlans();
                                setEditingPlan(null);
                              }
                            } catch (err) {
                              console.error(err);
                              showToast('Failed to update plan', 'error');
                            }
                          }}
                          className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2"
                        >
                          <Save size={18} />
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-2">💳 Payment Link Instructions</h4>
                <p className="text-sm text-blue-700 mb-4">
                  To enable payment collection, configure your payment gateway URL below. 
                  When users subscribe, they'll receive a payment link to complete their purchase.
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Enter your payment gateway URL (e.g., https://pay.stripe.com/...)"
                    className="flex-1 px-4 py-3 border border-blue-200 rounded-xl"
                  />
                  <button className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">
                    Save Payment URL
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'subscriptions' && (
          <motion.div
            key="subscriptions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-xl font-bold text-neutral-900">Pending Subscription Approvals</h3>
              <p className="text-sm text-neutral-500">Review and approve subscription requests from businesses</p>
            </div>

            {pendingSubscriptions.length === 0 ? (
              <div className="p-12 bg-neutral-50 rounded-2xl border border-neutral-200 text-center">
                <CheckCircle size={48} className="mx-auto text-emerald-300 mb-4" />
                <p className="text-neutral-500">No pending subscriptions to review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSubscriptions.map((sub) => (
                  <div key={sub.id} className="p-6 bg-white rounded-2xl border border-neutral-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-neutral-900">{sub.business_name}</h4>
                        <p className="text-sm text-neutral-500">
                          Plan: <span className="font-bold">{sub.plan_name}</span>
                        </p>
                        <p className="text-sm text-neutral-500">
                          Reference: <span className="font-mono">{sub.reference_code}</span>
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          Created: {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveSubscription(sub.id, 'approved')}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproveSubscription(sub.id, 'rejected')}
                          className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 flex items-center gap-1"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                    {sub.payment_proof_image && (
                      <div className="mt-4 pt-4 border-t border-neutral-100">
                        <p className="text-sm font-bold text-neutral-700 mb-2">Payment Proof:</p>
                        <img 
                          src={sub.payment_proof_image} 
                          alt="Payment proof" 
                          className="max-h-48 rounded-lg border border-neutral-200"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'terms' && (
          <motion.div
            key="terms"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Terms of Service</h3>
                <p className="text-sm text-neutral-500">Edit the terms of service content</p>
              </div>
              <button
                onClick={() => setEditingTerms(!editingTerms)}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2"
              >
                {editingTerms ? <Check size={16} /> : <Edit2 size={16} />}
                {editingTerms ? 'Save' : 'Edit'}
              </button>
            </div>

            {editingTerms ? (
              <div className="space-y-4">
                <textarea
                  value={termsContent}
                  onChange={(e) => setTermsContent(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                  placeholder="Enter terms of service content..."
                />
                <div className="flex gap-3">
                  <button
                    onClick={saveTermsContent}
                    className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingTerms(false)}
                    className="px-6 py-2 bg-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-neutral-200">
                <div className="prose prose-neutral max-w-none">
                  {termsContent ? (
                    <div dangerouslySetInnerHTML={{ __html: termsContent.replace(/\n/g, '<br>') }} />
                  ) : (
                    <p className="text-neutral-500 italic">No terms of service content set yet.</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'privacy' && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Privacy Policy</h3>
                <p className="text-sm text-neutral-500">Edit the privacy policy content</p>
              </div>
              <button
                onClick={() => setEditingPrivacy(!editingPrivacy)}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2"
              >
                {editingPrivacy ? <Check size={16} /> : <Edit2 size={16} />}
                {editingPrivacy ? 'Save' : 'Edit'}
              </button>
            </div>

            {editingPrivacy ? (
              <div className="space-y-4">
                <textarea
                  value={privacyContent}
                  onChange={(e) => setPrivacyContent(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                  placeholder="Enter privacy policy content..."
                />
                <div className="flex gap-3">
                  <button
                    onClick={savePrivacyContent}
                    className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingPrivacy(false)}
                    className="px-6 py-2 bg-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-neutral-200">
                <div className="prose prose-neutral max-w-none">
                  {privacyContent ? (
                    <div dangerouslySetInnerHTML={{ __html: privacyContent.replace(/\n/g, '<br>') }} />
                  ) : (
                    <p className="text-neutral-500 italic">No privacy policy content set yet.</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Register Business Modal */}
      <AnimatePresence>
        {registerBusinessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setRegisterBusinessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="text-xl font-bold">Register New Business</h2>
                <button
                  onClick={() => setRegisterBusinessModal(false)}
                  className="p-2 rounded-full hover:bg-neutral-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {registerBusinessError && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl">
                    {registerBusinessError}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Owner Credentials</h3>
                    <input
                      type="text"
                      placeholder="Owner full name"
                      value={registerBusinessOwner.name}
                      onChange={(e) => setRegisterBusinessOwner(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl"
                    />
                    <input
                      type="email"
                      placeholder="Owner email"
                      value={registerBusinessOwner.email}
                      onChange={(e) => setRegisterBusinessOwner(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl"
                    />
                    <input
                      type="password"
                      placeholder="Owner password"
                      value={registerBusinessOwner.password}
                      onChange={(e) => setRegisterBusinessOwner(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold">Business Details</h3>
                    <input
                      type="text"
                      placeholder="Business name"
                      value={registerBusiness.name}
                      onChange={(e) => setRegisterBusiness(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl"
                    />
                    <input
                      type="text"
                      placeholder="Business type"
                      value={registerBusiness.type}
                      onChange={(e) => setRegisterBusiness(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl"
                    />
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Logo</label>
                      <div 
                        onClick={() => logoInputRef.current?.click()}
                        className="w-full h-24 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-neutral-100 transition-all overflow-hidden"
                      >
                        {registerBusiness.logo ? (
                          <img src={registerBusiness.logo} alt="Logo Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <>
                            <Camera size={20} className="text-neutral-400" />
                            <span className="text-xs font-medium text-neutral-500">Click to upload logo</span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Address"
                      value={registerBusiness.address}
                      onChange={(e) => setRegisterBusiness(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl"
                    />
                    <input
                      type="text"
                      placeholder="Contacts"
                      value={registerBusiness.contacts}
                      onChange={(e) => setRegisterBusiness(prev => ({ ...prev, contacts: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl"
                    />
                    <input
                      type="text"
                      placeholder="Social handles"
                      value={registerBusiness.social_handles}
                      onChange={(e) => setRegisterBusiness(prev => ({ ...prev, social_handles: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={registerBusiness.tel}
                      onChange={(e) => setRegisterBusiness(prev => ({ ...prev, tel: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl"
                    />
                    <textarea
                      placeholder="Business description"
                      value={registerBusiness.description}
                      onChange={(e) => setRegisterBusiness(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRegisterBusiness}
                  disabled={registerBusinessLoading}
                  className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  {registerBusinessLoading ? 'Registering...' : 'Register and Generate OTP'}
                </button>

                <p className="text-xs text-neutral-500">The generated one-time passcode is valid for 1 hour and is required along with email and password on first login.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white p-6 border-b border-neutral-100 rounded-t-[2.5rem]">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-neutral-900">User Details</h2>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={24} className="text-neutral-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {userDetailsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Basic Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-neutral-100 overflow-hidden shrink-0">
                        {selectedUser.profile_picture ? (
                          <img src={selectedUser.profile_picture} alt={selectedUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-neutral-400">
                            {selectedUser.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-neutral-900">{selectedUser.name}</h3>
                        <p className="text-neutral-500 flex items-center gap-2 mt-1">
                          <Mail size={14} /> {selectedUser.email}
                        </p>
                        {selectedUser.business_phone && (
                          <p className="text-neutral-500 flex items-center gap-2 mt-1">
                            <Phone size={14} /> {selectedUser.business_phone}
                          </p>
                        )}
                        <p className="text-neutral-400 flex items-center gap-2 mt-1 text-sm">
                          <Calendar size={14} /> Joined {new Date(selectedUser.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Bio */}
                    {selectedUser.bio && (
                      <div className="p-4 bg-neutral-50 rounded-2xl">
                        <p className="text-neutral-600">{selectedUser.bio}</p>
                      </div>
                    )}

                    {/* Performance Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-emerald-50 rounded-2xl text-center">
                        <Package className="mx-auto text-emerald-600 mb-2" size={24} />
                        <p className="text-2xl font-black text-neutral-900">{selectedUser.performance.itemsCount}</p>
                        <p className="text-xs font-bold text-neutral-500 uppercase">Items</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-2xl text-center">
                        <Heart className="mx-auto text-red-600 mb-2" size={24} />
                        <p className="text-2xl font-black text-neutral-900">{selectedUser.performance.likesCount}</p>
                        <p className="text-xs font-bold text-neutral-500 uppercase">Likes</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl text-center">
                        <MessageCircle className="mx-auto text-blue-600 mb-2" size={24} />
                        <p className="text-2xl font-black text-neutral-900">{selectedUser.performance.commentsCount}</p>
                        <p className="text-xs font-bold text-neutral-500 uppercase">Comments</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-2xl text-center">
                        <Briefcase className="mx-auto text-purple-600 mb-2" size={24} />
                        <p className="text-2xl font-black text-neutral-900">{selectedUser.performance.businessesCount}</p>
                        <p className="text-xs font-bold text-neutral-500 uppercase">Businesses</p>
                      </div>
                    </div>

                    {/* Business Info */}
                    {selectedUser.business_name && (
                      <div className="p-6 bg-neutral-50 rounded-2xl">
                        <h4 className="font-bold text-neutral-900 mb-2 flex items-center gap-2">
                          <Briefcase size={18} /> Business Information
                        </h4>
                        <p className="font-bold text-lg text-neutral-800">{selectedUser.business_name}</p>
                        {selectedUser.business_description && (
                          <p className="text-neutral-600 mt-2">{selectedUser.business_description}</p>
                        )}
                      </div>
                    )}

                    {/* Recent Items */}
                    {selectedUser.recentItems && selectedUser.recentItems.length > 0 && (
                      <div>
                        <h4 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                          <BarChart2 size={18} /> Recent Items
                        </h4>
                        <div className="space-y-2">
                          {selectedUser.recentItems.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-4 p-3 bg-neutral-50 rounded-xl">
                              <div className="w-12 h-12 rounded-lg bg-neutral-200 overflow-hidden shrink-0">
                                {item.image_url && (
                                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-neutral-900 truncate">{item.title}</p>
                                <div className="flex gap-3 text-xs text-neutral-500">
                                  <span className="flex items-center gap-1"><Heart size={12} /> {item.likes}</span>
                                  <span className="flex items-center gap-1"><MessageCircle size={12} /> {item.comments}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
