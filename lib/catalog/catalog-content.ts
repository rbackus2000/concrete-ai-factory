/**
 * Editorial copy for the storefront catalog.
 *
 * Edit this file directly to update the catalog's text content. Product data
 * (names, prices, dimensions, images) is pulled live from the Sku table — do
 * not duplicate product info here.
 *
 * Re-publish the catalog from /admin/catalog after editing this file to
 * regenerate the PDF and the JSON bundled by the BDC flipbook.
 */

export const CATALOG_CONTENT = {
  meta: {
    title: "Catalog 2026",
    subtitle: "Architectural concrete, cast by hand",
    version: 1,
  },

  cover: {
    image: "https://cdn.opsrbstudio.com/bdc-products/studio/workshop-wide.png",
    titleLines: ["Backus", "Design Co."],
    subtitle: "Architectural concrete, cast by hand · Catalog 2026",
  },

  designerLetter: {
    title: "A note from the studio",
    paragraphs: [
      "When we started Backus Design Co., the question wasn't whether we could cast concrete. It was whether we could make concrete behave the way we wanted it to — quiet, precise, sculptural, and dependable in a kitchen or a hotel lobby for thirty years.",
      "Every piece in this catalog is hand-cast in our Texas studio. We mix every batch by hand, build a mold for the piece it will serve, and don't rush a cure. We don't ship anything that hasn't reached full structural strength under our own roof.",
      "Architectural concrete is having a moment, and that moment will pass. What will outlast it is craft — the discipline of getting one thing right and not pretending it's something it isn't. That's what this catalog is. A small studio's record of what we make and how we make it.",
      "Thank you for taking the time to look.",
    ],
    signature: "Robert Backus, Founder",
  },

  studio: {
    intro:
      "Backus Design Co. is an architectural concrete studio in Texas. Founded by Robert Backus, the studio specializes in hand-cast GFRC (glass-fiber-reinforced concrete) pieces that live at the intersection of craft and architecture.",
    stats: [
      { number: "7-10", label: "Day cure, ship-ready" },
      { number: "214", label: "Pieces cast, 2025" },
      { number: "6", label: "Hands in the shop" },
    ],
    images: [
      "https://cdn.opsrbstudio.com/bdc-products/studio/workshop-wide.png",
      "https://cdn.opsrbstudio.com/bdc-products/studio/mixing.png",
      "https://cdn.opsrbstudio.com/bdc-products/studio/finishing.png",
    ],
    process: [
      {
        step: "01",
        title: "Design & Mold Build",
        body: "Every piece starts as a 3D model. Mold geometry is designed, patterns are 3D-printed in-house, and production molds are built from those prints — one mold per design.",
      },
      {
        step: "02",
        title: "Mix & Batch",
        body: "GFRC is batched by hand. Portland cement, fine aggregates, glass fiber, polymer, and pigment are weighed to the gram and logged per batch.",
      },
      {
        step: "03",
        title: "Pour & Spray",
        body: "The mix is sprayed or hand-packed into the mold in controlled layers. Fiber orientation, compaction pressure, and layer thickness are monitored.",
      },
      {
        step: "04",
        title: "Cure",
        body: "Seven to ten days in a controlled environment with temperature and humidity monitored daily. GFRC reaches strength faster than traditional concrete thanks to the glass-fiber reinforcement, but the cure is never accelerated.",
      },
      {
        step: "05",
        title: "Finish & Seal",
        body: "Each piece is hand-finished. Edges are refined, surfaces inspected under raking light, and the chosen sealer is applied. Food-safe finishes on all sink and kitchen surfaces.",
      },
      {
        step: "06",
        title: "QC & Ship",
        body: "Every piece is weighed, measured, and inspected against spec. Approved pieces are signed, numbered, and crated. Pieces that don't meet standard are rejected.",
      },
    ],
  },

  market: {
    title: "Where the material is going",
    intro:
      "Architectural concrete is no longer the brutalist outlier it once was. Designers, architects, and homeowners are reaching for it in spaces where the alternative used to be polished stone, lacquered wood, or quartz. Below is what we're watching from inside the trade.",
    bullets: [
      {
        headline: "GFRC has gone residential",
        body: "Glass-fiber reinforcement made it possible to cast thin, light, complex pieces without sacrificing structural integrity. What used to be a cladding-only material is now a sink, a console, a wall installation. The fiber does what rebar can't at this scale.",
      },
      {
        headline: "Reactive sealers replaced topical coatings",
        body: "The next decade of concrete care belongs to penetrating reactive sealers — silane / siloxane systems that bond chemically to the matrix instead of forming a film on top. They don't peel, they don't yellow, and they let the surface look like concrete instead of plastic.",
      },
      {
        headline: "Color is the new craft signal",
        body: "Where the field used to mean 'gray', we now work in 16 finishes across two families: Classic (smooth pigmented surfaces from Linen to Carbon) and Woodform (concrete cast against real wood-grain molds). Color is how a concrete piece signals which house it belongs in.",
      },
      {
        headline: "Sustainability favors small batches",
        body: "GFRC has roughly half the embodied carbon of solid precast concrete on a per-piece basis. Add hand-batched mixing — no warehouse-scale factory pour, no overproduction — and the per-piece footprint comes down further. Specifying small-batch isn't just an aesthetic choice anymore.",
      },
      {
        headline: "Provenance is the next premium",
        body: "Customers are tired of anonymous goods. A signed, numbered piece with a known studio, a known maker, and a known cure date carries a premium that mass production can't reach. That's the lane we work in.",
      },
    ],
  },

  colorGuide: {
    intro:
      "Sixteen studio finishes across two families. Classic colors are smooth pigmented GFRC surfaces. Woodform colors are GFRC cast against real walnut-grain molds — concrete that reads visually as reclaimed hardwood. Every piece in this catalog is available across the family appropriate to its shape.",
    families: [
      {
        name: "Classic",
        description: "Smooth, uniform, fine sand particle texture. Available across all sink, furniture, tile, and hard-goods designs.",
        colors: [
          { name: "Linen",     hex: "#F2EBDE", note: "Warm off-white" },
          { name: "Frost",     hex: "#D8D5CD", note: "Cool light gray" },
          { name: "Beach",     hex: "#B3A99B", note: "Warm mid-gray" },
          { name: "Graphite",  hex: "#9FA19C", note: "Cool mid-gray" },
          { name: "Pewter",    hex: "#888176", note: "Warm medium gray" },
          { name: "Storm",     hex: "#666A6B", note: "Cool dark gray" },
          { name: "Shadow",    hex: "#4A4A45", note: "Dark charcoal" },
          { name: "Carbon",    hex: "#2D2E2E", note: "Near-black" },
        ],
      },
      {
        name: "Woodform",
        description: "GFRC cast against real walnut slab molds. Realistic, deeply embossed wood-grain surface with visible grain lines, knots, and saw marks.",
        colors: [
          { name: "Mist",      hex: "#D8CDBD", note: "Light whitewashed wood" },
          { name: "Dune",      hex: "#B08968", note: "Warm natural blonde" },
          { name: "Fog",       hex: "#9A948A", note: "Cool gray wood" },
          { name: "Forest",    hex: "#3F5340", note: "Forest green wood" },
          { name: "Grove",     hex: "#6E5032", note: "Warm honey-amber" },
          { name: "Twilight",  hex: "#5E4E44", note: "Cool medium brown" },
          { name: "Mocha",     hex: "#463027", note: "Deep rich brown" },
          { name: "Ember",     hex: "#2A1F18", note: "Near-black charred" },
        ],
      },
    ],
  },

  finishesGuide: {
    intro:
      "Color is what the piece looks like; finish is how the surface feels and where it can live. We work in four base finishes.",
    finishes: [
      {
        name: "Classic",
        tagline: "Smooth, uniform, fine sand particle texture.",
        body: "All surfaces including sink basins. The default for kitchen and bath. Reads modern, minimal, and architectural.",
      },
      {
        name: "Foundry",
        tagline: "Naturally mottled, hand-troweled.",
        body: "Subtle color variation and artisan character. Not for sink basins. Best on furniture, side tables, and accent pieces where the hand-troweled surface adds depth.",
      },
      {
        name: "Industrial",
        tagline: "Raw, distressed, visible air pores.",
        body: "Exposed aggregate texture and intentional imperfections. Vertical surfaces only — wall tile, slat panels, accent walls.",
      },
      {
        name: "Woodform",
        tagline: "Wood-grain texture cast from real walnut slab molds.",
        body: "Indoor or outdoor. Reads as reclaimed hardwood from across the room. Available across sinks, furniture, tile, and slat wall art in eight Woodform colors.",
      },
    ],
  },

  sections: [
    {
      code: "sinks",
      bdcCategory: "Vessel Sink",
      bdcUrlSegment: "sinks",
      title: "Sinks",
      eyebrow: "01 — Vessel Sinks",
      intro:
        "Thirteen designs, each poured in GFRC with a seven-to-ten-day monitored cure to ship strength. Every basin is unique — shaped by the mold, the mix, and the moment of the pour. Mount type, drain type, and overflow status are listed per piece.",
    },
    {
      code: "furniture",
      bdcCategory: "Furniture",
      bdcUrlSegment: "furniture",
      title: "Furniture",
      eyebrow: "02 — Furniture",
      intro:
        "Tables, consoles, and benches in cast GFRC. Indoor and outdoor pieces, hand-finished and signed. Lead times vary by piece — most made-to-order furniture ships in three to five weeks.",
    },
    {
      code: "slat-wall",
      bdcCategory: "Slat Wall",
      bdcUrlSegment: "slat-wall-art",
      title: "Slat Wall Art",
      eyebrow: "03 — Slat Wall Art",
      intro:
        "Modular cast-concrete wall installations. Modules range from 36 to 60 inches; the Kinetic system is sized to the wall. Six-to-eight-week lead time on standard pieces; eight to twelve on custom widths.",
    },
    {
      code: "tile",
      bdcCategory: "Wall Tile",
      bdcUrlSegment: "tile",
      title: "Tile",
      eyebrow: "04 — Tile",
      intro:
        "Cast concrete tile in four formats. Smooth, ridged, and large-format slab. All tile is wall-mount via thinset or mechanical anchor depending on size. Sold by the square foot.",
    },
    {
      code: "hard-goods",
      bdcCategory: "Hard Goods",
      bdcUrlSegment: "hard-goods",
      title: "Hard Goods",
      eyebrow: "05 — Hard Goods",
      intro:
        "Bowls, trays, candle holders, planters, and desk objects. Affordable entry points into the studio's material language. Most items ship within five business days.",
    },
  ],

  care: {
    intro:
      "Architectural concrete is built to outlast its first installation. Care for it the way it was made — by hand, on a slow rhythm, with the right materials. Every studio piece ships with a free in-box starter kit (a small wax tin, a microfiber cloth, a printed care card with a QR code that links to a maintenance video and a reorder page).",
    routines: [
      { title: "Daily", body: "Wipe with a soft cloth and pH-neutral soap diluted in warm water. Rinse and dry. Avoid bleach, ammonia, acetone, abrasive scrubbers, and steel wool." },
      { title: "Monthly", body: "Apply a thin coat of food-safe maintenance wax with a soft applicator. Allow to haze for 2-3 minutes, then buff to a soft matte finish." },
      { title: "Annual", body: "For active outdoor furniture and bathroom tile, reseal annually with reactive penetrating resealer. Indoor pieces need resealing every 3-5 years." },
      { title: "Repair", body: "Edge chips fill with color-matched repair compound. Specify your studio color when ordering — we mix to match." },
    ],
    kitsIntro:
      "Care kits are sold individually as ongoing maintenance for each product family. A single kit covers 12-18 months of recommended care for one piece.",
  },

  commissions: {
    intro:
      "We accept a limited number of commissions each quarter. Whether you're an architect specifying for a hospitality project, a designer working on a residential install, or a homeowner who wants a sink we don't currently make — we work directly to develop the piece.",
    steps: [
      { title: "Conversation", body: "Tell us about the space, the intent, and any constraints." },
      { title: "Concept & Pricing", body: "We develop a proposal with drawings, material samples, and a fixed quote." },
      { title: "Fabrication", body: "Molds are built, mixes batched, and pieces poured. Progress photos throughout." },
      { title: "Cure & Delivery", body: "Seven to ten day monitored cure, final finishing, signed and crated." },
    ],
    leadTime: "Lead times range from 10 to 14 weeks depending on complexity and finish.",
  },

  trade: {
    intro:
      "We work with architects, interior designers, and trade professionals on residential and hospitality specifications. Trade pricing, COMs, and project documentation available on application.",
    perks: [
      "Tiered trade pricing on all standard catalog SKUs",
      "Specification packets with technical drawings, weights, and finish samples",
      "Direct line to the studio for project-specific questions",
      "Material samples shipped within five business days",
    ],
  },

  leadTimes: {
    intro: "Lead times depend on the piece. In-stock items are pulled and shipped within five business days; made-to-order pieces are batched and cured before crating.",
    ranges: [
      { category: "Hard Goods (in stock)",     time: "5 business days" },
      { category: "Sinks (in stock)",          time: "5 business days" },
      { category: "Sinks (made to order)",     time: "2-3 weeks" },
      { category: "Tile",                      time: "5 days to 4 weeks (by quantity)" },
      { category: "Furniture",                 time: "3-5 weeks" },
      { category: "Slat Wall Art",             time: "6-8 weeks (12 weeks for custom)" },
      { category: "Custom commissions",        time: "10-14 weeks" },
    ],
  },

  glossary: [
    { term: "GFRC",                  definition: "Glass-fiber-reinforced concrete. A modern composite that uses alkali-resistant glass fibers in place of steel rebar. Allows thin, light, complex castings without compromising structural integrity." },
    { term: "Reactive sealer",       definition: "A penetrating sealer (typically silane / siloxane) that chemically bonds with the concrete matrix instead of forming a film on top. Doesn't peel, doesn't yellow, and lets the surface look like concrete." },
    { term: "Foundry finish",         definition: "A naturally mottled, hand-troweled surface with subtle color variation. Best on accent pieces where the artisan texture adds depth." },
    { term: "Woodform",              definition: "GFRC cast against real walnut slab molds. The cured surface carries a realistic wood-grain texture but the piece is concrete." },
    { term: "Cure",                   definition: "The chemical process by which fresh concrete reaches its full structural strength. GFRC reaches ship-strength in 7-10 days under controlled temperature and humidity." },
    { term: "Trade program",         definition: "Tiered pricing and project-support program for architects, interior designers, and specifiers." },
    { term: "Color match",           definition: "Repair compound mixed to order using the customer's original studio color. Required for chip and edge repair on archived pieces." },
  ],

  contact: {
    studioName: "Backus Design Co.",
    addressLines: ["205 Portina Dr.", "Anna, Texas 75409"],
    email: "studio@backusdesignco.com",
    phone: "Available on request",
    hours: "Studio and showroom by appointment.",
    website: "BACKUSDESIGNCO.COM",
  },
} as const;

export type CatalogContent = typeof CATALOG_CONTENT;
