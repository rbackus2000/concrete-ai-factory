import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const adminSections = [
  {
    title: "Prompt Templates",
    href: "/admin/prompt-templates",
    description: "Manage generation templates, scope, status, and versioning.",
  },
  {
    title: "Rules Master",
    href: "/admin/rules-master",
    description: "Manage manufacturing rules, priority, and scoped activation.",
  },
  {
    title: "Build Packet Templates",
    href: "/admin/build-packet-templates",
    description: "Manage packet sections, ordering, and packet-ready content.",
  },
  {
    title: "QC Templates",
    href: "/admin/qc-templates",
    description: "Manage checklists, acceptance criteria, and rejection gates.",
  },
  {
    title: "Materials Master",
    href: "/admin/materials-master",
    description: "Manage reusable material, sealer, insert, pigment, and packaging records.",
  },
  {
    title: "Finishes",
    href: "/admin/finishes",
    description: "Manage concrete finish presets — color families, textures, sealers, and pigment formulas.",
  },
  {
    title: "Clients",
    href: "/admin/clients",
    description: "Manage client contacts, companies, and project associations.",
  },
  {
    title: "Audit Logs",
    href: "/admin/audit-logs",
    description: "Review write activity and export access events by actor, entity, and action.",
  },
  {
    title: "Equipment Tracker",
    href: "/admin/equipment",
    description: "Procurement tracker for studio build-out — equipment, tools, and infrastructure by phase.",
  },
  {
    title: "Product Agent",
    href: "/admin/product-agent",
    description: "AI-powered product creation — describe a product and generate the complete SKU, build packets, materials, and QC specs.",
  },
] as const;

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Core system records"
        description="Internal CRUD for templates and control records that drive generation, packet assembly, and future export."
      />

      <section className="grid gap-4 md:grid-cols-2">
        {adminSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition hover:border-primary/40">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{section.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
