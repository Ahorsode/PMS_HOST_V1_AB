import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-medium text-fg-2">
      <Link 
        href="/dashboard" 
        className="hover:text-fg transition-colors flex items-center gap-1 group"
      >
        <Home className="h-5 w-5 transition-transform" aria-label="Dashboard" />
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-5 w-5 text-fg-3" aria-hidden="true" />
          {item.href ? (
            <Link 
              href={item.href} 
              className="hover:text-fg transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-semibold text-fg">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
