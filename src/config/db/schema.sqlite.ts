import { sql } from 'drizzle-orm';
import {
  AnySQLiteColumn,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// SQLite has no schema concept like Postgres. Keep a `table` alias to minimize diff with pg schema.
const table = sqliteTable;

// SQLite "now" in epoch milliseconds (same expression drizzle used in `defaultNow()`).
const sqliteNowMs = sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`;
const sqliteNowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export const user = table(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
      .default(false)
      .notNull(),
    image: text('image'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    // Track first-touch acquisition channel (e.g. google, twitter, newsletter)
    utmSource: text('utm_source').notNull().default(''),
    ip: text('ip').notNull().default(''),
    locale: text('locale').notNull().default(''),
  },
  (table) => [
    // Search users by name in admin dashboard
    index('idx_user_name').on(table.name),
    // Order users by registration time for latest users list
    index('idx_user_created_at').on(table.createdAt),
  ]
);

export const session = table(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    // Composite: Query user sessions and filter by expiration
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_session_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const account = table(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Query all linked accounts for a user
    index('idx_account_user_id').on(table.userId),
    // Composite: OAuth login (most critical)
    // Can also be used for: WHERE providerId = ? (left-prefix)
    index('idx_account_provider_account').on(table.providerId, table.accountId),
  ]
);

export const verification = table(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Find verification code by identifier (e.g., find code by email)
    index('idx_verification_identifier').on(table.identifier),
  ]
);

export const project = table(
  'project',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    gameGenre: text('game_genre').notNull().default(''),
    artStyle: text('art_style').notNull().default(''),
    paletteJson: text('palette_json'),
    negativePrompt: text('negative_prompt'),
    settingsJson: text('settings_json').notNull().default('{}'),
    status: text('status').notNull().default('active'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
    updatedAt: text('updated_at').default(sqliteNowIso).notNull(),
    deletedAt: text('deleted_at'),
  },
  (t) => [
    index('idx_project_user_status_updated').on(
      t.userId,
      t.status,
      t.updatedAt
    ),
  ]
);

export const assetItem = table(
  'asset_item',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    parentItemId: text('parent_item_id').references(
      (): AnySQLiteColumn => assetItem.id,
      { onDelete: 'set null' }
    ),
    type: text('type').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    settingsJson: text('settings_json').notNull().default('{}'),
    status: text('status').notNull().default('active'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
    updatedAt: text('updated_at').default(sqliteNowIso).notNull(),
    deletedAt: text('deleted_at'),
  },
  (t) => [
    index('idx_asset_item_project_type_status').on(
      t.projectId,
      t.type,
      t.status
    ),
    index('idx_asset_item_parent_sort').on(t.parentItemId, t.sortOrder),
    index('idx_asset_item_project_updated').on(t.projectId, t.updatedAt),
  ]
);

export const assetVariant = table(
  'asset_variant',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => assetItem.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    variantType: text('variant_type').notNull().default('base'),
    prompt: text('prompt'),
    sortOrder: integer('sort_order').notNull().default(0),
    status: text('status').notNull().default('active'),
    metadataJson: text('metadata_json').notNull().default('{}'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
    updatedAt: text('updated_at').default(sqliteNowIso).notNull(),
    deletedAt: text('deleted_at'),
  },
  (t) => [
    index('idx_asset_variant_item_status_sort').on(
      t.itemId,
      t.status,
      t.sortOrder
    ),
    index('idx_asset_variant_project_type').on(t.projectId, t.variantType),
  ]
);

export const generation = table(
  'generation',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    itemId: text('item_id').references(() => assetItem.id, {
      onDelete: 'set null',
    }),
    variantId: text('variant_id').references(() => assetVariant.id, {
      onDelete: 'set null',
    }),
    taskType: text('task_type').notNull(),
    prompt: text('prompt'),
    negativePrompt: text('negative_prompt'),
    paramsJson: text('params_json').notNull().default('{}'),
    status: text('status').notNull().default('pending'),
    creditsCost: integer('credits_cost').notNull().default(0),
    providerCostMicros: integer('provider_cost_micros').notNull().default(0),
    failureCode: text('failure_code'),
    failureReason: text('failure_reason'),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
    updatedAt: text('updated_at').default(sqliteNowIso).notNull(),
  },
  (t) => [
    index('idx_generation_project_task_status').on(
      t.projectId,
      t.taskType,
      t.status
    ),
    index('idx_generation_user_created').on(t.userId, t.createdAt),
    index('idx_generation_item_created').on(t.itemId, t.createdAt),
  ]
);

export const generationTask = table(
  'generation_task',
  {
    id: text('id').primaryKey(),
    generationId: text('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'cascade' }),
    aiTaskId: text('ai_task_id')
      .notNull()
      .references((): AnySQLiteColumn => aiTask.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('primary'),
    sortOrder: integer('sort_order').notNull().default(0),
    metadataJson: text('metadata_json').notNull().default('{}'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
  },
  (t) => [
    uniqueIndex('idx_generation_task_ai_task').on(t.aiTaskId),
    index('idx_generation_task_generation_sort').on(
      t.generationId,
      t.sortOrder
    ),
  ]
);

export const assetFile = table(
  'asset_file',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    itemId: text('item_id').references(() => assetItem.id, {
      onDelete: 'set null',
    }),
    variantId: text('variant_id').references(() => assetVariant.id, {
      onDelete: 'set null',
    }),
    generationId: text('generation_id').references(() => generation.id, {
      onDelete: 'set null',
    }),
    generationTaskId: text('generation_task_id').references(
      () => generationTask.id,
      { onDelete: 'set null' }
    ),
    parentFileId: text('parent_file_id').references(
      (): AnySQLiteColumn => assetFile.id,
      { onDelete: 'set null' }
    ),
    mediaType: text('media_type').notNull(),
    role: text('role').notNull(),
    storageKey: text('storage_key').notNull(),
    thumbnailKey: text('thumbnail_key'),
    originalFilename: text('original_filename'),
    mimeType: text('mime_type'),
    width: integer('width'),
    height: integer('height'),
    durationMs: integer('duration_ms'),
    sizeBytes: integer('size_bytes'),
    isActiveReference: integer('is_active_reference', { mode: 'boolean' })
      .notNull()
      .default(false),
    status: text('status').notNull().default('ready'),
    metadataJson: text('metadata_json').notNull().default('{}'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
    updatedAt: text('updated_at').default(sqliteNowIso).notNull(),
    deletedAt: text('deleted_at'),
  },
  (t) => [
    index('idx_asset_file_project_media_role').on(
      t.projectId,
      t.mediaType,
      t.role
    ),
    index('idx_asset_file_item_role_created').on(t.itemId, t.role, t.createdAt),
    index('idx_asset_file_variant_role_created').on(
      t.variantId,
      t.role,
      t.createdAt
    ),
    index('idx_asset_file_generation').on(t.generationId),
    index('idx_asset_file_generation_task').on(t.generationTaskId),
    index('idx_asset_file_parent').on(t.parentFileId),
    uniqueIndex('idx_asset_file_variant_active_reference')
      .on(t.variantId)
      .where(
        sql`${t.variantId} IS NOT NULL AND ${t.isActiveReference} = true AND ${t.deletedAt} IS NULL`
      ),
  ]
);

export const projectReference = table(
  'project_reference',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    fileId: text('file_id')
      .notNull()
      .references(() => assetFile.id, { onDelete: 'cascade' }),
    referenceType: text('reference_type').notNull(),
    label: text('label'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
  },
  (t) => [
    index('idx_project_reference_project_sort').on(t.projectId, t.sortOrder),
    index('idx_project_reference_file').on(t.fileId),
  ]
);

export const generationInput = table(
  'generation_input',
  {
    id: text('id').primaryKey(),
    generationId: text('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'cascade' }),
    generationTaskId: text('generation_task_id').references(
      () => generationTask.id,
      { onDelete: 'cascade' }
    ),
    fileId: text('file_id')
      .notNull()
      .references(() => assetFile.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    paramsJson: text('params_json').notNull().default('{}'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
  },
  (t) => [
    index('idx_generation_input_generation_role_sort').on(
      t.generationId,
      t.role,
      t.sortOrder
    ),
    index('idx_generation_input_task').on(t.generationTaskId),
    index('idx_generation_input_file').on(t.fileId),
  ]
);

export const assetRegion = table(
  'asset_region',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    fileId: text('file_id')
      .notNull()
      .references(() => assetFile.id, { onDelete: 'cascade' }),
    itemId: text('item_id').references(() => assetItem.id, {
      onDelete: 'set null',
    }),
    name: text('name'),
    type: text('type'),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    metadataJson: text('metadata_json').notNull().default('{}'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
    updatedAt: text('updated_at').default(sqliteNowIso).notNull(),
  },
  (t) => [
    index('idx_asset_region_file_sort').on(t.fileId, t.sortOrder),
    index('idx_asset_region_item').on(t.itemId),
  ]
);

export const animationSet = table(
  'animation_set',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => assetItem.id, { onDelete: 'cascade' }),
    variantId: text('variant_id').references(() => assetVariant.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    action: text('action').notNull(),
    perspective: text('perspective').notNull().default(''),
    directionMode: text('direction_mode').notNull().default('single'),
    loop: integer('loop', { mode: 'boolean' }).notNull().default(true),
    status: text('status').notNull().default('draft'),
    metadataJson: text('metadata_json').notNull().default('{}'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
    updatedAt: text('updated_at').default(sqliteNowIso).notNull(),
    deletedAt: text('deleted_at'),
  },
  (t) => [
    index('idx_animation_set_item_action_status').on(
      t.itemId,
      t.action,
      t.status
    ),
    index('idx_animation_set_project_updated').on(t.projectId, t.updatedAt),
  ]
);

export const animationClip = table(
  'animation_clip',
  {
    id: text('id').primaryKey(),
    animationSetId: text('animation_set_id')
      .notNull()
      .references(() => animationSet.id, { onDelete: 'cascade' }),
    direction: text('direction').notNull().default('none'),
    isMirrored: integer('is_mirrored', { mode: 'boolean' })
      .notNull()
      .default(false),
    mirrorSourceClipId: text('mirror_source_clip_id').references(
      (): AnySQLiteColumn => animationClip.id,
      { onDelete: 'set null' }
    ),
    sortOrder: integer('sort_order').notNull().default(0),
    status: text('status').notNull().default('draft'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
    updatedAt: text('updated_at').default(sqliteNowIso).notNull(),
  },
  (t) => [
    uniqueIndex('idx_animation_clip_set_direction').on(
      t.animationSetId,
      t.direction
    ),
    index('idx_animation_clip_mirror_source').on(t.mirrorSourceClipId),
  ]
);

export const animationVersion = table(
  'animation_version',
  {
    id: text('id').primaryKey(),
    clipId: text('clip_id')
      .notNull()
      .references(() => animationClip.id, { onDelete: 'cascade' }),
    versionNo: integer('version_no').notNull(),
    parentVersionId: text('parent_version_id').references(
      (): AnySQLiteColumn => animationVersion.id,
      { onDelete: 'set null' }
    ),
    generationId: text('generation_id').references(() => generation.id, {
      onDelete: 'set null',
    }),
    isCurrent: integer('is_current', { mode: 'boolean' })
      .notNull()
      .default(false),
    fps: real('fps').notNull().default(12),
    frameWidth: integer('frame_width').notNull(),
    frameHeight: integer('frame_height').notNull(),
    frameCount: integer('frame_count').notNull().default(0),
    editorJson: text('editor_json').notNull().default('{}'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
  },
  (t) => [
    uniqueIndex('idx_animation_version_clip_no').on(t.clipId, t.versionNo),
    uniqueIndex('idx_animation_version_current')
      .on(t.clipId)
      .where(sql`${t.isCurrent} = true`),
    index('idx_animation_version_generation').on(t.generationId),
  ]
);

export const animationFrame = table(
  'animation_frame',
  {
    id: text('id').primaryKey(),
    versionId: text('version_id')
      .notNull()
      .references(() => animationVersion.id, { onDelete: 'cascade' }),
    fileId: text('file_id')
      .notNull()
      .references(() => assetFile.id, { onDelete: 'restrict' }),
    frameIndex: integer('frame_index').notNull(),
    durationMs: integer('duration_ms'),
    offsetX: integer('offset_x').notNull().default(0),
    offsetY: integer('offset_y').notNull().default(0),
    metadataJson: text('metadata_json').notNull().default('{}'),
    createdAt: text('created_at').default(sqliteNowIso).notNull(),
  },
  (t) => [
    uniqueIndex('idx_animation_frame_version_index').on(
      t.versionId,
      t.frameIndex
    ),
    index('idx_animation_frame_file').on(t.fileId),
  ]
);

export const config = table('config', {
  name: text('name').unique().notNull(),
  value: text('value'),
});

export const taxonomy = table(
  'taxonomy',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    image: text('image'),
    icon: text('icon'),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query taxonomies by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_taxonomy_type_status').on(table.type, table.status),
  ]
);

export const post = table(
  'post',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title'),
    description: text('description'),
    image: text('image'),
    content: text('content'),
    categories: text('categories'),
    tags: text('tags'),
    authorName: text('author_name'),
    authorImage: text('author_image'),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query posts by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_post_type_status').on(table.type, table.status),
  ]
);

export const order = table(
  'order',
  {
    id: text('id').primaryKey(),
    orderNo: text('order_no').unique().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // checkout user email
    status: text('status').notNull(), // created, paid, failed
    amount: integer('amount').notNull(), // checkout amount in cents
    currency: text('currency').notNull(), // checkout currency
    productId: text('product_id'),
    paymentType: text('payment_type'), // one_time, subscription
    paymentInterval: text('payment_interval'), // day, week, month, year
    paymentProvider: text('payment_provider').notNull(),
    paymentSessionId: text('payment_session_id'),
    checkoutInfo: text('checkout_info').notNull(), // checkout request info
    checkoutResult: text('checkout_result'), // checkout result
    paymentResult: text('payment_result'), // payment result
    discountCode: text('discount_code'), // discount code
    discountAmount: integer('discount_amount'), // discount amount in cents
    discountCurrency: text('discount_currency'), // discount currency
    paymentEmail: text('payment_email'), // actual payment email
    paymentAmount: integer('payment_amount'), // actual payment amount
    paymentCurrency: text('payment_currency'), // actual payment currency
    paidAt: integer('paid_at', { mode: 'timestamp_ms' }), // paid at
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    description: text('description'), // order description
    productName: text('product_name'), // product name
    subscriptionId: text('subscription_id'), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    checkoutUrl: text('checkout_url'), // checkout url
    callbackUrl: text('callback_url'), // callback url, after handle callback
    creditsAmount: integer('credits_amount'), // credits amount
    creditsValidDays: integer('credits_valid_days'), // credits validity days
    planName: text('plan_name'), // subscription plan name
    paymentProductId: text('payment_product_id'), // payment product id
    invoiceId: text('invoice_id'),
    invoiceUrl: text('invoice_url'),
    subscriptionNo: text('subscription_no'), // order subscription no
    transactionId: text('transaction_id'), // payment transaction id
    paymentUserName: text('payment_user_name'), // payment user name
    paymentUserId: text('payment_user_id'), // payment user id
  },
  (table) => [
    // Composite: Query user orders by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_order_user_status_payment_type').on(
      table.userId,
      table.status,
      table.paymentType
    ),
    // Composite: Prevent duplicate payments
    // Can also be used for: WHERE transactionId = ? (left-prefix)
    index('idx_order_transaction_provider').on(
      table.transactionId,
      table.paymentProvider
    ),
    // Order orders by creation time for listing
    index('idx_order_created_at').on(table.createdAt),
  ]
);

export const subscription = table(
  'subscription',
  {
    id: text('id').primaryKey(),
    subscriptionNo: text('subscription_no').unique().notNull(), // subscription no
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // subscription user email
    status: text('status').notNull(), // subscription status
    paymentProvider: text('payment_provider').notNull(),
    subscriptionId: text('subscription_id').notNull(), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    productId: text('product_id'), // product id
    description: text('description'), // subscription description
    amount: integer('amount'), // subscription amount
    currency: text('currency'), // subscription currency
    interval: text('interval'), // subscription interval, day, week, month, year
    intervalCount: integer('interval_count'), // subscription interval count
    trialPeriodDays: integer('trial_period_days'), // subscription trial period days
    currentPeriodStart: integer('current_period_start', {
      mode: 'timestamp_ms',
    }), // subscription current period start
    currentPeriodEnd: integer('current_period_end', { mode: 'timestamp_ms' }), // subscription current period end
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    planName: text('plan_name'),
    billingUrl: text('billing_url'),
    productName: text('product_name'), // subscription product name
    creditsAmount: integer('credits_amount'), // subscription credits amount
    creditsValidDays: integer('credits_valid_days'), // subscription credits valid days
    paymentProductId: text('payment_product_id'), // subscription payment product id
    paymentUserId: text('payment_user_id'), // subscription payment user id
    canceledAt: integer('canceled_at', { mode: 'timestamp_ms' }), // subscription canceled apply at
    canceledEndAt: integer('canceled_end_at', { mode: 'timestamp_ms' }), // subscription canceled end at
    canceledReason: text('canceled_reason'), // subscription canceled reason
    canceledReasonType: text('canceled_reason_type'), // subscription canceled reason type
  },
  (table) => [
    // Composite: Query user's subscriptions by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_subscription_user_status_interval').on(
      table.userId,
      table.status,
      table.interval
    ),
    // Composite: Prevent duplicate subscriptions
    // Can also be used for: WHERE paymentProvider = ? (left-prefix)
    index('idx_subscription_provider_id').on(
      table.subscriptionId,
      table.paymentProvider
    ),
    // Order subscriptions by creation time for listing
    index('idx_subscription_created_at').on(table.createdAt),
  ]
);

export const credit = table(
  'credit',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }), // user id
    userEmail: text('user_email'), // user email
    orderNo: text('order_no'), // payment order no
    subscriptionNo: text('subscription_no'), // subscription no
    transactionNo: text('transaction_no').unique().notNull(), // transaction no
    transactionType: text('transaction_type').notNull(), // transaction type, grant / consume
    transactionScene: text('transaction_scene'), // transaction scene, payment / subscription / gift / award
    credits: integer('credits').notNull(), // credits amount, n or -n
    remainingCredits: integer('remaining_credits').notNull().default(0), // remaining credits amount
    balanceAfter: integer('balance_after'), // user balance after applying this ledger entry
    description: text('description'), // transaction description
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }), // transaction expires at
    status: text('status').notNull(), // transaction status
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    consumedDetail: text('consumed_detail'), // consumed detail
    metadata: text('metadata'), // transaction metadata
  },
  (table) => [
    // Critical composite index for credit consumption (FIFO queue)
    // Query: WHERE userId = ? AND transactionType = 'grant' AND status = 'active'
    //        AND remainingCredits > 0 ORDER BY expiresAt
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_credit_consume_fifo').on(
      table.userId,
      table.status,
      table.transactionType,
      table.remainingCredits,
      table.expiresAt
    ),
    // Query credits by order number
    index('idx_credit_order_no').on(table.orderNo),
    // Query credits by subscription number
    index('idx_credit_subscription_no').on(table.subscriptionNo),
  ]
);

export const apikey = table(
  'apikey',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    // Composite: Query user's API keys by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_apikey_user_status').on(table.userId, table.status),
    // Composite: Validate active API key (most common for auth)
    // Can also be used for: WHERE key = ? (left-prefix)
    index('idx_apikey_key_status').on(table.key, table.status),
  ]
);

// RBAC Tables
export const role = table(
  'role',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(), // admin, editor, viewer
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Query active roles
    index('idx_role_status').on(table.status),
  ]
);

export const permission = table(
  'permission',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(), // admin.users.read, admin.posts.write
    resource: text('resource').notNull(), // users, posts, categories
    action: text('action').notNull(), // read, write, delete
    title: text('title').notNull(),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Composite: Query permissions by resource and action
    // Can also be used for: WHERE resource = ? (left-prefix)
    index('idx_permission_resource_action').on(table.resource, table.action),
  ]
);

export const rolePermission = table(
  'role_permission',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    // Composite: Query permissions for a role
    // Can also be used for: WHERE roleId = ? (left-prefix)
    index('idx_role_permission_role_permission').on(
      table.roleId,
      table.permissionId
    ),
  ]
);

export const userRole = table(
  'user_role',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    // Composite: Query user's active roles (most critical for auth)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_user_role_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const aiTask = table(
  'ai_task',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    mediaType: text('media_type').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    prompt: text('prompt').notNull(),
    options: text('options'),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    taskId: text('task_id'), // provider task id
    taskInfo: text('task_info'), // provider task info
    taskResult: text('task_result'), // provider task result
    costCredits: integer('cost_credits').notNull().default(0),
    scene: text('scene').notNull().default(''),
    creditId: text('credit_id'), // credit consumption record id
  },
  (table) => [
    // Composite: Query user's AI tasks by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_ai_task_user_media_type').on(table.userId, table.mediaType),
    // Composite: Query user's AI tasks by media type and provider
    // Can also be used for: WHERE mediaType = ? AND provider = ? (left-prefix)
    index('idx_ai_task_media_type_status').on(table.mediaType, table.status),
  ]
);

export const chat = table(
  'chat',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
    title: text('title').notNull().default(''),
    parts: text('parts').notNull(),
    metadata: text('metadata'),
    content: text('content'),
  },
  (table) => [index('idx_chat_user_status').on(table.userId, table.status)]
);

export const chatMessage = table(
  'chat_message',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    chatId: text('chat_id')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => new Date())
      .notNull(),
    role: text('role').notNull(),
    parts: text('parts').notNull(),
    metadata: text('metadata'),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
  },
  (table) => [
    index('idx_chat_message_chat_id').on(table.chatId, table.status),
    index('idx_chat_message_user_id').on(table.userId, table.status),
  ]
);

export const footerLink = table(
  'footer_link',
  {
    id: text('id').primaryKey(),
    group: text('group').notNull(),
    title: text('title').notNull(),
    url: text('url').notNull(),
    imageUrl: text('image_url'),
    altText: text('alt_text'),
    locale: text('locale').notNull().default('all'),
    rel: text('rel').notNull().default(''),
    status: text('status').notNull().default('published'),
    sort: integer('sort').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sqliteNowMs)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('idx_footer_link_status_group_sort').on(
      table.status,
      table.group,
      table.sort
    ),
    index('idx_footer_link_locale_status').on(table.locale, table.status),
  ]
);
