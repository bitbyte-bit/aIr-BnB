import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, CheckCircle, AlertTriangle, Plus, Image, FileText, Phone, MapPin, BarChart2, Briefcase } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function BusinessDocuments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState({
    nationalIdFront: null as File | null,
    nationalIdBack: null as File | null,
    ninNumber: null as File | null,
    businessLogo: null as File | null,
    location: null as File | null,
    businessType: null as File | null,
    ownersPic: null as File | null,
    telephone: null as File | null,
    alternativePhoneNumber: null as File | null,
  });
  
  const [previews, setPreviews] = useState({
    nationalIdFront: '',
    nationalIdBack: '',
    ninNumber: '',
    businessLogo: '',
    location: '',
    businessType: '',
    ownersPic: '',
    telephone: '',
    alternativePhoneNumber: '',
  });
  
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      setUserId(parsed.id);
    } else {
      navigate('/auth');
    }
  }, [navigate]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof documents) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, [field]: 'Only JPEG/PNG files are allowed' }));
        return;
      }
      setDocuments(prev => ({ ...prev, [field]: file }));
      setErrors(prev => ({ ...prev, [field]: '' }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setDocuments(prev => ({ ...prev, [field]: null }));
      setPreviews(prev => ({ ...prev, [field]: '' }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setLoading(true);
    setErrors({});
    
    try {
      const formData = new FormData();
      formData.append('userId', userId.toString());
      
      // Append each document if exists
      const fields = [
        'nationalIdFront',
        'nationalIdBack', 
        'ninNumber',
        'businessLogo',
        'location',
        'businessType',
        'ownersPic',
        'telephone',
        'alternativePhoneNumber'
      ];
      
      fields.forEach(field => {
        if (documents[field]) {
          formData.append(field, documents[field]);
        }
      });
      
      const res = await fetch('/api/business/upload-documents', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok) {
        showToast('Documents uploaded successfully!', 'success');
        // Redirect to business dashboard or home
        navigate('/business');
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          showToast(data.error || 'Failed to upload documents', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  if (!userId) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-emerald-50">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tighter text-emerald-600 mb-2">Vitu</h1>
          <p className="text-neutral-500 font-medium">Upload Business Documents</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900">Identity Documents</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">National ID (Front)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'nationalIdFront')}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                  {previews.nationalIdFront && (
                    <img src={previews.nationalIdFront} alt="National ID Front Preview" className="absolute left-0 top-0 h-16 w-16 object-cover rounded-lg border-2 border-emerald-500" />
                  )}
                  {errors.nationalIdFront && (
                    <p className="mt-1 text-red-500 text-xs">{errors.nationalIdFront}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">National ID (Back)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'nationalIdBack')}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                  {previews.nationalIdBack && (
                    <img src={previews.nationalIdBack} alt="National ID Back Preview" className="absolute left-0 top-0 h-16 w-16 object-cover rounded-lg border-2 border-emerald-500" />
                  )}
                  {errors.nationalIdBack && (
                    <p className="mt-1 text-red-500 text-xs">{errors.nationalIdBack}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900">Business Documents</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">NIN Number</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'ninNumber')}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                  {previews.ninNumber && (
                    <img src={previews.ninNumber} alt="NIN Number Preview" className="absolute left-0 top-0 h-16 w-16 object-cover rounded-lg border-2 border-emerald-500" />
                  )}
                  {errors.ninNumber && (
                    <p className="mt-1 text-red-500 text-xs">{errors.ninNumber}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Business Logo</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'businessLogo')}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                  {previews.businessLogo && (
                    <img src={previews.businessLogo} alt="Business Logo Preview" className="absolute left-0 top-0 h-16 w-16 object-cover rounded-lg border-2 border-emerald-500" />
                  )}
                  {errors.businessLogo && (
                    <p className="mt-1 text-red-500 text-xs">{errors.businessLogo}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900">Business Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Location</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'location')}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                  {previews.location && (
                    <img src={previews.location} alt="Location Preview" className="absolute left-0 top-0 h-16 w-16 object-cover rounded-lg border-2 border-emerald-500" />
                  )}
                  {errors.location && (
                    <p className="mt-1 text-red-500 text-xs">{errors.location}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Business Type</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'businessType')}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                  {previews.businessType && (
                    <img src={previews.businessType} alt="Business Type Preview" className="absolute left-0 top-0 h-16 w-16 object-cover rounded-lg border-2 border-emerald-500" />
                  )}
                  {errors.businessType && (
                    <p className="mt-1 text-red-500 text-xs">{errors.businessType}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900">Owner & Contact</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Owner's Picture</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'ownersPic')}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                  {previews.ownersPic && (
                    <img src={previews.ownersPic} alt="Owner's Picture Preview" className="absolute left-0 top-0 h-16 w-16 object-cover rounded-lg border-2 border-emerald-500" />
                  )}
                  {errors.ownersPic && (
                    <p className="mt-1 text-red-500 text-xs">{errors.ownersPic}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Telephone</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'telephone')}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                  {previews.telephone && (
                    <img src={previews.telephone} alt="Telephone Preview" className="absolute left-0 top-0 h-16 w-16 object-cover rounded-lg border-2 border-emerald-500" />
                  )}
                  {errors.telephone && (
                    <p className="mt-1 text-red-500 text-xs">{errors.telephone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900">Alternative Contact</h2>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Alternative Phone Number</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'alternativePhoneNumber')}
                  className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
                {previews.alternativePhoneNumber && (
                  <img src={previews.alternativePhoneNumber} alt="Alternative Phone Number Preview" className="absolute left-0 top-0 h-16 w-16 object-cover rounded-lg border-2 border-emerald-500" />
                )}
                {errors.alternativePhoneNumber && (
                  <p className="mt-1 text-red-500 text-xs">{errors.alternativePhoneNumber}</p>
                )}
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 active:scale-[0.98] transition-all"
          >
            {loading ? 'Uploading...' : 'Submit Documents'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-neutral-500">
          <p>Allowed file types: JPEG, PNG</p>
          <p>Maximum file size: 50 MB</p>
        </div>
      </div>
    </div>
  );
}