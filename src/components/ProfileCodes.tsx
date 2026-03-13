import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Copy, QrCode, Hash, Barcode, Check, Share2 } from 'lucide-react';

interface ProfileCodesProps {
  isOpen: boolean;
  onClose: () => void;
  profileType: 'user' | 'business';
  profileId: number;
  profileName: string;
  profileUrl?: string;
}

export default function ProfileCodes({ isOpen, onClose, profileType, profileId, profileName, profileUrl }: ProfileCodesProps) {
  const [activeTab, setActiveTab] = useState<'qr' | 'barcode' | 'reference'>('qr');
  const [copied, setCopied] = useState(false);
  const barcodeRef = useRef<SVGSVGElement>(null);

  // Generate reference code based on profile type and ID
  const referenceCode = profileType === 'business' 
    ? `VITU-BIZ-${profileId.toString().padStart(6, '0')}`
    : `VITU-USR-${profileId.toString().padStart(6, '0')}`;

  // Profile URL for QR code
  const profileLink = profileUrl || (profileType === 'business' 
    ? `${window.location.origin}/business/${profileId}`
    : `${window.location.origin}/profile/${profileId}`);

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(referenceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = (type: 'qr' | 'barcode') => {
    let svgData = '';
    let filename = '';

    if (type === 'qr') {
      const qrContainer = document.getElementById('qr-code-download');
      if (qrContainer) {
        svgData = new XMLSerializer().serializeToString(qrContainer.querySelector('svg')!);
        filename = `vitu-${profileType}-${profileId}-qr.svg`;
      }
    } else if (type === 'barcode') {
      if (barcodeRef.current) {
        svgData = new XMLSerializer().serializeToString(barcodeRef.current);
        filename = `vitu-${profileType}-${profileId}-barcode.svg`;
      }
    }

    if (svgData) {
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Simple barcode-like pattern using SVG (Code 128 style representation)
  const renderBarcode = () => {
    const bars = [];
    const code = referenceCode;
    const barWidth = 3;
    const height = 80;
    
    // Generate pseudo-random bars based on the reference code
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const numBars = (charCode % 5) + 3;
      
      for (let j = 0; j < numBars; j++) {
        const isBlack = (charCode + j) % 2 === 0;
        bars.push(
          <rect
            key={`${i}-${j}`}
            x={i * 15 + j * barWidth}
            y={0}
            width={barWidth}
            height={height}
            fill={isBlack ? '#000' : '#fff'}
          />
        );
      }
    }

    return (
      <svg 
        ref={barcodeRef}
        width={code.length * 15 + 20} 
        height={height + 20}
        className="bg-white p-2"
        viewBox={`0 0 ${code.length * 15 + 20} ${height + 20}`}
      >
        <rect width="100%" height="100%" fill="white" />
        <g transform="translate(10, 10)">
          {bars}
        </g>
        <text 
          x={(code.length * 15) / 2} 
          y={height + 15} 
          textAnchor="middle" 
          fontSize="12" 
          fontFamily="monospace"
        >
          {code}
        </text>
      </svg>
    );
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
            className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-900">
                {profileName}'s Profile Codes
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-100">
              <button
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'qr' 
                    ? 'text-emerald-600 border-b-2 border-emerald-600' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <QrCode size={18} />
                QR Code
              </button>
              <button
                onClick={() => setActiveTab('barcode')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'barcode' 
                    ? 'text-emerald-600 border-b-2 border-emerald-600' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Barcode size={18} />
                Barcode
              </button>
              <button
                onClick={() => setActiveTab('reference')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'reference' 
                    ? 'text-emerald-600 border-b-2 border-emerald-600' 
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Hash size={18} />
                Reference
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'qr' && (
                <div className="flex flex-col items-center">
                  <div id="qr-code-download" className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-inner mb-4">
                    <QRCodeSVG
                      value={profileLink}
                      size={200}
                      level="H"
                      includeMargin
                      fgColor="#000000"
                    />
                  </div>
                  <p className="text-sm text-neutral-500 text-center mb-4">
                    Scan to view {profileType === 'business' ? 'business' : 'user'} profile
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => handleDownload('qr')}
                      className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={18} />
                      Download
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 py-3 bg-neutral-100 text-neutral-900 font-bold rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'barcode' && (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-inner mb-4 overflow-x-auto">
                    {renderBarcode()}
                  </div>
                  <p className="text-sm text-neutral-500 text-center mb-4">
                    Use this barcode to reference {profileType === 'business' ? 'the business' : 'the user'}
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => handleDownload('barcode')}
                      className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={18} />
                      Download
                    </button>
                    <button
                      onClick={handleCopyReference}
                      className="flex-1 py-3 bg-neutral-100 text-neutral-900 font-bold rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'reference' && (
                <div className="flex flex-col items-center">
                  <div className="w-full bg-neutral-50 p-6 rounded-2xl border border-neutral-200 mb-4">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 text-center">
                      Reference Code
                    </p>
                    <p className="text-2xl font-black text-neutral-900 text-center tracking-wider font-mono">
                      {referenceCode}
                    </p>
                  </div>
                  <p className="text-sm text-neutral-500 text-center mb-4">
                    Share this code with users to find your {profileType === 'business' ? 'business' : 'profile'}
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={handleCopyReference}
                      className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                      {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 py-3 bg-neutral-100 text-neutral-900 font-bold rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 size={18} />
                      Share Link
                    </button>
                  </div>
                  
                  <div className="mt-6 w-full bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-800 font-medium text-center">
                      🎉 Give this code to users who can enter it for a FREE month of {profileType === 'business' ? 'business' : 'premium'} features!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
