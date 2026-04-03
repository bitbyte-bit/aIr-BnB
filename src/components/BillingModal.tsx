import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Crown, Zap, Star, ExternalLink, Loader2, Camera } from 'lucide-react';
import { useToast } from './Toast';
import { useCurrency } from '../context/CurrencyContext';

interface BillingPlan {
  id: number;
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  lifetime_price: number;
  features: string;
  monthly_payment_link?: string;
  yearly_payment_link?: string;
  lifetime_payment_link?: string;
}

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: number;
  businessName: string;
  itemCount: number;
  totalLikes: number;
}

export default function BillingModal({ isOpen, onClose, businessId, businessName, itemCount, totalLikes }: BillingModalProps) {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<'monthly' | 'yearly' | 'lifetime'>('monthly');
  const [subscribing, setSubscribing] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [paymentProof, setPaymentProof] = useState<string>('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [showProofUpload, setShowProofUpload] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      setCurrentSubscription(null);
      setShowProofUpload(false);
      setPaymentProof('');
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    setSubscribing(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan?.id,
          duration: selectedDuration
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentSubscription(data);
        setShowProofUpload(true);
        showToast(`Subscription created! Reference Code: ${data.reference_code}. Please make payment and upload your payment proof image for verification.`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to create subscription', 'error');
      }
    } catch (err) {
      console.error('Failed to subscribe:', err);
      showToast('Failed to create subscription. Please try again.', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const handleUploadProof = async () => {
    if (!currentSubscription || !paymentProof) return;
    setUploadingProof(true);
    try {
      const res = await fetch(`/api/subscriptions/${currentSubscription?.id}/payment-proof`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_proof_image: paymentProof })
      });

      if (res.ok) {
        showToast('Payment proof uploaded successfully! Your subscription is pending admin approval.', 'success');
        onClose();
      } else {
        showToast('Failed to upload payment proof', 'error');
      }
    } catch (err) {
      console.error('Failed to upload proof:', err);
      alert('Failed to upload payment proof. Please try again.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getPaymentLink = (plan: BillingPlan) => {
    if (selectedDuration === 'monthly') return plan.monthly_payment_link;
    if (selectedDuration === 'yearly') return plan.yearly_payment_link;
    return plan.lifetime_payment_link;
  };

  const getPrice = (plan: BillingPlan) => {
    if (selectedDuration === 'monthly') return plan.monthly_price;
    if (selectedDuration === 'yearly') return plan.yearly_price;
    return plan.lifetime_price;
  };

  const { formatCurrency } = useCurrency();

  const getDiscount = () => {
    if (selectedDuration === 'yearly') return 10;
    if (selectedDuration === 'lifetime') return 40;
    return 0;
  };

  const getPlanIcon = (planName: string) => {
    if (planName === 'Lifetime') return <Crown size={24} />;
    if (planName === 'Standard') return <Zap size={24} />;
    return <Star size={24} />;
  };

  const getPlanColor = (planName: string) => {
    if (planName === 'Lifetime') return 'bg-gradient-to-br from-purple-500 to-purple-700 text-white';
    if (planName === 'Standard') return 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white';
    return 'bg-gradient-to-br from-blue-500 to-blue-700 text-white';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="relative p-8 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/80 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="text-center">
                <h2 className="text-3xl font-black tracking-tight mb-2">Upgrade Your Business! 🚀</h2>
                <p className="text-emerald-100">
                  {businessName} has grown to {itemCount} items and {totalLikes} likes! 
                  Choose a plan to continue growing.
                </p>
              </div>
            </div>

            {/* Duration Selection */}
            <div className="p-6 border-b border-neutral-100">
              <div className="flex justify-center gap-2">
                {(['monthly', 'yearly', 'lifetime'] as const).map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                      selectedDuration === duration
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {duration === 'monthly' && 'Monthly'}
                    {duration === 'yearly' && `Yearly (-${getDiscount()}%)`}
                    {duration === 'lifetime' && 'Lifetime (-40%)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Plans */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={40} className="animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  {plans.map((plan) => (
                    <motion.div
                      key={plan.id}
                      whileHover={{ scale: 1.02 }}
                      className={`relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedPlan?.id === plan.id
                          ? 'border-emerald-500 shadow-xl'
                          : 'border-neutral-200 hover:border-emerald-300'
                      }`}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      {plan.name === 'Standard' && (
                        <div className="absolute top-0 inset-x-0 bg-emerald-500 text-white text-center py-1 text-xs font-bold">
                          MOST POPULAR
                        </div>
                      )}
                      {plan.name === 'Lifetime' && (
                        <div className="absolute top-0 inset-x-0 bg-purple-500 text-white text-center py-1 text-xs font-bold">
                          BEST VALUE
                        </div>
                      )}

                      <div className={`p-6 ${getPlanColor(plan.name)}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {getPlanIcon(plan.name)}
                          <h3 className="text-xl font-black">{plan.name}</h3>
                        </div>
                        <p className="text-sm opacity-80">{plan.description}</p>
                      </div>

                      <div className="p-6 bg-white">
                        <div className="text-center mb-4">
                          <span className="text-3xl font-black text-neutral-900">
                            {formatCurrency(getPrice(plan))}
                          </span>
                          {selectedDuration !== 'lifetime' && (
                            <span className="text-neutral-500 text-sm">/{selectedDuration === 'monthly' ? 'month' : 'year'}</span>
                          )}
                        </div>

                        <ul className="space-y-3 mb-6">
                          {(() => {
                            try {
                              return JSON.parse(plan.features || '[]');
                            } catch (e) {
                              return [];
                            }
                          })().map((feature: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                              <Check size={16} className="text-emerald-500 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlan(plan);
                          }}
                          className={`w-full py-3 rounded-xl font-bold transition-all ${
                            selectedPlan?.id === plan.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          }`}
                        >
                          {selectedPlan?.id === plan.id ? 'Selected' : 'Select Plan'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-neutral-100 bg-neutral-50">
              {showProofUpload && currentSubscription ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="font-bold text-emerald-800 mb-2">Subscription Created!</p>
                    <p className="text-sm text-emerald-700">
                      Reference Code: <span className="font-mono font-bold">{currentSubscription.reference_code}</span>
                    </p>
                    {selectedPlan && getPaymentLink(selectedPlan) && (
                      <a 
                        href={getPaymentLink(selectedPlan)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-800 mt-2"
                      >
                        Open Payment Link <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">
                      Upload Payment Proof Image
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <div className="px-4 py-3 border-2 border-dashed border-neutral-300 rounded-xl text-center hover:border-emerald-500 transition-colors">
                          {paymentProof ? (
                            <img src={paymentProof} alt="Payment proof" className="max-h-32 mx-auto rounded-lg" />
                          ) : (
                            <div className="text-neutral-500">
                              <Camera size={24} className="mx-auto mb-1" />
                              <span className="text-sm">Click to upload proof</span>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleUploadProof}
                    disabled={!paymentProof || uploadingProof}
                    className="w-full px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {uploadingProof ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        Submit for Approval
                        <Check size={20} />
                      </>
                    )}
                  </button>
                  <p className="text-xs text-neutral-400 text-center">
                    Your subscription will be activated after admin approval.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-500">
                        Selected: <span className="font-bold text-neutral-900">{selectedPlan?.name || 'None'}</span>
                      </p>
                      {selectedPlan && (
                        <p className="text-lg font-black text-emerald-600">
                          {formatCurrency(getPrice(selectedPlan))}
                          {selectedDuration !== 'lifetime' && `/${selectedDuration === 'monthly' ? 'mo' : 'yr'}`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleSubscribe}
                      disabled={!selectedPlan || subscribing}
                      className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-emerald-200"
                    >
                      {subscribing ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Subscribe Now
                          <ExternalLink size={20} />
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400 text-center mt-4">
                    By subscribing, you agree to our terms of service. Payment links will be generated after subscription.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
