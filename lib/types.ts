import type { OrderStatus } from '@/lib/order-status';

/** A row from the items_active view (deleted items never appear here). Admin use. */
export type Item = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  image_path: string | null;
  purchase_price: number;
  markup_percent: number;
  selling_price: number;
  sizes: string[];
  colours: string[];
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
};

/** What members see in the store: no cost price or markup. */
export type CatalogueItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  selling_price: number;         // price today (after any promotion discount)
  regular_price?: number;        // price without the promotion
  discount_percent?: number;     // 0 when no promotion discount applies
  sizes: string[];
  colours: string[];
};

/** Size, colour and note chosen for a cart or order line ('' = none). */
export type LineOptions = { size: string; colour: string; note: string };

/** One line in a member's cart, priced at the current selling price. */
export type CartLine = LineOptions & {
  line_id: string;
  item_id: string;
  quantity: number;
  name: string;
  description: string | null;
  image_url: string | null;
  selling_price: number;
  line_total: number;
  regular_price?: number;
  discount_percent?: number;
};

export type AccountType = 'Cheque / Current' | 'Savings' | 'Transmission' | 'Business';

/** The store's banking details (South African format). */
export type BankDetails = {
  account_holder: string;
  bank_name: string;
  branch_name: string | null;
  branch_code: string;
  account_number: string;
  account_type: AccountType;
  swift_code: string | null;
  pop_email: string | null;
  payment_instructions: string | null;
};

export type OrderLine = LineOptions & {
  line_no: number;
  unit_cost?: number | null;     // purchase price per unit; admin pages only
  regular_price?: number | null; // price before a promotion discount
  supplier_id?: string | null;   // the item's current supplier (supplier lists only)
  discount_percent?: number;     // promotion discount the line was bought with
  item_id: string | null;
  name: string;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Order = {
  id: string;
  order_number: string;          // also the payment reference
  status: OrderStatus;
  item_count: number;
  total: number;
  bank_details: BankDetails;     // as they were when the order was placed
  email_sent_at: string | null;
  email_error: string | null;
  created_at: string;
  ready_at?: string | null;
  collection_contact?: CollectionContact | null;
};

/** The admin a member contacts to arrange collection (copied onto the order). */
export type CollectionContact = { name: string; email: string; phone: string | null };

/** Order as seen on the admin pages, with the member who placed it. */
export type AdminOrder = Order & {
  paid_at: string | null;
  ordered_at: string | null;
  delivered_at: string | null;
  rejected_at: string | null;
  status_note: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  ready_at: string | null;
  collection_email_sent_at: string | null;
  collection_email_error: string | null;
  member: { member_number: string; name: string; nickname: string | null; email: string; phone: string | null };
};

export type OrderStatusLogEntry = {
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  changed_at: string;
  changer: { name: string } | null;
};

/** A promotion running today, with its item (as shown in the pop-up). */
export type LivePromotion = {
  id: string;
  item_id: string;
  title: string;
  message: string;
  starts_on: string;   // YYYY-MM-DD
  ends_on: string;
  item_name: string;
  item_description: string | null;
  image_url: string | null;
  selling_price: number;         // promotion price
  regular_price: number;
  discount_percent: number;
  sizes: string[];
  colours: string[];
};

/** A promotion as maintained on the admin pages. */
export type Promotion = {
  id: string;
  item_id: string;
  title: string;
  message: string;
  starts_on: string;
  ends_on: string;
  is_active: boolean;
  discount_percent: number;
  created_at: string;
  item: { name: string; image_url: string | null; is_deleted: boolean } | null;
  added: number;     // members who added it to their cart
  ignored: number;   // members who ignored it
};

/** A supplier (only those not marked for deletion are used by the apps). */
export type Supplier = {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};
