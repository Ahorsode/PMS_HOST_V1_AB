"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <h3 id={id} className={cn("text-lg font-medium text-[#ededed]", className)}>
    {children}
  </h3>
);

export const DialogDescription = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <p id={id} className={cn("mt-1 text-sm text-[#a1a1a6]", className)}>
    {children}
  </p>
);

export const Dialog = ({ 
  isOpen, 
  onOpenChange, 
  title, 
  description,
  children, 
  className 
}: DialogProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted) return null;

  const dialogId = `dialog-${title?.toLowerCase().replace(/[^\w]/g, '-') || 'default'}`;
  const descriptionId = `${dialogId}-description`;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 pb-[5.5rem] md:p-3"
          role="presentation"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/70"
          />

          {/* Dialog Content */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? dialogId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            className={cn(
              "relative w-full max-w-xl max-h-[calc(90dvh-5.5rem)] md:max-h-[90dvh] flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#19191b] shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
              className
            )}
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4">
                <div>
                  {title && (
                    <DialogTitle id={dialogId}>
                      {title}
                    </DialogTitle>
                  )}
                  {description && (
                    <DialogDescription id={descriptionId}>
                      {description}
                    </DialogDescription>
                  )}
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-lg text-[#85858b] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#ededed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/60"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
            )}

            {/* Close button if no header */}
            {!title && !description && (
              <button
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-4 z-10 flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[#85858b] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#ededed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/60"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 custom-scrollbar pb-safe">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
