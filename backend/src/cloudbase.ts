import cloudbase from "@cloudbase/js-sdk";
import { cloudbaseConfig } from "./config";
import type { AdminUser, HotelProfile, Order, RefundRecord, Room, RoomCalendar } from "./types";

const initOptions = {
  env: cloudbaseConfig.env,
  region: cloudbaseConfig.region,
  ...(cloudbaseConfig.accessKey ? { accessKey: cloudbaseConfig.accessKey } : {}),
  auth: { detectSessionInUrl: true }
};

export const app = cloudbase.init(initOptions);
export const auth = app.auth({ persistence: "local" });
export const db = app.database();

type CollectionName = "hotel_profile" | "rooms" | "room_calendar" | "orders" | "refund_records" | "admin_users";

type CollectionMap = {
  hotel_profile: HotelProfile;
  rooms: Room;
  room_calendar: RoomCalendar;
  orders: Order;
  refund_records: RefundRecord;
  admin_users: AdminUser;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDoc<T extends { _id: string }>(value: unknown): T {
  if (!isRecord(value)) throw new Error("云数据库返回了无效记录");
  return value as T;
}

function normalizeList<T extends { _id: string }>(items: unknown[] | undefined): T[] {
  return (items || []).map((item) => normalizeDoc<T>(item));
}

export async function listDocs<Name extends CollectionName>(name: Name, orderBy = "updatedAt", order: "asc" | "desc" = "desc") {
  const result = await db.collection(name).orderBy(orderBy, order).limit(100).get();
  return normalizeList<CollectionMap[Name]>(result.data);
}

export async function getDoc<Name extends CollectionName>(name: Name, id: string) {
  const result = await db.collection(name).doc(id).get();
  return normalizeDoc<CollectionMap[Name]>(result.data);
}

export async function updateDoc<Name extends CollectionName>(name: Name, id: string, data: Partial<CollectionMap[Name]>) {
  return db.collection(name).doc(id).update({
    data: {
      ...data,
      updatedAt: new Date()
    }
  });
}

export async function setDoc<Name extends CollectionName>(name: Name, id: string, data: CollectionMap[Name]) {
  const { _id, ...body } = data;
  return db.collection(name).doc(id).set({
    data: {
      ...body,
      updatedAt: new Date()
    }
  });
}

export async function queryDocs<Name extends CollectionName>(
  name: Name,
  query: Record<string, unknown>,
  orderBy?: string,
  order: "asc" | "desc" = "desc"
) {
  const baseQuery = db.collection(name).where(query);
  const finalQuery = orderBy ? baseQuery.orderBy(orderBy, order) : baseQuery;
  const result = await finalQuery.limit(100).get();
  return normalizeList<CollectionMap[Name]>(result.data);
}

export async function getCurrentAdmin() {
  const sessionResult = await auth.getSession();
  const session = sessionResult.data?.session;
  const uid = session?.user?.id;
  if (!session || session.user?.is_anonymous || !uid) return null;

  const byUid = await queryDocs("admin_users", { uid, enabled: true });
  if (byUid[0]) return byUid[0];

  const byOpenid = await queryDocs("admin_users", { openid: uid, enabled: true });
  return byOpenid[0] || null;
}
