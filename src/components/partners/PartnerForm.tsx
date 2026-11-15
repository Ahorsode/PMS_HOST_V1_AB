"use client";

import React, { useState } from 'react';
import {
  Button,
  Form,
  FormActions,
  FormRow,
  FormSection,
  Input,
  MoreDetails,
  Textarea,
} from '@/components/ui/form';
import { createCustomer } from '@/lib/actions/customer-actions';
import { createSupplier } from '@/lib/actions/supplier-actions';
import { toast } from 'sonner';
import { useMoney } from '@/components/providers/CurrencyProvider'

interface PartnerFormProps {
  setIsOpen: (val: boolean) => void;
  defaultType?: 'buyer' | 'supplier';
  onSuccess?: (partner: any) => void;
}

export function PartnerForm({ setIsOpen, defaultType = 'supplier', onSuccess }: PartnerFormProps) {
  const money = useMoney()
  const [isSubmitting, setIsSubmitting] = useState(false);
  const partnerType = defaultType;

  const [balanceOwed, setBalanceOwed] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      balanceOwed: Number(balanceOwed) || 0,
    };

    setIsSubmitting(true);
    let res: any;
    if (partnerType === 'supplier') {
      res = await createSupplier(data);
    } else {
      res = await createCustomer(data);
    }
    setIsSubmitting(false);

    if (res.success) {
      const partner = res.supplier || res.customer;
      toast.success(`${partnerType === 'supplier' ? 'Supplier' : 'Customer'} added`);
      if (onSuccess && partner) {
        onSuccess(partner);
      }
      setIsOpen(false);
    } else {
      toast.error(res.error || 'That could not be saved. Try again.');
    }
  };

  const isSupplier = partnerType === 'supplier';

  return (
    <Form onSubmit={handleSubmit}>
      <input type="hidden" name="partnerType" value={partnerType} />

      <FormSection title={isSupplier ? 'Supplier' : 'Customer'}>
        <Input
          label={isSupplier ? 'Supplier or company name' : 'Name or company'}
          name="name"
          required
          autoFocus
          placeholder={isSupplier ? 'e.g. Agro Feeds Ltd' : 'e.g. Ama Owusu or Kumasi Cold Store'}
        />
        <FormRow>
          <Input label="Phone" optional name="phone" type="tel" inputMode="tel" placeholder="e.g. 0241234567" />
          <Input label="Email" optional name="email" type="email" placeholder="e.g. orders@agrofeeds.com" />
        </FormRow>
      </FormSection>

      <MoreDetails label="Address and money already owed">
        <Textarea
          label="Address"
          optional
          name="address"
          rows={2}
          placeholder={isSupplier ? 'e.g. Warehouse, Kejetia, Kumasi' : 'e.g. Shop 12, Adum, Kumasi'}
        />
        <Input
          label={isSupplier ? 'You already owe them' : 'They already owe you'}
          optional
          name="balanceOwed"
          type="number"
          step="0.01"
          min="0"
          unit={money.currency}
          hint="Any old balance from before you started using Poultry Ledger."
          value={balanceOwed}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || Number(val) >= 0) {
              setBalanceOwed(val);
            }
          }}
          placeholder="0.00"
        />
      </MoreDetails>

      <FormActions>
        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" isLoading={isSubmitting} loadingText="Saving">
          {isSupplier ? 'Add supplier' : 'Add customer'}
        </Button>
      </FormActions>
    </Form>
  );
}
