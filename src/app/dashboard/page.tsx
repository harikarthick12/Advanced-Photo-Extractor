"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, CheckCircle2, Copy, QrCode as QrCodeIcon, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { getMultipleFaceDescriptors } from "@/lib/face-api";
import QRCode from "react-qr-code";

export default function Dashboard() {
  const [eventName, setEventName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventPin, setEventPin] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [originUrl, setOriginUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOriginUrl(window.location.origin);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || files.length === 0) return;
    
    setIsUploading(true);
    setProgress(5);

    try {
      // 1. Upload files
      const formData = new FormData();
      formData.append("eventName", eventName);
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      const newEventId = data.eventId;
      const newEventPin = data.eventPin;
      const uploadedImages = data.images;
      
      setProgress(30);
      setIsUploading(false);
      setIsProcessing(true);

      // 2. Process images for face descriptors (Client-side)
      let count = 0;
      for (let i = 0; i < files.length; i++) {
        try {
          const file = files[i];
          const serverImage = uploadedImages[i];
          
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await new Promise((resolve) => (img.onload = resolve));
          
          const descriptors = await getMultipleFaceDescriptors(img);
          
          // Send descriptors back to server
          await fetch(`/api/event/${newEventId}/descriptors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageId: serverImage.id,
              descriptors: descriptors
            })
          });
          
          count++;
          setProcessedCount(count);
          setProgress(30 + Math.floor((count / files.length) * 70));
        } catch (err) {
          console.error("Error processing face:", err);
        }
      }

      setEventId(newEventId);
      setEventPin(newEventPin);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload photos. Please try again.");
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center font-display font-bold">
            A
          </div>
          <span className="font-display font-bold text-lg text-slate-900">APE Dashboard</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">Photographer</span>
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
            P
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 grid gap-8 md:grid-cols-[1fr_350px]">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Create Event</h1>
            <p className="text-slate-500 mt-1">Upload photos to start finding faces.</p>
          </div>

          <form onSubmit={handleUpload} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div>
              <label htmlFor="eventName" className="block text-sm font-medium text-slate-700 mb-1">
                Event Name
              </label>
              <input
                id="eventName"
                type="text"
                placeholder="Type Your Event Name Here.."
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                required
                disabled={isUploading || isProcessing || !!eventId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Upload Event Photos
              </label>
              <div 
                onClick={() => !eventId && !isUploading && !isProcessing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer group ${
                  files.length > 0 ? "border-primary-300 bg-primary-50/30" : "border-slate-300 hover:bg-slate-50"
                } ${eventId || isUploading || isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
                <div className="w-16 h-16 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                {files.length > 0 ? (
                  <div>
                    <p className="font-medium text-primary-700">{files.length} photos selected</p>
                    <p className="text-sm text-primary-600 mt-1">Click to change selection</p>
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-slate-700">Click to select photos</p>
                    <p className="text-sm text-slate-500 mt-1">Multiple files supported</p>
                  </>
                )}
                <p className="text-xs text-slate-400 mt-4">JPG, PNG, WEBP</p>
              </div>
            </div>

            {(isUploading || isProcessing) && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in zoom-in-95">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700 flex items-center gap-2">
                    {isUploading ? (
                      <>
                        <UploadCloud className="w-4 h-4 text-primary-500" />
                        Uploading images...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-primary-500 animate-pulse" />
                        AI processing: {processedCount} / {files.length}
                      </>
                    )}
                  </span>
                  <span className="text-primary-600 font-bold">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-600 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(124,58,237,0.3)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 text-center">
                  {isProcessing ? "Detected faces will be stored securely for matching." : "Almost there..."}
                </p>
              </div>
            )}

            {!eventId && (
              <button
                type="submit"
                disabled={isUploading || isProcessing || !eventName || files.length === 0}
                className="w-full py-4 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
              >
                {isUploading || isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isUploading ? "Uploading..." : "Processing Faces..."}
                  </>
                ) : (
                  "Create Event & Process Photos"
                )}
              </button>
            )}
          </form>
        </div>

        <div>
          {eventId ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24 space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-display font-semibold text-lg text-slate-900">Event Ready!</h3>
                <p className="text-sm text-slate-500 mt-1">{files.length} photos uploaded successfully.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Event Name</p>
                  <p className="font-medium text-slate-900">{eventName}</p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Event ID</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-2 py-1 rounded border border-slate-200 text-sm font-medium text-primary-700">
                      {eventId}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(eventId);
                        alert("ID copied!");
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Guest Access PIN</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200 text-lg font-bold text-primary-700 tracking-widest shadow-sm">
                      {eventPin}
                    </code>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Guests will need this PIN to enter the gallery.</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Guest Link</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${originUrl}/event/${eventId}`}
                      className="flex-1 text-sm bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none text-slate-900"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${originUrl}/event/${eventId}`);
                        alert("Link copied!");
                      }}
                      className="px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded text-sm font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex flex-col items-center">
                  <div className="w-40 h-40 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center mb-2 shadow-sm">
                    {originUrl && <QRCode value={`${originUrl}/event/${eventId}`} size={140} />}
                  </div>
                  <p className="text-xs text-slate-500">Scan to open guest portal</p>
                </div>
              </div>

              <Link 
                href={`/event/${eventId}`}
                className="block text-center w-full py-2.5 px-4 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-medium transition-colors text-sm"
              >
                View as Guest
              </Link>
              
              <button
                onClick={() => {
                  setEventId(null);
                  setEventPin(null);
                  setFiles([]);
                  setEventName("");
                  setProgress(0);
                }}
                className="block text-center w-full py-2.5 px-4 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors text-sm"
              >
                Create New Event
              </button>
            </div>
          ) : (
            <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200 h-full flex flex-col items-center justify-center text-center space-y-4">
              <QrCodeIcon className="w-12 h-12 text-slate-300" />
              <div>
                <h3 className="font-medium text-slate-600">No Active Event</h3>
                <p className="text-sm text-slate-400 mt-1">Upload photos to generate an event ID and QR code.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
