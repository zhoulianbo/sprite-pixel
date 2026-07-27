/**
 * RBAC Initialization Script
 *
 * This script initializes the RBAC system with default roles and permissions.
 *
 * Usage:
 *   npx tsx scripts/init-rbac.ts
 *   npx tsx scripts/init-rbac.ts --local
 *   npx tsx scripts/init-rbac.ts --remote
 *
 * Optional: Assign super_admin role to a user
 *   npx tsx scripts/init-rbac.ts --admin-email=your@email.com
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { getUuid } from '@/shared/lib/hash';

async function loadSchemaTables(): Promise<any> {
  if (envConfigs.database_provider === 'mysql') {
    return (await import('@/config/db/schema.mysql')) as any;
  }

  if (['sqlite', 'turso', 'd1'].includes(envConfigs.database_provider)) {
    return (await import('@/config/db/schema.sqlite')) as any;
  }

  // Default: PostgreSQL
  return (await import('@/config/db/schema')) as any;
}

// Default permissions
const defaultPermissions = [
  // Admin access
  {
    code: 'admin.access',
    resource: 'admin',
    action: 'access',
    title: 'Admin Access',
    description: 'Access to admin area',
  },

  // Users management
  {
    code: 'admin.users.read',
    resource: 'users',
    action: 'read',
    title: 'Read Users',
    description: 'View user list and details',
  },
  {
    code: 'admin.users.write',
    resource: 'users',
    action: 'write',
    title: 'Write Users',
    description: 'Create and update users',
  },
  {
    code: 'admin.users.delete',
    resource: 'users',
    action: 'delete',
    title: 'Delete Users',
    description: 'Delete users',
  },

  // Posts management
  {
    code: 'admin.posts.read',
    resource: 'posts',
    action: 'read',
    title: 'Read Posts',
    description: 'View post list and details',
  },
  {
    code: 'admin.posts.write',
    resource: 'posts',
    action: 'write',
    title: 'Write Posts',
    description: 'Create and update posts',
  },
  {
    code: 'admin.posts.delete',
    resource: 'posts',
    action: 'delete',
    title: 'Delete Posts',
    description: 'Delete posts',
  },

  // Categories management
  {
    code: 'admin.categories.read',
    resource: 'categories',
    action: 'read',
    title: 'Read Categories',
    description: 'View category list and details',
  },
  {
    code: 'admin.categories.write',
    resource: 'categories',
    action: 'write',
    title: 'Write Categories',
    description: 'Create and update categories',
  },
  {
    code: 'admin.categories.delete',
    resource: 'categories',
    action: 'delete',
    title: 'Delete Categories',
    description: 'Delete categories',
  },

  // Payments management
  {
    code: 'admin.payments.read',
    resource: 'payments',
    action: 'read',
    title: 'Read Payments',
    description: 'View payment list and details',
  },

  // Subscriptions management
  {
    code: 'admin.subscriptions.read',
    resource: 'subscriptions',
    action: 'read',
    title: 'Read Subscriptions',
    description: 'View subscription list and details',
  },

  // Credits management
  {
    code: 'admin.credits.read',
    resource: 'credits',
    action: 'read',
    title: 'Read Credits',
    description: 'View credit list and details',
  },
  {
    code: 'admin.credits.write',
    resource: 'credits',
    action: 'write',
    title: 'Write Credits',
    description: 'Grant or consume credits',
  },

  // API Keys management
  {
    code: 'admin.apikeys.read',
    resource: 'apikeys',
    action: 'read',
    title: 'Read API Keys',
    description: 'View API key list and details',
  },
  {
    code: 'admin.apikeys.write',
    resource: 'apikeys',
    action: 'write',
    title: 'Write API Keys',
    description: 'Create and update API keys',
  },
  {
    code: 'admin.apikeys.delete',
    resource: 'apikeys',
    action: 'delete',
    title: 'Delete API Keys',
    description: 'Delete API keys',
  },

  // Settings management
  {
    code: 'admin.settings.read',
    resource: 'settings',
    action: 'read',
    title: 'Read Settings',
    description: 'View system settings',
  },
  {
    code: 'admin.settings.write',
    resource: 'settings',
    action: 'write',
    title: 'Write Settings',
    description: 'Update system settings',
  },

  // Roles & Permissions management
  {
    code: 'admin.roles.read',
    resource: 'roles',
    action: 'read',
    title: 'Read Roles',
    description: 'View roles and permissions',
  },
  {
    code: 'admin.roles.write',
    resource: 'roles',
    action: 'write',
    title: 'Write Roles',
    description: 'Create and update roles',
  },
  {
    code: 'admin.roles.delete',
    resource: 'roles',
    action: 'delete',
    title: 'Delete Roles',
    description: 'Delete roles',
  },

  // Permissions management
  {
    code: 'admin.permissions.read',
    resource: 'permissions',
    action: 'read',
    title: 'Read Permissions',
    description: 'View permission list and details',
  },
  {
    code: 'admin.permissions.write',
    resource: 'permissions',
    action: 'write',
    title: 'Write Permissions',
    description: 'Create and update permissions',
  },
  {
    code: 'admin.permissions.delete',
    resource: 'permissions',
    action: 'delete',
    title: 'Delete Permissions',
    description: 'Delete permissions',
  },

  // AI Tasks management
  {
    code: 'admin.ai-tasks.read',
    resource: 'ai-tasks',
    action: 'read',
    title: 'Read AI Tasks',
    description: 'View AI task list and details',
  },
  {
    code: 'admin.ai-tasks.write',
    resource: 'ai-tasks',
    action: 'write',
    title: 'Write AI Tasks',
    description: 'Create and update AI tasks',
  },
  {
    code: 'admin.ai-tasks.delete',
    resource: 'ai-tasks',
    action: 'delete',
    title: 'Delete AI Tasks',
    description: 'Delete AI tasks',
  },

  // Wildcard permission for super admin
  {
    code: '*',
    resource: 'all',
    action: 'all',
    title: 'Super Admin',
    description: 'All permissions (super admin only)',
  },
];

// Default roles and their permissions
const defaultRoles = [
  {
    name: 'super_admin',
    title: 'Super Admin',
    description: 'Full system access with all permissions',
    status: 'active',
    sort: 1,
    permissions: ['*'], // All permissions
  },
  {
    name: 'admin',
    title: 'Admin',
    description: 'Administrator with most permissions',
    status: 'active',
    sort: 2,
    permissions: [
      'admin.access',
      'admin.users.*',
      'admin.posts.*',
      'admin.categories.*',
      'admin.payments.*',
      'admin.subscriptions.*',
      'admin.credits.*',
      'admin.apikeys.*',
      'admin.settings.read',
      'admin.ai-tasks.*',
    ],
  },
  {
    name: 'editor',
    title: 'Editor',
    description: 'Content editor with limited permissions',
    status: 'active',
    sort: 3,
    permissions: [
      'admin.access',
      'admin.posts.read',
      'admin.posts.write',
      'admin.categories.read',
      'admin.categories.write',
    ],
  },
  {
    name: 'viewer',
    title: 'Viewer',
    description: 'Read-only access to admin area',
    status: 'active',
    sort: 4,
    permissions: [
      'admin.access',
      'admin.users.read',
      'admin.posts.read',
      'admin.categories.read',
      'admin.payments.read',
      'admin.subscriptions.read',
      'admin.credits.read',
    ],
  },
];

type D1Target = 'local' | 'remote';

function getCliArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

function hasD1BindingConfig(): boolean {
  const configFiles = ['wrangler.toml', 'wrangler.jsonc', 'wrangler.json'];

  return configFiles.some((configFile) => {
    if (!existsSync(configFile)) return false;

    const config = readFileSync(configFile, 'utf8');
    return (
      config.includes('[[d1_databases]]') || config.includes('"d1_databases"')
    );
  });
}

function getD1Target(): D1Target | undefined {
  const args = process.argv.slice(2);
  const useLocal = args.includes('--local');
  const useRemote = args.includes('--remote');

  if (useLocal && useRemote) {
    throw new Error('Use only one of --local or --remote');
  }

  if (useRemote) return 'remote';
  if (useLocal) return 'local';

  if (envConfigs.database_provider === 'd1') return 'local';

  // Standalone scripts do not load Next.js .env fallback files. If no database
  // provider/URL was loaded but this project declares a D1 binding, use the
  // local D1 database instead of incorrectly falling back to PostgreSQL.
  if (
    !process.env.DATABASE_PROVIDER &&
    !process.env.DATABASE_URL &&
    hasD1BindingConfig()
  ) {
    return 'local';
  }

  return undefined;
}

function escapeSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function buildD1RbacSql(adminEmail?: string): string {
  const statements: string[] = [];

  for (const permission of defaultPermissions) {
    statements.push(`
INSERT OR IGNORE INTO permission (
  id, code, resource, action, title, description
) VALUES (
  ${escapeSqlString(getUuid())},
  ${escapeSqlString(permission.code)},
  ${escapeSqlString(permission.resource)},
  ${escapeSqlString(permission.action)},
  ${escapeSqlString(permission.title)},
  ${escapeSqlString(permission.description)}
);`);
  }

  for (const roleData of defaultRoles) {
    statements.push(`
INSERT OR IGNORE INTO role (
  id, name, title, description, status, sort
) VALUES (
  ${escapeSqlString(getUuid())},
  ${escapeSqlString(roleData.name)},
  ${escapeSqlString(roleData.title)},
  ${escapeSqlString(roleData.description)},
  ${escapeSqlString(roleData.status)},
  ${roleData.sort}
);`);

    statements.push(`
DELETE FROM role_permission
WHERE role_id = (SELECT id FROM role WHERE name = ${escapeSqlString(roleData.name)});`);

    const permissionCodes = roleData.permissions.flatMap((permissionCode) => {
      if (!permissionCode.endsWith('.*')) return [permissionCode];

      const prefix = permissionCode.slice(0, -2);
      return defaultPermissions
        .map((permission) => permission.code)
        .filter((code) => code.startsWith(`${prefix}.`));
    });

    for (const permissionCode of permissionCodes) {
      statements.push(`
INSERT INTO role_permission (id, role_id, permission_id)
SELECT
  ${escapeSqlString(getUuid())},
  role.id,
  permission.id
FROM role
JOIN permission ON permission.code = ${escapeSqlString(permissionCode)}
WHERE role.name = ${escapeSqlString(roleData.name)};`);
    }
  }

  if (adminEmail) {
    statements.push(`
INSERT INTO user_role (id, user_id, role_id)
SELECT
  ${escapeSqlString(getUuid())},
  "user".id,
  role.id
FROM "user"
JOIN role ON role.name = 'super_admin'
WHERE "user".email = ${escapeSqlString(adminEmail)}
  AND NOT EXISTS (
    SELECT 1
    FROM user_role
    WHERE user_role.user_id = "user".id
      AND user_role.role_id = role.id
  );`);
  }

  return statements.join('\n');
}

function initializeD1RBAC(target: D1Target) {
  const database = getCliArgument('database') || 'DB';
  const adminEmail = getCliArgument('admin-email');
  const targetFlag = target === 'remote' ? '--remote' : '--local';
  const tempDirectory = mkdtempSync(join(tmpdir(), 'saas-template-rbac-'));
  const sqlFile = join(tempDirectory, 'init-rbac.sql');

  console.log(
    `🗄️  Using ${target} D1 database via Wrangler binding: ${database}\n`
  );

  try {
    writeFileSync(sqlFile, buildD1RbacSql(adminEmail), 'utf8');
    execFileSync(
      'pnpm',
      [
        'exec',
        'wrangler',
        'd1',
        'execute',
        database,
        targetFlag,
        '--file',
        sqlFile,
      ],
      {
        cwd: process.cwd(),
        stdio: 'inherit',
      }
    );
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }

  console.log('\n✅ RBAC initialization completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Permissions: ${defaultPermissions.length}`);
  console.log(`   - Roles: ${defaultRoles.length}`);

  if (adminEmail) {
    console.log(`   - Requested super_admin assignment: ${adminEmail}`);
  } else {
    console.log('\nℹ️  To assign super_admin to a user, add:');
    console.log('   --admin-email=your@email.com');
  }
}

async function initializeRBAC() {
  console.log('🚀 Starting RBAC initialization...\n');

  try {
    const d1Target = getD1Target();
    if (d1Target) {
      initializeD1RBAC(d1Target);
      return;
    }

    const { permission, role, rolePermission, user, userRole } =
      (await loadSchemaTables()) as any;

    // 1. Create permissions
    console.log('📝 Creating permissions...');
    const createdPermissions: Record<string, string> = {};

    for (const perm of defaultPermissions) {
      // Check if permission already exists
      const [existing] = await db()
        .select()
        .from(permission)
        .where(eq(permission.code, perm.code));

      if (existing) {
        console.log(`   ✓ Permission already exists: ${perm.code}`);
        createdPermissions[perm.code] = existing.id;
      } else {
        const id = getUuid();
        await db()
          .insert(permission)
          .values({ id, ...perm });
        createdPermissions[perm.code] = id;
        console.log(`   ✓ Created permission: ${perm.code}`);
      }
    }

    console.log(
      `\n✅ Created ${Object.keys(createdPermissions).length} permissions\n`
    );

    // 2. Create roles and assign permissions
    console.log('👥 Creating roles...');
    const createdRoles: Record<string, string> = {};

    for (const roleData of defaultRoles) {
      // Check if role already exists
      const [existingRole] = await db()
        .select()
        .from(role)
        .where(eq(role.name, roleData.name));

      let roleId: string;

      if (existingRole) {
        console.log(`   ✓ Role already exists: ${roleData.name}`);
        roleId = existingRole.id;
      } else {
        const id = getUuid();
        await db().insert(role).values({
          id,
          name: roleData.name,
          title: roleData.title,
          description: roleData.description,
          status: roleData.status,
          sort: roleData.sort,
        });
        roleId = id;
        console.log(`   ✓ Created role: ${roleData.name}`);
      }

      createdRoles[roleData.name] = roleId;

      // Clear existing permissions for this role
      await db()
        .delete(rolePermission)
        .where(eq(rolePermission.roleId, roleId));

      // Assign permissions to role
      for (const permCode of roleData.permissions) {
        // Handle wildcard permissions (e.g., "admin.posts.*")
        if (permCode.endsWith('.*')) {
          const prefix = permCode.slice(0, -2); // Remove ".*"
          const matchingPerms = Object.entries(createdPermissions)
            .filter(([code]) => code.startsWith(prefix + '.'))
            .map(([, id]) => id);

          for (const permId of matchingPerms) {
            await db().insert(rolePermission).values({
              id: getUuid(),
              roleId,
              permissionId: permId,
            });
          }
        } else {
          const permId = createdPermissions[permCode];
          if (permId) {
            await db().insert(rolePermission).values({
              id: getUuid(),
              roleId,
              permissionId: permId,
            });
          }
        }
      }

      console.log(
        `   ✓ Assigned ${roleData.permissions.length} permissions to ${roleData.name}`
      );
    }

    console.log(`\n✅ Created ${Object.keys(createdRoles).length} roles\n`);

    // 3. Assign super_admin role to user if email provided
    const args = process.argv.slice(2);
    const adminEmailArg = args.find((arg) => arg.startsWith('--admin-email='));

    if (adminEmailArg) {
      const adminEmail = adminEmailArg.split('=')[1];
      console.log(`👤 Assigning super_admin role to ${adminEmail}...`);

      const [adminUser] = await db()
        .select()
        .from(user)
        .where(eq(user.email, adminEmail));

      if (adminUser) {
        const superAdminRoleId = createdRoles['super_admin'];

        // Check if user already has the role
        const [existingUserRole] = await db()
          .select()
          .from(userRole)
          .where(
            and(
              eq(userRole.userId, adminUser.id),
              eq(userRole.roleId, superAdminRoleId)
            )
          );

        if (!existingUserRole) {
          await db().insert(userRole).values({
            id: getUuid(),
            userId: adminUser.id,
            roleId: superAdminRoleId,
          });
          console.log(`   ✅ Assigned super_admin role to ${adminEmail}`);
        } else {
          console.log(`   ℹ️  User already has super_admin role`);
        }
      } else {
        console.log(`   ⚠️  User not found: ${adminEmail}`);
      }
    } else {
      console.log('ℹ️  To assign super_admin role to a user, run:');
      console.log(
        '   npx tsx scripts/init-rbac.ts --admin-email=your@email.com'
      );
    }

    console.log('\n✅ RBAC initialization completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Permissions: ${Object.keys(createdPermissions).length}`);
    console.log(`   - Roles: ${Object.keys(createdRoles).length}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Run database migrations if needed');
    console.log('   2. Assign roles to users via admin panel or this script');
    console.log('   3. Test permissions in the admin area\n');
  } catch (error) {
    console.error('\n❌ Error during RBAC initialization:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeRBAC()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
