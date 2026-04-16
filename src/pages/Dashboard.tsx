import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, X, CheckCircle2, ChevronRight, AlertCircle,
  ImageIcon, Camera, RotateCcw, Info, Lightbulb,
} from 'lucide-react';
import { uploadImage } from '../services/cloudinary';
import { predictSkinDisease } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const processingSteps = [
  'Uploading image to Cloudinary…',
  'Running CNN classifier…',
  'Generating UNet segmentation mask…',
  'Preparing your results…',
];

const TIPS = [
  { icon: '💡', text: 'Use natural daylight or a bright white lamp — avoid flash glare.' },
  { icon: '🔍', text: 'Get within 10–15 cm of the lesion so it fills at least half the frame.' },
  { icon: '📐', text: 'Hold the camera steady and parallel to the skin — avoid angles.' },
  { icon: '🧴', text: 'Clean the area first; remove any cream, makeup, or hair covering the spot.' },
  { icon: '🖤', text: 'For dark skin tones, extra light helps the model read colour variations.' },
];

const CameraModal: React.FC<{ onCapture: (file: File) => void; onClose: () => void }> = ({ onCapture, onClose }) => {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream]     = useState<MediaStream | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [captured, setCaptured] = useState<Blob | null>(null);
  const [facing, setFacing]     = useState<'user' | 'environment'>('environment');
  const [error, setError]       = useState('');

  const startCamera = async (facingMode: 'user' | 'environment') => {
    try {
      if (stream) { stream.getTracks().forEach(t => t.stop()); }
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setError('');
    } catch (e: any) {
      setError(e.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Could not access camera. Try uploading an image instead.');
    }
  };

  useEffect(() => { startCamera(facing); return () => { stream?.getTracks().forEach(t => t.stop()); }; }, []);

  const flip = () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    startCamera(next);
    setPreview(null); setCaptured(null);
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    c.toBlob(blob => {
      if (!blob) return;
      setCaptured(blob);
      setPreview(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.92);
  };

  const retake = () => { setPreview(null); setCaptured(null); };

  const confirm = () => {
    if (!captured) return;
    const file = new File([captured], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file);
    stream?.getTracks().forEach(t => t.stop());
  };

  return (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={onClose}>
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}/>
        <motion.div className="relative w-full max-w-lg rounded-2xl overflow-hidden z-10"
                    style={{ background: '#000', border: '1px solid rgba(0,229,255,0.2)' }}
                    initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93 }}
                    onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-sm font-bold" style={{ color: 'rgba(0,229,255,0.8)' }}>📷 Take a photo</span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
              <X size={14}/>
            </button>
          </div>
          <div className="relative" style={{ aspectRatio: '4/3', background: '#111' }}>
            {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <AlertCircle size={36} color="#ef4444"/>
                  <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
                </div>
            ) : preview ? (
                <img src={preview} className="w-full h-full object-cover" alt="Preview"/>
            ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"/>
            )}
            {!preview && !error && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-56 h-56">
                    {['top-0 left-0', 'top-0 right-0 rotate-90', 'bottom-0 left-0 -rotate-90', 'bottom-0 right-0 rotate-180'].map((cls, i) => (
                        <div key={i} className={`absolute ${cls} w-8 h-8`}>
                          <svg viewBox="0 0 32 32" fill="none"><path d="M0 12 L0 0 L12 0" stroke="rgba(0,229,255,0.8)" strokeWidth="2.5"/></svg>
                        </div>
                    ))}
                    <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap" style={{ color: 'rgba(0,229,255,0.6)' }}>Position lesion in frame</p>
                  </div>
                </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden"/>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {!preview ? (
                <>
                  <button onClick={flip} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}><RotateCcw size={18}/></button>
                  <button onClick={capture} disabled={!!error} className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-40" style={{ background: 'rgba(0,229,255,0.9)', boxShadow: '0 0 24px rgba(0,229,255,0.4)' }}><div className="w-12 h-12 rounded-full border-2 border-[#070d1a]"/></button>
                  <div className="w-10"/>
                </>
            ) : (
                <>
                  <button onClick={retake} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>Retake</button>
                  <button onClick={confirm} className="px-5 py-2 rounded-xl text-sm font-bold" style={{ background: '#00e5ff', color: '#070d1a' }}>Use this photo ✓</button>
                </>
            )}
          </div>
        </motion.div>
      </motion.div>
  );
};

const TipCard: React.FC = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => { const id = setInterval(() => setIdx(i => (i + 1) % TIPS.length), 4000); return () => clearInterval(id); }, []);
  return (
      <motion.div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,229,255,0.2)' }}>
        <Lightbulb size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }}/>
        <AnimatePresence mode="wait">
          <motion.p key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3 }} className="text-xs leading-relaxed" style={{ color: 'var(--tx2)' }}>
            <strong style={{ color: 'var(--accent)' }}>Tip {idx + 1}/{TIPS.length}:</strong> {TIPS[idx].text}
          </motion.p>
        </AnimatePresence>
      </motion.div>
  );
};

