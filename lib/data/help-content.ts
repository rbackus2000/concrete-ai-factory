export type HelpStep = {
  title: string;
  detail: string;
};

export type HelpGuide = {
  title: string;
  summary: string;
  steps: HelpStep[];
  tips?: string[];
};

export const helpContent: Record<string, HelpGuide> = {
  // ─── DASHBOARD ──────────────────────────────────────────────
  dashboard: {
    title: "Dashboard",
    summary:
      "Your daily operations command center. See revenue, outstanding invoices, production status, and AI-generated insights at a glance.",
    steps: [
      {
        title: "KPI Cards (Top Row)",
        detail:
          "Six key metrics: monthly revenue (with trend vs. last month), outstanding invoices, overdue invoices, active orders, inventory value, and pipeline value. Click any card to jump directly to that module.",
      },
      {
        title: "Revenue & Expenses Chart",
        detail:
          "Monthly bar chart showing revenue (gold bars) vs. costs (dark bars). The dashed line shows net profit. Toggle between 12-month and 6-month views using the buttons above the chart.",
      },
      {
        title: "AR Aging Buckets",
        detail:
          "Four boxes showing how much is Current, 1\u201330 days, 31\u201360 days, and 60+ days overdue. Below the buckets, a table lists your top overdue invoices with links to follow up.",
      },
      {
        title: "Sales Trends",
        detail:
          "Line chart tracking quotes sent, quotes signed, and revenue over time. Use this to spot patterns in your sales pipeline and conversion rates.",
      },
      {
        title: "Top Customers",
        detail:
          "Your highest-revenue customers ranked by total paid. Shows open quotes and pipeline stage for each. Click a customer name to view their full contact record.",
      },
      {
        title: "AI Daily Briefing",
        detail:
          'Claude analyzes your live business data and generates a daily operations briefing. Click "Generate Today\'s Briefing" if one hasn\'t been created yet. Covers what needs attention, production status, and one key recommendation.',
      },
      {
        title: "Production Queue",
        detail:
          "Three sections: orders Ready to Build (green), Blocked by material shortages (red, shows what\u2019s missing), and Ready to Ship (blue). Use this to plan your daily production.",
      },
      {
        title: "Inventory Health",
        detail:
          "Two horizontal bar charts. Raw Materials compares on-hand stock vs. reorder points. Finished Products compares on-hand vs. reserved quantities. Red highlights items below reorder thresholds.",
      },
    ],
    tips: [
      "The daily briefing is also emailed to you at 7:00 AM CT every morning.",
      "KPI cards with red or amber borders indicate items that need your attention.",
      "All charts and tables link to their respective modules for drill-down details.",
    ],
  },

  // ─── CONTACTS ───────────────────────────────────────────────
  contacts: {
    title: "Contacts",
    summary:
      "Your CRM contact list. Every customer, lead, and prospect lives here. This is the starting point for quotes, invoices, and pipeline tracking.",
    steps: [
      {
        title: "Stats Cards",
        detail:
          "Three summary cards at the top show Total Contacts, Pipeline Value (sum of all open quotes), and New Leads count.",
      },
      {
        title: "Filters",
        detail:
          "Use the filter bar to narrow contacts by pipeline Stage (New Lead, Qualified, Proposal Sent, etc.), search by name/email/company, or filter by tags.",
      },
      {
        title: "Contact Table",
        detail:
          "Each row shows the contact\u2019s name, company, pipeline stage, tags, total quoted amount, and last activity date. Click a name to open their full record.",
      },
      {
        title: "Quick Actions",
        detail:
          "Each row has View and New Quote buttons. Click New Quote to jump straight to the quote builder pre-filled with that customer\u2019s info.",
      },
      {
        title: "Adding Contacts",
        detail:
          'Click "New Contact" in the top right to create a new contact record. You\u2019ll enter their name, email, company, and pipeline stage.',
      },
    ],
    tips: [
      "Tags help you segment contacts for marketing campaigns and sequences.",
      "The pipeline stage tracks where each contact is in your sales process \u2014 drag them on the Pipeline board to update.",
    ],
  },

  "contacts-new": {
    title: "New Contact",
    summary:
      "Add a new customer, lead, or prospect to your CRM. Fill in as much or as little as you have \u2014 you can always update later.",
    steps: [
      {
        title: "Name",
        detail: "Full name of the contact. This is the only required field.",
      },
      {
        title: "Email & Phone",
        detail:
          "Contact\u2019s email and phone number. Email is used for sending quotes, invoices, and marketing sequences.",
      },
      {
        title: "Company & Title",
        detail:
          "The company they work for and their job title. Helpful for B2B projects like architectural installs.",
      },
      {
        title: "Address Fields",
        detail:
          "Street address, city, state, and zip. Used for shipping when you create orders for this contact.",
      },
      {
        title: "Source",
        detail:
          'How this contact found you \u2014 e.g., "Website", "Instagram", "Referral", "Trade Show". Helps track which marketing channels work.',
      },
      {
        title: "Tags",
        detail:
          'Comma-separated labels for segmenting contacts \u2014 e.g., "architect, commercial, dallas". Used for marketing campaign targeting.',
      },
      {
        title: "Pipeline Stage",
        detail:
          "Where this contact is in your sales process: New Lead, Contacted, Qualified, Proposal Sent, Negotiation, Won, or Lost.",
      },
      {
        title: "Notes",
        detail:
          "Free-form notes about the contact. Project details, preferences, special requirements, etc.",
      },
    ],
  },

  "contacts-detail": {
    title: "Contact Detail",
    summary:
      "Everything about this customer in one place \u2014 quotes, invoices, orders, activities, and marketing enrollment.",
    steps: [
      {
        title: "Contact Info",
        detail:
          "Name, email, phone, company, and address at the top. Click Edit to update any of these fields.",
      },
      {
        title: "Quotes Tab",
        detail:
          "All quotes created for this contact with status, amount, and dates. Click a quote number to view the full quote.",
      },
      {
        title: "Invoices Tab",
        detail:
          "All invoices sent to this contact showing status (Draft, Sent, Paid, Overdue), amounts, and payment history.",
      },
      {
        title: "Orders Tab",
        detail:
          "Production orders linked to this contact. Shows order status, items, and shipping info.",
      },
      {
        title: "Activity Timeline",
        detail:
          "Chronological log of all interactions \u2014 quotes sent, invoices paid, emails opened, stage changes, and notes.",
      },
      {
        title: "Marketing Enrollment",
        detail:
          "Shows which email sequences this contact is enrolled in, and their email engagement history (opens, clicks).",
      },
    ],
    tips: [
      "Use the activity timeline to check when a quote was last viewed before following up.",
      "You can create a new quote directly from this page using the action buttons.",
    ],
  },

  "contacts-edit": {
    title: "Edit Contact",
    summary: "Update this contact\u2019s information. All fields match the New Contact form.",
    steps: [
      {
        title: "Basic Info",
        detail: "Update name, email, phone, company, and title.",
      },
      {
        title: "Address",
        detail:
          "Update the shipping/billing address. This will be used as the default ship-to address on future orders.",
      },
      {
        title: "Pipeline Stage",
        detail:
          'Change the sales stage. You can also drag the contact on the Pipeline board instead. Moving to "Won" or "Lost" updates your conversion metrics.',
      },
      {
        title: "Tags & Notes",
        detail:
          "Update tags (comma-separated) for marketing segmentation, and add any new notes about the contact.",
      },
    ],
  },

  // ─── PIPELINE ───────────────────────────────────────────────
  pipeline: {
    title: "Pipeline Board",
    summary:
      "Visual Kanban board showing all contacts organized by sales stage. Drag cards between columns to update their pipeline position.",
    steps: [
      {
        title: "Stage Columns",
        detail:
          "Each column represents a sales stage: New Lead, Contacted, Qualified, Proposal Sent, Negotiation, Won, Lost. The header shows the count and total pipeline value for that stage.",
      },
      {
        title: "Contact Cards",
        detail:
          "Each card shows the contact\u2019s name, company, and total quoted value. Click a card to open the contact detail page.",
      },
      {
        title: "Drag to Move",
        detail:
          "Drag a contact card from one column to another to update their pipeline stage. The change is saved automatically.",
      },
      {
        title: "Pipeline Value",
        detail:
          "The header shows total contacts and total pipeline value across all stages. This represents all open quote amounts.",
      },
    ],
    tips: [
      "Contacts with exceptions (like shipping issues) are highlighted so you can address them.",
      "Pipeline value only counts open quotes \u2014 paid invoices are counted as revenue instead.",
    ],
  },

  // ─── QUOTES ─────────────────────────────────────────────────
  quotes: {
    title: "Quotes",
    summary:
      "Build, send, and track quotes. See status, customer views, e-signatures, and conversion rates in one place.",
    steps: [
      {
        title: "Stats Bar",
        detail:
          "Shows open quote count, total pending dollar amount, and your conversion rate (quotes signed \u00f7 quotes sent).",
      },
      {
        title: "Filters",
        detail:
          "Filter by status (Draft, Sent, Viewed, Signed, Expired, Converted) and search by quote number, customer name, or company.",
      },
      {
        title: "Quote Table",
        detail:
          "Each row shows: quote number, customer, status badge, total, item count, view count (how many times the customer opened it), linked invoice status, and created date.",
      },
      {
        title: "View Tracking",
        detail:
          "The Views column shows how many times the customer opened the quote link. A high view count with no signature means they\u2019re interested but hesitating \u2014 follow up!",
      },
      {
        title: "Invoice Link",
        detail:
          "If a quote has been converted to an invoice, the Invoice column shows the invoice status as a clickable badge.",
      },
    ],
    tips: [
      "Quotes with view counts > 3 but unsigned are your best follow-up candidates.",
      'Click "New Quote" to start building a quote from scratch, or go to a Contact and click "New Quote" to pre-fill their info.',
    ],
  },

  "quotes-new": {
    title: "Quote Builder",
    summary:
      "Build a detailed quote with line items, pricing, discounts, and terms. Send it to the customer for e-signature.",
    steps: [
      {
        title: "Customer Info",
        detail:
          "Select an existing contact or enter customer details manually. Name, email, and phone are used on the quote document and for sending.",
      },
      {
        title: "Line Items",
        detail:
          'Add products from your catalog or create custom line items. Each line has a description, quantity, unit price, and optional discount %. Click "Add Line Item" for each product.',
      },
      {
        title: "Pricing Tier",
        detail:
          "Choose Retail or Wholesale pricing. This affects which prices are pulled from your product catalog for auto-filled items.",
      },
      {
        title: "Discount & Tax",
        detail:
          "Set an overall discount amount and tax rate. These apply to the quote total after line item calculations.",
      },
      {
        title: "Customer Message",
        detail:
          "A message displayed to the customer on the quote page. Use this for project scope notes, lead times, or special conditions.",
      },
      {
        title: "Terms & Valid Until",
        detail:
          "Payment terms (e.g., Net 30, 50% deposit) and quote expiration date. The quote link shows an expired notice after this date.",
      },
      {
        title: "Internal Notes",
        detail:
          "Notes visible only to you \u2014 not shown to the customer. Use for internal pricing justification, margin notes, etc.",
      },
    ],
    tips: [
      "Optional line items are shown at 50% opacity on the quote and aren\u2019t included in the total.",
      "After saving, you\u2019ll get a public link to send to the customer for viewing and e-signing.",
    ],
  },

  "quotes-detail": {
    title: "Quote Detail",
    summary:
      "View the complete quote with line items, pricing, signature status, customer activity, and available actions.",
    steps: [
      {
        title: "Summary Cards",
        detail:
          "Four cards at the top: Quote Total (with pricing tier badge), Item Count, View Count (with first viewed date), and Valid Until date.",
      },
      {
        title: "Customer Card",
        detail:
          "Shows contact name, email (clickable mailto link), phone, company, and the customer message you included.",
      },
      {
        title: "Line Items Table",
        detail:
          "Full breakdown of every item with price, quantity, discount, and line total. Optional items shown at 50% opacity. Subtotal, discount, tax, and final total calculated at the bottom.",
      },
      {
        title: "Signature Card",
        detail:
          "If the customer signed, shows their name, date/time, IP address, and signature image. This serves as your e-signature record.",
      },
      {
        title: "Activity Timeline",
        detail:
          "Shows every event: Created, Sent, Viewed (with IP), Signed, and Converted to Invoice. Use this to track customer engagement.",
      },
      {
        title: "Actions",
        detail:
          "Available actions depend on status: Send (emails the link), Convert to Invoice (creates an invoice from this quote), Edit, and Copy Public Link.",
      },
    ],
    tips: [
      "The public link (/q/...) is what the customer sees. Share it via email or text.",
      'Converting to an invoice automatically copies all line items and links the two records.',
    ],
  },

  "quotes-edit": {
    title: "Edit Quote",
    summary:
      "Modify an existing quote. Same fields as the quote builder \u2014 update line items, pricing, terms, or customer info.",
    steps: [
      {
        title: "Edit Any Field",
        detail:
          "All fields from the original quote are editable: customer info, line items, pricing, discount, tax, terms, and messages.",
      },
      {
        title: "Add / Remove Line Items",
        detail:
          "Add new products or remove existing ones. Line totals recalculate automatically.",
      },
      {
        title: "Save Changes",
        detail:
          "Click Save to update the quote. If the quote has already been sent, the customer will see the updated version at the same link.",
      },
    ],
    tips: [
      "Editing a sent quote updates the live link immediately \u2014 the customer sees the new version.",
      "The activity log records when edits were made.",
    ],
  },

  // ─── INVOICES ───────────────────────────────────────────────
  invoices: {
    title: "Invoices",
    summary:
      "Track all invoices from draft through payment. Monitor outstanding balances, overdue amounts, and payment collection.",
    steps: [
      {
        title: "Summary Cards",
        detail:
          "Four cards: Outstanding (total unpaid), Overdue (past due date, shown in red), Paid This Month (shown in green), and Drafts count.",
      },
      {
        title: "Filters",
        detail:
          "Filter by status (Draft, Sent, Viewed, Partial, Paid, Overdue, Cancelled) and search by invoice number, customer, or company.",
      },
      {
        title: "Invoice Table",
        detail:
          "Each row shows: invoice number, customer, status badge, issued date, due date, total, amount paid, and amount still due.",
      },
      {
        title: "Overdue Indicators",
        detail:
          "Overdue invoices show a red badge with days overdue. Due dates within 7 days show in amber as a warning.",
      },
      {
        title: "Payment Status",
        detail:
          'The Paid column shows how much has been collected in green. The Due column shows the remaining balance, or "Paid" if fully collected.',
      },
    ],
    tips: [
      "Invoices are created by converting signed quotes \u2014 you don\u2019t create them from scratch.",
      "The dashboard AR Aging section groups these invoices into aging buckets for a quick health check.",
    ],
  },

  "invoices-detail": {
    title: "Invoice Detail",
    summary:
      "Complete invoice view with status timeline, line items, payment history, and available actions like sending reminders.",
    steps: [
      {
        title: "Status Timeline",
        detail:
          "Visual 4-step progress bar: Created \u2192 Sent \u2192 Viewed \u2192 Paid. Shows checkmarks and dates for completed steps.",
      },
      {
        title: "Summary Cards",
        detail:
          "Four cards: Invoice Total, Amount Paid (green), Amount Due (red if overdue), and Due Date (red if past due with days count).",
      },
      {
        title: "Line Items",
        detail:
          "Full breakdown of items with price, quantity, and totals. Subtotal, discount, tax, and final total at the bottom.",
      },
      {
        title: "Payment History",
        detail:
          "Table showing every payment received: date, method (Stripe Card, ACH, Cash, Check, Wire), amount, status, and card details if applicable.",
      },
      {
        title: "Activity Log",
        detail:
          "Timeline of all events: sent, viewed, payment received/failed, reminders sent, and status changes.",
      },
      {
        title: "Actions",
        detail:
          "Available actions: Send Invoice (emails the payment link), Send Reminder, Record Payment (manual), Mark as Paid, and Cancel. The public link is also available.",
      },
    ],
    tips: [
      "The public payment link (/inv/...) lets customers view and pay the invoice online.",
      "Payment methods include Stripe (card/ACH), cash, check, and wire transfer.",
    ],
  },

  // ─── ORDERS ─────────────────────────────────────────────────
  orders: {
    title: "Orders",
    summary:
      "Manage orders from production through delivery. Track status, ship orders, verify items, and handle exceptions.",
    steps: [
      {
        title: "Stats Cards",
        detail:
          "Four cards: Active Orders, Ready to Ship, In Transit, and Exceptions (orders with issues).",
      },
      {
        title: "Status Tabs",
        detail:
          "Filter by status: All, Pending, In Production, Quality Check, Ready to Ship, Shipped, Delivered, Exception. Each tab shows the count.",
      },
      {
        title: "Search",
        detail:
          "Search by order number, customer name, company, or tracking number.",
      },
      {
        title: "Order Table",
        detail:
          "Each row shows: order number, customer, date, item count, weight, status badge, carrier/tracking, and ship-by date. Click the expand arrow to see line item details.",
      },
      {
        title: "Expanded Row",
        detail:
          "Clicking the expand arrow shows all line items as pills with images, SKU codes, quantities, and totals.",
      },
      {
        title: "Bulk Actions",
        detail:
          "Select multiple orders with checkboxes, then use bulk actions: Print Labels, Print Packing Slips, Mark In Production, or Mark Ready to Ship.",
      },
      {
        title: "Row Actions",
        detail:
          'Each row has View and Ship buttons. "Ship" takes you to the shipping workflow with rate shopping and label purchase.',
      },
    ],
    tips: [
      "Ship-by dates in red are past due \u2014 prioritize these.",
      "The status flow is: Pending \u2192 In Production \u2192 Quality Check \u2192 Ready to Ship \u2192 Shipped \u2192 Delivered.",
    ],
  },

  "orders-new": {
    title: "New Order",
    summary:
      "Create a production order manually. Select a customer, add line items, and set shipping details.",
    steps: [
      {
        title: "Select Customer",
        detail:
          "Choose an existing contact from the dropdown. Their info will be used for shipping and communications.",
      },
      {
        title: "Ship-To Address",
        detail:
          "Enter the shipping destination: name, company, street address, city, state, and zip. Set the ship-by date for production scheduling.",
      },
      {
        title: "Line Items",
        detail:
          'Add products from your finished inventory using the "Add product..." dropdown. Or click "+ Custom Item" for non-catalog items. Set quantities and unit prices for each.',
      },
      {
        title: "Line Item Details",
        detail:
          "Each line shows the item name, quantity, unit price, and calculated line total. Click the X to remove a line item.",
      },
      {
        title: "Production Notes",
        detail:
          "Add any special instructions for production: custom finishes, packaging requirements, priority notes, etc.",
      },
    ],
    tips: [
      "Orders are typically created automatically when invoices are paid, but you can create manual orders for special situations.",
      "The total is calculated from line items and displayed at the bottom.",
    ],
  },

  "orders-detail": {
    title: "Order Detail",
    summary:
      "Complete order view with status timeline, line items, shipping info, tracking, and all available actions.",
    steps: [
      {
        title: "Status Timeline",
        detail:
          "Visual progress bar showing the order\u2019s journey: Pending \u2192 In Production \u2192 Quality Check \u2192 Ready to Ship \u2192 Shipped \u2192 Delivered.",
      },
      {
        title: "Summary Cards",
        detail:
          "Four cards: Order Total, Item Count, Verified count (items QC\u2019d vs. total), and Shipping Cost.",
      },
      {
        title: "Line Items Table",
        detail:
          "Shows each item with image, SKU, quantity, price, total, and verification status (Verified in green, or count progress).",
      },
      {
        title: "Quick Actions (Right Panel)",
        detail:
          "Status-dependent buttons: Ship This Order, Print Label, Print Packing Slip, Verify Items, Mark In Production, Mark Ready to Ship, and Cancel Order.",
      },
      {
        title: "Ship-To & Package Details",
        detail:
          "Editable cards showing shipping address and package dimensions/weight. Click the pencil icon to edit. Use Verify Address to validate with the carrier.",
      },
      {
        title: "Tracking & Activity",
        detail:
          "If shipped, shows tracking timeline with carrier updates. The activity card logs every status change, label purchase, and event.",
      },
      {
        title: "Notes",
        detail:
          "Production notes and packing notes are shown and editable. These appear on the packing slip.",
      },
    ],
    tips: [
      "Verify items by scanning barcodes before shipping to catch picking errors.",
      "The Ship button takes you to the rate-shopping workflow where you compare carrier rates and buy labels.",
    ],
  },

  "orders-ship": {
    title: "Ship Order",
    summary:
      "Complete the shipping workflow: enter package details, get carrier rates, compare options, and purchase a shipping label.",
    steps: [
      {
        title: "Ship-To Address",
        detail:
          'Verify or update the destination address. Click "Verify Address" to validate it with the carrier and get the standardized version.',
      },
      {
        title: "Package Details",
        detail:
          "Enter the package weight (lbs and oz), dimensions (length, width, height in inches), and package type. These are required to get accurate shipping rates.",
      },
      {
        title: "Insurance (Optional)",
        detail:
          "Check the box to add shipping insurance. Enter the declared value and the estimated premium is calculated automatically.",
      },
      {
        title: "Get Shipping Rates",
        detail:
          'Click "Get Shipping Rates" to fetch real-time rates from all carriers. This calls EasyPost for live pricing.',
      },
      {
        title: "Compare Rates",
        detail:
          'Rates are listed by carrier and service level with cost, delivery time, and badges for "Best Price" and "Fastest". Click a rate to select it.',
      },
      {
        title: "Buy Label",
        detail:
          'Click "Buy Label" to purchase the shipping label. The label PDF opens automatically for printing. Tracking number is saved to the order.',
      },
    ],
    tips: [
      "Address verification catches typos that would cause delivery failures.",
      "The label is generated instantly and can be reprinted from the order detail page.",
      "Insurance is recommended for orders over $500.",
    ],
  },

  "orders-verify": {
    title: "Verify Items",
    summary:
      "Scan barcodes to verify each item in the order before shipping. Ensures accurate fulfillment and catches picking errors.",
    steps: [
      {
        title: "Progress Bar",
        detail:
          "Shows how many items have been verified out of the total. Turns green and shows a banner when all items are verified.",
      },
      {
        title: "Camera Scanner",
        detail:
          "Point your camera at an item\u2019s barcode. The scanner reads it automatically and checks it against the order\u2019s line items.",
      },
      {
        title: "Manual Entry",
        detail:
          'If the camera can\u2019t read a barcode, type the barcode or SKU number manually and click "Scan".',
      },
      {
        title: "Scan Results",
        detail:
          'Green flash = item verified successfully. Red flash = item not in this order. The checklist below updates in real time.',
      },
      {
        title: "Item Checklist",
        detail:
          'Each line item shows a checkbox, name, SKU, quantity, and scan progress. You can also click "Mark Verified" to manually verify without scanning.',
      },
      {
        title: "Proceed to Ship",
        detail:
          'Once all items are verified, a "Proceed to Ship" button appears to go directly to the shipping workflow.',
      },
    ],
    tips: [
      "Scan each unit individually \u2014 the counter tracks how many of each item have been scanned.",
      "You can verify items in any order. The checklist shows which ones are still pending.",
    ],
  },

  // ─── INVENTORY ──────────────────────────────────────────────
  inventory: {
    title: "Inventory",
    summary:
      "Track all finished products and raw materials. Manage stock levels, reorder points, and inventory value.",
    steps: [
      {
        title: "Stats Cards",
        detail:
          "Four cards: Total Items, Total Value (with finished vs. raw breakdown), Low Stock count (red if any), and Items on Order (from purchase orders).",
      },
      {
        title: "Action Bar",
        detail:
          "Quick action buttons: Print Labels, Cycle Count, Reorder Report, Export CSV, and Sync Inventory.",
      },
      {
        title: "Filters",
        detail:
          "Filter by type (Finished Product or Raw Material), status (in stock, low stock, out of stock), and search by name or SKU.",
      },
      {
        title: "Inventory Table",
        detail:
          "Each row shows: item name/SKU, type badge, category, on-hand quantity, reserved quantity, available quantity, reorder point, unit cost, and total value. Low stock items have a red badge.",
      },
      {
        title: "Item Links",
        detail:
          "Click any item name to open the detail page where you can view stock history, adjust quantities, and print labels.",
      },
    ],
    tips: [
      "Available = On Hand \u2212 Reserved. Reserved items are allocated to existing orders.",
      "Use the Reorder Report to see all raw materials below their reorder point, grouped by vendor.",
      "Export CSV for external reporting or accounting.",
    ],
  },

  "inventory-new": {
    title: "Add Inventory Item",
    summary:
      "Create a new finished product or raw material in your inventory system.",
    steps: [
      {
        title: "Item Type",
        detail:
          "Choose Finished Product (something you sell) or Raw Material (something you use in production). This controls which fields appear.",
      },
      {
        title: "Name & SKU",
        detail:
          "Enter the item name and optionally a SKU/code. If you leave SKU blank, one will be auto-generated.",
      },
      {
        title: "Description & Category",
        detail:
          'Describe the item and assign a category (e.g., "GFRC", "Pigment", "Hardware", "Sealer"). Categories help with filtering and reporting.',
      },
      {
        title: "Supplier Info (Raw Materials)",
        detail:
          "For raw materials: set the unit of measure (EA, LB, KG, GAL, etc.), vendor name, vendor SKU, and cost per unit. This feeds into your costing calculations.",
      },
      {
        title: "Stock Levels",
        detail:
          "Set the initial quantity on hand, reorder point (triggers low-stock alert), and suggested reorder quantity (for purchase orders).",
      },
    ],
    tips: [
      "Finished products are items you sell to customers. Raw materials are consumed during production.",
      "Set reorder points to get alerts on the dashboard and reorder report when stock runs low.",
    ],
  },

  "inventory-detail": {
    title: "Inventory Item Detail",
    summary:
      "Full item detail with stock levels, movement history, barcode, valuation, and quick stock adjustment buttons.",
    steps: [
      {
        title: "Item Info Bar",
        detail:
          "Shows type badge, SKU, category, low stock warning (if applicable), and item description.",
      },
      {
        title: "Barcode",
        detail:
          "Displays the item\u2019s barcode with a Print Label button. This barcode is used for scanning in the warehouse.",
      },
      {
        title: "Stock Level Cards",
        detail:
          "Four cards: On Hand, Reserved (allocated to orders), On Order (from purchase orders), and Available (what you can actually use/sell).",
      },
      {
        title: "Quick Actions",
        detail:
          'Three buttons: "+ Add Stock" (receive inventory), "- Remove Stock" (use or dispose), and "Print Label" (generate barcode label).',
      },
      {
        title: "Stock Movement History",
        detail:
          "Table showing every stock change: date, type (In/Out/Adjustment), quantity change, running balance, reason, and reference (linked to PO, invoice, etc.).",
      },
      {
        title: "Sidebar Details",
        detail:
          "Right panel shows: unit cost, total valuation, vendor info, reorder settings, and any open purchase orders for this item.",
      },
    ],
    tips: [
      "Stock movements are automatically created when purchase orders are received or orders are shipped.",
      "Manual adjustments should include a reason for audit trail purposes.",
    ],
  },

  "inventory-edit": {
    title: "Edit Inventory Item",
    summary:
      "Update item details, supplier info, and reorder settings. Stock quantities are adjusted through Add/Remove Stock instead.",
    steps: [
      {
        title: "Item Details",
        detail:
          "Update name, description, category, and image URL. The item type (Finished/Raw) cannot be changed after creation.",
      },
      {
        title: "Supplier Info",
        detail:
          "Update vendor name, vendor SKU, unit of measure, and cost per unit.",
      },
      {
        title: "Reorder Settings",
        detail:
          "Adjust the reorder point and suggested reorder quantity. Changes take effect immediately on the reorder report.",
      },
    ],
    tips: [
      'To change stock quantities, use the Add Stock / Remove Stock buttons on the detail page instead of editing.',
    ],
  },

  "inventory-scan": {
    title: "Barcode Scanner",
    summary:
      "Scan item barcodes to quickly look up stock levels, add stock, or check materials out to projects.",
    steps: [
      {
        title: "Camera Scan",
        detail:
          "Point your camera at any inventory barcode. The scanner reads it automatically and pulls up the item.",
      },
      {
        title: "Manual Lookup",
        detail:
          'If the camera can\u2019t read a barcode, type the barcode number or SKU manually and click "Lookup".',
      },
      {
        title: "Item Display",
        detail:
          "Once scanned, you\u2019ll see the item name, type, current on-hand quantity (large display), and low-stock warning if applicable.",
      },
      {
        title: "Add Stock",
        detail:
          'Click "+ Add Stock", enter the quantity, select a reason (Received from PO, Production Return, Adjustment, etc.), and optionally add notes. Click "Confirm Add".',
      },
      {
        title: "Material Out",
        detail:
          'Click "Material Out" to check materials out. First select where it\u2019s going (Project, Shop, or Test), then select the specific job if it\u2019s a project, enter the quantity, and confirm.',
      },
    ],
    tips: [
      "Material Out linked to a project automatically creates a stock movement reference on that job.",
      "If a scanned barcode isn\u2019t found, you\u2019ll get an option to create a new inventory item.",
    ],
  },

  "inventory-reorder": {
    title: "Reorder Report",
    summary:
      "Shows all raw materials at or below their reorder point, grouped by vendor. Use this to create purchase orders.",
    steps: [
      {
        title: "Vendor Sections",
        detail:
          "Items are grouped by vendor. Each section shows the vendor name and a table of items that need reordering.",
      },
      {
        title: "Item Details",
        detail:
          "Each row shows: item name/SKU, unit, current on-hand quantity (highlighted in red), reorder point, editable order quantity, unit cost, and estimated total.",
      },
      {
        title: "Adjust Order Qty",
        detail:
          "The order quantity is editable \u2014 adjust it based on what you actually need. The estimated total updates automatically.",
      },
      {
        title: "Vendor Subtotals",
        detail:
          "Each vendor section shows a subtotal. The grand total at the bottom sums all vendors.",
      },
      {
        title: "Create Draft POs",
        detail:
          'Click "Create Draft POs" to automatically generate purchase orders for each vendor with the quantities shown. Review and send from the Purchase Orders page.',
      },
    ],
    tips: [
      "Run this report weekly to stay ahead of material shortages.",
      "The reorder point for each item is set on the inventory item detail page.",
      'Use "Print / Download" to save a copy for your records.',
    ],
  },

  "inventory-count": {
    title: "Cycle Count",
    summary:
      "Count physical inventory and reconcile with system quantities. Find discrepancies between what\u2019s recorded and what\u2019s actually on the shelf.",
    steps: [
      {
        title: "Select Scope",
        detail:
          "Choose what to count: All Items, Finished Products Only, or Raw Materials Only. Narrower scope means faster counting.",
      },
      {
        title: "Start Count",
        detail:
          'Click "Start Count" to generate a count sheet. This snapshots the current system quantities for comparison.',
      },
      {
        title: "Enter Physical Counts",
        detail:
          "Go through each item and enter the actual quantity you count on the shelf. The system highlights discrepancies.",
      },
      {
        title: "Review Variances",
        detail:
          "After counting, review items where physical count differs from system quantity. Decide whether to adjust the system to match.",
      },
    ],
    tips: [
      "Count during low-activity times for best accuracy.",
      "Adjustments from cycle counts create audit-tracked stock movements.",
    ],
  },

  "inventory-labels": {
    title: "Barcode Labels",
    summary:
      "Generate and print barcode labels for your inventory items. Sized for Avery 5160 sheets (30 labels per page).",
    steps: [
      {
        title: "Select Items",
        detail:
          'Check the boxes next to items you want labels for. Use "Select All" to grab everything, or search to find specific items.',
      },
      {
        title: "Search Items",
        detail:
          "Type in the search box to filter by item name, SKU, or barcode number.",
      },
      {
        title: "Set Copy Count",
        detail:
          "In the preview panel, adjust the number of copies for each item (1\u2013100). More copies = more labels for that item.",
      },
      {
        title: "Preview",
        detail:
          "The preview panel shows the first 12 labels in a 3-column grid matching the Avery 5160 layout. Total label count and sheet count are shown.",
      },
      {
        title: "Print",
        detail:
          'Click "Print Labels" to open the print dialog. Use Avery 5160 (or compatible) label sheets for best results.',
      },
    ],
    tips: [
      "Avery 5160 sheets have 30 labels per page (3 columns x 10 rows).",
      "Print a few test labels on plain paper first to check alignment.",
    ],
  },

  // ─── PURCHASE ORDERS ───────────────────────────────────────
  "purchase-orders": {
    title: "Purchase Orders",
    summary:
      "Track material orders from vendors. Create POs, monitor delivery status, and receive shipments into inventory.",
    steps: [
      {
        title: "Stats Cards",
        detail:
          "Four cards: Open POs, Partially Received (amber), Expected This Week, and Total on Order (dollar amount).",
      },
      {
        title: "PO Table",
        detail:
          "Each row shows: PO number (linked), vendor name, item count, total cost, status badge, and expected delivery date.",
      },
      {
        title: "Status Flow",
        detail:
          "POs move through: Draft \u2192 Sent \u2192 Partially Received \u2192 Received. You can also cancel a PO if needed.",
      },
    ],
    tips: [
      "Use the Reorder Report to auto-generate draft POs based on low-stock items.",
      "Receiving a PO automatically updates inventory quantities.",
    ],
  },

  "purchase-orders-new": {
    title: "New Purchase Order",
    summary:
      "Create a purchase order for raw materials from a vendor. Add items, set quantities, and track costs.",
    steps: [
      {
        title: "Vendor Details",
        detail:
          "Enter the vendor name, contact name, email, expected delivery date, and any notes.",
      },
      {
        title: "Add Line Items",
        detail:
          'Search for raw materials in the "Search raw materials to add..." box. Click a result to add it to the PO. The item\u2019s unit cost is auto-filled from inventory.',
      },
      {
        title: "Set Quantities & Prices",
        detail:
          "For each line item, enter the quantity to order and verify/adjust the unit cost. Line totals calculate automatically.",
      },
      {
        title: "Tax & Shipping",
        detail:
          "Add estimated tax and shipping costs at the bottom. These are included in the PO total.",
      },
      {
        title: "Create PO",
        detail:
          'Click "Create Purchase Order" to save. The PO starts in Draft status. You\u2019ll send it to the vendor from the detail page.',
      },
    ],
    tips: [
      "Only raw materials (not finished products) can be added to purchase orders.",
      "Unit costs default from the inventory item but can be overridden per PO.",
    ],
  },

  "purchase-orders-detail": {
    title: "Purchase Order Detail",
    summary:
      "View PO details, track delivery status, and receive shipments. Receiving updates your inventory automatically.",
    steps: [
      {
        title: "Items Table",
        detail:
          "Shows each item with unit, ordered quantity, received quantity (green when complete), unit cost, and line total.",
      },
      {
        title: "Actions (Right Panel)",
        detail:
          'Status-dependent buttons: "Mark as Sent" (for drafts), "Receive Shipment" (for sent/partial), and "Cancel PO".',
      },
      {
        title: "Receive Shipment",
        detail:
          'Click "Receive Shipment" to enter quantities received for each item. Confirm to update inventory. You can receive partial shipments \u2014 the PO stays open until everything arrives.',
      },
      {
        title: "PO Details (Right Panel)",
        detail:
          "Shows vendor info, contact, email, expected delivery, created date, and any notes.",
      },
      {
        title: "Activity Log",
        detail:
          "Timeline showing every event: created, sent, partially received, fully received, or cancelled.",
      },
    ],
    tips: [
      "Partial receiving is supported \u2014 receive what arrives now, the rest later.",
      "Received quantities automatically create stock-in movements in inventory with a PO reference.",
    ],
  },

  // ─── MARKETING ──────────────────────────────────────────────
  marketing: {
    title: "Marketing & Automation",
    summary:
      "Hub for email sequences, campaigns, and follow-up automation. See enrollment stats, open rates, and recent activity.",
    steps: [
      {
        title: "Stats Cards",
        detail:
          "Four cards: Active Sequences, Enrolled Contacts, Sent This Month, and Average Open Rate (highlighted amber if 25%+).",
      },
      {
        title: "Sequences Preview",
        detail:
          "Shows up to 8 sequences with name, trigger type, step count, enrolled count, and active/paused status. Click any to view details.",
      },
      {
        title: "Recent Email Activity",
        detail:
          "Live feed of the 15 most recent email events: who opened/clicked/received, the email subject, which sequence or campaign sent it, and when.",
      },
    ],
    tips: [
      "Open rates above 25% are highlighted as strong performance.",
      "Click contact names in the activity feed to go directly to their CRM record.",
    ],
  },

  sequences: {
    title: "Email Sequences",
    summary:
      "Automated multi-step email sequences triggered by customer actions. Set them up once and they run automatically.",
    steps: [
      {
        title: "Sequence Table",
        detail:
          "Each row shows: name, trigger event, number of steps, active toggle, enrolled count, sent count, and open rate.",
      },
      {
        title: "Active Toggle",
        detail:
          "Flip the toggle to activate or pause a sequence. Paused sequences stop sending but enrolled contacts keep their position.",
      },
      {
        title: "Trigger Types",
        detail:
          "Each sequence fires on a specific trigger: Quote Sent, Quote Signed, Invoice Sent, Invoice Overdue, New Contact, etc.",
      },
      {
        title: "Performance",
        detail:
          "Open rate is calculated from all steps combined. Click a sequence to see per-step performance.",
      },
    ],
    tips: [
      'Prebuilt sequences are marked with a "Prebuilt" badge and come with recommended email templates.',
      "You can have multiple sequences for the same trigger \u2014 contacts can be in multiple sequences simultaneously.",
    ],
  },

  "sequences-new": {
    title: "New Sequence",
    summary:
      "Create an automated email sequence. Define the trigger, then add email steps with delays between them.",
    steps: [
      {
        title: "Name & Description",
        detail:
          'Name your sequence (e.g., "Quote Follow-Up") and add an optional description for your reference.',
      },
      {
        title: "Trigger",
        detail:
          "Select what event triggers this sequence: Quote Sent, Quote Signed, Invoice Overdue, New Contact, etc. Contacts are automatically enrolled when the trigger fires.",
      },
      {
        title: "Active Toggle",
        detail:
          "Set whether the sequence is active immediately. You can leave it inactive while building and activate later.",
      },
      {
        title: "Email Steps",
        detail:
          "Add one or more email steps. Each step has a delay (days after previous step), subject line, and email body (HTML editor).",
      },
      {
        title: "Step Delay",
        detail:
          "The delay is in days from the previous step (or from enrollment for step 1). Example: Step 1 = 0 days (send immediately), Step 2 = 3 days, Step 3 = 7 days.",
      },
      {
        title: "Email Body",
        detail:
          "Write your email in the HTML editor. You can use merge fields for personalization like the contact\u2019s name or company.",
      },
      {
        title: "Tone",
        detail:
          "Select the email tone: Friendly, Professional, Urgent, etc. This helps maintain consistency across your sequence.",
      },
    ],
    tips: [
      "Start with 3\u20134 steps. You can always add more based on performance data.",
      "First step at 0 days delay sends immediately when triggered.",
      "Preview your emails before activating the sequence.",
    ],
  },

  "sequences-detail": {
    title: "Sequence Detail",
    summary:
      "View sequence performance with per-step analytics. See enrolled contacts, send counts, and open/click rates.",
    steps: [
      {
        title: "Analytics Cards",
        detail:
          "Four cards: Enrolled (total contacts), Sent (total emails), Open Rate (%), and Conversion Rate (%).",
      },
      {
        title: "Step Performance Table",
        detail:
          "Each step shows: step number, delay, subject, sent count, opened count, open %, clicked count, and click %. This tells you exactly where engagement drops off.",
      },
    ],
    tips: [
      "If open rates drop significantly at a step, consider revising that email\u2019s subject line.",
      'Click "Edit" to modify the sequence. Changes affect future sends, not emails already sent.',
    ],
  },

  "sequences-edit": {
    title: "Edit Sequence",
    summary: "Modify sequence settings, trigger, and email steps. Changes apply to future sends only.",
    steps: [
      {
        title: "Settings",
        detail: "Update the name, description, trigger, and active status.",
      },
      {
        title: "Edit Steps",
        detail:
          "Modify delays, subjects, and email body for existing steps. Add new steps or remove existing ones.",
      },
      {
        title: "Save",
        detail:
          "Save changes. Already-sent emails are not affected \u2014 only future sends use the updated content.",
      },
    ],
  },

  campaigns: {
    title: "Campaigns",
    summary:
      "One-time broadcast emails to targeted segments of contacts. Unlike sequences, campaigns send once to everyone in the segment.",
    steps: [
      {
        title: "Campaign Table",
        detail:
          "Each row shows: name, target segment, status (Draft, Scheduled, Sending, Sent, Cancelled), sent count, open rate, and scheduled/sent date.",
      },
      {
        title: "Status Flow",
        detail:
          "Campaigns go: Draft \u2192 Scheduled (or send immediately) \u2192 Sending \u2192 Sent. You can cancel before sending.",
      },
    ],
    tips: [
      "Draft campaigns can be edited. Once scheduled or sent, they\u2019re locked.",
      "Segment your audience carefully \u2014 targeted campaigns get better open rates.",
    ],
  },

  "campaigns-new": {
    title: "New Campaign",
    summary:
      "Create a one-time email broadcast. Choose your audience segment, write the email, and schedule or send.",
    steps: [
      {
        title: "Campaign Name",
        detail:
          "Internal name for this campaign (not shown to recipients). Make it descriptive for your reference.",
      },
      {
        title: "Subject Line",
        detail:
          "The email subject line your recipients will see. Keep it compelling and under 60 characters for best deliverability.",
      },
      {
        title: "Email Body",
        detail:
          "Write your email content in the HTML editor. Include a clear call-to-action.",
      },
      {
        title: "Segment",
        detail:
          "Choose who receives this campaign. Segment types let you target specific groups of contacts based on tags, pipeline stage, or other criteria.",
      },
      {
        title: "Recipient Count",
        detail:
          "Shows how many contacts match your segment criteria. Review this before sending to make sure you\u2019re reaching the right audience.",
      },
    ],
    tips: [
      "Send a test email to yourself first by creating a segment of just your own contact.",
      "Best open rates happen Tuesday\u2013Thursday, 9\u201311 AM in the recipient\u2019s timezone.",
    ],
  },

  "campaigns-detail": {
    title: "Campaign Detail",
    summary: "View campaign results with recipient-level analytics. See who opened, clicked, and unsubscribed.",
    steps: [
      {
        title: "Analytics Cards",
        detail:
          "Five cards: Sent, Recipients, Opened (count + %), Clicked (count + %), and Unsubscribed count.",
      },
      {
        title: "Recipient Log",
        detail:
          "Table showing every recipient: contact name (linked), email, sent date, opened date, clicked date, and unsubscribe status.",
      },
    ],
    tips: [
      "Click contact names in the recipient log to go to their CRM record for follow-up.",
      "Unsubscribed contacts are automatically excluded from future campaigns.",
    ],
  },

  "campaigns-edit": {
    title: "Edit Campaign",
    summary: "Modify a draft campaign\u2019s name, subject, body, and segment. Only draft campaigns can be edited.",
    steps: [
      {
        title: "Edit Fields",
        detail: "Update the campaign name, subject line, email body, and target segment.",
      },
      {
        title: "Save",
        detail:
          "Save changes. The campaign stays in Draft status until you schedule or send it from the detail page.",
      },
    ],
  },

  // ─── REPORTS ────────────────────────────────────────────────
  reports: {
    title: "Reports Center",
    summary:
      "18 pre-built reports across Financial, Sales, Inventory, Operations, and Marketing. Run any report or export to CSV.",
    steps: [
      {
        title: "Report Categories",
        detail:
          "Reports are organized into 5 sections: Financial (revenue, AR, invoices, top customers), Sales (quotes, conversion, pipeline), Inventory (valuation, stock, materials, POs), Operations (fulfillment, shipping, production), and Marketing (campaigns, sequences, contacts).",
      },
      {
        title: "Run a Report",
        detail:
          'Click "Run Report" on any card to open the report viewer with default date range (this month). You\u2019ll see the data in a table with filtering options.',
      },
      {
        title: "Export CSV",
        detail:
          'Click "Export CSV" to download the report as a CSV file with the current date range. Opens in Excel, Google Sheets, or any spreadsheet tool.',
      },
    ],
    tips: [
      "Financial reports are great for monthly bookkeeping and tax prep.",
      "The Inventory Valuation report gives you a snapshot of total inventory value for insurance or financial reporting.",
    ],
  },

  "reports-viewer": {
    title: "Report Viewer",
    summary: "View report data in a table with date range controls, period presets, and CSV export.",
    steps: [
      {
        title: "Period Presets",
        detail:
          'Quick-select buttons: This Month, Last Month, Last Quarter, YTD (year to date), and All Time. Click any to instantly filter.',
      },
      {
        title: "Custom Date Range",
        detail:
          'Use the From and To date pickers for a custom range. The period buttons switch to "Custom" when you manually set dates.',
      },
      {
        title: "Data Table",
        detail:
          "The table shows report data with columns specific to each report type. All monetary values are formatted to 2 decimal places.",
      },
      {
        title: "Export",
        detail:
          'Click "Export CSV" to download the currently displayed data as a CSV file.',
      },
    ],
    tips: [
      "The table scrolls horizontally on narrow screens for wide reports.",
      'Use "All Time" to see your complete history, or narrow the range for specific periods.',
    ],
  },

  // ─── SKUs ───────────────────────────────────────────────────
  skus: {
    title: "SKU Master List",
    summary:
      "All product SKU definitions. Each SKU record drives prompt generation, build packets, QC gates, and calculator outputs.",
    steps: [
      {
        title: "SKU Table",
        detail:
          "Each row shows: SKU code (linked), product name, category badge, finish, status, target weight, and batch quantity.",
      },
      {
        title: "Categories",
        detail:
          "SKUs are categorized: VESSEL_SINK (13 sink designs S1\u2013S13), COUNTERTOP, FURNITURE, PANEL, TILE. Category determines which templates and rules apply.",
      },
      {
        title: "Status",
        detail:
          "SKU status: DRAFT (in development), ACTIVE (production-ready), ARCHIVED (no longer produced).",
      },
    ],
    tips: [
      "Click a SKU code to view the full detail page with geometry, materials, rules, and QC data.",
      "Only ACTIVE SKUs appear in the calculator, generator, and quote builder.",
    ],
  },

  "skus-new": {
    title: "Create New SKU",
    summary:
      "Define a new product SKU with full geometry, specifications, and calculator defaults. This is the source of truth for the product.",
    steps: [
      {
        title: "Basic Info",
        detail:
          "Name, slug (URL-friendly identifier), category (Vessel Sink, Countertop, etc.), status, type, finish, and summary description.",
      },
      {
        title: "Target Weight",
        detail:
          "Min and max acceptable weight in pounds. Used for QC \u2014 pieces outside this range fail quality check.",
      },
      {
        title: "Outer Dimensions",
        detail:
          "Overall length, width, and height of the finished piece in inches. These define the mold outer boundary.",
      },
      {
        title: "Inner Dimensions (Sinks)",
        detail:
          "Basin length, width, and depth for vessel sinks. Defines the interior cavity.",
      },
      {
        title: "Thickness Values",
        detail:
          "Wall thickness, bottom thickness, top lip thickness, and hollow core depth. Critical for GFRC mix calculations.",
      },
      {
        title: "Dome & Ribs",
        detail:
          "Dome rise (min/max), rib counts (long and cross), rib dimensions. These are structural features of the piece.",
      },
      {
        title: "Drain & Mount",
        detail:
          "Drain diameter, type, basin slope, slope direction, mount type, overflow settings. Specific to sink products.",
      },
      {
        title: "Reinforcement & Details",
        detail:
          "Reinforcement dimensions, draft angle, corner radius, fiber percentage. Manufacturing specifications.",
      },
      {
        title: "Pricing",
        detail:
          "Retail and wholesale prices. These are pulled into the quote builder when this SKU is added to a quote.",
      },
      {
        title: "Labor",
        detail:
          "Select a labor rate and set hours per unit. Used in the calculator for total production cost.",
      },
      {
        title: "Calculator Defaults (JSON)",
        detail:
          "Default calculator settings as JSON: mix type, water ratio, plasticizer, fiber, color, units, waste factor, etc. These pre-fill the calculator when this SKU is selected.",
      },
    ],
    tips: [
      "All dimensions are in inches unless otherwise noted.",
      "The calculator defaults JSON must be valid JSON. Use the calculator to test your defaults.",
      "Start with basic dimensions and pricing \u2014 you can add detail later.",
    ],
  },

  "skus-detail": {
    title: "SKU Detail & Edit",
    summary:
      "Full SKU definition with inline editing, related materials, rules, QC templates, and output history.",
    steps: [
      {
        title: "Edit Form (Left Side)",
        detail:
          "All SKU fields are editable inline. Change geometry, pricing, labor, or calculator defaults and save.",
      },
      {
        title: "Core Info Card (Right Side)",
        detail:
          "Displays: product name, type, status, finish, target weight, batch size, labor per unit cost, outer dimensions, and inner basin dimensions.",
      },
      {
        title: "Datum System",
        detail:
          "Reference datum points for the product. Each datum has a name and description defining measurement references.",
      },
      {
        title: "Materials Card",
        detail:
          "Materials assigned to this SKU from the Materials Master. Shows name, category, quantity, unit, and unit cost.",
      },
      {
        title: "Rules Card",
        detail:
          "Manufacturing rules that apply to this SKU. Shows rule title, priority, and rule text.",
      },
      {
        title: "QC Templates",
        detail:
          "Quality control checklists assigned to this SKU. Shows template name, category, and first few checklist items.",
      },
      {
        title: "Generated Output History",
        detail:
          "Recent prompt, packet, and calculation outputs generated for this SKU. Links to the full output viewer.",
      },
      {
        title: "Open in Calculator",
        detail:
          'Click "Open in Calculator" to load this SKU\u2019s defaults in the mix calculator for cost estimation.',
      },
    ],
    tips: [
      "Materials, rules, and QC templates are assigned via the Admin section and matched by scope (Global, Category, or SKU Override).",
      "The Reject If card shows conditions that would fail quality inspection.",
    ],
  },

  // ─── SLAT WALLS ─────────────────────────────────────────────
  "slat-walls": {
    title: "Slat Wall Projects",
    summary:
      "Kinetic rotating GFRC slat wall projects with dual-image UV print artwork. Each project defines a complete installation.",
    steps: [
      {
        title: "Projects Table",
        detail:
          "Each row shows: project code, name, status, total slat count, wall width (in inches), and wall height.",
      },
      {
        title: "Quick Links",
        detail:
          'Action buttons: "Cost Calculator" (estimate project costs), "Proposals" (view all proposals), "New Project" (create a new slat wall project).',
      },
    ],
    tips: [
      "Each slat wall has two viewing positions (A and B) that reveal different images when the slats rotate.",
      "Use the Simulator to preview the rotation effect before production.",
    ],
  },

  "slat-walls-new": {
    title: "New Slat Wall Project",
    summary: "Configure a new kinetic rotating slat wall installation with dimensions, positions, and specifications.",
    steps: [
      {
        title: "Project Identity",
        detail: "Name, code (e.g., SW-02), slug, and status (Draft, Active, Archived).",
      },
      {
        title: "Client Info",
        detail: "Client name, location, designer, engineer, and revision number for the project.",
      },
      {
        title: "Position Names",
        detail:
          'Name each viewing position (e.g., Position A = "Cityscape", Position B = "Abstract"). Add descriptions explaining each.',
      },
      {
        title: "Wall Dimensions",
        detail:
          "Total slat count, individual slat width/thickness/height, and spacing between slats. These determine the total wall width.",
      },
      {
        title: "Mechanical",
        detail:
          "Support frame type, pivot type, and rotation angles for Position A and Position B.",
      },
    ],
    tips: [
      "The total wall width is calculated from: (slat count \u00d7 slat width) + ((slat count \u2212 1) \u00d7 spacing).",
      "Standard rotation is typically 45\u00b0 for Position A and 135\u00b0 for Position B.",
    ],
  },

  "slat-walls-detail": {
    title: "Slat Wall Project Detail",
    summary:
      "Full project view with configuration, artwork, AI renders, slat schedule, and generation tools.",
    steps: [
      {
        title: "Info Cards",
        detail: "Four cards: Status, Client info, Position A name, Position B name.",
      },
      {
        title: "Wall Configuration",
        detail:
          "Shows: total slats, slat dimensions, total wall width, spacing, frame type, pivot type, and rotation angles.",
      },
      {
        title: "Generator Form",
        detail:
          "Embedded form to generate slat artwork and AI renders. Configure and run generation directly from this page.",
      },
      {
        title: "AI Renders",
        detail:
          "Gallery of AI-rendered simulation images showing the slat wall in each state (Side A, Side B, Transition).",
      },
      {
        title: "Artwork Inputs",
        detail:
          "Gallery of uploaded artwork for each position with status badges and preview images.",
      },
      {
        title: "Slat Schedule",
        detail:
          "Table showing every slat: ID, position, Face A slice, Face B slice, dimensions, orientation, and production status.",
      },
      {
        title: "Action Buttons",
        detail:
          "Simulator (interactive 3D preview), Print Generator (production files), Proposal (client PDF), Edit Project (modify specs).",
      },
    ],
  },

  "slat-walls-edit": {
    title: "Edit Slat Wall Project",
    summary: "Update project configuration, dimensions, and position settings.",
    steps: [
      {
        title: "Edit Fields",
        detail: "All fields from the New Project form are editable. Update dimensions, positions, or mechanical specs.",
      },
      {
        title: "Save Changes",
        detail: "Save to update the project. This may require regenerating slat schedules if dimensions changed.",
      },
    ],
  },

  "slat-walls-proposal": {
    title: "Proposal Generator",
    summary:
      "Generate a premium 16-page PDF proposal for a slat wall installation. Includes specs, renders, and pricing.",
    steps: [
      {
        title: "Project Details",
        detail: "Pre-filled from the project: code, name, client, dimensions. Verify or update as needed.",
      },
      {
        title: "Configure Proposal",
        detail: "Set pricing, installation details, and which AI renders to include.",
      },
      {
        title: "Generate PDF",
        detail: "Click generate to create the premium PDF proposal. This includes all project specs, images, and pricing.",
      },
    ],
    tips: [
      "Generated proposals are saved and can be accessed from the Proposals list.",
      "Include AI renders for maximum client impact.",
    ],
  },

  "slat-walls-simulator": {
    title: "Slat Wall Simulator",
    summary:
      "Interactive visualization showing the slat wall rotation effect. See how images transform as slats rotate between positions.",
    steps: [
      {
        title: "3D Preview",
        detail:
          "Interactive 3D view of the slat wall. Drag to rotate the slats between Position A and Position B.",
      },
      {
        title: "State Views",
        detail:
          "Toggle between three states: Side A (full image A), Transition (mid-rotation), and Side B (full image B).",
      },
      {
        title: "AI Renders",
        detail:
          "If AI renders have been generated, they\u2019re overlaid for a realistic preview.",
      },
    ],
    tips: [
      "Use this to demo the effect to clients before committing to production.",
      "The line density rendering approximates the actual optical effect of the physical slats.",
    ],
  },

  "slat-walls-print-generator": {
    title: "Print Generator",
    summary:
      "Generate print-ready files (SVG, PDF, DXF) for UV flatbed printing or stencil cutting.",
    steps: [
      {
        title: "Configure Output",
        detail: "Select the output format and configure print settings for your UV flatbed printer.",
      },
      {
        title: "Generate Files",
        detail:
          "Click generate to create print-ready files. Each slat face gets its own print file with proper dimensions.",
      },
      {
        title: "Download",
        detail:
          "Download individual files or a ZIP archive of all slat print files.",
      },
    ],
    tips: [
      "Files are sized to match your configured slat dimensions exactly.",
      "DXF files work with CNC and laser cutting workflows.",
    ],
  },

  "slat-walls-calculator": {
    title: "Slat Wall Cost Calculator",
    summary:
      "Estimate materials, labor, print costs, and total client pricing for rotating slat wall installations.",
    steps: [
      {
        title: "Wall Configuration",
        detail:
          "Enter slat count, dimensions, spacing, and material selections. The calculator computes material quantities and costs.",
      },
      {
        title: "Cost Breakdown",
        detail:
          "See itemized costs: GFRC material, UV printing, hardware, labor, and overhead. Each line shows quantity, unit cost, and total.",
      },
      {
        title: "Client Pricing",
        detail:
          "Set your markup to generate the client-facing price. Compare retail and wholesale options.",
      },
    ],
  },

  "slat-walls-proposals-detail": {
    title: "Proposal Detail",
    summary: "View a generated slat wall proposal with status tracking, specs, cost breakdown, and timeline.",
    steps: [
      {
        title: "Status & Actions",
        detail: "Current status badge (Draft, Sent, Viewed, Accepted, Expired) with action buttons to update.",
      },
      {
        title: "Info Cards",
        detail: "Four cards: Client info, Wall Size, Client Price, and Valid Until date.",
      },
      {
        title: "Specification",
        detail: "Shows scenario ID, slat dimensions, print method, and installation inclusion.",
      },
      {
        title: "Timeline",
        detail: "Created, Sent, and Viewed dates for tracking proposal engagement.",
      },
      {
        title: "Cost Breakdown",
        detail: "Detailed JSON breakdown of all costs (if included in the proposal).",
      },
    ],
  },

  // ─── GENERATOR ──────────────────────────────────────────────
  generator: {
    title: "Prompt Generation Workspace",
    summary:
      "Generate prompt text, build packets, calculations, and AI images from your SKU definitions and templates.",
    steps: [
      {
        title: "Select SKU",
        detail: "Choose an active SKU from the dropdown. Its geometry, materials, and defaults are loaded automatically.",
      },
      {
        title: "Select Output Type",
        detail:
          "Choose what to generate: IMAGE_PROMPT (text for image AI), IMAGE_RENDER (actual AI image), BUILD_PACKET (assembly instructions), or CALCULATION (mix/cost numbers).",
      },
      {
        title: "Configure Options",
        detail:
          "Depending on the output type, set options like scene preset (lifestyle, detail, installed), image model, or packet sections.",
      },
      {
        title: "Generate",
        detail:
          "Click Generate to run the engine. Results are saved to the database and appear in the Outputs history.",
      },
      {
        title: "Reference Images",
        detail: "If available, reference images for the selected SKU are shown for context.",
      },
      {
        title: "Recent Outputs",
        detail: "Your most recent generated outputs are shown below for quick access.",
      },
    ],
    tips: [
      "IMAGE_PROMPT generates the text prompt only. IMAGE_RENDER generates the actual AI image using Gemini.",
      "Build packets assemble from all matching templates, rules, and QC gates based on the SKU\u2019s scope.",
      "Generated outputs are versioned \u2014 regenerating creates a new version, not an overwrite.",
    ],
  },

  outputs: {
    title: "Generated Output History",
    summary:
      "Browse all saved prompt, packet, calculation, and image outputs. Filter by SKU or output type.",
    steps: [
      {
        title: "Filters",
        detail:
          'Use the SKU dropdown and Output Type dropdown to narrow results. Click "Apply" to filter, "Clear" to reset.',
      },
      {
        title: "Output Table",
        detail:
          "Each row shows: thumbnail (for images), SKU, title, type badge, status badge, created date, and a link to view details.",
      },
    ],
    tips: [
      "Output types: IMAGE_PROMPT, IMAGE_RENDER, BUILD_PACKET, CALCULATION.",
      "Status values: DRAFT, ACTIVE, ARCHIVED. Only ACTIVE outputs are used in production.",
    ],
  },

  "outputs-detail": {
    title: "Output Detail",
    summary:
      "Full view of a generated output: rendered images, text, packet sections, rules, QC templates, and raw payloads.",
    steps: [
      {
        title: "Info Cards",
        detail: "Four cards: SKU (linked), Output Type, Status badge, and Version number.",
      },
      {
        title: "Rendered Images",
        detail: "If this is an image output, shows the generated images with model info, dimensions, and download buttons.",
      },
      {
        title: "Rendered Text",
        detail: "If this is a prompt output, shows the generated text with a copy button.",
      },
      {
        title: "Packet Sections",
        detail: "If this is a build packet, shows each section in order with section name and content.",
      },
      {
        title: "Rules & QC Applied",
        detail: "Shows which manufacturing rules and QC checklists were applied during generation.",
      },
      {
        title: "Source References",
        detail: "Shows which templates, packet sections, and rules contributed to this output.",
      },
      {
        title: "Raw Payloads",
        detail: "Expandable JSON views of the input and output payloads for debugging.",
      },
      {
        title: "Actions",
        detail: "Export actions: Print (for build packets), Download Markdown, Download PDF.",
      },
    ],
    tips: [
      "PDF export is only available for BUILD_PACKET outputs.",
      "Use the raw payloads to debug template issues or verify calculations.",
    ],
  },

  // ─── PACKETS ────────────────────────────────────────────────
  packets: {
    title: "Build Packet Previews",
    summary:
      "Preview assembled build packets for each SKU. Packets combine templates, rules, and QC gates into production instructions.",
    steps: [
      {
        title: "SKU Table",
        detail:
          'Each row shows: SKU code, name, category, finish, and target weight. Click "View packet" to see the assembled packet.',
      },
    ],
    tips: [
      "Build packets are assembled dynamically from templates that match the SKU\u2019s scope (Global, Category, Override).",
      "Changes to templates in Admin are reflected immediately in packet previews.",
    ],
  },

  "packets-detail": {
    title: "Build Packet",
    summary:
      "Assembled production packet for a specific SKU with geometry, critical rules, QC criteria, and all sections.",
    steps: [
      {
        title: "Core Geometry Card",
        detail: "Shows outer dimensions, inner dimensions, and wall/bottom thickness for the product.",
      },
      {
        title: "Critical Rules Card",
        detail: "Manufacturing rules that must be followed. Shows rule title and full text.",
      },
      {
        title: "Reject If Card",
        detail: "Conditions that would cause a piece to fail quality inspection.",
      },
      {
        title: "Packet Sections",
        detail:
          "Ordered cards showing each build packet section: section number, name, status, and full content text.",
      },
    ],
    tips: [
      "Packet sections are assembled from multiple templates based on scope priority: SKU Override > Category > Global.",
      "Use this preview to verify packets before generating official outputs.",
    ],
  },

  // ─── JOBS ───────────────────────────────────────────────────
  jobs: {
    title: "Job Tracking",
    summary: "Track production jobs from creation to delivery using a Kanban board.",
    steps: [
      {
        title: "Kanban Board",
        detail:
          "Jobs are displayed as cards in columns by status. Drag cards between columns to update their status.",
      },
      {
        title: "Job Cards",
        detail: "Each card shows: job number, SKU name, quantity, client, and due date.",
      },
      {
        title: "Create Job",
        detail: 'Click "Create Job" to start a new production job.',
      },
    ],
    tips: [
      "Jobs are linked to SKUs and optionally to clients and orders.",
      "Due dates in red are past due.",
    ],
  },

  "jobs-new": {
    title: "Create New Job",
    summary: "Start a new production job for a specific SKU and client.",
    steps: [
      {
        title: "Select SKU",
        detail: "Choose which product to produce from the SKU dropdown.",
      },
      {
        title: "Quantity",
        detail: "How many units to produce in this job.",
      },
      {
        title: "Select Client",
        detail: "Optionally assign this job to a client from the dropdown.",
      },
      {
        title: "Due Date",
        detail: "When this job needs to be completed.",
      },
      {
        title: "Notes",
        detail: "Production notes, special instructions, or custom requirements.",
      },
    ],
  },

  "jobs-detail": {
    title: "Job Detail",
    summary: "View job info with SKU, quantity, client, pricing, and notes.",
    steps: [
      {
        title: "Info Cards",
        detail: "Four cards: Status, SKU (linked), Quantity, and Due Date.",
      },
      {
        title: "Client Card",
        detail: "If assigned to a client, shows name, company, email, and phone.",
      },
      {
        title: "Pricing Card",
        detail: "Shows calculated retail and wholesale total prices based on SKU pricing \u00d7 quantity.",
      },
      {
        title: "Notes",
        detail: "Production notes and special instructions for this job.",
      },
    ],
  },

  // ─── GALLERY ────────────────────────────────────────────────
  gallery: {
    title: "Generated Image Portfolio",
    summary: "All AI-rendered product images grouped by category. Browse your visual catalog.",
    steps: [
      {
        title: "Category Sections",
        detail: "Images are grouped by product category (Vessel Sinks, Panels, etc.) with section headers.",
      },
      {
        title: "Image Grid",
        detail:
          "Responsive grid of image cards. Each shows the rendered image, SKU code, product name, and output type badge.",
      },
      {
        title: "View Detail",
        detail: "Click any image card to go to the full output detail page with download options.",
      },
    ],
    tips: [
      "Images are generated from the Generator workspace using the IMAGE_RENDER output type.",
      "All generated images are automatically saved to the gallery.",
    ],
  },

  // ─── CALCULATOR ─────────────────────────────────────────────
  calculator: {
    title: "Mix Calculator",
    summary:
      "Calculate GFRC mix quantities, pigment ratios, sealer coverage, and production costs. Uses live SKU defaults and material baselines.",
    steps: [
      {
        title: "Select SKU",
        detail:
          "Choose a SKU to load its calculator defaults (mix type, water ratio, fiber %, etc.). Or start from scratch with manual values.",
      },
      {
        title: "Mix Parameters",
        detail:
          "Adjust mix type, water-to-cement ratio, plasticizer, fiber percentage, color loading, waste factor, and batch size.",
      },
      {
        title: "Material Quantities",
        detail:
          "See calculated quantities for each material: cement, sand, polymer, fiber, pigment, water, plasticizer, and sealer.",
      },
      {
        title: "Cost Breakdown",
        detail:
          "Material costs from your Materials Master, labor costs from labor rates, and total production cost per unit.",
      },
      {
        title: "Override & Experiment",
        detail:
          "Adjust any parameter to see how it affects quantities and costs. Changes don\u2019t save to the SKU \u2014 it\u2019s a scratch workspace.",
      },
    ],
    tips: [
      "The calculator pulls material costs from your Materials Master (Admin section).",
      "Waste factor accounts for material lost during mixing, pouring, and cleanup.",
      "Use the calculator to compare costs between different mix types or SKU geometries.",
    ],
  },

  // ─── CHAT (JACOB) ──────────────────────────────────────────
  chat: {
    title: "Jacob \u2014 AI Assistant",
    summary:
      "Chat with Jacob, your AI assistant. Ask questions about your business data, get recommendations, or brainstorm product ideas.",
    steps: [
      {
        title: "Type a Message",
        detail: "Type your question or request in the chat input at the bottom and press Enter.",
      },
      {
        title: "Ask About Your Data",
        detail:
          'Jacob can access your business data. Ask things like "What\u2019s my top-selling sink?" or "Which invoices are overdue?"',
      },
      {
        title: "Get Recommendations",
        detail:
          'Ask for advice: "What should I produce this week?" or "Which customers should I follow up with?"',
      },
      {
        title: "Conversation History",
        detail: "Previous messages are shown in the chat window. Start a new conversation by refreshing the page.",
      },
    ],
    tips: [
      "Jacob knows about your SKUs, orders, invoices, inventory, and customer data.",
      "Be specific in your questions for the most helpful answers.",
    ],
  },

  // ─── MOLD GENERATOR ────────────────────────────────────────
  "mold-generator": {
    title: "3D Print Mold Generator",
    summary:
      "Generate 3D-printable mold geometries from your SKU definitions. Preview in 3D, configure print settings, and export STL files.",
    steps: [
      {
        title: "Select Product",
        detail:
          "Choose a sink or tile SKU from the tabs. The SKU\u2019s dimensions are used to generate the mold geometry.",
      },
      {
        title: "3D Preview",
        detail:
          "Interactive 3D viewer shows the mold geometry. Rotate, zoom, and pan to inspect the design from all angles.",
      },
      {
        title: "Configure Print Settings",
        detail:
          "Adjust mold parameters like wall offset, bottom thickness, and any mold-specific features (drainage channels, registration marks).",
      },
      {
        title: "Generate AI Preview",
        detail:
          "Optionally generate an AI rendering of what the finished GFRC piece will look like in the mold.",
      },
      {
        title: "Export STL",
        detail:
          "Download the mold as an STL file for your 3D printer (Ender-5 Max or similar).",
      },
    ],
    tips: [
      "Mold geometry is calculated from the SKU\u2019s outer/inner dimensions and wall thickness.",
      "The 3D preview uses Three.js \u2014 drag to rotate, scroll to zoom.",
      "Check that your printer\u2019s build volume can fit the mold before printing.",
    ],
  },

  // ─── ADMIN HUB ──────────────────────────────────────────────
  admin: {
    title: "Admin Hub",
    summary:
      "Central access to all system configuration: templates, rules, materials, colors, finishes, labor rates, suppliers, and more.",
    steps: [
      {
        title: "Section Cards",
        detail:
          "Grid of linked cards, each representing a system configuration area. Click any card to manage that section.",
      },
      {
        title: "Product Catalog",
        detail: "Manage retail and wholesale pricing for all SKUs.",
      },
      {
        title: "Prompt Templates",
        detail: "Templates used by the generator to create prompts and images.",
      },
      {
        title: "Rules Master",
        detail: "Manufacturing rules that feed into build packets and validation.",
      },
      {
        title: "Build Packet Templates",
        detail: "Section templates assembled into production build packets.",
      },
      {
        title: "QC Templates",
        detail: "Quality control checklists and acceptance criteria.",
      },
      {
        title: "Materials Master",
        detail: "Material baselines for calculator and production costing.",
      },
      {
        title: "Other Sections",
        detail:
          "Labor Rates, Suppliers, Colors, Finishes, Clients, Google Sheets Sync, Audit Logs, Equipment Tracker, and Product Agent.",
      },
    ],
    tips: [
      "Changes to templates and rules take effect immediately in the generator and packet previews.",
      "Use the Audit Logs to track who changed what and when.",
    ],
  },

  "admin-audit-logs": {
    title: "Audit Logs",
    summary: "Read-only history of all record changes and export actions. Track who did what and when.",
    steps: [
      {
        title: "Filters",
        detail: "Filter by Actor (who made the change), Entity Type, Action (Create, Update, Archive, Export), and Entity ID.",
      },
      {
        title: "Event Table",
        detail: "Each row shows: timestamp, actor (with role badge), entity type and ID, action badge, and change summary.",
      },
      {
        title: "Expand Details",
        detail: "Click a row to expand and see the full JSON of changed fields and metadata.",
      },
    ],
    tips: [
      "Audit logs are created automatically \u2014 no action needed to enable them.",
      "Use Entity ID filter to see the full history of a specific record.",
    ],
  },

  "admin-build-packet-templates": {
    title: "Build Packet Templates",
    summary:
      "Manage packet sections that assemble into production build packets. Each section has a scope that determines which SKUs it applies to.",
    steps: [
      {
        title: "Template Table",
        detail: "Each row shows: packet key, section key, name, section order, status, scope, and edit link.",
      },
      {
        title: "Scope System",
        detail: "Sections apply at three levels: GLOBAL (all SKUs), SKU_CATEGORY (e.g., all sinks), or SKU_OVERRIDE (one specific SKU). More specific scopes override less specific ones.",
      },
    ],
    tips: [
      "Section order determines the sequence in the assembled packet.",
      "Use packet key to group sections into the same packet (e.g., 'standard_build').",
    ],
  },

  "admin-build-packet-templates-form": {
    title: "Build Packet Section Form",
    summary: "Create or edit a build packet section with scope control and content.",
    steps: [
      {
        title: "Packet Key",
        detail: "Groups sections into the same packet. All sections with the same packet key are assembled together.",
      },
      {
        title: "Section Key",
        detail: "Unique identifier for this section within the packet (e.g., 'mold_prep', 'mixing', 'curing').",
      },
      {
        title: "Name",
        detail: "Human-readable name for the section displayed in packet previews.",
      },
      {
        title: "Section Order",
        detail: "Numeric order (1, 2, 3...) determining where this section appears in the assembled packet.",
      },
      {
        title: "Scope Controls",
        detail:
          "Category Scope: GLOBAL (all), SKU_CATEGORY (set category below), or SKU_OVERRIDE (set SKU below). SKU Category: which category this applies to. SKU Override: specific SKU ID for override scope.",
      },
      {
        title: "Status",
        detail: "DRAFT (not used in generation), ACTIVE (included in packets), ARCHIVED (retired).",
      },
      {
        title: "Content",
        detail:
          "The actual section content text. This is what appears in the build packet. Can include markdown formatting.",
      },
      {
        title: "Variables (JSON)",
        detail: "JSON array of variable names used in the content. Used for template interpolation with {{variable}} syntax.",
      },
    ],
    tips: [
      "Test your section by viewing the packet preview for the relevant SKU.",
      "GLOBAL sections apply to every SKU unless overridden by a more specific scope.",
    ],
  },

  "admin-clients": {
    title: "Clients",
    summary: "Manage production clients linked to jobs and slat wall projects.",
    steps: [
      {
        title: "Client Table",
        detail: "Shows name, company, email, phone, job count, and project count for each client.",
      },
    ],
  },

  "admin-clients-form": {
    title: "Client Form",
    summary: "Add or edit a client record with contact details.",
    steps: [
      {
        title: "Name",
        detail: "Client\u2019s full name (required).",
      },
      {
        title: "Company",
        detail: "Company or business name.",
      },
      {
        title: "Contact Info",
        detail: "Email and phone number for communication.",
      },
      {
        title: "Address",
        detail: "Physical address for shipping and project reference.",
      },
      {
        title: "Notes",
        detail: "Any additional notes about the client, project preferences, or special requirements.",
      },
    ],
  },

  "admin-colors": {
    title: "Color System",
    summary:
      "RB Studio pigment color collections. Manage formulas, hex codes, and color organization across collections.",
    steps: [
      {
        title: "Collection Cards",
        detail: "Colors are organized into collections. Each collection card shows the collection name, color count, and a grid of color swatches.",
      },
      {
        title: "Color Swatches",
        detail: "Each swatch shows a circular color preview, the color name, and its hex code. Click to edit.",
      },
    ],
    tips: [
      "Hex codes are approximate \u2014 actual pigment colors depend on the GFRC mix and curing conditions.",
      "Pigment formulas define the exact recipe for reproducing each color.",
    ],
  },

  "admin-colors-form": {
    title: "Color Form",
    summary: "Add or edit a color in an RB Studio collection.",
    steps: [
      {
        title: "Collection",
        detail: "Select which collection this color belongs to.",
      },
      {
        title: "Code & Name",
        detail: "Unique code and display name for the color.",
      },
      {
        title: "Hex Approximation",
        detail: "Use the color picker to set the approximate hex code for digital display.",
      },
      {
        title: "Pigment Formula",
        detail: "The actual pigment recipe for reproducing this color in GFRC production.",
      },
      {
        title: "Sort Order",
        detail: "Controls the display order within the collection. Lower numbers appear first.",
      },
      {
        title: "Status",
        detail: "ACTIVE (available for use) or INACTIVE (hidden from selection).",
      },
    ],
  },

  "admin-equipment": {
    title: "Equipment Tracker",
    summary: "Track shop equipment, tools, and capital assets organized by category with purchase dates and budget tracking.",
    steps: [
      {
        title: "Categories",
        detail: "Equipment is organized into categories (e.g., 3D Printers, Mixing Equipment, Safety, etc.).",
      },
      {
        title: "Equipment Items",
        detail: "Each item shows purchase date and relevant metadata. Items are nested under their category.",
      },
      {
        title: "Budget Tracking",
        detail: "Budget information is displayed alongside equipment to track capital spending.",
      },
    ],
  },

  "admin-finishes": {
    title: "Finishes",
    summary: "Manage concrete finish presets: color families, textures, sealers, and pigment formulas.",
    steps: [
      {
        title: "Finish Table",
        detail: "Each row shows: code (linked), name, color family, texture type, sealer type, and status badge.",
      },
    ],
  },

  "admin-finishes-form": {
    title: "Finish Form",
    summary: "Create or edit a concrete finish preset.",
    steps: [
      {
        title: "Code & Name",
        detail: "Unique code (e.g., 'NAT-01') and descriptive name for the finish.",
      },
      {
        title: "Color Family",
        detail: "The color family this finish belongs to (e.g., Natural, Charcoal, Sand).",
      },
      {
        title: "Texture Type",
        detail: "Surface texture (e.g., Smooth, Sandblasted, Brushed, Acid-Etched).",
      },
      {
        title: "Sealer Type",
        detail: "The sealer applied (e.g., Penetrating, Topical, Wax, None).",
      },
      {
        title: "Pigment Formula",
        detail: "The pigment recipe or color formula used to achieve this finish.",
      },
      {
        title: "Reference Image URL",
        detail: "Link to a reference photo of this finish for visual matching.",
      },
      {
        title: "Status",
        detail: "DRAFT (not available for selection), ACTIVE (available), ARCHIVED (retired).",
      },
    ],
  },

  "admin-labor-rates": {
    title: "Labor Rates",
    summary: "Shop labor rates used for product costing and quotes. Set hourly rates by skill level or task type.",
    steps: [
      {
        title: "Rate Table",
        detail: "Each row shows: code, name, hourly rate ($/hr), description, linked SKU count, and status.",
      },
      {
        title: "Default Rate",
        detail: 'One rate can be marked as "Default" \u2014 it\u2019s used when a SKU doesn\u2019t specify a rate.',
      },
    ],
  },

  "admin-labor-rates-form": {
    title: "Labor Rate Form",
    summary: "Create or edit a shop labor rate.",
    steps: [
      {
        title: "Code & Name",
        detail: "Unique code and descriptive name (e.g., 'SHOP-STD', 'Standard Shop Rate').",
      },
      {
        title: "Hourly Rate",
        detail: "The dollar-per-hour rate. This is multiplied by hours per unit on each SKU to get labor cost.",
      },
      {
        title: "Description",
        detail: "Notes about what this rate covers (e.g., 'Includes mixing, pouring, and finishing').",
      },
      {
        title: "Default Toggle",
        detail: "If checked, this rate is used when a SKU doesn\u2019t specify a labor rate. Only one rate can be default.",
      },
      {
        title: "Status",
        detail: "ACTIVE (available for use) or INACTIVE (hidden from selection).",
      },
    ],
  },

  "admin-materials-master": {
    title: "Materials Master",
    summary:
      "Reusable material baselines for the calculator and production costing. Each material has scope, cost, and supplier info.",
    steps: [
      {
        title: "Material Table",
        detail: "Each row shows: code, name, category badge, supplier, quantity with unit, unit cost, last priced date, status, and scope.",
      },
      {
        title: "Sync Prices",
        detail: 'If materials have suppliers linked, "Sync All Prices" fetches current pricing from supplier catalogs.',
      },
    ],
    tips: [
      "Material costs directly feed into the Calculator and production cost estimates.",
      "Scope determines which SKUs use this material baseline.",
    ],
  },

  "admin-materials-master-form": {
    title: "Material Form",
    summary: "Create or edit a material baseline with cost, supplier, and scope information.",
    steps: [
      {
        title: "Code & Name",
        detail: "Unique code (e.g., 'GFRC-CEMENT') and material name.",
      },
      {
        title: "Category",
        detail: "Material category: GFRC, PIGMENT, SEALER, HARDWARE, PACKAGING, etc.",
      },
      {
        title: "Scope Controls",
        detail:
          "Category Scope: GLOBAL (all SKUs), SKU_CATEGORY (specific category), or SKU_OVERRIDE (one SKU). These determine which products use this material baseline.",
      },
      {
        title: "Unit & Quantity",
        detail: "Unit of measure (LB, GAL, EA, etc.) and baseline quantity per unit. This is the default amount used per piece.",
      },
      {
        title: "Unit Cost",
        detail: "Cost per unit of measure. Updated when you sync prices or edit manually.",
      },
      {
        title: "Specification",
        detail: "Technical specs or product description for reference.",
      },
      {
        title: "Supplier Fields",
        detail: "Link to a supplier, their product URL, and their SKU number. Enables price syncing.",
      },
      {
        title: "Metadata (JSON)",
        detail: "Additional key-value data as JSON for any extra material properties.",
      },
    ],
    tips: [
      "The scope system means you can have different material baselines for sinks vs. panels vs. a specific custom SKU.",
      "Linking a supplier enables automatic price updates.",
    ],
  },

  "admin-product-agent": {
    title: "Product Creation Agent",
    summary:
      "AI-powered tool that generates a complete SKU with build packets, materials, QC checklists, and calculator defaults from a natural language description.",
    steps: [
      {
        title: "Describe Your Product",
        detail:
          "Type a natural language description of the product you want to create. Include dimensions, features, and any specific requirements.",
      },
      {
        title: "AI Generation",
        detail:
          "The agent analyzes your description and generates: SKU definition with geometry, material list, build packet sections, QC checklist, and calculator defaults.",
      },
      {
        title: "Review & Save",
        detail: "Review the generated product definition. Edit any fields before saving to the database.",
      },
    ],
    tips: [
      "Be specific about dimensions, finish, and intended use for best results.",
      "The agent matches your existing product structure \u2014 new products will follow the same patterns as S1\u2013S13.",
    ],
  },

  "admin-product-catalog": {
    title: "Product Catalog",
    summary: "Manage retail and wholesale pricing for all SKUs. These prices are used in the quote builder.",
    steps: [
      {
        title: "Summary Cards",
        detail: "Four cards: Total SKUs, Priced (how many have prices set), Categories, and Catalog Value (total if you sold one of each).",
      },
      {
        title: "Catalog Table",
        detail: "All active SKUs with: code, name, category, type, finish, retail price, wholesale price, and dimensions.",
      },
      {
        title: "Edit Prices",
        detail: "Click into a SKU to edit its retail and wholesale prices. Changes take effect immediately in the quote builder.",
      },
    ],
    tips: [
      "The quote builder pulls prices from this catalog based on the selected pricing tier (Retail or Wholesale).",
      "SKUs without prices will show $0.00 in quotes \u2014 set prices before quoting.",
    ],
  },

  "admin-prompt-templates": {
    title: "Prompt Templates",
    summary:
      "Templates used by the generator to create prompts and AI images. Scoped by category for different product types.",
    steps: [
      {
        title: "Template Table",
        detail: "Each row shows: key, name, category, output type, status, version, scope, and edit link.",
      },
      {
        title: "Output Types",
        detail: "IMAGE_PROMPT (text prompts), IMAGE_RENDER (AI image generation), BUILD_PACKET, CALCULATION.",
      },
      {
        title: "Versioning",
        detail: "Templates are versioned. Creating a new version with the same key keeps history while updating the active template.",
      },
    ],
  },

  "admin-prompt-templates-form": {
    title: "Prompt Template Form",
    summary: "Create or edit a prompt template with scope, versioning, and template body.",
    steps: [
      {
        title: "Key & Name",
        detail: "Key is the machine identifier (e.g., 'sink_image_lifestyle'). Name is the human-readable label.",
      },
      {
        title: "Category & Output Type",
        detail: "Category groups templates. Output type determines how the template is used (IMAGE_PROMPT, IMAGE_RENDER, etc.).",
      },
      {
        title: "Scope Controls",
        detail: "GLOBAL (all SKUs), SKU_CATEGORY (e.g., only sinks), or SKU_OVERRIDE (one specific SKU).",
      },
      {
        title: "Version",
        detail: "Increment the version when making significant changes. Keeps history of previous template versions.",
      },
      {
        title: "System Prompt",
        detail: "The system instruction sent to the AI model. Defines the AI\u2019s role, style, and constraints.",
      },
      {
        title: "Template Body",
        detail:
          'The main template with {{token}} placeholders that get replaced with SKU data at generation time. Use {{#if fieldName}} for conditional sections.',
      },
      {
        title: "Variables (JSON)",
        detail: "JSON array listing the variable names used in the template. Helps the engine validate that all required data is available.",
      },
    ],
    tips: [
      "Use {{sku.outerLength}}, {{sku.name}}, etc. to inject SKU geometry and metadata.",
      "{{#if hasOverflow}} content {{/if}} for conditional sections based on SKU features.",
      "Test templates by generating output in the Generator workspace.",
    ],
  },

  "admin-qc-templates": {
    title: "QC Templates",
    summary: "Quality control checklists and acceptance criteria that feed into build packets and production QC gates.",
    steps: [
      {
        title: "Template Table",
        detail: "Each row shows: template key, name, category, status, scope, and edit link.",
      },
      {
        title: "Categories",
        detail: "QC categories: SETUP, MIXING, POURING, CURING, FINISHING, FINAL_INSPECTION, PACKAGING.",
      },
    ],
  },

  "admin-qc-templates-form": {
    title: "QC Template Form",
    summary: "Create or edit a QC template with checklist items, acceptance criteria, and rejection criteria.",
    steps: [
      {
        title: "Template Key & Name",
        detail: "Unique key (e.g., 'vessel_sink_final_qc') and human-readable name.",
      },
      {
        title: "Category",
        detail: "Which production phase this QC applies to: SETUP, MIXING, POURING, CURING, FINISHING, FINAL_INSPECTION, or PACKAGING.",
      },
      {
        title: "Scope Controls",
        detail: "GLOBAL (all products), SKU_CATEGORY (e.g., all sinks), or SKU_OVERRIDE (one specific product).",
      },
      {
        title: "Checklist Items (JSON)",
        detail:
          'JSON array of checklist items. Each item is a string describing what to check, e.g., ["Verify weight within range", "Check for air bubbles", "Inspect drain alignment"].',
      },
      {
        title: "Acceptance Criteria (JSON)",
        detail: 'JSON array of conditions that must be met for the piece to pass, e.g., ["Weight within 5% of target", "No visible cracks"].',
      },
      {
        title: "Rejection Criteria (JSON)",
        detail: 'JSON array of conditions that cause automatic rejection, e.g., ["Crack longer than 1 inch", "Weight outside 10% tolerance"].',
      },
    ],
    tips: [
      "JSON must be a valid array of strings: [\"item 1\", \"item 2\"]",
      "QC templates appear in build packets and the Reject If section of SKU detail pages.",
    ],
  },

  "admin-rules-master": {
    title: "Rules Master",
    summary: "Manufacturing rules that feed into validation, generation, and build packet assembly.",
    steps: [
      {
        title: "Rules Table",
        detail: "Each row shows: code, title, category, output type, priority, status, scope, and edit link.",
      },
      {
        title: "Priority",
        detail: "Lower number = higher priority. P1 rules are applied before P5 rules when there are conflicts.",
      },
    ],
  },

  "admin-rules-master-form": {
    title: "Rule Form",
    summary: "Create or edit a manufacturing rule with scope, priority, and content.",
    steps: [
      {
        title: "Code & Title",
        detail: "Unique code (e.g., 'DIM-001') and descriptive title for the rule.",
      },
      {
        title: "Category",
        detail: "Rule category: DIMENSIONAL, STRUCTURAL, MATERIAL, PROCESS, SAFETY, QUALITY.",
      },
      {
        title: "Scope Controls",
        detail: "GLOBAL (all products), SKU_CATEGORY (specific category), or SKU_OVERRIDE (one product).",
      },
      {
        title: "Priority",
        detail: "Numeric priority (1 = highest). Controls order when multiple rules apply to the same SKU.",
      },
      {
        title: "Description",
        detail: "Brief description of what this rule covers and why it exists.",
      },
      {
        title: "Rule Text",
        detail: "The full rule content that appears in build packets. Be specific and actionable.",
      },
      {
        title: "Source",
        detail: "Where this rule comes from (e.g., 'Engineering spec v2.3', 'Customer requirement').",
      },
      {
        title: "Metadata (JSON)",
        detail: "Additional structured data as JSON for any extra rule properties.",
      },
    ],
    tips: [
      "Rules with SKU_OVERRIDE scope take precedence over Category and Global rules with the same code.",
      "Set status to ACTIVE for the rule to be included in packet assembly.",
    ],
  },

  "admin-sheets": {
    title: "Google Sheets Sync",
    summary: "Push app data to your Google Sheet: products, pricing, costing, orders, and capacity.",
    steps: [
      {
        title: "Connection Status",
        detail:
          "Shows whether the Google Sheets connection is working. If there\u2019s an error, check that google-credentials.json exists and the spreadsheet ID is set in .env.local.",
      },
      {
        title: "Available Tabs",
        detail: "Lists the sheet tabs you can sync data to. Each tab corresponds to a data category.",
      },
      {
        title: "Sync Data",
        detail: "Click sync to push current app data to the selected Google Sheet tabs. Data is overwritten, not appended.",
      },
    ],
    tips: [
      "Make sure the Google Sheet is shared with the service account email from your credentials file.",
      "Sync is one-way: app \u2192 Google Sheet. Changes in the sheet are not pulled back into the app.",
    ],
  },

  "admin-suppliers": {
    title: "Suppliers",
    summary: "Manage material suppliers with contact info, websites, and linked materials.",
    steps: [
      {
        title: "Supplier Table",
        detail: "Each row shows: code (linked), name, website (opens in new tab), material count, and status badge.",
      },
    ],
  },

  "admin-suppliers-form": {
    title: "Supplier Form",
    summary: "Add or edit a material supplier.",
    steps: [
      {
        title: "Code & Name",
        detail: "Unique code (e.g., 'BUDDY-RHODES') and supplier name.",
      },
      {
        title: "Website",
        detail: "Supplier\u2019s website URL. Used as a quick reference link.",
      },
      {
        title: "Contact Info",
        detail: "Contact email and phone number for ordering.",
      },
      {
        title: "Notes",
        detail: "Notes about the supplier: account numbers, shipping preferences, lead times, etc.",
      },
      {
        title: "Status",
        detail: "ACTIVE (current supplier) or INACTIVE (no longer used).",
      },
    ],
    tips: [
      "Linking materials to a supplier enables the Sync Prices feature in the Materials Master.",
    ],
  },
};
