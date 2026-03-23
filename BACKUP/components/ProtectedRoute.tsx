import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth';

interface Props {
    allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<Props> = ({ allowedRoles }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // 1. Não está autenticado? Manda para login
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Está autenticado mas não tem permissão?
    // Normalizar role do user (lidar com legacy "Administrador", etc)
    let normalizedRole: UserRole = UserRole.COLLABORATOR;
    const r = user.role;
    if (r === UserRole.ADMIN || r === 'ADMIN' || r === 'Administrador') normalizedRole = UserRole.ADMIN;
    else if (r === UserRole.AUDITOR || r === 'AUDITOR' || r === 'Auditor') normalizedRole = UserRole.AUDITOR;
    else normalizedRole = UserRole.COLLABORATOR;

    // Check if the NORMALIZED role is allowed
    // We also need to check if the allowedRoles array contains the generic string match if strict enum is used
    // Ideally allowedRoles are Enums.
    const hasAccess = allowedRoles.includes(normalizedRole);

    if (!hasAccess) {
        // Redirect to a safe page (Portal) instead of broken /unauthorized
        return <Navigate to="/portal" replace />;
    }

    // 3. Sucesso: Renderiza a rota filha
    return <Outlet />;
};
