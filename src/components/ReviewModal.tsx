import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Send, User } from 'lucide-react';
import { Item, Review, User as UserType } from '../types';

interface ReviewModalProps {
  item: Item | null;
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReviewModal({ item, user, isOpen, onClose }: ReviewModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      fetchReviews();
    }
  }, [isOpen, item]);

  const fetchReviews = async () => {
    if (!item) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${item.id}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setAverageRating(data.average_rating);
        setTotalReviews(data.total_reviews);
        
        // Check if current user has already reviewed
        const userReview = data.reviews.find((r: Review) => r.user_id === user.id);
        if (userReview) {
          setExistingReview(userReview);
          setUserRating(userReview.rating);
          setReviewText(userReview.text || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || userRating === 0) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/items/${item.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          rating: userRating,
          text: reviewText
        })
      });
      
      if (res.ok) {
        const newReview = await res.json();
        if (existingReview) {
          setReviews(prev => prev.map(r => r.id === existingReview.id ? newReview : r));
        } else {
          setReviews(prev => [newReview, ...prev]);
        }
        setExistingReview(newReview);
        
        // Update average rating
        const avgRes = await fetch(`/api/items/${item.id}/reviews`);
        if (avgRes.ok) {
          const data = await avgRes.json();
          setAverageRating(data.average_rating);
          setTotalReviews(data.total_reviews);
        }
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate?.(star)}
            className={`${interactive ? 'cursor-pointer' : 'cursor-default'} transition-transform hover:scale-110`}
          >
            <Star
              size={interactive ? 32 : 20}
              className={`${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-neutral-200 text-neutral-200'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
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
            className="bg-white rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="relative p-6 border-b border-neutral-100">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-neutral-100 flex-shrink-0">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">{item.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center">
                      {renderStars(Math.round(averageRating))}
                    </div>
                    <span className="text-sm text-neutral-500">
                      {averageRating.toFixed(1)} ({totalReviews} reviews)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Write Review Form */}
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-3">
                  {existingReview ? 'Update Your Review' : 'Write a Review'}
                </h3>
                
                <form onSubmit={handleSubmitReview}>
                  <div className="flex justify-center mb-4">
                    {renderStars(userRating, true, setUserRating)}
                  </div>
                  
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience with this product..."
                    className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    rows={3}
                  />
                  
                  <button
                    type="submit"
                    disabled={userRating === 0 || isSubmitting}
                    className="w-full mt-3 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={18} />
                        {existingReview ? 'Update Review' : 'Submit Review'}
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  Reviews ({totalReviews})
                </h3>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400">
                    <p>No reviews yet. Be the first to review!</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-2xl p-4 border border-neutral-100">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 overflow-hidden flex-shrink-0">
                          {review.user_avatar ? (
                            <img
                              src={review.user_avatar}
                              alt={review.user_name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-400">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-neutral-900">{review.user_name}</span>
                            <span className="text-xs text-neutral-400">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center mb-2">
                            {renderStars(review.rating)}
                          </div>
                          {review.text && (
                            <p className="text-sm text-neutral-600 leading-relaxed">{review.text}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
