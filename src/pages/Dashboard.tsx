import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileImage, Loader2, AlertCircle, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { uploadImage } from '../services/cloudinary';
import { predictSkinDisease } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const { user, isGuest } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    if (isGuest) {
      const scanned = localStorage.getItem('guest_scanned');
      if (scanned === 'true') {
        setHasScanned(true);
      }
    }
  }, [isGuest]);

  const analyzeSelectedFile = useCallback(async (selectedFile: File) => {
    if (isGuest && hasScanned) {
      toast.error('Guest limit reached. Please create an account to continue.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const imageUrl = await uploadImage(selectedFile);
      const prediction = await predictSkinDisease({ imageUrl });

      setResult(prediction);

      if (isGuest) {
        localStorage.setItem('guest_scanned', 'true');
        setHasScanned(true);
      }

      if (user) {
        await addDoc(collection(db, 'scans'), {
          userId: user.uid,
          imageUrl,
          disease: prediction.disease,
          confidence: prediction.confidence,
          createdAt: serverTimestamp(),
        });
      }

      toast.success('Analysis complete!');
    } catch (error: any) {
      toast.error(error.message || 'Analysis failed. Try again later.');
    } finally {
      setLoading(false);
    }
  }, [hasScanned, isGuest, user]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      void analyzeSelectedFile(selectedFile);
    }
  }, [analyzeSelectedFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Skin Condition Analysis</h1>
        <p className="text-gray-600 dark:text-gray-400">Upload a clear image of the affected skin area and the scan will start automatically.</p>
        {isGuest && <p className="text-orange-500 font-medium text-sm">Guest Mode: You have {hasScanned ? '0' : '1'} scan remaining.</p>}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <input {...getInputProps()} />
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                  {isDragActive ? 'Drop the image here...' : 'Drag & drop an image here, or click to select'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Supports JPG, PNG, WEBP</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-1/2">
                  <div className="relative rounded-xl overflow-hidden shadow-md aspect-square bg-gray-100 dark:bg-gray-900">
                    <img src={preview!} alt="Preview" className="w-full h-full object-cover" />
                    {!result && (
                      <button
                        onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="absolute top-2 right-2 bg-red-500/80 text-white p-2 rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm"
                        aria-label="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-1/2 space-y-6">
                  {!result ? (
                    <div className="h-full flex flex-col justify-center space-y-4">
                      <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                        <FileImage className="w-5 h-5 text-blue-500" />
                        <span className="font-medium truncate">{file.name}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {loading
                          ? 'Uploading and analyzing the image now. Results will appear automatically.'
                          : 'The image is ready. The scan starts automatically after upload.'}
                      </p>
                      <div className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/30">
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Scanning image...</span>
                          </>
                        ) : (
                          <span>Preparing results...</span>
                        )}
                      </div>
                      {isGuest && hasScanned && (
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-lg text-sm flex items-start space-x-2">
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <span>You've used your guest scan. Please sign up to scan more images and save your history.</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5 border border-gray-100 dark:border-gray-700 h-full"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Analysis Result</h3>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Detected Condition</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.disease}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Confidence Score</p>
                          <div className="flex items-center space-x-3">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${result.confidence}%` }}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{result.confidence.toFixed(1)}%</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Description</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.description}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">Suggestions</p>
                          <ul className="space-y-1">
                            {result.suggestions.map((suggestion: string, i: number) => (
                              <li key={i} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                                <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                        <button
                          onClick={reset}
                          className="w-full py-2.5 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Scan Another Image
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
