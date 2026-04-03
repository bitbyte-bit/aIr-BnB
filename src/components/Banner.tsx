import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, MessageCircle } from 'lucide-react';

export interface BannerData {
  id: string;
  type: 'update' | 'welcome';
  title: string;
  message: string;
  backgroundColor: string;
  textColor: string;
  buttonText?: string;
  buttonUrl?: string;
  isActive: boolean;
  createdAt: string;
}

interface BannerProps {
  banner: BannerData;
  onClose: () => void;
  onInstallUpdate?: () => void;
  onChat?: () => void;
}

export default function Banner({ banner, onClose, onInstallUpdate, onChat }: BannerProps) {
  const handleButtonClick = () => {
    if (banner.type === 'update' && onInstallUpdate) {
      onInstallUpdate();
    } else if (banner.type === 'welcome' && banner.buttonUrl) {
      window.open(banner.buttonUrl, '_blank');
    } else if (banner.type === 'welcome' && onChat) {
      onChat();
    }
  };

  const getIcon = () => {
    switch (banner.type) {
      case 'update':
        return <Download className="w-6 h-6" />;
      case 'welcome':
        return <MessageCircle className="w-6 h-6" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="relative z-50"
      style={{ backgroundColor: banner.backgroundColor, color: banner.textColor }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 p-2 rounded-lg bg-black/10">
              {getIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">{banner.title}</h3>
              <p className="text-xs opacity-90 truncate">{banner.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {banner.buttonText && (
              <button
                onClick={handleButtonClick}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-black/10 hover:bg-black/20 transition-colors"
              >
                {banner.buttonText}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}