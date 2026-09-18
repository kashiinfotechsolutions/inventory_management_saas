
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  address: 'address',
  phone: 'phone',
  gstin: 'gstin',
  state_code: 'state_code',
  currency: 'currency',
  timezone: 'timezone',
  subscription_status: 'subscription_status',
  trial_ends_at: 'trial_ends_at',
  plan_id: 'plan_id',
  stripe_customer_id: 'stripe_customer_id',
  saved_mappings: 'saved_mappings',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.PlanScalarFieldEnum = {
  id: 'id',
  name: 'name',
  price_monthly: 'price_monthly',
  price_yearly: 'price_yearly',
  limits: 'limits',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  tenant_id: 'tenant_id',
  plan_id: 'plan_id',
  stripe_subscription_id: 'stripe_subscription_id',
  status: 'status',
  current_period_start: 'current_period_start',
  current_period_end: 'current_period_end',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  tenant_id: 'tenant_id',
  email: 'email',
  password_hash: 'password_hash',
  name: 'name',
  role: 'role',
  is_active: 'is_active',
  failed_login_count: 'failed_login_count',
  locked_until: 'locked_until',
  reset_token_hash: 'reset_token_hash',
  reset_token_expires_at: 'reset_token_expires_at',
  last_login_at: 'last_login_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  tenant_id: 'tenant_id',
  sku: 'sku',
  barcode: 'barcode',
  name: 'name',
  category: 'category',
  hsn_code: 'hsn_code',
  unit: 'unit',
  pack_size: 'pack_size',
  mrp: 'mrp',
  price: 'price',
  cost_price: 'cost_price',
  quantity_in_stock: 'quantity_in_stock',
  low_stock_threshold: 'low_stock_threshold',
  gst_rate: 'gst_rate',
  is_active: 'is_active',
  image_url: 'image_url',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.StockMovementScalarFieldEnum = {
  id: 'id',
  tenant_id: 'tenant_id',
  product_id: 'product_id',
  movement_type: 'movement_type',
  quantity_change: 'quantity_change',
  quantity_after: 'quantity_after',
  reference_type: 'reference_type',
  reference_id: 'reference_id',
  note: 'note',
  created_by: 'created_by',
  created_at: 'created_at'
};

exports.Prisma.UploadBatchScalarFieldEnum = {
  id: 'id',
  tenant_id: 'tenant_id',
  type: 'type',
  mode: 'mode',
  filename: 'filename',
  file_url: 'file_url',
  status: 'status',
  total_rows: 'total_rows',
  success_rows: 'success_rows',
  failed_rows: 'failed_rows',
  error_report: 'error_report',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.BillScalarFieldEnum = {
  id: 'id',
  tenant_id: 'tenant_id',
  bill_number: 'bill_number',
  subtotal: 'subtotal',
  discount_amount: 'discount_amount',
  cgst_amount: 'cgst_amount',
  sgst_amount: 'sgst_amount',
  igst_amount: 'igst_amount',
  round_off: 'round_off',
  total: 'total',
  payment_method: 'payment_method',
  status: 'status',
  idempotency_key: 'idempotency_key',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.BillItemScalarFieldEnum = {
  id: 'id',
  bill_id: 'bill_id',
  product_id: 'product_id',
  product_name: 'product_name',
  sku: 'sku',
  hsn_code: 'hsn_code',
  mrp: 'mrp',
  quantity: 'quantity',
  unit_price: 'unit_price',
  gst_rate: 'gst_rate',
  cgst_amount: 'cgst_amount',
  sgst_amount: 'sgst_amount',
  line_total: 'line_total',
  created_at: 'created_at'
};

exports.Prisma.BillCounterScalarFieldEnum = {
  tenant_id: 'tenant_id',
  last_number: 'last_number',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.AlertScalarFieldEnum = {
  id: 'id',
  tenant_id: 'tenant_id',
  product_id: 'product_id',
  type: 'type',
  status: 'status',
  triggered_at: 'triggered_at',
  resolved_at: 'resolved_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.DailySalesSummaryScalarFieldEnum = {
  id: 'id',
  tenant_id: 'tenant_id',
  date: 'date',
  product_id: 'product_id',
  units_sold: 'units_sold',
  revenue: 'revenue',
  cost: 'cost',
  profit: 'profit',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  tenant_id: 'tenant_id',
  user_id: 'user_id',
  action: 'action',
  entity_type: 'entity_type',
  entity_id: 'entity_id',
  metadata: 'metadata',
  created_at: 'created_at'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.SubscriptionStatus = exports.$Enums.SubscriptionStatus = {
  TRIALING: 'TRIALING',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED'
};

exports.UserRole = exports.$Enums.UserRole = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER'
};

exports.MovementType = exports.$Enums.MovementType = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  ADJUSTMENT: 'ADJUSTMENT',
  RETURN: 'RETURN',
  WASTAGE: 'WASTAGE',
  STOCK_SYNC: 'STOCK_SYNC'
};

exports.UploadType = exports.$Enums.UploadType = {
  PRODUCT_IMPORT: 'PRODUCT_IMPORT',
  RESTOCK: 'RESTOCK'
};

exports.UploadMode = exports.$Enums.UploadMode = {
  CLOSING_SYNC: 'CLOSING_SYNC',
  ADD_QUANTITY: 'ADD_QUANTITY'
};

exports.UploadStatus = exports.$Enums.UploadStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  COMPLETED_WITH_ERRORS: 'COMPLETED_WITH_ERRORS',
  FAILED: 'FAILED'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  UPI: 'UPI',
  OTHER: 'OTHER'
};

exports.BillStatus = exports.$Enums.BillStatus = {
  COMPLETED: 'COMPLETED',
  VOID: 'VOID'
};

exports.AlertType = exports.$Enums.AlertType = {
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK'
};

exports.AlertStatus = exports.$Enums.AlertStatus = {
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED'
};

exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  Plan: 'Plan',
  Subscription: 'Subscription',
  User: 'User',
  Product: 'Product',
  StockMovement: 'StockMovement',
  UploadBatch: 'UploadBatch',
  Bill: 'Bill',
  BillItem: 'BillItem',
  BillCounter: 'BillCounter',
  Alert: 'Alert',
  DailySalesSummary: 'DailySalesSummary',
  AuditLog: 'AuditLog'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
