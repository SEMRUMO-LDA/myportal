import { useMemo } from 'react';
import { User, Department, Location } from '../types';
import { FULL_ACCESS_ROLES } from '../constants';

interface UseVisibleUsersResult {
  visibleUsers: User[];
  isFullAccess: boolean;
  isDepartmentManager: boolean;
  isLocationResponsible: boolean;
  managedDepartmentNames: string[];
  managedLocationIds: number[];
  canInteractWith: (userId: number) => boolean;
}

export function useVisibleUsers(
  currentUser: User | null,
  allUsers: User[],
  departments: Department[],
  locations: Location[]
): UseVisibleUsersResult {
  return useMemo(() => {
    if (!currentUser) {
      return {
        visibleUsers: [],
        isFullAccess: false,
        isDepartmentManager: false,
        isLocationResponsible: false,
        managedDepartmentNames: [],
        managedLocationIds: [],
        canInteractWith: () => false
      };
    }

    // 1. Check full access (case-insensitive)
    const roleUpper = (currentUser.role || '').toUpperCase();
    const isFullAccess = FULL_ACCESS_ROLES.some(
      r => r.toUpperCase() === roleUpper
    );

    // 2. Departments managed by current user
    const managedDepartmentNames = departments
      .filter(d => d.managerId === currentUser.id)
      .map(d => d.name);
    const isDepartmentManager = managedDepartmentNames.length > 0;

    // 3. Locations managed by current user
    const managedLocationIds = locations
      .filter(l => l.managerId === currentUser.id)
      .map(l => l.id);
    const isLocationResponsible = managedLocationIds.length > 0;

    // 4. Filter users
    let visibleUsers: User[];
    if (isFullAccess) {
      visibleUsers = allUsers;
    } else if (isDepartmentManager || isLocationResponsible) {
      visibleUsers = allUsers.filter(u => {
        // Always see yourself
        if (u.id === currentUser.id) return true;
        // Department match
        if (isDepartmentManager && managedDepartmentNames.includes(u.department)) return true;
        // Location match (check both legacy locationId and modern locationIds)
        if (isLocationResponsible) {
          if (u.locationId && managedLocationIds.includes(u.locationId)) return true;
          if (u.locationIds && u.locationIds.some(lid => managedLocationIds.includes(lid))) return true;
        }
        return false;
      });
    } else {
      // Regular collaborator: only themselves
      visibleUsers = allUsers.filter(u => u.id === currentUser.id);
    }

    // 5. canInteractWith helper (O(1) lookup)
    const visibleUserIds = new Set(visibleUsers.map(u => u.id));
    const canInteractWith = (userId: number) => visibleUserIds.has(userId);

    return {
      visibleUsers,
      isFullAccess,
      isDepartmentManager,
      isLocationResponsible,
      managedDepartmentNames,
      managedLocationIds,
      canInteractWith
    };
  }, [currentUser, allUsers, departments, locations]);
}
