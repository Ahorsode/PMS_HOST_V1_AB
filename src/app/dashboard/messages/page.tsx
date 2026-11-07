import { redirect } from 'next/navigation';

/** Messages now live in the Inbox, alongside farm notifications. */
export default function MessagesPage() {
  redirect('/dashboard/inbox?show=messages');
}
