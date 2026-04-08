import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Save, User as UserIcon, Briefcase, MapPin, Phone, Globe, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { User, Business, SocialHandle } from '../types';
import { Plus, Trash2 } from 'lucide-react';

export default function Profile({ user: currentUser, onUpdate }: { user: User; onUpdate: (user: User) => void }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const isOwnProfile = !userId || userId === String(currentUser.id);
  
  const [targetUser, setTargetUser] = useState<User | null>(isOwnProfile ? currentUser : null);
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [profilePicture, setProfilePicture] = useState(currentUser.profile_picture || '');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!isOwnProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Business state
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');
  const [businessLogo, setBusinessLogo] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessContacts, setBusinessContacts] = useState('');
  const [businessSocials, setBusinessSocials] = useState<SocialHandle[]>([]);
  const [businessTel, setBusinessTel] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [customType, setCustomType] = useState('');
  const businessLogoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOwnProfile && userId) {
      fetchTargetUser(userId);
    } else {
      setTargetUser(currentUser);
      setName(currentUser.name);
      setBio(currentUser.bio || '');
      setProfilePicture(currentUser.profile_picture || '');
    }
  }, [userId, currentUser]);

  useEffect(() => {
    const bizId = isOwnProfile ? currentUser.business_id : targetUser?.business_id;
    if (bizId) {
      fetchBusiness();
    }
    fetchBusinessTypes();
  }, [currentUser.business_id, targetUser?.business_id, isOwnProfile]);

  const fetchTargetUser = async (id: string) => {
    setFetching(true);
    try {
      const res = await fetch(`/api/profile/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTargetUser(data);
        setName(data.name);
        setBio(data.bio || '');
        setProfilePicture(data.profile_picture || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const fetchBusinessTypes = async () => {
    try {
      const res = await fetch('/api/business-types');
      if (res.ok) {
        const data = await res.json();
        setAvailableTypes(data);
      }
    } catch (err) {
      console.error('Failed to fetch business types:', err);
    }
  };

  const fetchBusiness = async () => {
    const id = isOwnProfile ? currentUser.id : userId;
    try {
      const res = await fetch(`/api/businesses/my/${id}`);
      const data = await res.json();
      if (data) {
        setBusiness(data);
        setBusinessName(data.name);
        setBusinessDesc(data.description);
        setBusinessLogo(data.logo || '');
        setBusinessAddress(data.address || '');
        setBusinessContacts(data.contacts || '');
        setBusinessType(data.type || '');
        try {
          const parsed = JSON.parse(data.social_handles || '[]');
          setBusinessSocials(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setBusinessSocials([]);
        }
        setBusinessTel(data.tel || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'user' | 'business') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'user') setProfilePicture(reader.result as string);
        else setBusinessLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnProfile) return;
    setLoading(true);

    try {
      // Update User Profile
      const userRes = await fetch(`/api/profile/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, profile_picture: profilePicture }),
      });

      // Update Business Profile if applicable
      if (business) {
        const finalType = isAddingCustomType ? customType : businessType;
        await fetch(`/api/businesses/${business.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: businessName, 
            description: businessDesc, 
            logo: businessLogo,
            address: businessAddress,
            contacts: businessContacts,
            social_handles: JSON.stringify(businessSocials),
            tel: businessTel,
            type: finalType
          }),
        });
        if (isAddingCustomType) {
          setAvailableTypes(prev => Array.from(new Set([...prev, customType])));
          setBusinessType(customType);
          setIsAddingCustomType(false);
          setCustomType('');
        }
      }

      if (userRes.ok) {
        onUpdate({ ...currentUser, name, bio, profile_picture: profilePicture });
        alert('Profile updated successfully!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-neutral-900">User not found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-emerald-600 font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-12 pb-20">
      <header className="flex items-center gap-4">
        {!isOwnProfile && (
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isOwnProfile ? 'Your Profile' : `${targetUser.name}'s Profile`}</h1>
          <p className="text-neutral-500">{isOwnProfile ? 'Manage your public information' : 'Public profile information'}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* User Section */}
        <section className="space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100 border-4 border-white shadow-lg">
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    <UserIcon size={48} />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
                >
                  <Camera size={20} />
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleImageUpload(e, 'user')}
                accept="image/*"
                className="hidden"
              />
            </div>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest">Personal Photo</p>
          </div>

          <div className="space-y-6 bg-white p-8 rounded-[2rem] border border-neutral-200 shadow-sm">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Full Name</label>
              <input
                type="text"
                readOnly={!isOwnProfile}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all read-only:bg-transparent read-only:border-transparent read-only:px-1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Bio</label>
              <textarea
                readOnly={!isOwnProfile}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder={isOwnProfile ? "Tell us about yourself..." : "No bio provided"}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none read-only:bg-transparent read-only:border-transparent read-only:px-1"
              />
            </div>
          </div>
        </section>

        {/* Business Section */}
        {business && (
          <section className="space-y-8">
            <div className="flex items-center gap-4 px-2">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                <Briefcase size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Business Profile</h2>
                <p className="text-sm text-neutral-500">{isOwnProfile ? 'Manage your business details' : 'Business information'}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl overflow-hidden bg-neutral-100 border-4 border-white shadow-lg">
                  {businessLogo ? (
                    <img src={businessLogo} alt="Business Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <Briefcase size={48} />
                    </div>
                  )}
                </div>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => businessLogoRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Camera size={20} />
                  </button>
                )}
                <input
                  type="file"
                  ref={businessLogoRef}
                  onChange={(e) => handleImageUpload(e, 'business')}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest">Business Logo</p>
            </div>

            <div className="space-y-6 bg-white p-8 rounded-[2rem] border border-neutral-200 shadow-sm">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Business Name</label>
                <input
                  type="text"
                  readOnly={!isOwnProfile}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all read-only:bg-transparent read-only:border-transparent read-only:px-1"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Description</label>
                <textarea
                  readOnly={!isOwnProfile}
                  value={businessDesc}
                  onChange={(e) => setBusinessDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe your business..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none read-only:bg-transparent read-only:border-transparent read-only:px-1"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Business Type</label>
                <div className="flex gap-2">
                  {!isAddingCustomType ? (
                    <select
                      disabled={!isOwnProfile}
                      value={businessType}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') {
                          setIsAddingCustomType(true);
                        } else {
                          setBusinessType(e.target.value);
                        }
                      }}
                      className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none disabled:bg-transparent disabled:border-transparent disabled:px-1"
                    >
                      <option value="">Select Type</option>
                      {availableTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      {isOwnProfile && <option value="ADD_NEW" className="text-emerald-600 font-bold">+ Add New Type</option>}
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

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <MapPin size={14} /> Address
                  </label>
                  <input
                    type="text"
                    readOnly={!isOwnProfile}
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Physical location"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all read-only:bg-transparent read-only:border-transparent read-only:px-1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Phone size={14} /> Telephone
                  </label>
                  <input
                    type="tel"
                    readOnly={!isOwnProfile}
                    value={businessTel}
                    onChange={(e) => setBusinessTel(e.target.value)}
                    placeholder="Business phone"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all read-only:bg-transparent read-only:border-transparent read-only:px-1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Mail size={14} /> Contacts
                  </label>
                  <input
                    type="text"
                    readOnly={!isOwnProfile}
                    value={businessContacts}
                    onChange={(e) => setBusinessContacts(e.target.value)}
                    placeholder="Email or other contacts"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all read-only:bg-transparent read-only:border-transparent read-only:px-1"
                  />
                </div>
                <div className="space-y-4 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Globe size={14} /> Social Handles
                    </label>
                    {isOwnProfile && (
                      <button
                        type="button"
                        onClick={() => setBusinessSocials([...businessSocials, { platform: '', url: '' }])}
                        className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                      >
                        <Plus size={14} /> Add Handle
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {businessSocials.map((handle, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            readOnly={!isOwnProfile}
                            placeholder="Platform (e.g. TikTok)"
                            value={handle.platform}
                            onChange={(e) => {
                              const newSocials = [...businessSocials];
                              newSocials[index].platform = e.target.value;
                              setBusinessSocials(newSocials);
                            }}
                            className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm read-only:bg-transparent read-only:border-transparent read-only:px-1"
                          />
                          <input
                            type="url"
                            readOnly={!isOwnProfile}
                            placeholder="URL (e.g. https://tiktok.com/@user)"
                            value={handle.url}
                            onChange={(e) => {
                              const newSocials = [...businessSocials];
                              newSocials[index].url = e.target.value;
                              setBusinessSocials(newSocials);
                            }}
                            className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm read-only:bg-transparent read-only:border-transparent read-only:px-1"
                          />
                        </div>
                        {isOwnProfile && (
                          <button
                            type="button"
                            onClick={() => setBusinessSocials(businessSocials.filter((_, i) => i !== index))}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    {businessSocials.length === 0 && (
                      <p className="text-xs text-neutral-400 italic ml-1">No social handles added yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {isOwnProfile && (
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-200"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save All Changes'}
          </button>
        )}
      </form>
    </div>
  );
}
