"use client";

import React, { useState } from 'react';
import { Plus, CheckCircle2, XCircle, FileDown, CreditCard, Loader2, MessageCircle } from 'lucide-react';
import { Button, Dialog, Form, FormActions, FormSummary, FormSummaryRow, Input } from '@/components/ui/form';
import { SalesForm } from './SalesForm';
import { updateOrderStatus } from '@/lib/actions/order-actions';
import { recordPayment } from '@/lib/actions/payment-actions';
import { toast } from 'sonner';
import { MutationBoundary } from '@/components/ui/MutationFeedback';
import { buildWhatsAppInvoiceUrl, downloadSalesInvoicePdf } from '@/lib/invoices/browser-invoice';
import { useRouter } from 'next/navigation';
import { toLocalDateTimeInputValue } from '@/lib/finance/financial-dates';
import { useMoney } from '@/components/providers/CurrencyProvider'
import { QlOverflowMenu } from '@/components/ui/ql/OverflowMenu'

export function SalesActionsHeader({ customers, inventory, eggInventory, eggBatchStock = [], fifoEggAvailability = { totalEggs: 0, byCategoryId: {} }, livestock, eggsPerCrate = 30, initialLivestockId, initialOpen = false, canEdit = true, canOverridePrice = false, allowBatchOverride = false, allowWorkerDiscounts = false, defaultDiscountType = 'item' }: { 
  customers: any[], 
  inventory: any[],
  eggInventory: any[],
  eggBatchStock?: Array<{ batchId: string; batchName: string; eggsRemaining: number }>,
  fifoEggAvailability?: { totalEggs: number; byCategoryId: Record<string, number> },
  livestock: any[],
  eggsPerCrate?: number,
  initialLivestockId?: string,
  initialOpen?: boolean,
  canEdit?: boolean,
  canOverridePrice?: boolean,
  allowBatchOverride?: boolean,
  allowWorkerDiscounts?: boolean,
  defaultDiscountType?: 'flat' | 'percent' | 'item',
}) {
  const [isOpen, setIsOpen] = useState(!!initialLivestockId || initialOpen);
  const router = useRouter();

  return (
    <>
      {canEdit && (
        <Button variant="accent" onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Record a sale
        </Button>
      )}

      <Dialog 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        title="Record a sale"
        className="max-w-2xl"
      >
        <SalesForm 
            customers={customers} 
            inventory={inventory}
            eggInventory={eggInventory}
            eggBatchStock={eggBatchStock}
            fifoEggAvailability={fifoEggAvailability}
            livestock={livestock}
            eggsPerCrate={eggsPerCrate}
            initialLivestockId={initialLivestockId}
            canOverridePrice={canOverridePrice}
            allowBatchOverride={allowBatchOverride}
            allowWorkerDiscounts={allowWorkerDiscounts}
            defaultDiscountType={defaultDiscountType}
            canAddCustomer={canEdit}
            onSuccess={() => {
              setIsOpen(false);
              router.refresh();
            }} 
          />
      </Dialog>
    </>
  );
}

