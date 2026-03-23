import React from 'react';

/**
 * KioskDashboardSkeleton - Loading state para KioskDashboard
 *
 * Features:
 * - Layout similar ao dashboard real
 * - Pulse animation suave
 * - Shimmer effect para polish
 * - Dark mode support
 * - Responsive design
 */
const KioskDashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-24 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>

      {/* Clock Time Display Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="h-16 w-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>

      {/* Main Action Button Skeleton (Clock In/Out) */}
      <div className="mb-6">
        <div className="h-16 w-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl shadow-lg relative overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-shimmer">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </div>
      </div>

      {/* Stats Cards Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            {/* Icon */}
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />

            {/* Label */}
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />

            {/* Value */}
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      {/* Recent Activity List Skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />

        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
          >
            {/* Avatar */}
            <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>

            {/* Action */}
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default KioskDashboardSkeleton;
