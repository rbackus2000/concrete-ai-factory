import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RB Studio — Invoice",
  description: "View and pay your invoice from RB Architecture Concrete Studio.",
};

export default function PublicInvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
