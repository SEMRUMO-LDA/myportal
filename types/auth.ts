export enum UserRole {
    ADMIN = 'ADMIN',
    COLLABORATOR = 'COLLABORATOR',
    AUDITOR = 'AUDITOR'
}

export interface Permission {
    code: string;
    description: string;
    category: string;
}

export interface UserSession {
    id: string;
    name: string;
    role: UserRole | string;
    permissions: string[];
    email?: string;
    companyId?: string;
    token?: string; // Optional JWT if applicable
}
