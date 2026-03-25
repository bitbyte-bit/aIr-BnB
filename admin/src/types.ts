export interface User {
  id: number;
  email: string;
  name: string;
  bio?: string;
  profile_picture?: string;
  role: 'user' | 'admin';
  status: 'active' | 'warned' | 'suspended' | 'banned';
  business_id?: number;
}

export interface BillingPlan {
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

export interface BusinessSubscription {
  id: number;
  business_id: number;
  plan_id: number;
  status: 'pending' | 'approved' | 'rejected';
  start_date?: string;
  end_date?: string;
  payment_link?: string;
  reference_code?: string;
  payment_proof_image?: string;
  created_at: string;
}

export interface Business {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  type: string;
  logo?: string;
  address?: string;
  contacts?: string;
  social_handles?: string;
  tel?: string;
  is_approved: boolean;
  followers_count?: number;
  created_at: string;
}

export interface AnalyticsData {
  likesByDay: { date: string; count: number }[];
  totalUsers: number;
  totalItems: number;
  totalLikes: number;
}

export interface UserDetails {
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

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  message: string;
}