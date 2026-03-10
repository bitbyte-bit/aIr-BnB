import React, { useState, useRef, useEffect } from 'react';
import { Camera, Save, User as UserIcon, Briefcase, MapPin, Phone, Globe, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { User, Business } from '../types';

export default function Profile({ user, onUpdate }: { user: User; onUpdate: (user: User) => void }) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [profilePicture, setProfilePicture] = useState(user.profile_picture || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Business state
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');
  const [businessLogo, setBusinessLogo] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessContacts, setBusinessContacts] = useState('');
  const [businessSocials, setBusinessSocials] = useState('');
  const [businessTel, setBusinessTel] = useState('');
  const businessLogoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user.business_id) {
      fetchBusiness();
    }
  }, [user.business_id]);

  const fetchBusiness = async () => {
    try {
      const res = await fetch(`/api/businesses/my/${user.id}`);
      const data = await res.json();
      if (data) {
        setBusiness(data);
        setBusinessName(data.name);
        setBusinessDesc(data.description);
        setBusinessLogo(data.logo || '');
        setBusinessAddress(data.address || '');
        setBusinessContacts(data.contacts || '');
        setBusinessSocials(data.social_handles || '');
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
    setLoading(true);

    try {
      // Update User Profile
      const userRes = await fetch(`/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, profile_picture: profilePicture }),
      });

      // Update Business Profile if applicable
      if (business) {
        await fetch(`/api/businesses/${business.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: businessName, 
            description: businessDesc, 
            logo: businessLogo,
            address: businessAddress,
            contacts: businessContacts,
            social_handles: businessSocials,
            tel: businessTel
          }),
        });
      }

      if (userRes.ok) {
        onUpdate({ ...user, name, bio, profile_picture: profilePicture });
        alert('Profile updated successfully!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 pb-20">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-neutral-500">Manage your public information</p>
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
              >
                <Camera size={20} />
              </button>
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
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
                <p className="text-sm text-neutral-500">Manage your business details</p>
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
                <button
                  type="button"
                  onClick={() => businessLogoRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
                >
                  <Camera size={20} />
                </button>
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
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Description</label>
                <textarea
                  value={businessDesc}
                  onChange={(e) => setBusinessDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe your business..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <MapPin size={14} /> Address
                  </label>
                  <input
                    type="text"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Physical location"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Phone size={14} /> Telephone
                  </label>
                  <input
                    type="tel"
                    value={businessTel}
                    onChange={(e) => setBusinessTel(e.target.value)}
                    placeholder="Business phone"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Mail size={14} /> Contacts
                  </label>
                  <input
                    type="text"
                    value={businessContacts}
                    onChange={(e) => setBusinessContacts(e.target.value)}
                    placeholder="Email or other contacts"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Globe size={14} /> Socials
                  </label>
                  <input
                    type="text"
                    value={businessSocials}
                    onChange={(e) => setBusinessSocials(e.target.value)}
                    placeholder="Social media handles"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-200"
        >
          <Save size={20} />
          {loading ? 'Saving...' : 'Save All Changes'}
        </button>
      </form>
    </div>
  );
}
