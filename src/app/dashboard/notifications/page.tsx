import { redirect } from 'next/navigation';

/** Notifications now live in the Inbox, alongside messages from the team. */
export default function NotificationsPage() {
  redirect('/dashboard/inbox?show=alerts');
}
