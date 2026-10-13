import {
  Activity,
  Banknote,
  BarChart3,
  Crown,
  Egg,
  FileText,
  HeartPulse,
  LayoutDashboard,
  PawPrint,
  Settings,
  ShieldCheck,
  ThermometerSun,
  Truck,
  Users,
  Wallet,
  Wheat,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export type AppNavItem = {
  name: string;
  shortLabel: string;
  icon: LucideIcon;
  href: string;
  roles: string[];
};

export type AppNavCategory = {
  name: string;
  items: AppNavItem[];
};

export const APP_NAV_CATEGORIES: AppNavCategory[] = [
  {
    name: 'Operations',
    items: [
      { name: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, href: '/dashboard', roles: ['OWNER', 'MANAGER', 'WORKER', 'ACCOUNTANT', 'FINANCE_OFFICER'] },
      { name: 'Livestock', shortLabel: 'Flocks', icon: PawPrint, href: '/dashboard/flocks', roles: ['OWNER', 'MANAGER', 'WORKER'] },
      { name: 'Analytics', shortLabel: 'Stats', icon: BarChart3, href: '/dashboard/analytics/compare', roles: ['OWNER', 'MANAGER'] },
      { name: 'Houses', shortLabel: 'Houses', icon: ThermometerSun, href: '/dashboard/houses', roles: ['OWNER', 'MANAGER'] },
      { name: 'Eggs', shortLabel: 'Eggs', icon: Egg, href: '/dashboard/eggs', roles: ['OWNER', 'MANAGER', 'WORKER'] },
      { name: 'Feeding', shortLabel: 'Feed', icon: Wheat, href: '/dashboard/feed', roles: ['OWNER', 'MANAGER', 'WORKER'] },
      { name: 'Mortality', shortLabel: 'Losses', icon: XCircle, href: '/dashboard/mortality', roles: ['OWNER', 'MANAGER', 'WORKER'] },
      { name: 'Quarantine', shortLabel: 'Isolate', icon: Activity, href: '/dashboard/quarantine', roles: ['OWNER', 'MANAGER', 'WORKER'] },
      { name: 'Health', shortLabel: 'Health', icon: HeartPulse, href: '/dashboard/health', roles: ['OWNER', 'MANAGER', 'WORKER'] },
    ],
  },
  {
    name: 'Commercial Hub',
    items: [
      { name: 'Sales', shortLabel: 'Sales', icon: Banknote, href: '/dashboard/sales', roles: ['OWNER', 'MANAGER', 'WORKER', 'CASHIER', 'ACCOUNTANT', 'FINANCE_OFFICER'] },
      { name: 'Customers', shortLabel: 'Buyers', icon: Users, href: '/dashboard/sales/customers', roles: ['OWNER', 'MANAGER', 'CASHIER', 'ACCOUNTANT'] },
      { name: 'Suppliers', shortLabel: 'Supply', icon: Truck, href: '/dashboard/suppliers', roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'] },
      { name: 'Finance Control', shortLabel: 'Finance', icon: Wallet, href: '/dashboard/finance', roles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'FINANCE_OFFICER'] },
      { name: 'Reports', shortLabel: 'Reports', icon: FileText, href: '/dashboard/reports', roles: ['OWNER', 'MANAGER', 'ACCOUNTANT', 'FINANCE_OFFICER'] },
      { name: 'Inventory', shortLabel: 'Stock', icon: LayoutDashboard, href: '/dashboard/inventory', roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'] },
    ],
  },
  {
    name: 'Governance',
    items: [
      { name: 'Audit Logs', shortLabel: 'Audit', icon: ShieldCheck, href: '/dashboard/admin/logs', roles: ['OWNER', 'MANAGER'] },
      { name: 'Team Management', shortLabel: 'Team', icon: Users, href: '/dashboard/team', roles: ['OWNER', 'MANAGER'] },
      { name: 'License Upgrade', shortLabel: 'License', icon: Crown, href: '/dashboard/license-upgrade', roles: ['OWNER', 'MANAGER'] },
      { name: 'Settings', shortLabel: 'Settings', icon: Settings, href: '/dashboard/settings', roles: ['OWNER', 'MANAGER'] },
    ],
  },
];

/** First matches that the current role can see become the docked tabs. */
export const PRIMARY_NAV_HREFS = [
  '/dashboard',
  '/dashboard/flocks',
  '/dashboard/eggs',
  '/dashboard/sales',
  '/dashboard/feed',
  '/dashboard/finance',
  '/dashboard/reports',
];

export function isNavItemActive(
  pathname: string,
  href: string,
  items: { href: string }[],
) {
  if (pathname === href) return true;
  if (href === '/dashboard') return false;
  if (!pathname.startsWith(`${href}/`)) return false;

  return !items.some(
    (other) =>
      other.href !== href &&
      other.href.startsWith(`${href}/`) &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`)),
  );
}
