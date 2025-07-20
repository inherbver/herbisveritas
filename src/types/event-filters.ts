import type { EventType, EventSeverity } from "@/lib/admin/dashboard";

export interface EventLogFilters {
  severity: EventSeverity[];
  eventTypes: EventType[];
  dateRange: {
    start: Date;
    end: Date;
  } | null;
  search: string;
}

export interface EventTypeGroup {
  id: string;
  label: string;
  eventTypes: EventType[];
}

export const EVENT_TYPE_GROUPS: EventTypeGroup[] = [
  {
    id: "authentication",
    label: "Authentification",
    eventTypes: [
      "USER_REGISTERED",
      "USER_LOGIN",
      "PASSWORD_RESET_REQUESTED",
      "PASSWORD_RESET_COMPLETED",
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    eventTypes: ["ORDER_CREATED", "PAYMENT_SUCCEEDED", "PAYMENT_FAILED", "ORDER_STATUS_CHANGED"],
  },
  {
    id: "profiles",
    label: "Profils",
    eventTypes: ["PROFILE_UPDATED", "ADDRESS_ADDED", "ADDRESS_UPDATED", "PROFILE_RECOVERY"],
  },
  {
    id: "security",
    label: "Sécurité",
    eventTypes: ["unauthorized_admin_access", "successful_admin_login", "admin_action"],
  },
  {
    id: "system",
    label: "Système",
    eventTypes: ["DATABASE_CLEANUP", "DATABASE_ERROR", "API_ERROR", "SYNC_ERROR"],
  },
  {
    id: "legacy",
    label: "Anciens types",
    eventTypes: ["user_registered", "order_validated", "product_created", "security_alert"],
  },
];

export const DATE_RANGE_PRESETS = [
  {
    label: "Aujourd'hui",
    getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      return { start: today, end: endOfDay };
    },
  },
  {
    label: "7 derniers jours",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  {
    label: "30 derniers jours",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  {
    label: "Ce mois",
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    },
  },
] as const;

export const DEFAULT_FILTERS: EventLogFilters = {
  severity: [],
  eventTypes: [],
  dateRange: null,
  search: "",
};