export const Dashboard: React.FC = () => {
  const { user, userProfile, isGuest } = useAuth();
  const [file, setFile]               = useState<File | null>(null);
  const [preview, setPreview]         = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [stepIdx, setStepIdx]         = useState(0);
  const [result, setResult]           = useState<any | null>(null);
  const [hasScanned, setHasScanned]   = useState(false);
  const [confidenceDisplay, setConfidenceDisplay] = useState(0);
  const [showCamera, setShowCamera]   = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [bodyView, setBodyView]       = useState('N/A'); // <--- ADDED BODY VIEW STATE

  useEffect(() => {
    if (isGuest && localStorage.getItem('guest_scanned') === 'true') setHasScanned(true);
    setCameraSupported(!!(navigator.mediaDevices?.getUserMedia));
  }, [isGuest]);

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setStepIdx(i => Math.min(i + 1, processingSteps.length - 1)), 1800);
    return () => clearInterval(iv);
  }, [loading]);

  useEffect(() => {
    if (!result) return;
    const target = result.confidence ?? 0;
    let cur = 0;
    const step = target / 40;
    const iv = setInterval(() => {
      cur += step;
      if (cur >= target) { setConfidenceDisplay(target); clearInterval(iv); }
      else setConfidenceDisplay(Math.round(cur));
    }, 25);
    return () => clearInterval(iv);
  }, [result]);

  const analyzeFile = useCallback(async (selectedFile: File) => {
    if (isGuest && hasScanned) { toast.error('Guest limit reached. Create a free account to scan more.'); return; }
    setLoading(true); setResult(null); setStepIdx(0);
    try {
      const imageUrl = await uploadImage(selectedFile);
      let prediction;
      try {
        prediction = await predictSkinDisease({ imageUrl });
      } catch {
        prediction = { disease: 'Pending AI Analysis', confidence: 0, description: 'The AI backend is currently offline. Your image was saved and will be available in History.', suggestions: ['Check back when the AI backend is online.'], };
      }
      setResult(prediction);
      if (isGuest) { localStorage.setItem('guest_scanned', 'true'); setHasScanned(true); }
      if (user) {
        await addDoc(collection(db, 'users', user.uid, 'scans'), {
          userId:      user.uid,
          photoUri:    imageUrl,
          analysis:    prediction.disease,
          confidence:  prediction.confidence,
          description: prediction.description,
          createdAt:   serverTimestamp(),
          bodyView:    bodyView, // <--- SAVING SELECTED DROPDOWN VALUE
          x: 0, y: 0,
          source:      'web',
        });
      }
      toast.success('Analysis complete!');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed. Please try again.');
    } finally { setLoading(false); }
  }, [hasScanned, isGuest, user, bodyView]);

  const onDrop = useCallback((files: File[]) => {
    if (!files.length) return;
    const f = files[0];
    setFile(f); setPreview(URL.createObjectURL(f)); setResult(null);
    void analyzeFile(f);
  }, [analyzeFile]);

  const handleCapture = (f: File) => {
    setShowCamera(false); setFile(f); setPreview(URL.createObjectURL(f)); setResult(null);
    void analyzeFile(f);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 });
  const reset = () => { setFile(null); setPreview(null); setResult(null); setLoading(false); setStepIdx(0); };

  const firstName = userProfile?.firstName || user?.displayName?.split(' ')[0] || (isGuest ? 'Guest' : 'there');
  const confColor = (c: number) => c >= 80 ? '#22c55e' : c >= 60 ? '#f59e0b' : '#ef4444';

  return (
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--tx)' }}>Hello, <span style={{ color: 'var(--accent)' }}>{firstName}</span> 👋</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>Upload or take a photo of a skin area to start your AI analysis.</p>
          {isGuest && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertCircle size={13}/> Guest mode · {hasScanned ? '0' : '1'} scan remaining
              </div>
          )}
        </motion.div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
          <AnimatePresence mode="wait">
            {!file && (
                <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="p-6 sm:p-8 space-y-4">

                  {/* NEW BODY LOCATION SELECTOR */}
                  <div className="mb-4 text-left">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--tx2)' }}>Body Location (Optional)</label>
                    <select value={bodyView} onChange={e => setBodyView(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl text-sm outline-none cursor-pointer"
                            style={{ background: 'var(--surface2)', border: '1px solid var(--br)', color: 'var(--tx)' }}>
                      <option value="N/A">Not specified (N/A)</option>
                      <option value="front">Front Body</option>
                      <option value="back">Back Body</option>
                    </select>
                  </div>

                  <div {...getRootProps()} className="rounded-2xl p-10 text-center cursor-pointer transition-all duration-200" style={{ border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--br2)'}`, background: isDragActive ? 'var(--accent-dim)' : 'var(--surface2)' }}>
                    <input {...getInputProps()}/>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors" style={{ background: isDragActive ? 'var(--accent)' : 'var(--accent-dim)', color: isDragActive ? '#fff' : 'var(--accent)' }}><UploadCloud size={28}/></div>
                    <p className="text-lg font-bold mb-1" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{isDragActive ? 'Drop it here' : 'Upload a skin photo'}</p>
                    <p className="text-sm" style={{ color: 'var(--tx2)' }}>Drag & drop or click to select · JPG, PNG, WEBP</p>
                  </div>

                  {cameraSupported && (
                      <button onClick={() => setShowCamera(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all card-hover" style={{ background: 'var(--surface2)', color: 'var(--tx2)', border: '1px solid var(--br)' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx2)'; e.currentTarget.style.borderColor = 'var(--br)'; }}>
                        <Camera size={16}/> Take a photo with your camera
                      </button>
                  )}
                  <TipCard/>
                </motion.div>
            )}

            {file && (
                <motion.div key="preview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-6 sm:p-8">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-full md:w-2/5 flex-shrink-0">
                      <div className="relative rounded-2xl overflow-hidden aspect-square" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                        <img src={preview!} alt="Skin scan" className="w-full h-full object-cover"/>
                        {!result && ( <button onClick={(e) => { e.stopPropagation(); reset(); }} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: 'rgba(239,68,68,0.85)' }}><X size={13}/></button> )}
                        {loading && ( <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(8,15,13,0.55)', backdropFilter: 'blur(2px)' }}><div className="pring w-16 h-16 rounded-full border-2" style={{ borderColor: 'rgba(0,229,255,0.6)' }}/></div> )}
                      </div>
                      <p className="text-xs mt-2 truncate text-center" style={{ color: 'var(--tx3)' }}><ImageIcon size={11} className="inline mr-1"/>{file.name}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <AnimatePresence mode="wait">
                        {loading && (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                              <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>Analyzing your image…</p>
                              <div className="space-y-2">
                                {processingSteps.map((s, i) => (
                                    <div key={s} className="flex items-center gap-3 py-2 px-3 rounded-xl transition-all" style={{ background: i === stepIdx ? 'var(--accent-dim)' : 'transparent' }}>
                                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: i < stepIdx ? 'var(--accent)' : i === stepIdx ? 'var(--accent-dim)' : 'var(--br)', color: i < stepIdx ? '#fff' : i === stepIdx ? 'var(--accent)' : 'var(--tx3)', }}>
                                        {i < stepIdx ? <CheckCircle2 size={12}/> : i === stepIdx ? <span className="spin w-2.5 h-2.5 border-2 rounded-full block" style={{ borderColor: 'var(--br2)', borderTopColor: 'var(--accent)' }}/> : <span className="w-1.5 h-1.5 rounded-full block" style={{ background: 'var(--tx3)' }}/>}
                                      </div>
                                      <span className="text-xs font-medium" style={{ color: i === stepIdx ? 'var(--accent)' : i < stepIdx ? 'var(--tx2)' : 'var(--tx3)' }}>{s}</span>
                                    </div>
                                ))}
                              </div>
                            </motion.div>
                        )}
                        {result && !loading && (
                            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                              <div className="flex items-center gap-2 mb-1"><CheckCircle2 size={18} style={{ color: 'var(--accent)' }}/><h3 className="text-lg font-extrabold" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Analysis Result</h3></div>
                              <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}><p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--tx3)' }}>Detected condition</p><p className="text-xl font-extrabold" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{result.disease}</p></div>
                              <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>Confidence score</p><div className="relative group"><Info size={12} style={{ color: 'var(--tx3)' }}/><div className="hidden group-hover:block absolute bottom-5 left-1/2 -translate-x-1/2 w-48 px-2.5 py-2 rounded-xl text-xs z-10" style={{ background: 'var(--surface)', border: '1px solid var(--br)', color: 'var(--tx2)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>How confident the CNN model is in its prediction. &ge;80% is high confidence.</div></div></div>
                                  <span className="text-lg font-extrabold" style={{ color: confColor(confidenceDisplay), fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{confidenceDisplay}%</span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--br2)' }}><motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${confColor(result.confidence)}77, ${confColor(result.confidence)})`, width: `${confidenceDisplay}%` }}/></div>
                              </div>
                              {result.description && ( <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}><p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tx3)' }}>Description</p><p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>{result.description}</p></div> )}
                              {result.suggestions?.length > 0 && ( <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}><p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tx3)' }}>Recommendations</p><ul className="space-y-1.5">{result.suggestions.map((s: string, i: number) => ( <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--tx2)' }}><ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }}/>{s}</li> ))}</ul></div> )}
                              <button onClick={reset} className="btn-ghost w-full py-2.5 rounded-xl text-sm mt-2">↩ Scan another image</button>
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--tx3)' }}>⚠ Results are for informational purposes only and are not a medical diagnosis. Consult a qualified dermatologist for any concerning skin changes.</p>
        <AnimatePresence>{showCamera && <CameraModal onCapture={handleCapture} onClose={() => setShowCamera(false)}/>}</AnimatePresence>
      </div>
  );
};