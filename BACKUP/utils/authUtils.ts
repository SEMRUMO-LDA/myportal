/**
 * Auth Utilities
 * Centralized logic for role-based access control
 */

/**
 * Normalizes a role name for comparison (removes accents, lowercase, trim)
 * Example: "Responsável de Departamento" -> "responsavel de departamento"
 */
export function normalizeRoleName(name: string): string {
    if (!name) return '';
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/**
 * List of roles that should have full administrative access
 */
export const ADMIN_ROLES_NORMALIZED = [
    'admin',
    'administrador',
    'responsavel de departamento',
    'diretor de unidade',
    'rh',
    'recursos humanos',
    'ceo',
    'diretor geral',
    'gerente'
];

/**
 * Checks if a normalized role name has admin access
 */
export function isAdminRole(normalizedRole: string): boolean {
    return ADMIN_ROLES_NORMALIZED.includes(normalizedRole);
}
/**
 * Returns a standardized display name for a role
 */
export function getRoleDisplayName(role: string): string {
    if (!role) return '';
    const normalized = normalizeRoleName(role);
    
    // Normalize "Collaborator" variations
    if (normalized === 'collaborator' || normalized === 'colaborador') {
        return 'Colaborador';
    }
    
    // Normalize "Admin" variations
    if (normalized === 'admin' || normalized === 'administrador') {
        return 'Administrador';
    }
    
    // Handle other known admin roles from ADMIN_ROLES_NORMALIZED
    if (isAdminRole(normalized)) {
        // Capitalize words for nice display (e.g., "diretor de unidade" -> "Diretor de Unidade")
        return role.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    return role;
}
