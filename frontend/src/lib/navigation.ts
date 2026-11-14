import type { Role } from "./types";

export function roleHomePath(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "TENANT_ADMIN":
      return "/admin";
    case "CHIEF_EVALUATOR":
      return "/chief-evaluator";
    case "EVALUATOR":
      return "/evaluator";
  }
}

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  TENANT_ADMIN: "Admin",
  CHIEF_EVALUATOR: "Chief Evaluator",
  EVALUATOR: "Evaluator",
};

export interface NavItem {
  label: string;
  href: string;
  description?: string;
}

export const navItemsByRole: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    { label: "Overview", href: "/admin" },
    { label: "Exams", href: "/admin/exams" },
    { label: "Allocations", href: "/admin/allocations" },
    { label: "Users", href: "/admin/users" },
  ],
  TENANT_ADMIN: [
    { label: "Overview", href: "/admin" },
    { label: "Exams", href: "/admin/exams" },
    { label: "Allocations", href: "/admin/allocations" },
    { label: "Users", href: "/admin/users" },
  ],
  CHIEF_EVALUATOR: [
    { label: "Overview", href: "/chief-evaluator" },
    { label: "Moderation queue", href: "/chief-evaluator/moderation" },
  ],
  EVALUATOR: [
    {
      label: "Assigned scripts",
      href: "/evaluator",
      description: "Continue marking",
    },
    {
      label: "Upload scripts",
      href: "/evaluator/new",
      description: "Start an evaluation",
    },
  ],
};
