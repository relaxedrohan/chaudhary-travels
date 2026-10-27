export type TaxType = "CGST_SGST" | "IGST";

export type Settings = {
  id: number;
  business_name: string | null;
  address: string | null;
  gstin: string | null;
  state: string | null;
  gst_rate: number;
  tax_type: TaxType;
  sac_code: string | null;
};

export type Bus = {
  id: string;
  name: string | null;
  bus_number: string;
  operator_name: string | null;
};

export type Route = {
  id: string;
  from_place: string;
  to_place: string;
};

export type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  bus_number: string | null;
  operator_name: string | null;
  route_from: string | null;
  route_to: string | null;
  travel_date: string | null;
  seat_no: string | null;
  gst_rate: number;
  tax_type: TaxType;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  created_by_email: string | null;
  created_at: string;
  updated_at: string | null;
  updated_by_email: string | null;
};

export type NewInvoice = Pick<
  Invoice,
  | "customer_name"
  | "customer_phone"
  | "total_amount"
  | "bus_number"
  | "operator_name"
  | "route_from"
  | "route_to"
  | "travel_date"
  | "seat_no"
>;
