import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, Package, Heart, TrendingUp, Plus, Shield, Briefcase, Trash2, AlertTriangle, CheckCircle, XCircle, CreditCard, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnalyticsData, User, Business } from '../types';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'businesses' | 'billing'>('analytics');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [billingPlans, setBillingPlans] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [newItem, setNewItem] = useState({ 
    title: '', 
    description: '', 
    image_url: '',
    gallery: [] as string[],
    customFields: [] as { key: string; value: string }[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchUsers();
    fetchBusinesses();
    if (activeTab === 'billing') {
      fetchBillingPlans();
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

  const handlePostItem = async (e: React.FormEvent) => {
    e.preventDefault();
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
        alert('Item posted successfully!');
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
          {(['analytics', 'users', 'businesses', 'billing'] as const).map((tab) => (
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
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Main Image URL</label>
                  <input
                    type="url"
                    required
                    value={newItem.image_url}
                    onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
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
            <table className="w-full text-left">
              <thead>
                <tr className="border-bottom border-neutral-100 bg-neutral-50">
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-neutral-900">{u.name}</div>
                      <div className="text-xs text-neutral-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        u.business_id ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {u.business_id ? `Business (${u.name})` : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        u.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                        u.status === 'warned' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleUpdateUserStatus(u.id, 'warned')} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Warn"><AlertTriangle size={16} /></button>
                        <button onClick={() => handleUpdateUserStatus(u.id, 'suspended')} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title="Suspend"><Shield size={16} /></button>
                        <button onClick={() => handleUpdateUserStatus(u.id, 'banned')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Ban"><XCircle size={16} /></button>
                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                        <span className="font-bold text-neutral-900 ml-2">UGX {plan.monthly_price?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Yearly:</span>
                        <span className="font-bold text-neutral-900 ml-2">UGX {plan.yearly_price?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Lifetime:</span>
                        <span className="font-bold text-neutral-900 ml-2">UGX {plan.lifetime_price?.toLocaleString()}</span>
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
                                  features: editingPlan.features
                                })
                              });
                              if (res.ok) {
                                alert('Plan updated successfully!');
                                fetchBillingPlans();
                                setEditingPlan(null);
                              }
                            } catch (err) {
                              console.error(err);
                              alert('Failed to update plan');
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
      </AnimatePresence>
    </div>
  );
}
