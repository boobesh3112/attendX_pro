import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, X, CheckCircle, AlertCircle, Loader2, Scan } from "lucide-react";
import { faceAuth, BiometricAuthResult, FaceRegistrationResult } from "../utils/faceAuth";
import { sounds } from "../utils/sounds";
import { haptics } from "../utils/haptics";

interface FaceScanProps {
  mode: "register" | "authenticate";
  userId?: string;
  userName?: string;
  onSuccess: (result: BiometricAuthResult | FaceRegistrationResult) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function FaceScan({ mode, userId, userName, onSuccess, onCancel, isOpen }: FaceScanProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<string>("Initializing...");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === "register" && (!userId || !userName)) {
      setError("User information required for registration");
      return;
    }

    startScan();

    return () => {
      // Cleanup: stop video stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, mode, userId, userName]);

  const startScan = async () => {
    if (!videoRef.current) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(false);
    setScanProgress(0);

    try {
      sounds.playClick();
      haptics.medium();

      const onProgress = (msg: string) => {
        setStatus(msg);
        setScanProgress(prev => Math.min(prev + 20, 90));
      };

      let result: BiometricAuthResult | FaceRegistrationResult;

      if (mode === "register") {
        result = await faceAuth.register(userId!, userName!, videoRef.current, onProgress);
      } else {
        result = await faceAuth.authenticate(videoRef.current, onProgress);
      }

      setScanProgress(100);

      if (result.success) {
        setSuccess(true);
        setStatus(mode === "register" ? "Face registered successfully!" : "Authentication successful!");
        sounds.playSuccess();
        haptics.success();

        // Stop video stream
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }

        setTimeout(() => {
          onSuccess(result);
        }, 1500);
      } else {
        setError(result.error || "Face scan failed");
        setStatus("Failed");
        sounds.playError();
        haptics.error();

        // Stop video stream on error
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setStatus("Error");
      sounds.playError();
      haptics.error();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    sounds.playClick();
    onCancel();
  };

  const handleRetry = () => {
    setError(null);
    setSuccess(false);
    setScanProgress(0);
    startScan();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg glassmorphism rounded-3xl p-6 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <X size={20} className="text-white" />
          </button>

          {/* Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-3">
              <Camera size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {mode === "register" ? "Register Your Face" : "Face Authentication"}
            </h2>
            <p className="text-white/60 text-sm">
              {mode === "register"
                ? "Position your face in the frame and follow the instructions"
                : "Look at the camera to verify your identity"}
            </p>
          </div>

          {/* Video container */}
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black/50 mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Scanning overlay */}
            <AnimatePresence>
              {isProcessing && !success && !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {/* Face frame */}
                  <div className="relative w-48 h-64">
                    <div className="absolute inset-0 border-4 border-white/30 rounded-full" />
                    <motion.div
                      animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 border-4 border-gradient-to-br from-purple-500 to-blue-500 rounded-full"
                    />
                    <Scan size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/70" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success overlay */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 10, stiffness: 200 }}
                    >
                      <CheckCircle size={64} className="text-green-400 mx-auto mb-2" />
                    </motion.div>
                    <p className="text-white font-semibold text-lg">Success!</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error overlay */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-sm"
                >
                  <div className="text-center px-4">
                    <AlertCircle size={64} className="text-red-400 mx-auto mb-2" />
                    <p className="text-white font-semibold text-sm">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scanProgress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
              />
            </div>
          </div>

          {/* Status text */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2">
              {isProcessing && !success && !error && (
                <Loader2 size={16} className="text-white/70 animate-spin" />
              )}
              <p className="text-white/80 text-sm font-medium">{status}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {error && (
              <button
                onClick={handleRetry}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            )}
            {!success && (
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Instructions */}
          {mode === "register" && !error && !success && (
            <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-white/70 text-xs text-center">
                💡 For best results: Ensure good lighting, remove glasses, and look directly at the camera
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
