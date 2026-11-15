import { redirect } from 'next/navigation'

/** Merged into the Desktop licenses page; kept so old links still work. */
export default function MovedPage() {
  redirect('/admin/licenses')
}
