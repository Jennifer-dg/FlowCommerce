import { Permission, Role } from '@flowcommerce/types';

// Matriz estática que asigna a cada rol los permisos que puede ejercer.
// Es la única fuente de verdad de "qué puede hacer cada rol?".
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: [
    Permission.PROJECT_READ,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.MEMBER_READ,
    Permission.MEMBER_INVITE,
    Permission.MEMBER_UPDATE_ROLE,
    Permission.MEMBER_REMOVE,
    Permission.RESOURCE_READ,
    Permission.RESOURCE_CREATE,
    Permission.RESOURCE_UPDATE,
    Permission.RESOURCE_DELETE,
  ],
  ADMIN: [
    Permission.PROJECT_READ,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_INVITE,
    Permission.MEMBER_UPDATE_ROLE,
    Permission.MEMBER_REMOVE,
    Permission.RESOURCE_READ,
    Permission.RESOURCE_CREATE,
    Permission.RESOURCE_UPDATE,
    Permission.RESOURCE_DELETE,
  ],
  MEMBER: [
    Permission.PROJECT_READ,
    Permission.MEMBER_READ,
    Permission.RESOURCE_READ,
    Permission.RESOURCE_CREATE,
    Permission.RESOURCE_UPDATE,
  ],
  VIEWER: [
    Permission.PROJECT_READ,
    Permission.MEMBER_READ,
    Permission.RESOURCE_READ,
  ],
};

// Devuelve true si el rol tiene el permiso indicado.
export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Devuelve true si el rol tiene TODOS los permisos indicados.
export function roleHasAllPermissions(
  role: Role,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => roleHasPermission(role, permission));
}

// Devuelve true si el rol tiene AL MENOS UNO de los permisos indicados.
export function roleHasAnyPermission(
  role: Role,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => roleHasPermission(role, permission));
}
