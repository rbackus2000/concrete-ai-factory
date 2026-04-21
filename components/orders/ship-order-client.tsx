"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Check, Loader2, MapPin, Package, Shield, Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PACKAGE_TYPES } from "@/lib/schemas/order";

type Rate = {
  id: string;
  carrier: string;
  service: string;
  rate: number;
  deliveryDays: number | null;
  deliveryDate: string | null;
  currency: string;
};

type OrderForShip = {
  id: string;
  orderNumber: string;
  shipToName: string | null;
  shipToCompany: string | null;
  shipToAddress1: string | null;
  shipToAddress2: string | null;
  shipToCity: string | null;
  shipToState: string | null;
  shipToZip: string | null;
  shipToCountry: string;
  addressVerified: boolean;
  weightLbs: number | null;
  weightOz: number | null;
  dimLength: number | null;
  dimWidth: number | null;
  dimHeight: number | null;
  packageType: string | null;
  orderTotal: number;
};

export function ShipOrderClient({ order }: { order: OrderForShip }) {
  const router = useRouter();

  // Address
  const [addr, setAddr] = useState({
    name: order.shipToName || "",
    company: order.shipToCompany || "",
    street1: order.shipToAddress1 || "",
    street2: order.shipToAddress2 || "",
    city: order.shipToCity || "",
    state: order.shipToState || "",
    zip: order.shipToZip || "",
    country: order.shipToCountry || "US",
  });
  const [addressVerified, setAddressVerified] = useState(order.addressVerified);
  const [verifying, setVerifying] = useState(false);

  // Package
  const [weightLbs, setWeightLbs] = useState(order.weightLbs || 0);
  const [weightOz, setWeightOz] = useState(order.weightOz || 0);
  const [dimLength, setDimLength] = useState(order.dimLength || 0);
  const [dimWidth, setDimWidth] = useState(order.dimWidth || 0);
  const [dimHeight, setDimHeight] = useState(order.dimHeight || 0);
  const [packageType, setPackageType] = useState(order.packageType || "Package");

  // Rates
  const [rates, setRates] = useState<Rate[]>([]);
  const [shipmentId, setShipmentId] = useState("");
  const [fetchingRates, setFetchingRates] = useState(false);
  const [selectedRate, setSelectedRate] = useState<string | null>(null);

  // Insurance
  const [insure, setInsure] = useState(false);
  const [declaredValue, setDeclaredValue] = useState(order.orderTotal);

  // Buy
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState<{
    labelUrl: string;
    trackingNumber: string;
    carrier: string;
    service: string;
  } | null>(null);

  const [error, setError] = useState("");

  async function handleVerifyAddress() {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${order.id}/verify-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addr),
      });
      const json = await res.json();
      if (json.data?.verified) {
        setAddressVerified(true);
        if (json.data.corrected) {
          setAddr((a) => ({
            ...a,
            street1: json.data.corrected.street1 || a.street1,
            street2: json.data.corrected.street2 || a.street2,
            city: json.data.corrected.city || a.city,
            state: json.data.corrected.state || a.state,
            zip: json.data.corrected.zip || a.zip,
          }));
        }
      } else {
        setError("Address could not be verified. Check the details.");
      }
    } catch {
      setError("Failed to verify address");
    } finally {
      setVerifying(false);
    }
  }

  async function handleFetchRates() {
    setFetchingRates(true);
    setError("");
    setRates([]);
    setSelectedRate(null);

    const totalOz = (weightLbs * 16) + weightOz;
    if (totalOz <= 0) {
      setError("Enter a valid weight");
      setFetchingRates(false);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${order.id}/rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAddress: addr,
          parcel: {
            weightOz: totalOz,
            length: dimLength || undefined,
            width: dimWidth || undefined,
            height: dimHeight || undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to fetch rates");
        return;
      }
      setRates(json.data.rates || []);
      setShipmentId(json.data.shipmentId || "");
      if (json.data.rates?.length > 0) {
        setSelectedRate(json.data.rates[0].id);
      }
    } catch {
      setError("Failed to fetch rates");
    } finally {
      setFetchingRates(false);
    }
  }

  async function handleBuyLabel() {
    if (!selectedRate || !shipmentId) return;
    setBuying(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/${order.id}/buy-label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rateId: selectedRate,
          easypostShipmentId: shipmentId,
          insure,
          declaredValue: insure ? declaredValue : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to purchase label");
        return;
      }

      setPurchased(json.data);
      // Open label in new tab
      if (json.data.labelUrl) {
        window.open(json.data.labelUrl, "_blank");
      }
    } catch {
      setError("Failed to purchase label");
    } finally {
      setBuying(false);
    }
  }

  // Identify best/fastest
  const cheapestId = rates.length > 0 ? rates[0].id : null;
  const fastestId = rates.length > 0
    ? [...rates].sort((a, b) => (a.deliveryDays ?? 99) - (b.deliveryDays ?? 99))[0].id
    : null;

  if (purchased) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100">
          <Check className="size-8 text-emerald-700" />
        </div>
        <h2 className="text-2xl font-bold">Label Purchased!</h2>
        <p className="text-muted-foreground">
          {purchased.carrier} — {purchased.service}
        </p>
        <p className="font-mono text-sm">{purchased.trackingNumber}</p>
        <p className="text-sm text-muted-foreground">Label opened in a new tab.</p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => router.push(`/orders/${order.id}`)}>View Order</Button>
          {purchased.labelUrl && (
            <a href={purchased.labelUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">Open Label Again</Button>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/orders/${order.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 size-3" /> Back to Order
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Ship Order {order.orderNumber}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Address + Package */}
        <div className="space-y-4">
          {/* Ship To */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4" /> Ship To
              </CardTitle>
              {addressVerified && <Badge variant="success"><Check className="mr-1 size-3" /> Verified</Badge>}
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                  <Input value={addr.name} onChange={(e) => { setAddr({ ...addr, name: e.target.value }); setAddressVerified(false); }} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Company</label>
                  <Input value={addr.company} onChange={(e) => { setAddr({ ...addr, company: e.target.value }); setAddressVerified(false); }} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Address 1</label>
                <Input value={addr.street1} onChange={(e) => { setAddr({ ...addr, street1: e.target.value }); setAddressVerified(false); }} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Address 2</label>
                <Input value={addr.street2} onChange={(e) => { setAddr({ ...addr, street2: e.target.value }); setAddressVerified(false); }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">City</label>
                  <Input value={addr.city} onChange={(e) => { setAddr({ ...addr, city: e.target.value }); setAddressVerified(false); }} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">State</label>
                  <Input value={addr.state} onChange={(e) => { setAddr({ ...addr, state: e.target.value }); setAddressVerified(false); }} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Zip</label>
                  <Input value={addr.zip} onChange={(e) => { setAddr({ ...addr, zip: e.target.value }); setAddressVerified(false); }} />
                </div>
              </div>
              <Button variant="outline" onClick={handleVerifyAddress} disabled={verifying}>
                <MapPin className="mr-1 size-3" />
                {verifying ? "Verifying..." : "Verify Address"}
              </Button>
            </CardContent>
          </Card>

          {/* Package Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-4" /> Package Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Weight (lbs)</label>
                  <Input type="number" min="0" step="0.1" value={weightLbs} onChange={(e) => setWeightLbs(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Weight (oz)</label>
                  <Input type="number" min="0" step="0.1" value={weightOz} onChange={(e) => setWeightOz(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Length (in)</label>
                  <Input type="number" min="0" step="0.1" value={dimLength} onChange={(e) => setDimLength(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Width (in)</label>
                  <Input type="number" min="0" step="0.1" value={dimWidth} onChange={(e) => setDimWidth(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Height (in)</label>
                  <Input type="number" min="0" step="0.1" value={dimHeight} onChange={(e) => setDimHeight(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Package Type</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                >
                  {PACKAGE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleFetchRates} disabled={fetchingRates} className="w-full">
                {fetchingRates ? (
                  <><Loader2 className="mr-1 size-4 animate-spin" /> Fetching rates from USPS, UPS, FedEx, DHL...</>
                ) : (
                  <><Truck className="mr-1 size-4" /> Get Shipping Rates</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Insurance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-4" /> Insurance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={insure}
                  onChange={(e) => setInsure(e.target.checked)}
                  className="accent-primary"
                />
                Add shipping insurance
              </label>
              {insure && (
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Declared Value ($)</label>
                  <Input type="number" min="0" step="0.01" value={declaredValue} onChange={(e) => setDeclaredValue(parseFloat(e.target.value) || 0)} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Estimated premium: ${(declaredValue * 0.01).toFixed(2)} (1% of declared value)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Rate Results */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Rates</CardTitle>
            </CardHeader>
            <CardContent>
              {rates.length === 0 && !fetchingRates && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Enter package details and click &quot;Get Shipping Rates&quot; to see available options.
                </p>
              )}
              {fetchingRates && (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />
                  ))}
                </div>
              )}
              {rates.length > 0 && (
                <div className="space-y-2">
                  {rates.map((rate) => {
                    const isSelected = selectedRate === rate.id;
                    const isCheapest = rate.id === cheapestId;
                    const isFastest = rate.id === fastestId && rate.id !== cheapestId;

                    return (
                      <button
                        key={rate.id}
                        onClick={() => setSelectedRate(rate.id)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{rate.carrier}</span>
                              {isCheapest && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Best Price</Badge>}
                              {isFastest && <Badge className="bg-blue-100 text-blue-700 border-blue-200">Fastest</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{rate.service}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">${rate.rate.toFixed(2)}</p>
                            {rate.deliveryDays && (
                              <p className="text-xs text-muted-foreground">
                                {rate.deliveryDays} day{rate.deliveryDays !== 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Buy Label Button */}
          {selectedRate && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleBuyLabel}
              disabled={buying}
            >
              {buying ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Purchasing Label...</>
              ) : (
                <><Truck className="mr-2 size-4" /> Buy Label — ${rates.find((r) => r.id === selectedRate)?.rate.toFixed(2)}</>
              )}
            </Button>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
