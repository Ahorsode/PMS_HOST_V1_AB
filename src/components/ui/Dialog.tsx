"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SheetContext } from '@/components/ui/form/layout';

interface DialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Buttons pinned under the scrolling content. Forms usually use <FormActions> inside instead. */
  footer?: React.ReactNode;
  className?: string;
}

export const DialogTitle = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <h2 id={id} className={cn("text-lg font-semibold leading-6 text-fg", className)}>
    {children}
  </h2>
);

export const DialogDescription = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <p id={id} className={cn("mt-1 text-sm leading-5 text-fg-2", className)}>
    {children}
  </p>
);

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const closeButtonClass =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-fg-2 transition-colors duration-150 hover:bg-fg/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';

/**
 * The one modal for forms. On a phone it is a bottom sheet: the title and
 * close button stay at the top, the buttons stay at the bottom, and only the
 * middle scrolls. From tablet width up it is a centred dialog.
 */
export const Dialog = ({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className
}: DialogProps) => {
  const [mounted, setMounted] = useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const reactId = React.useId();

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

  // Move focus into the sheet when it opens and hand it back when it closes.
  useEffect(() => {
    if (!isOpen || !mounted) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [isOpen, mounted]);

  if (!mounted) return null;

  const dialogId = `dialog-${reactId}`;
  const descriptionId = `${dialogId}-description`;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onOpenChange(false);
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;

    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null,
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          role="presentation"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/70"
          />

          {/* Sheet on phones, dialog from sm up */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? dialogId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className={cn(
              "relative flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-b-0 border-fg/[0.08] bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_8px_24px_rgba(0,0,0,0.4)] focus:outline-none sm:max-h-[90dvh] sm:rounded-2xl sm:border-b sm:pb-0",
              className
            )}
          >
            {/* Header: stays put while the content scrolls */}
            {(title || description) && (
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-fg/[0.08] py-3 pl-5 pr-3">
                <div className="min-w-0 py-1.5">
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
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={closeButtonClass}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>
            )}

            {/* Close button if no header */}
            {!title && !description && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn(closeButtonClass, 'absolute right-3 top-3 z-20')}
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            )}

            <SheetContext.Provider value={true}>
              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                {children}
              </div>
            </SheetContext.Provider>

            {footer ? (
              <div className="flex shrink-0 items-center gap-3 border-t border-fg/[0.08] bg-card px-5 py-3 sm:justify-end [&>*:last-child]:flex-1 sm:[&>*:last-child]:flex-none">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/** The standard form modal: a bottom sheet on phones, a dialog on desktop. Same component as Dialog. */
export const FormSheet = Dialog;
export const FormModal = Dialog;
