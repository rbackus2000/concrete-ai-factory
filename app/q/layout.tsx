import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RB Studio — Quote",
  description: "View and approve your quote from RB Architecture Concrete Studio.",
};

export default function PublicQuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
