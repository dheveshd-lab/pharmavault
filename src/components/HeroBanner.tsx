import React, { useState, useEffect } from 'react';
import { Pill, Send, Plus, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Box } from 'lucide-react';
import image1 from '../assets/images/pharmacy_hero_1_1790165865687.jpg';
import image2 from '../assets/images/pharmacy_hero_2_1790165878396.jpg';
import image3 from '../assets/images/futuristic_pharma_lab_1790166245565.jpg';
import { FuturisticPharmaScene } from './FuturisticPharmaScene';

export const backgroundImages = [
  image1,
  image2,
  image3,
];

interface HeroBannerProps {
  onOpenAddMedicine: () => void;
  onOpenAddBatch?: () => void;
  onOpenDispense?: () => void;
  hasMedicines?: boolean;
  totalMedicines?: number;
  totalAvailableUnits?: number;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onOpenAddMedicine,
  onOpenAddBatch,
  onOpenDispense,
  hasMedicines = false,
  totalMedicines = 0,
  totalAvailableUnits = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate hero background images smoothly
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % backgroundImages.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + backgroundImages.length) % backgroundImages.length);
  };

  const imageCaptions = [
    { title: 'Clinical Dispensary Vault', subtitle: 'Workstation & compounding lab' },
    { title: 'Sterile Inventory Bay', subtitle: 'Temperature-monitored medical storage' },
    { title: 'Futuristic Molecular Lab & FEFO', subtitle: '3D interactive pharmaceutical depth environment' },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg bg-slate-950 text-white transition-all duration-300 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Pharmacy Vault Overview Hero"
    >
      {/* Background Image Carousel with smooth crossfade */}
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {backgroundImages.map((imgSrc, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none scale-105'
            } transform transition-transform duration-7000 ease-out`}
          >
            {idx === 2 ? (
              <FuturisticPharmaScene
                isActive={currentIndex === 2}
                backgroundImage={imgSrc}
              />
            ) : (
              <img
                src={imgSrc}
                alt=""
                loading={idx === 0 ? 'eager' : 'lazy'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
            )}
          </div>
        ))}

        {/* Deep Medical Navy & Blue Gradient Overlay to guarantee high text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-slate-950/75 mix-blend-multiply pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-900/40 pointer-events-none" />
        <div className="absolute inset-0 bg-teal-950/20 mix-blend-color-dodge pointer-events-none" />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col justify-between min-h-[220px] sm:min-h-[240px]">
        {/* Top Badges & Carousel Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30 backdrop-blur-md shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              FEFO Protocol Active
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-400/20 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-blue-400" />
              Enterprise Health Vault
            </span>
          </div>

          {/* Carousel Slide Indicators & Navigation Controls */}
          <div className="flex items-center gap-2 bg-slate-900/70 border border-white/10 backdrop-blur-md px-2.5 py-1 rounded-xl">
            <button
              onClick={goToPrev}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Previous Background Visual"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5 px-1">
              {backgroundImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex
                      ? 'w-6 bg-teal-400'
                      : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to background image ${idx + 1}`}
                  title={imageCaptions[idx].title}
                />
              ))}
            </div>

            <button
              onClick={goToNext}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Next Background Visual"
              aria-label="Next image"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Headline & Value Proposition */}
        <div className="my-4 max-w-2xl">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white drop-shadow-xs">
            PharmaVault Clinical Inventory
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-300/90 leading-relaxed drop-shadow-xs">
            Precision pharmaceutical inventory governance with First-Expired First-Out (FEFO) batch allocation, automated expiry interception, and clinical dispensing intelligence.
          </p>
          <div className="mt-2 text-[11px] text-teal-300/90 flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Viewing Visual #{currentIndex + 1}: {imageCaptions[currentIndex].title}
          </div>
        </div>

        {/* Bottom Bar: Action Buttons & Live Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="hero-add-medicine-btn"
              onClick={onOpenAddMedicine}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Medicine
            </button>

            {hasMedicines && onOpenAddBatch && (
              <button
                id="hero-add-batch-btn"
                onClick={onOpenAddBatch}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-white font-semibold text-xs border border-white/15 backdrop-blur-md transition-all cursor-pointer"
              >
                <Box className="w-3.5 h-3.5 text-indigo-300" />
                Add Batch
              </button>
            )}

            {hasMedicines && totalAvailableUnits > 0 && onOpenDispense && (
              <button
                id="hero-dispense-btn"
                onClick={onOpenDispense}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-white font-semibold text-xs border border-white/15 backdrop-blur-md transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-teal-300" />
                Dispense (FEFO)
              </button>
            )}
          </div>

          {/* Quick Metrics Badge */}
          {hasMedicines && (
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <span><strong className="text-white">{totalMedicines}</strong> Medicines</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span><strong className="text-white">{totalAvailableUnits}</strong> Units in Stock</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
