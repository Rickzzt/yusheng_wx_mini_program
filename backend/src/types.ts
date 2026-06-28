export type OrderStatus = "pending" | "paid" | "cancelled" | "completed" | "refunded";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type RefundStatus = "none" | "processing" | "processed" | "rejected";

export type HotelProfile = {
  _id: string;
  name: string;
  address: string;
  city: string;
  opened: string;
  roomCount: number;
  rating?: string;
  reviewCount?: number;
  level?: string;
  phone: string;
  ctripId?: string;
  ctripUrl?: string;
  tags?: string[];
  facilities?: string[];
  nearby?: string[];
  traffic?: string[];
  outdoorImages?: string[];
};

export type Room = {
  _id: string;
  name: string;
  stock: number;
  area: string;
  bed: string;
  capacity: number;
  basePrice: number;
  originalPrice?: number;
  position?: string;
  tags?: string[];
  cancelPolicy: {
    type: "free_before_18" | "non_cancelable";
    text: string;
  };
  intro?: string;
  facilities?: string[];
  notice?: string[];
  images: string[];
  isActive: boolean;
  sort: number;
};

export type RoomCalendar = {
  _id: string;
  roomId: string;
  date: string;
  price: number;
  stock: number;
  remainingStock: number;
  isBookable: boolean;
  priceType: "base" | "holiday" | "manual";
  note?: string;
  updatedBy?: string;
};

export type Order = {
  _id: string;
  openid: string;
  roomId: string;
  roomName?: string;
  roomSnapshot?: {
    name?: string;
    cover?: string;
    bed?: string;
    capacity?: number;
    cancelRule?: string;
  };
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  contactName: string;
  idNo?: string;
  phone: string;
  remark?: string;
  amount: number;
  payAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMode: "mock" | "wechat";
  refundStatus?: RefundStatus;
  cancelReason?: string;
  createdAtMs: number;
};

export type RefundRecord = {
  _id: string;
  orderId: string;
  openid: string;
  amount: number;
  status: "processed" | "rejected";
  reason?: string;
  operatorOpenid: string;
  operatorName?: string;
  note?: string;
};

export type AdminUser = {
  _id: string;
  openid?: string;
  uid?: string;
  name: string;
  role: "owner" | "operator";
  enabled: boolean;
};
