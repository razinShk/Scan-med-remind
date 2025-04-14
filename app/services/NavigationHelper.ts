/**
 * NavigationHelper.ts
 * 
 * This file provides consistent route paths for navigation throughout the app.
 * Always use these constants when navigating between screens to avoid typing errors
 * and ensure consistency.
 */

export const ROUTES = {
  // Main screens
  HOME: '/home',
  
  // Feature screens
  PROFILE: '/profile',
  SUBSCRIPTION: '/subscription/index',
  NURSE: '/nurse/index',
  CALENDAR: '/calendar/index',
  HISTORY: '/history/index',
  REFILLS: '/refills/index',
  
  // Authentication
  AUTH: '/auth',
  
  // Medication management
  MEDICATIONS_ADD: '/medications/add',
  MEDICATIONS_EDIT: '/medications/edit',
  
  // Other utilities
  SCAN: '/scan',
} as const; 