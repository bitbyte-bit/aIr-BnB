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

export interface Item {
  id: string;
  title: string;
  description: string;
  image_url: string;
  gallery?: string; // JSON string of image URLs
  custom_fields?: string; // JSON string of key-value pairs
  created_at: string;
  likes?: number;
  followers_count?: number;
  business_id?: number;
  business_name?: string;
  is_approved?: boolean;
  reviews?: Review[];
  average_rating?: number;
  subscription_status?: string;
  subscription_plan?: string;
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

export interface SocialHandle {
  platform: string;
  url: string;
}

export interface Comment {
  id: number;
  item_id: number;
  user_id: number;
  user_name: string;
  text: string;
  parent_id?: number | null;
  created_at: string;
}

export interface Review {
  id: number;
  item_id: number;
  user_id: number;
  user_name: string;
  user_avatar?: string;
  rating: number; // 1-5 stars
  text?: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: number;
  receiver_id: number;
  sender_name?: string;
  sender_avatar?: string;
  text: string;
  attachment?: string;
  is_read?: boolean;
  created_at: string;
}

export interface AnalyticsData {
  likesByDay: { date: string; count: number }[];
  totalUsers: number;
  totalItems: number;
  totalLikes: number;
}
