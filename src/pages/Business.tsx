import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Plus, TrendingUp, Package, Heart, Save, Camera, MapPin, Phone, Globe, Edit3, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Business } from '../types';

export default function BusinessPage({ user, business, onUpdate }: { user: User; business: Business | null; onUpdate: () => void }) {
  const [name, setName] = useState(business?.name || '');
  const [description, setDescription] = useState(business?.description || '');
  const [logo, setLogo] = useState(business?.logo || '');
  const [address, setAddress] = useState(business?.address || '');
  const [contacts, setContacts] = useState(business?.contacts || '');
  const [socialHandles, setSocialHandles] = useState(business?.social_handles || '');
  const [tel, setTel] = useState(business?.tel || '');
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<{ totalItems: number; totalLikes: number } | null>(null);
  const [newItem, setNewItem] = useState({ 
    title: '', 
    description: '', 
    image_url: '',
    gallery: [] as string[],
    customFields: [] as { key: string; value: string }[]
  });
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const itemImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (business) {
      fetchAnalytics();
      setName(business.name);
      setDescription(business.description);
      setLogo(business.logo || '');
      setAddress(business.address || '');
      setContacts(business.contacts || '');
      setSocialHandles(business.social_handles || '');
      setTel(business.tel || '');
    }
  }, [business]);

  const fetchAnalytics = async () => {
    if (!business) return;
    try {
      const res = await fetch(`/api/businesses/${business.id}/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
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
          ownerId: user.id, 
          name, 
          description, 
          logo,
          address,
          contacts,
          social_handles: socialHandles,
          tel
        }),
      });
      if (res.ok) {
        onUpdate();
        setIsEditingProfile(false);
        if (business) alert('Business profile updated!');
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    if (!newItem.image_url) {
      alert('Please upload an image for the item');
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
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Social Handles</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  type="text"
                  value={socialHandles}
                  onChange={(e) => setSocialHandles(e.target.value)}
                  placeholder="@businessname"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
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
      </header>

      {/* Business Details Card */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {business.address && (
          <div className="flex items-center gap-2 text-neutral-600">
            <MapPin size={16} className="text-emerald-500 shrink-0" />
            <span className="text-xs font-medium truncate">{business.address}</span>
          </div>
        )}
        {business.tel && (
          <div className="flex items-center gap-2 text-neutral-600">
            <Phone size={16} className="text-emerald-500 shrink-0" />
            <span className="text-xs font-medium truncate">{business.tel}</span>
          </div>
        )}
        {business.contacts && (
          <div className="flex items-center gap-2 text-neutral-600">
            <Save size={16} className="text-emerald-500 shrink-0" />
            <span className="text-xs font-medium truncate">{business.contacts}</span>
          </div>
        )}
        {business.social_handles && (
          <div className="flex items-center gap-2 text-neutral-600">
            <Globe size={16} className="text-emerald-500 shrink-0" />
            <span className="text-xs font-medium truncate">{business.social_handles}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2">
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
          <div className="p-4 rounded-2xl bg-red-50 text-red-600">
            <Heart size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Likes</p>
            <p className="text-2xl font-black">{analytics?.totalLikes || 0}</p>
          </div>
        </div>
      </div>

      {/* Post New Item */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
            <Plus size={20} />
          </div>
          <h3 className="text-xl font-bold">Post Business Item</h3>
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
                    placeholder="Field Name"
                    value={field.key}
                    onChange={(e) => updateCustomField(i, e.target.value, field.value)}
                    className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Value"
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
            disabled={loading}
            className="md:col-span-2 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Item'}
          </button>
        </form>
      </div>
    </div>
  );
}
