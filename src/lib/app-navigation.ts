import {
  Activity,
  Banknote,
  BarChart3,
  Briefcase,
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
  User,
  Users,
  Wallet,
  Wheat,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { canShowNavigationItem } from './navigation-permissions';

export type AppNavItem = {
  name: string;
  shortLabel: string;
  icon: LucideIcon;
  href: string;
  roles: string[];
};

export type AppNavCategory = {
  id: 'farm' | 'business' | 'governance';
  name: string;
  icon: LucideIcon;
  items: AppNavItem[];
};

const ALL_ROLES = ['OWNER', 'MANAGER', 'WORKER', 'CASHIER', 'ACCOUNTANT', 'FINANCE_OFFICER'];

/** Direct link shown as its own icon ahead of the groups in the rail and mobile tab bar. */
export const DASHBOARD_NAV_ITEM: AppNavItem = {
  name: 'Dashboard',
  shortLabel: 'Home',
  icon: LayoutDashboard,
  href: '/dashboard',
  roles: ['OWNER', 'MANAGER', 'WORKER', 'ACCOUNTANT', 'FINANCE_OFFICER'],
};

/** The three groups shown as icons (after Dashboard) in the sidebar rail and mobile tab bar. */
export const APP_NAV_CATEGORIES: AppNavCategory[] = [
  {
    id: 'farm',
    name: 'Farm',
    icon: PawPrint,
    items: [
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
    id: 'business',
    name: 'Business',
    icon: Briefcase,
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
    id: 'governance',
    name: 'Governance',
    icon: ShieldCheck,
    items: [
      { name: 'My Profile', shortLabel: 'Profile', icon: User, href: '/dashboard/profile', roles: ALL_ROLES },
      { name: 'Team Management', shortLabel: 'Team', icon: Users, href: '/dashboard/team', roles: ['OWNER', 'MANAGER'] },
      { name: 'Audit Logs', shortLabel: 'Audit', icon: ShieldCheck, href: '/dashboard/admin/logs', roles: ['OWNER', 'MANAGER'] },
      { name: 'License Upgrade', shortLabel: 'License', icon: Crown, href: '/dashboard/license-upgrade', roles: ['OWNER', 'MANAGER'] },
      { name: 'Settings', shortLabel: 'Settings', icon: Settings, href: '/dashboard/settings', roles: ['OWNER', 'MANAGER'] },
    ],
  },
];

export function canShowDashboardNavItem(
  role?: string,
  permissions?: Record<string, boolean | null | undefined> | null,
) {
  return canShowNavigationItem({
    name: DASHBOARD_NAV_ITEM.name,
    role,
    roles: DASHBOARD_NAV_ITEM.roles,
    permissions,
  });
}

/** Categories with only the items this role/permission set may see; empty groups are dropped. */
export function getVisibleNavCategories(
  role?: string,
  permissions?: Record<string, boolean | null | undefined> | null,
): AppNavCategory[] {
  return APP_NAV_CATEGORIES.map((category) => ({
    ...category,
    items: category.items.filter((item) =>
      canShowNavigationItem({ name: item.name, role, roles: item.roles, permissions }),
    ),
  })).filter((category) => category.items.length > 0);
}

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

/** The group whose pages include the current route, so the rail can highlight it. */
export function getActiveNavCategoryId(
  pathname: string,
  categories: AppNavCategory[],
): AppNavCategory['id'] | null {
  const allItems = categories.flatMap((category) => category.items);
  const match = categories.find((category) =>
    category.items.some((item) => isNavItemActive(pathname, item.href, allItems)),
  );
  return match?.id ?? null;
}