export function SalesRowActions({ order, canEdit = true, canRecordPayment = false, eggsPerCrate = 30, variant = 'icons' }: { order: any, canEdit?: boolean, canRecordPayment?: boolean, eggsPerCrate?: number, variant?: 'icons' | 'phone' }) {
  const money = useMoney()
  const router = useRouter();
  const [updatingAction, setUpdatingAction] = useState<'completed' | 'cancelled' | 'payment' | 'whatsapp' | null>(null);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(Number(order.totalAmount));
  const [paymentDate, setPaymentDate] = useState(() => toLocalDateTimeInputValue());

  const handleStatusUpdate = async (status: string) => {
    if (updatingAction) return;
    const action = status.toLowerCase() === 'completed' ? 'completed' : 'cancelled';
    setUpdatingAction(action);
    try {
      const res = await updateOrderStatus(order.id, status);
      if (res.success) {
        toast.success(`Order ${status.toLowerCase()} successfully`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update order status');
      }
    } finally {
      setUpdatingAction(null);
    }
  };

  const handleDownloadInvoice = async () => {
    if (isDownloadingInvoice) return;
    setIsDownloadingInvoice(true);
    toast.info('Generating invoice PDF...');
    try {
      await downloadSalesInvoicePdf(order, eggsPerCrate, money.currency);
      toast.success('Invoice downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Unexpected error generating PDF');
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (updatingAction || isDownloadingInvoice) return;
    setUpdatingAction('whatsapp');
    try {
      await downloadSalesInvoicePdf(order, eggsPerCrate, money.currency);
      window.open(buildWhatsAppInvoiceUrl(order, money.currency), '_blank', 'noopener,noreferrer');
      toast.success('Invoice downloaded. WhatsApp Web is opening.');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to prepare WhatsApp invoice');
    } finally {
      setUpdatingAction(null);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updatingAction) return;
    setUpdatingAction('payment');
    try {
      const res = await recordPayment({
        customerId: order.customerId,
        amount: paymentAmount,
        orderId: order.id,
        paymentDate
      });
      if (res.success) {
        toast.success('Payment recorded');
        setIsPaymentOpen(false);
        setPaymentDate(toLocalDateTimeInputValue());
        router.refresh();
      } else {
        toast.error(res.error || 'The payment could not be saved. Try again.');
      }
    } finally {
      setUpdatingAction(null);
    }
  };

  const busyLabel = updatingAction === 'payment' ? 'Recording payment...' : updatingAction === 'whatsapp' ? 'Preparing WhatsApp...' : isDownloadingInvoice ? 'Generating invoice...' : 'Updating order...';
  const canPay = canEdit && canRecordPayment && order.customerId && order.status === 'PENDING';
  const canComplete = canEdit && (order.status === 'PENDING' || order.status === 'PAID');
  const canCancel = canEdit && order.status === 'PENDING';
  const openPayment = () => {
    setPaymentAmount(Number(order.totalAmount));
    setPaymentDate(toLocalDateTimeInputValue());
    setIsPaymentOpen(true);
  };

  const paymentDialog = (
      <Dialog 
        isOpen={isPaymentOpen} 
        onOpenChange={setIsPaymentOpen}
        title="Record payment"
      >
        <Form onSubmit={handleRecordPayment}>
          <FormSummary>
            <FormSummaryRow label="This sale" value={money.format(Number(order.totalAmount || 0))} />
            <FormSummaryRow
              label="Customer owes in total"
              value={money.format(Number(order.customer?.balanceOwed || 0))}
              strong
            />
          </FormSummary>

          <Input
            label="Amount paid"
            type="number"
            step="0.01"
            min="0"
            unit={money.currency}
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
            required
          />

          <Input
            label="Date and time paid"
            type="datetime-local"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />

          <FormActions>
            <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)} disabled={updatingAction === 'payment'}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" isLoading={updatingAction === 'payment'} loadingText="Saving">
              Record payment
            </Button>
          </FormActions>
        </Form>
      </Dialog>
  );

  if (variant === 'phone') {
    // Words, not bare icons; cancelling lives in the ⋯ menu.
    const named = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-ql-line px-3 font-ql-sans text-[13px] font-semibold text-ql-text disabled:opacity-50';
    return (
      <MutationBoundary active={!!updatingAction || isDownloadingInvoice} label={busyLabel} className="rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleDownloadInvoice} disabled={isDownloadingInvoice} className={named}>
            {isDownloadingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" strokeWidth={1.75} />}
            Receipt
          </button>
          <button type="button" onClick={handleShareWhatsApp} disabled={!!updatingAction || isDownloadingInvoice} className={named}>
            {updatingAction === 'whatsapp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" strokeWidth={1.75} />}
            WhatsApp
          </button>
          {canPay ? (
            <button type="button" onClick={openPayment} className={named}>
              <CreditCard className="h-4 w-4" strokeWidth={1.75} />
              Record payment
            </button>
          ) : null}
          {canComplete || canCancel ? (
            <QlOverflowMenu
              label="More actions for this order"
              disabled={!!updatingAction}
              items={[
                ...(canComplete ? [{ label: 'Mark completed', icon: CheckCircle2, onSelect: () => handleStatusUpdate('COMPLETED') }] : []),
                ...(canCancel ? [{ label: 'Cancel order', icon: XCircle, destructive: true, onSelect: () => handleStatusUpdate('CANCELLED') }] : []),
              ]}
            />
          ) : null}
          {paymentDialog}
        </div>
      </MutationBoundary>
    );
  }

  return (
    <MutationBoundary active={!!updatingAction || isDownloadingInvoice} label={busyLabel} className="rounded-md">
    <div className="flex items-center justify-end gap-2 px-2">
      <button 
        onClick={handleDownloadInvoice}
        disabled={isDownloadingInvoice}
        title="Download invoice"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2.5 hover:bg-fg/[0.06] text-fg-2 hover:text-fg-2 transition-colors border border-transparent hover:border-fg/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDownloadingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      </button>
      <button
        onClick={handleShareWhatsApp}
        disabled={!!updatingAction || isDownloadingInvoice}
        title="Download and share to WhatsApp web"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2.5 hover:bg-fg/[0.04] text-fg hover:text-fg transition-colors border border-transparent hover:border-fg/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {updatingAction === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
      </button>

      {canEdit && (
        <>
          {canRecordPayment && order.customerId && order.status === 'PENDING' && (
            <button aria-label="Record payment" 
              onClick={() => {
                setPaymentAmount(Number(order.totalAmount));
                setPaymentDate(toLocalDateTimeInputValue());
                setIsPaymentOpen(true);
              }}
              title="Record payment"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2.5 hover:bg-fg/[0.04] text-fg hover:text-fg transition-colors border border-transparent hover:border-fg/[0.08]"
            >
              <CreditCard className="w-4 h-4" />
            </button>
          )}
          
          {(order.status === 'PENDING' || order.status === 'PAID') && (
            <button 
              onClick={() => handleStatusUpdate('COMPLETED')}
              disabled={!!updatingAction}
              title="Mark as completed"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2.5 hover:bg-fg/[0.04] text-fg hover:text-fg transition-colors border border-transparent hover:border-fg/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updatingAction === 'completed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            </button>
          )}

          {order.status === 'PENDING' && (
            <button 
              onClick={() => handleStatusUpdate('CANCELLED')}
              disabled={!!updatingAction}
              title="Cancel order"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2.5 hover:bg-fg/[0.04] text-neg hover:text-neg transition-colors border border-transparent hover:border-fg/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updatingAction === 'cancelled' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            </button>
          )}
        </>
      )}

      {paymentDialog}
    </div>
    </MutationBoundary>
  );
}
