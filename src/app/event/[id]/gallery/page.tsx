"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Download, Share2, Heart, CheckCircle2, ArrowLeft, ImageOff, Sparkles } from "lucide-react";

export default function Gallery({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [photos, setPhotos] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    
    // Load matches from session storage
    const stored = sessionStorage.getItem(`matches-${id}`);
    if (stored) {
      setPhotos(JSON.parse(stored));
    }
    
    // Simulate loading effect
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [id]);

  const handleDownloadAll = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert("ZIP file download started!");
    }, 2000);
  };

  const handleShare = () => {
    const url = `${origin}/event/${id}`;
    if (navigator.share) {
      navigator.share({
        title: 'My Event Photos',
        text: 'Check out my photos from the event!',
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const handleNotMe = (photoId: string) => {
    console.log(`Feedback received: Photo ${photoId} is a false positive.`);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    const stored = sessionStorage.getItem(`matches-${id}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      const updated = parsed.filter((p: any) => p.id !== photoId);
      sessionStorage.setItem(`matches-${id}`, JSON.stringify(updated));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 py-4 px-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Link href={`/event/${id}`} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-lg text-slate-900">Your Photos</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Event: {id}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleShare}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-full font-medium text-sm transition-colors shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            Share Link
          </button>
          {photos.length > 0 && (
            <button 
              onClick={handleDownloadAll}
              disabled={downloading}
              className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-full font-medium text-sm transition-all shadow-md shadow-primary-600/20"
            >
              {downloading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{downloading ? "Preparing..." : "Download All"}</span>
              <span className="sm:hidden">{downloading ? "..." : "All"}</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {photos.length > 0 ? (
          <>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900">Found {photos.length} Matches! 🎉</h2>
                <p className="text-slate-500 mt-1">Our AI identified you in these moments.</p>
              </div>
              
              <div className="hidden md:flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                AI Verified
              </div>
            </div>

            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {photos.map((photo, index) => (
                <div 
                  key={photo.id} 
                  className={`relative group rounded-2xl overflow-hidden break-inside-avoid shadow-sm hover:shadow-xl transition-all duration-500 transform ${
                    loaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
                    <div className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-primary-700 shadow-sm border border-primary-100 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {photo.confidence}% Match
                    </div>
                    {photo.emotion && photo.emotion !== 'neutral' && (
                      <div className="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-pink-600 shadow-sm border border-pink-100 flex items-center gap-1">
                        {photo.emotion === 'happy' && '😄 Happy Moment'}
                        {photo.emotion === 'surprised' && '😲 Surprised'}
                        {photo.emotion === 'angry' && '😠 Intense'}
                        {photo.emotion === 'sad' && '🥺 Emotional'}
                        {photo.emotion === 'fearful' && '😨 Spooked'}
                        {photo.emotion === 'disgusted' && '😖 Eww'}
                        {photo.emotion === 'neutral' && ''}
                      </div>
                    )}
                  </div>
                  <img 
                    src={photo.url} 
                    alt={`Matched event photo ${index + 1}`} 
                    className="w-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-700 ease-out"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleNotMe(photo.id)}
                        title="Not Me"
                        className="w-10 h-10 bg-white/20 hover:bg-red-500/80 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-colors"
                      >
                        <span className="text-xs font-bold">✕</span>
                      </button>
                      <button className="w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-colors">
                        <Heart className="w-5 h-5" />
                      </button>
                    </div>
                    <a 
                      href={photo.url}
                      download
                      className="px-4 py-2 bg-white text-slate-900 font-medium rounded-full flex items-center gap-2 hover:bg-primary-50 hover:text-primary-600 transition-colors shadow-lg text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <ImageOff className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">No matches found yet</h2>
            <p className="text-slate-500 max-w-sm mb-8">
              We couldn't find your face in this event's photos. Try uploading a different selfie or check back later.
            </p>
            <Link 
              href={`/event/${id}`}
              className="px-6 py-3 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
            >
              Try Another Selfie
            </Link>
          </div>
        )}
        
        {photos.length > 0 && (
          <div className="mt-16 text-center pb-8">
            <p className="text-slate-400 text-sm">That's all we found! Hope you had a great time.</p>
          </div>
        )}
      </main>
    </div>
  );
}
