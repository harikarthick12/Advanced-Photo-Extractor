"use client";

import { useState, use, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, UserRound, ArrowRight, Loader2, Image as ImageIcon, Search } from "lucide-react";
import Link from "next/link";
import { getFaceDescriptor, checkImageQuality } from "@/lib/face-api";

export default function GuestUpload({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [selfies, setSelfies] = useState({
    front: null as string | null,
    frontFile: null as File | null,
    left: null as string | null,
    right: null as string | null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    left: useRef<HTMLInputElement>(null),
    right: useRef<HTMLInputElement>(null),
  };

  const handleFileChange = (angle: "front" | "left" | "right", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelfies((prev) => ({ 
          ...prev, 
          [angle]: e.target?.result as string,
          [`${angle}File`]: file
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerInput = (angle: "front" | "left" | "right") => {
    fileInputRefs[angle].current?.click();
  };

  const removeSelfie = (angle: "front" | "left" | "right") => {
    setSelfies((prev) => ({ ...prev, [angle]: null, [`${angle}File`]: null }));
    if (fileInputRefs[angle].current) {
      fileInputRefs[angle].current.value = "";
    }
  };

  const canSubmit = selfies.front !== null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 6) return;
    
    setIsVerifying(true);
    setPinError(null);

    try {
      const response = await fetch(`/api/event/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });

      if (!response.ok) {
        throw new Error("Incorrect PIN. Please try again.");
      }

      setIsAuthorized(true);
    } catch (err: any) {
      setPinError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selfies.frontFile) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Get face descriptors from the selfies
      const descriptors = [];
      
      const frontDescriptor = await getFaceDescriptor(selfies.frontFile);
      if (!frontDescriptor) {
        throw new Error("No face detected in your front selfie. Please try again with a clearer photo.");
      }
      
      // Perform Blur & Quality Detection (Feature #4)
      // We need to create an image element to check the blur
      const img = new Image();
      img.src = selfies.front as string;
      await new Promise((resolve) => (img.onload = resolve));
      
      const quality = checkImageQuality(img, frontDescriptor);
      if (!quality.isGood) {
        throw new Error(quality.error || "Poor image quality");
      }
      
      descriptors.push(frontDescriptor);

      if (selfies.leftFile) {
        const leftDescriptor = await getFaceDescriptor(selfies.leftFile);
        if (leftDescriptor) descriptors.push(leftDescriptor);
      }

      if (selfies.rightFile) {
        const rightDescriptor = await getFaceDescriptor(selfies.rightFile);
        if (rightDescriptor) descriptors.push(rightDescriptor);
      }

      // 2. Call the match API
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: id,
          selfieDescriptors: descriptors,
          selfieImageBase64: selfies.front // Send to backend for Python ArcFace
        })
      });

      if (!response.ok) throw new Error("Failed to search for matches.");

      const data = await response.json();
      
      // 3. Store matches in session storage for the gallery to pick up
      sessionStorage.setItem(`matches-${id}`, JSON.stringify(data.matches));
      
      router.push(`/event/${id}/gallery`);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary-200/30 blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="w-8 h-8 text-primary-600 animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Analyzing your face...</h2>
          <p className="text-slate-500 max-w-sm text-center">
            Comparing your features with event photos using advanced AI.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center font-display font-bold">
            A
          </div>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Event: {id}</span>
        </div>
      </header>

      {!isAuthorized ? (
        <main className="flex-1 w-full max-w-md mx-auto p-6 py-20 flex flex-col items-center justify-center">
          <div className="bg-white w-full p-8 rounded-3xl shadow-sm border border-slate-200 text-center space-y-6">
            <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Camera className="w-8 h-8" />
            </div>
            
            <div>
              <h1 className="text-2xl font-display font-bold text-slate-900">Private Gallery</h1>
              <p className="text-sm text-slate-500 mt-2">Enter the 6-digit access PIN provided by your photographer to find your photos.</p>
            </div>

            {pinError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">
                {pinError}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="------"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full text-center text-3xl tracking-[1em] py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-bold text-slate-700 placeholder-slate-300"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={pin.length < 6 || isVerifying}
                className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
              >
                {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Access Gallery"}
              </button>
            </form>
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-3xl w-full mx-auto p-6 py-12 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">Let's find you!</h1>
          <p className="text-slate-600 max-w-lg mx-auto">
            Upload a clear front-facing selfie to start the search. Add profile shots for even better accuracy!
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Front Face (Required) */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs">1</span>
                Front Face <span className="text-red-500">*</span>
              </label>
              
              <div 
                onClick={() => !selfies.front && triggerInput("front")}
                className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all ${
                  selfies.front 
                    ? "border-primary-500 shadow-md" 
                    : "border-dashed border-slate-300 hover:border-primary-400 hover:bg-slate-50 cursor-pointer bg-white"
                }`}
              >
                {selfies.front ? (
                  <>
                    <img src={selfies.front} alt="Front selfie" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeSelfie("front"); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur text-slate-700 rounded-full flex items-center justify-center hover:bg-white hover:text-red-500 shadow-sm transition-colors"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <UserRound className="w-10 h-10 text-slate-400 mb-3" />
                    <p className="text-sm font-medium text-slate-700">Tap to upload</p>
                    <p className="text-xs text-slate-500 mt-1">Look straight at camera</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRefs.front} 
                  onChange={(e) => handleFileChange("front", e)} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Left Profile (Optional) */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs">2</span>
                Left Profile <span className="text-slate-400 font-normal text-xs">(Optional)</span>
              </label>
              
              <div 
                onClick={() => !selfies.left && triggerInput("left")}
                className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all ${
                  selfies.left 
                    ? "border-primary-500 shadow-md" 
                    : "border-dashed border-slate-300 hover:border-primary-400 hover:bg-slate-50 cursor-pointer bg-white"
                }`}
              >
                {selfies.left ? (
                  <>
                    <img src={selfies.left} alt="Left profile selfie" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeSelfie("left"); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur text-slate-700 rounded-full flex items-center justify-center hover:bg-white hover:text-red-500 shadow-sm transition-colors"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <UserRound className="w-10 h-10 text-slate-400 mb-3" />
                    <p className="text-sm font-medium text-slate-700">Tap to upload</p>
                    <p className="text-xs text-slate-500 mt-1">Look left</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRefs.left} 
                  onChange={(e) => handleFileChange("left", e)} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Right Profile (Optional) */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs">3</span>
                Right Profile <span className="text-slate-400 font-normal text-xs">(Optional)</span>
              </label>
              
              <div 
                onClick={() => !selfies.right && triggerInput("right")}
                className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all ${
                  selfies.right 
                    ? "border-primary-500 shadow-md" 
                    : "border-dashed border-slate-300 hover:border-primary-400 hover:bg-slate-50 cursor-pointer bg-white"
                }`}
              >
                {selfies.right ? (
                  <>
                    <img src={selfies.right} alt="Right profile selfie" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeSelfie("right"); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur text-slate-700 rounded-full flex items-center justify-center hover:bg-white hover:text-red-500 shadow-sm transition-colors"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <UserRound className="w-10 h-10 text-slate-400 mb-3" />
                    <p className="text-sm font-medium text-slate-700">Tap to upload</p>
                    <p className="text-xs text-slate-500 mt-1">Look right</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRefs.right} 
                  onChange={(e) => handleFileChange("right", e)} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-8 border-t border-slate-200">
            <button
              type="submit"
              disabled={!canSubmit || isProcessing}
              className="px-10 py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-full font-medium text-lg transition-all flex items-center gap-2 group shadow-lg shadow-primary-600/20 disabled:shadow-none"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {isProcessing ? "Processing..." : "Find My Photos"}
              {!isProcessing && canSubmit && <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </form>
      </main>
      )}
    </div>
  );
}
