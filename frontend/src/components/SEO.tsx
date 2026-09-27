import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  googleVerification?: string;
}

export const SEO: React.FC<SEOProps> = ({ 
  title = "Top3 — O'zbekiston .uz saytlari uchun reyting", 
  description = "Pul to'lang — tepaga chiqing. O'zbekistonning har bir sayti bitta ro'yxatda.",
  canonical = window.location.href,
  googleVerification
}) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {googleVerification && (
        <meta name="google-site-verification" content={googleVerification} />
      )}
    </Helmet>
  );
};
