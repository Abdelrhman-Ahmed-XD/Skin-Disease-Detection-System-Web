import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, X, CheckCircle2, ChevronRight, AlertCircle, ImageIcon } from 'lucide-react';
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

export const Dashboard: React.FC = () => {
  const { user, isGuest } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState<any | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [confidenceDisplay, setConfidenceDisplay] = useState(0);

  useEffect(() => {
    if (isGuest && localStorage.getItem('guest_scanned') === 'true') setHasScanned(true);
  }, [isGuest]);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, processingSteps.length - 1));
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (result) {
      const target = result.confidence;
      let cur = 0;
      const step = target / 40;
      const iv = setInterval(() => {
        cur += step;
        if (cur >= target) { setConfidenceDisplay(target); clearInterval(iv); }
        else setConfidenceDisplay(Math.round(cur));
      }, 25);
      return () => clearInterval(iv);
    }
  }, [result]);

  const analyzeFile = useCallback(async (selectedFile: File) => {
    if (isGuest && hasScanned) {
      toast.error('Guest limit reached. Create a free account to scan more.');
      return;
    }
    setLoading(true);
    setResult(null);
    setStepIdx(0);
    try {
      const imageUrl = await uploadImage(selectedFile);
      const prediction = await predictSkinDisease({ imageUrl });
      setResult(prediction);
      if (isGuest) { localStorage.setItem('guest_scanned', 'true'); setHasScanned(true); }
      if (user) {
        await addDoc(collection(db, 'scans'), {
          userId: user.uid,
          imageUrl,
          disease: prediction.disease,
          confidence: prediction.confidence,
          description: prediction.description,
          createdAt: serverTimestamp(),
        });
      }
      toast.success('Analysis complete!');
    } catch (error: any) {
      toast.error(error.message || 'Analysis failed. Please try again.');
    } finally { setLoading(false); }
  }, [hasScanned, isGuest, user]);

  const onDrop = useCallback((files: File[]) => {
    if (!files.length) return;
    const f = files[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    void analyzeFile(f);
  }, [analyzeFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles: 1,
  });

  const reset = () => { setFile(null); setPreview(null); setResult(null); setLoading(false); setStepIdx(0); };

  const firstName = user?.displayName?.split(' ')[0] || (isGuest ? 'Guest' : 'there');

  return (
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--tx)' }}>
            Hello, <span style={{ color: 'var(--accent)' }}>{firstName}</span> 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>Upload a skin photo below to start your AI analysis.</p>
          {isGuest && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                   style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertCircle size={13} />
                Guest mode · {hasScanned ? '0' : '1'} scan remaining
              </div>
          )}
        </motion.div>

        {/* Main scan card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--br)' }}>
          <AnimatePresence mode="wait">
            {/* Drop zone */}
            {!file && (
                <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="p-6 sm:p-8">
                  <div {...getRootProps()} className="rounded-2xl p-12 text-center cursor-pointer transition-all duration-200"
                       style={{
                         border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--br2)'}`,
                         background: isDragActive ? 'var(--accent-dim)' : 'var(--surface2)',
                       }}>
                    <input {...getInputProps()} />
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors"
                         style={{ background: isDragActive ? 'var(--accent)' : 'var(--accent-dim)', color: isDragActive ? '#fff' : 'var(--accent)' }}>
                      <UploadCloud size={28} />
                    </div>
                    <p className="text-lg font-bold mb-1" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {isDragActive ? 'Drop it here' : 'Upload a skin photo'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--tx2)' }}>Drag & drop or click to select · JPG, PNG, WEBP</p>
                    <p className="text-xs mt-3" style={{ color: 'var(--tx3)' }}>For best results: close-up, well-lit, focused on the affected area</p>
                  </div>
                </motion.div>
            )}

            {/* Preview + results */}
            {file && (
                <motion.div key="preview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-6 sm:p-8">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Image */}
                    <div className="w-full md:w-2/5 flex-shrink-0">
                      <div className="relative rounded-2xl overflow-hidden aspect-square"
                           style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                        <img src={preview!} alt="Skin scan" className="w-full h-full object-cover" />
                        {!result && (
                            <button onClick={(e) => { e.stopPropagation(); reset(); }}
                                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                                    style={{ background: 'rgba(239,68,68,0.85)' }}>
                              <X size={13} />
                            </button>
                        )}
                        {/* Scanning overlay */}
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center"
                                 style={{ background: 'rgba(8,15,13,0.55)', backdropFilter: 'blur(2px)' }}>
                              <div className="pring w-16 h-16 rounded-full border-2" style={{ borderColor: 'rgba(0,212,170,0.6)' }} />
                            </div>
                        )}
                      </div>
                      <p className="text-xs mt-2 truncate text-center" style={{ color: 'var(--tx3)' }}>
                        <ImageIcon size={11} className="inline mr-1" />{file.name}
                      </p>
                    </div>

                    {/* Right panel */}
                    <div className="flex-1 min-w-0">
                      <AnimatePresence mode="wait">
                        {/* Loading state */}
                        {loading && (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                              <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>Analyzing your image…</p>
                              <div className="space-y-2">
                                {processingSteps.map((s, i) => (
                                    <div key={s} className="flex items-center gap-3 py-2 px-3 rounded-xl transition-all"
                                         style={{ background: i === stepIdx ? 'var(--accent-dim)' : 'transparent' }}>
                                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                           style={{
                                             background: i < stepIdx ? 'var(--accent)' : i === stepIdx ? 'var(--accent-dim)' : 'var(--br)',
                                             color: i < stepIdx ? '#fff' : i === stepIdx ? 'var(--accent)' : 'var(--tx3)',
                                           }}>
                                        {i < stepIdx ? <CheckCircle2 size={12} /> :
                                            i === stepIdx ? <span className="spin w-2.5 h-2.5 border-2 rounded-full block" style={{ borderColor: 'var(--br2)', borderTopColor: 'var(--accent)' }} /> :
                                                <span className="w-1.5 h-1.5 rounded-full block" style={{ background: 'var(--tx3)' }} />}
                                      </div>
                                      <span className="text-xs font-medium" style={{ color: i === stepIdx ? 'var(--accent)' : i < stepIdx ? 'var(--tx2)' : 'var(--tx3)' }}>{s}</span>
                                    </div>
                                ))}
                              </div>
                            </motion.div>
                        )}

                        {/* Result */}
                        {result && !loading && (
                            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
                                <h3 className="text-lg font-extrabold" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Analysis Result</h3>
                              </div>

                              {/* Disease */}
                              <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--tx3)' }}>Detected condition</p>
                                <p className="text-xl font-extrabold" style={{ color: 'var(--tx)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{result.disease}</p>
                              </div>

                              {/* Confidence */}
                              <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tx3)' }}>Confidence score</p>
                                  <span className="text-lg font-extrabold" style={{ color: 'var(--accent)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{confidenceDisplay}%</span>
                                </div>
                                <div className="confidence-track">
                                  <div className="confidence-fill" style={{ width: `${confidenceDisplay}%` }} />
                                </div>
                              </div>

                              {/* Description */}
                              {result.description && (
                                  <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tx3)' }}>Description</p>
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>{result.description}</p>
                                  </div>
                              )}

                              {/* Suggestions */}
                              {result.suggestions?.length > 0 && (
                                  <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--br)' }}>
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tx3)' }}>Recommendations</p>
                                    <ul className="space-y-1.5">
                                      {result.suggestions.map((s: string, i: number) => (
                                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--tx2)' }}>
                                            <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                                            {s}
                                          </li>
                                      ))}
                                    </ul>
                                  </div>
                              )}

                              <button onClick={reset}
                                      className="btn-ghost w-full py-2.5 rounded-xl text-sm mt-2">
                                ↩ Scan another image
                              </button>
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--tx3)' }}>
          ⚠ Results are for informational purposes only and are not a medical diagnosis.
          Consult a qualified dermatologist for any concerning skin changes.
        </p>
      </div>
  );
};