"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, ArrowRight, Camera, X } from "lucide-react";
import Link from "next/link";
import { Scanner } from '@yudiel/react-qr-scanner';

export default function GuestEntry() {
  const [eventId, setEventId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventId.trim()) {
      router.push(`/event/${eventId.trim()}`);
    }
  };

  const handleScan = (result: any) => {
    if (result && result.length > 0 && result[0].rawValue) {
      const url = result[0].rawValue;
      // Extract event ID from URL (e.g. http://localhost:3000/event/abc1234)
      // Or if it's just raw text, use it directly
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const id = pathParts[pathParts.length - 1];
        if (id) {
          router.push(`/event/${id}`);
          setIsScanning(false);
        }
      } catch (e) {
        // Not a URL, maybe just the raw ID
        router.push(`/event/${url}`);
        setIsScanning(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-100/40 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-100/50 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 text-white rounded-xl font-display font-bold text-2xl shadow-lg shadow-primary-500/30 mb-6">
            A
          </Link>
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">Find Your Photos</h1>
          <p className="text-slate-500">Enter the event code or scan the QR from the photographer to get started.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/50 space-y-6">
          {isScanning ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-slate-900">Scan QR Code</h3>
                <button 
                  onClick={() => setIsScanning(false)}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-xl overflow-hidden bg-black border-2 border-slate-200">
                <Scanner 
                  onScan={handleScan}
                  components={{
                    onOff: true,
                    torch: true,
                    zoom: true,
                    finder: true,
                  }}
                />
              </div>
              <p className="text-xs text-center text-slate-500">Point your camera at the Photographer's screen.</p>
            </div>
          ) : (
            <>
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label htmlFor="eventId" className="block text-sm font-medium text-slate-700 mb-2">
                    Event ID
                  </label>
                  <div className="relative">
                    <input
                      id="eventId"
                      type="text"
                      placeholder="e.g. demo123"
                      value={eventId}
                      onChange={(e) => setEventId(e.target.value)}
                      className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-mono text-lg tracking-wide uppercase"
                    />
                    <button 
                      type="submit"
                      disabled={!eventId.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">or</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button 
                onClick={() => setIsScanning(true)}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 group"
              >
                <QrCode className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
                Scan QR Code
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-8 flex items-center justify-center gap-1">
          <Camera className="w-4 h-4" />
          Powered by APE AI
        </p>
      </div>
    </div>
  );
}
