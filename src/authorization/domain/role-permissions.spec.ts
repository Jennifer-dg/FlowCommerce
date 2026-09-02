import { Permission, Role } from '@flowcommerce/types';
import {
  roleHasAllPermissions,
  roleHasAnyPermission,
  roleHasPermission,
  ROLE_PERMISSIONS,
} from './role-permissions';

describe('role-permissions matrix', () => {
  it('defines a permission set for every role', () => {
    for (const role of [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });

  it('grants OWNER every permission', () => {
    for (const permission of Object.values(Permission)) {
      expect(roleHasPermission(Role.OWNER, permission)).toBe(true);
    }
  });

  it('gives ADMIN full operational control except PROJECT_DELETE', () => {
    expect(roleHasPermission(Role.ADMIN, Permission.PROJECT_DELETE)).toBe(
      false,
    );
    expect(roleHasPermission(Role.ADMIN, Permission.PROJECT_UPDATE)).toBe(true);
    expect(roleHasPermission(Role.ADMIN, Permission.MEMBER_INVITE)).toBe(true);
    expect(roleHasPermission(Role.ADMIN, Permission.MEMBER_REMOVE)).toBe(true);
    expect(roleHasPermission(Role.ADMIN, Permission.RESOURCE_DELETE)).toBe(
      true,
    );
  });

  it('keeps MEMBER read/mutate resources but no member management', () => {
    expect(roleHasPermission(Role.MEMBER, Permission.RESOURCE_CREATE)).toBe(
      true,
    );
    expect(roleHasPermission(Role.MEMBER, Permission.RESOURCE_UPDATE)).toBe(
      true,
    );
    expect(roleHasPermission(Role.MEMBER, Permission.RESOURCE_DELETE)).toBe(
      false,
    );
    expect(roleHasPermission(Role.MEMBER, Permission.MEMBER_INVITE)).toBe(
      false,
    );
    expect(roleHasPermission(Role.MEMBER, Permission.PROJECT_UPDATE)).toBe(
      false,
    );
  });

  it('restricts VIEWER to read-only access', () => {
    expect(roleHasPermission(Role.VIEWER, Permission.PROJECT_READ)).toBe(true);
    expect(roleHasPermission(Role.VIEWER, Permission.MEMBER_READ)).toBe(true);
    expect(roleHasPermission(Role.VIEWER, Permission.RESOURCE_READ)).toBe(true);
    expect(roleHasPermission(Role.VIEWER, Permission.PROJECT_UPDATE)).toBe(
      false,
    );
    expect(roleHasPermission(Role.VIEWER, Permission.RESOURCE_CREATE)).toBe(
      false,
    );
    expect(roleHasPermission(Role.VIEWER, Permission.RESOURCE_DELETE)).toBe(
      false,
    );
  });

  it('evaluates ALL vs ANY semantics', () => {
    expect(
      roleHasAllPermissions(Role.ADMIN, [
        Permission.MEMBER_READ,
        Permission.MEMBER_INVITE,
      ]),
    ).toBe(true);
    expect(
      roleHasAnyPermission(Role.MEMBER, [
        Permission.PROJECT_DELETE,
        Permission.RESOURCE_CREATE,
      ]),
    ).toBe(true);
    expect(
      roleHasAllPermissions(Role.MEMBER, [
        Permission.RESOURCE_DELETE,
        Permission.MEMBER_INVITE,
      ]),
    ).toBe(false);
  });
});
