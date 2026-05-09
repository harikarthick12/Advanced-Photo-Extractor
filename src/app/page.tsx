"use client";

import Link from "next/link";
import { Camera, Search, ScanFace, Sparkles, Aperture, Focus } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const ParticleBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#f8fafc]">
      {/* Light leaks / Soft bokeh for photography feel */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary-200/40 blur-[100px]"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-200/40 blur-[120px]"
        animate={{
          x: [0, -50, 0],
          y: [0, -30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating Photography Elements (Clear and Visible) */}
      <motion.div
        className="absolute top-[20%] left-[15%] text-slate-300/60"
        animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Aperture size={120} strokeWidth={1} />
      </motion.div>

      <motion.div
        className="absolute bottom-[25%] left-[10%] text-primary-300/50"
        animate={{ y: [0, 30, 0], rotate: [0, -15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      >
        <Focus size={80} strokeWidth={1} />
      </motion.div>

      <motion.div
        className="absolute top-[15%] right-[15%] text-slate-300/60"
        animate={{ y: [0, 25, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      >
        <Camera size={100} strokeWidth={1} />
      </motion.div>

      <motion.div
        className="absolute bottom-[20%] right-[20%] text-primary-300/50"
        animate={{ y: [0, -25, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      >
        <Aperture size={90} strokeWidth={1} />
      </motion.div>

      {/* Grid Pattern overlay for a subtle 'lens grid' / 'viewfinder' feel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
    </div>
  );
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative text-slate-900 selection:bg-primary-500/30 font-sans">
      <ParticleBackground />

      {/* Navigation */}
      <header className="relative z-10 py-6 px-6 md:px-12 flex justify-between items-center w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white border border-slate-200 shadow-md rounded-2xl flex items-center justify-center">
            <Camera size={22} className="text-primary-600" />
          </div>
          <span className="font-bold text-2xl tracking-widest text-slate-800">
            APE
          </span>
        </div>
        <nav className="flex items-center gap-8">
          <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-primary-600 transition-all hover:scale-105">
            Photographer Portal
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 md:px-12 max-w-5xl mx-auto w-full pb-32">
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-medium mb-10 shadow-sm"
          >
            <Sparkles size={14} className="text-primary-500" />
            <span>AI-Powered Subject Retrieval</span>
          </motion.div>

          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-8 leading-[1.1] text-slate-900">
            Find Your <br/>
            <span 
              className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-accent-500 to-primary-600" 
              style={{ backgroundSize: '200% auto', animation: 'gradient 6s linear infinite' }}
            >
              Memories.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Upload a selfie and let our AI retrieve every moment you were captured. Effortlessly simple.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
            <Link 
              href="/event" 
              className="group relative w-full sm:w-auto px-10 py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-full font-semibold text-lg transition-all hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-3 overflow-hidden shadow-primary-600/30 shadow-lg"
            >
              <Search className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Find My Photos</span>
            </Link>
            
            <Link 
              href="/dashboard" 
              className="w-full sm:w-auto px-10 py-5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-full font-medium text-lg transition-all flex items-center justify-center gap-3 shadow-sm hover:-translate-y-1 hover:shadow-md"
            >
              <ScanFace className="w-5 h-5 text-slate-500" />
              <span>Photographer Access</span>
            </Link>
          </div>
        </motion.div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}} />
    </div>
  );
}
