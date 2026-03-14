import { useEffect } from 'react';

interface OpenGraphMetaProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  siteName?: string;
  locale?: string;
}

export default function OpenGraphMeta({
  title = 'Vitu - Business Showcase',
  description = 'Discover amazing businesses and products on Vitu',
  image = '/assets/logo.png',
  url,
  type = 'website',
  siteName = 'Vitu',
  locale = 'en_US',
}: OpenGraphMetaProps) {
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper function to update or create meta tags
    const updateMetaTag = (property: string, content: string, isProperty = true) => {
      const selector = isProperty 
        ? `meta[property="${property}"]` 
        : `meta[name="${property}"]`;
      
      let meta = document.querySelector(selector) as HTMLMetaElement | null;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (isProperty) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Open Graph tags
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', image);
    updateMetaTag('og:url', currentUrl);
    updateMetaTag('og:type', type);
    updateMetaTag('og:site_name', siteName);
    updateMetaTag('og:locale', locale);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image', false);
    updateMetaTag('twitter:title', title, false);
    updateMetaTag('twitter:description', description, false);
    updateMetaTag('twitter:image', image, false);

    // Fallback for Twitter URL
    updateMetaTag('twitter:url', currentUrl, false);

    // Cleanup function - optional: restore original meta on unmount
    return () => {
      // Optionally restore defaults, but usually we keep the last state
    };
  }, [title, description, image, currentUrl, type, siteName, locale]);

  // This component doesn't render anything
  return null;
}
