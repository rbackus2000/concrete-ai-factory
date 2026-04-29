import type { StaffRole } from "@/lib/schemas/domain";

// ── Role-based route access ──
// Single source of truth for "which roles can hit which routes."
//
// Rules:
// - ADMIN can access EVERYTHING — never list it in roles[].
// - Match is by longest-prefix. The rule with the longest matching prefix
//   wins, so /reports/revenue-summary inherits from /reports unless a
//   more-specific rule exists.
// - Unknown routes default-allow. We only restrict what's listed here,
//   so adding a new feature route doesn't accidentally lock everyone out.
//   /admin/* is gated separately in middleware (ADMIN only).
// - /account/* is always allowed (own profile / password change).
//
// To restrict a NEW feature, add a rule. To open a feature to a new role,
// add the role to the rule's `roles` array.

type AllowedRole = Exclude<StaffRole, "ADMIN">;

type RouteRule = {
  prefix: string;
  roles: readonly AllowedRole[];
};

// IMPORTANT: order does NOT matter — we sort by prefix length at runtime.
// Keep this list grouped by feature for readability.
export const ROLE_ACCESS_RULES: readonly RouteRule[] = [
  // ── Dashboard — everyone signed-in ──
  { prefix: "/dashboard", roles: ["OPS_MANAGER", "SHOP_FOREMAN", "SHOP_USER", "MARKETING", "FINANCE"] },

  // ── Sales / CRM — ops + finance ──
  { prefix: "/contacts",  roles: ["OPS_MANAGER", "FINANCE"] },
  { prefix: "/pipeline",  roles: ["OPS_MANAGER", "FINANCE"] },
  { prefix: "/quotes",    roles: ["OPS_MANAGER", "FINANCE"] },
  { prefix: "/invoices",  roles: ["OPS_MANAGER", "FINANCE"] },

  // ── Operations / Production ──
  { prefix: "/orders",          roles: ["OPS_MANAGER", "SHOP_FOREMAN", "SHOP_USER", "FINANCE"] },
  { prefix: "/inventory",       roles: ["OPS_MANAGER", "SHOP_FOREMAN", "SHOP_USER"] },
  { prefix: "/purchase-orders", roles: ["OPS_MANAGER", "FINANCE"] },
  { prefix: "/jobs",            roles: ["OPS_MANAGER", "SHOP_FOREMAN", "SHOP_USER"] },
  { prefix: "/packets",         roles: ["OPS_MANAGER", "SHOP_FOREMAN", "SHOP_USER"] },

  // ── Marketing ──
  { prefix: "/marketing", roles: ["MARKETING"] },
  { prefix: "/generator", roles: ["MARKETING"] },        // image generation
  { prefix: "/outputs",   roles: ["MARKETING", "SHOP_FOREMAN"] },

  // ── Reports — money-focused, finance + ops ──
  { prefix: "/reports", roles: ["OPS_MANAGER", "FINANCE"] },

  // ── Catalog / Product Tools ──
  { prefix: "/skus",       roles: ["OPS_MANAGER", "SHOP_FOREMAN", "MARKETING", "FINANCE"] },
  { prefix: "/slat-walls", roles: ["OPS_MANAGER", "SHOP_FOREMAN", "MARKETING"] },
  { prefix: "/calculator", roles: ["OPS_MANAGER", "SHOP_FOREMAN", "MARKETING", "FINANCE"] },
  { prefix: "/gallery",    roles: ["OPS_MANAGER", "SHOP_FOREMAN", "SHOP_USER", "MARKETING", "FINANCE"] },

  // ── Shop tools ──
  { prefix: "/tools/mold-generator", roles: ["SHOP_FOREMAN"] },

  // ── Jacob (AI chat) — everyone ──
  { prefix: "/chat", roles: ["OPS_MANAGER", "SHOP_FOREMAN", "SHOP_USER", "MARKETING", "FINANCE"] },
];

// Always-allowed paths regardless of role (own-profile management,
// auth flows). /admin/* is handled separately in middleware (ADMIN only).
const ALWAYS_ALLOWED_PREFIXES = [
  "/account",
  "/login",
];

function isAlwaysAllowed(pathname: string): boolean {
  return ALWAYS_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function findMatchingRule(pathname: string): RouteRule | null {
  let best: RouteRule | null = null;
  for (const rule of ROLE_ACCESS_RULES) {
    const matches = pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
    if (!matches) continue;
    if (!best || rule.prefix.length > best.prefix.length) {
      best = rule;
    }
  }
  return best;
}

/**
 * Returns true if the role is allowed to access the path. ADMIN always
 * passes. /admin/* is NOT handled here — middleware gates it separately
 * before this is called.
 */
export function canAccess(role: StaffRole, pathname: string): boolean {
  if (role === "ADMIN") return true;
  if (isAlwaysAllowed(pathname)) return true;

  const rule = findMatchingRule(pathname);
  if (!rule) {
    // Unknown route — default-allow. Only routes explicitly listed in
    // ROLE_ACCESS_RULES are restricted. Add new routes to the rules
    // table to lock them down.
    return true;
  }
  return rule.roles.includes(role as AllowedRole);
}
