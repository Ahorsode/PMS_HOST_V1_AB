/**
 * The shared form system. Every form in the app is built from these pieces so
 * they all look and behave the same.
 *
 *   <Dialog isOpen={open} onOpenChange={setOpen} title="Record eggs">
 *     <Form onSubmit={handleSubmit}>
 *       <FormError>{error}</FormError>
 *       <FormSection title="How many">
 *         <Input label="Eggs collected" type="number" unit="eggs" required />
 *         <FormRow>
 *           <DateInput label="Date" />
 *           <Select label="Egg size" options={sizes} />
 *         </FormRow>
 *       </FormSection>
 *       <FormActions>
 *         <Button type="button" variant="outline" onClick={close}>Cancel</Button>
 *         <Button type="submit" variant="accent" isLoading={saving}>Save</Button>
 *       </FormActions>
 *     </Form>
 *   </Dialog>
 */
export { FormField, FieldFrame, fieldStyles, controlClass, useFieldIds } from './field';
export type { FieldControlProps, FieldShellProps } from './field';
export {
  Form,
  FormSection,
  FormRow,
  FormActions,
  FormError,
  FormNote,
  FormSummary,
  FormSummaryRow,
  MoreDetails,
  FormSteps,
  SheetContext,
} from './layout';
export {
  Textarea,
  NumberInput,
  DateInput,
  Segmented,
  OptionCards,
  Checkbox,
  Switch,
  SearchSelect,
} from './controls';
export type { ChoiceOption, CardOption, SearchSelectOption, TextareaProps } from './controls';
export { Input } from '@/components/ui/Input';
export type { InputProps } from '@/components/ui/Input';
export { Select } from '@/components/ui/Select';
export type { SelectProps } from '@/components/ui/Select';
export { Button } from '@/components/ui/Button';
export { Dialog, FormSheet, FormModal } from '@/components/ui/Dialog';
export { BreedSelect } from '@/components/ui/BreedSelect';
export { CountrySelect } from '@/components/ui/CountrySelect';
