const cloud = require("wx-server-sdk");
const {
  buildDailyPrices,
  createOrderDraft,
  failure,
  isExpired,
  isValidChineseName,
  listRoomsForBooking,
  mapOrderForClient,
  mapRoomForClient,
  nightsBetween,
  success,
} = require("./domain");
const { seedData, withTimestamps } = require("./seedData");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const COLLECTIONS = ["hotel_profile", "rooms", "room_calendar", "orders", "refund_records", "admin_users"];

function requestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function wxContext() {
  return cloud.getWXContext();
}

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (error) {
    const message = String(error && (error.errMsg || error.message || error));
    if (!message.includes("collection exist") && !message.includes("already exists")) {
      throw error;
    }
  }
}

async function upsert(collectionName, item) {
  const { _id, ...data } = item;
  await db.collection(collectionName).doc(_id).set({ data });
}

async function getAll(collectionName, query = {}) {
  const result = await db.collection(collectionName).where(query).get();
  return result.data || [];
}

async function getRoom(roomId) {
  try {
    const result = await db.collection("rooms").doc(roomId).get();
    return { _id: roomId, ...result.data };
  } catch (error) {
    return null;
  }
}

async function getHotelProfile() {
  const result = await db.collection("hotel_profile").doc("yunsheng").get();
  return result.data;
}

async function initDatabase() {
  for (const collection of COLLECTIONS) {
    await ensureCollection(collection);
  }

  for (const [collection, items] of Object.entries(seedData)) {
    for (const item of items) {
      await upsert(collection, withTimestamps(item));
    }
  }

  return {
    collections: COLLECTIONS,
    inserted: Object.fromEntries(Object.entries(seedData).map(([name, items]) => [name, items.length])),
  };
}

async function listRooms(payload = {}) {
  const rooms = await getAll("rooms", { isActive: true });
  if (!rooms.length) return failure("DATA_NOT_INITIALIZED", "房型数据未初始化，请先调用 initDatabase");
  const calendars = await getAll("room_calendar");
  return { rooms: listRoomsForBooking({ rooms, calendars, payload }) };
}

async function getRoomDetail(payload = {}) {
  if (!payload.roomId) return failure("INVALID_PARAM", "房型 ID 不能为空");
  const room = await getRoom(payload.roomId);
  if (!room) return failure("ROOM_NOT_FOUND", "房型不存在");
  const calendars = await getAll("room_calendar", { roomId: payload.roomId });
  const dailyPrices =
    payload.checkIn && payload.checkOut ? buildDailyPrices(room, calendars, payload.checkIn, payload.checkOut) : [];
  return mapRoomForClient(room, {
    displayPrice: dailyPrices[0]?.price || room.basePrice,
    remainingStock: dailyPrices.length ? Math.min(...dailyPrices.map((item) => item.remainingStock)) : room.stock,
    isBookable: dailyPrices.length ? dailyPrices.every((item) => item.isBookable && item.remainingStock > 0) : room.isActive,
    dailyPrices,
  });
}

function validateOrderPayload(payload, room) {
  if (!payload.roomId || !payload.checkIn || !payload.checkOut) return failure("INVALID_PARAM", "房型和日期不能为空");
  if (nightsBetween(payload.checkIn, payload.checkOut) < 1) return failure("INVALID_PARAM", "离店日期必须晚于入住日期");
  if (!payload.contactName || !payload.phone || !payload.idNo) return failure("INVALID_PARAM", "联系人、手机号和身份证号不能为空");
  if (!isValidChineseName(payload.contactName)) return failure("INVALID_PARAM", "真实姓名只能填写中文");
  if (!/^1[3-9]\d{9}$/.test(payload.phone)) return failure("INVALID_PARAM", "手机号格式不正确");
  if (!/^\d{17}[\dXx]$/.test(payload.idNo)) return failure("INVALID_PARAM", "身份证号格式不正确");
  if (Number(payload.guests) > room.capacity) return failure("INVALID_PARAM", "入住人数超过房型上限");
  return null;
}

async function createOrder(payload = {}) {
  const { OPENID } = wxContext();
  if (!OPENID) return failure("UNAUTHORIZED", "未获取到登录身份");
  const room = await getRoom(payload.roomId);
  if (!room) return failure("ROOM_NOT_FOUND", "房型不存在");
  if (!room.isActive) return failure("ROOM_INACTIVE", "房型已下架");

  const validation = validateOrderPayload(payload, room);
  if (validation) return validation;

  const calendars = await getAll("room_calendar", { roomId: payload.roomId });
  const dailyPrices = buildDailyPrices(room, calendars, payload.checkIn, payload.checkOut);
  const unavailable = dailyPrices.find((item) => !item.isBookable);
  if (unavailable) return failure("DATE_UNAVAILABLE", "所选日期不可订");
  const soldOut = dailyPrices.find((item) => item.remainingStock < 1);
  if (soldOut) return failure("STOCK_NOT_ENOUGH", "所选日期库存不足");

  const nowMs = Date.now();
  const order = createOrderDraft({ room, dailyPrices, payload, openid: OPENID, nowMs });
  await upsert("orders", order);

  for (const item of dailyPrices) {
    const calendarId = `${room._id}_${item.date}`;
    const existing = calendars.find((calendar) => calendar._id === calendarId);
    if (existing) {
      await db.collection("room_calendar").doc(calendarId).update({
        data: { remainingStock: _.inc(-1), updatedAt: new Date(nowMs) },
      });
    } else {
      await upsert("room_calendar", {
        _id: calendarId,
        roomId: room._id,
        date: item.date,
        price: room.basePrice,
        stock: room.stock,
        remainingStock: room.stock - 1,
        isBookable: true,
        priceType: "base",
        createdAt: new Date(nowMs),
        updatedAt: new Date(nowMs),
      });
    }
  }

  return {
    orderId: order._id,
    status: order.status,
    amount: order.amount,
    nights: order.nights,
    expireAt: new Date(nowMs + 30 * 60 * 1000).toISOString(),
    paymentMode: "mock",
  };
}

async function getOrder(orderId) {
  try {
    const result = await db.collection("orders").doc(orderId).get();
    return { _id: orderId, ...result.data };
  } catch (error) {
    return null;
  }
}

async function releaseOrderStock(order) {
  for (const item of order.dailyPrices || []) {
    await db.collection("room_calendar").doc(`${order.roomId}_${item.date}`).update({
      data: { remainingStock: _.inc(1), updatedAt: new Date() },
    });
  }
}

async function expireOrder(order) {
  await releaseOrderStock(order);
  await db.collection("orders").doc(order._id).update({
    data: {
      status: "cancelled",
      paymentStatus: "unpaid",
      cancelReason: "timeout",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

async function listOrders(payload = {}) {
  const { OPENID } = wxContext();
  const nowMs = Date.now();
  const query = payload.status ? { openid: OPENID, status: payload.status } : { openid: OPENID };
  const orders = await getAll("orders", query);
  for (const order of orders) {
    if (isExpired(order, nowMs)) await expireOrder(order);
  }
  const refreshed = await getAll("orders", query);
  return { orders: refreshed.sort((left, right) => right.createdAtMs - left.createdAtMs).map(mapOrderForClient) };
}

async function getOrderDetail(payload = {}) {
  const { OPENID } = wxContext();
  const order = await getOrder(payload.orderId);
  if (!order) return failure("ORDER_NOT_FOUND", "订单不存在");
  if (order.openid !== OPENID) return failure("ORDER_NOT_OWNED", "订单不属于当前用户");
  if (isExpired(order, Date.now())) {
    await expireOrder(order);
    return failure("ORDER_EXPIRED", "订单已超时取消");
  }
  return mapOrderForClient(order);
}

async function mockPayOrder(payload = {}) {
  const { OPENID } = wxContext();
  const order = await getOrder(payload.orderId);
  if (!order) return failure("ORDER_NOT_FOUND", "订单不存在");
  if (order.openid !== OPENID) return failure("ORDER_NOT_OWNED", "订单不属于当前用户");
  if (isExpired(order, Date.now())) {
    await expireOrder(order);
    return failure("ORDER_EXPIRED", "订单已超时取消");
  }
  if (order.status !== "pending") return failure("ORDER_STATUS_INVALID", "订单状态不允许支付");
  await db.collection("orders").doc(order._id).update({
    data: {
      status: "paid",
      paymentStatus: "paid",
      paidAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return { orderId: order._id, status: "paid", paymentStatus: "paid", paidAt: new Date().toISOString() };
}

async function cancelOrder(payload = {}) {
  const { OPENID } = wxContext();
  const order = await getOrder(payload.orderId);
  if (!order) return failure("ORDER_NOT_FOUND", "订单不存在");
  if (order.openid !== OPENID) return failure("ORDER_NOT_OWNED", "订单不属于当前用户");
  if (order.status !== "pending") return failure("ORDER_STATUS_INVALID", "订单状态不允许取消");
  await releaseOrderStock(order);
  await db.collection("orders").doc(order._id).update({
    data: {
      status: "cancelled",
      paymentStatus: "unpaid",
      cancelReason: "user_cancel",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return { orderId: order._id, status: "cancelled", cancelledAt: new Date().toISOString() };
}

async function assertAdmin() {
  const { OPENID } = wxContext();
  const users = await getAll("admin_users", { openid: OPENID, enabled: true });
  if (!users.length) throw failure("FORBIDDEN", "当前用户无后台权限");
  return users[0];
}

async function adminListOrders(payload = {}) {
  await assertAdmin();
  const query = {};
  if (payload.status) query.status = payload.status;
  if (payload.roomId) query.roomId = payload.roomId;
  return { orders: (await getAll("orders", query)).map(mapOrderForClient) };
}

async function adminGetOrderDetail(payload = {}) {
  await assertAdmin();
  const order = await getOrder(payload.orderId);
  if (!order) return failure("ORDER_NOT_FOUND", "订单不存在");
  return mapOrderForClient(order);
}

async function adminListRoomCalendar(payload = {}) {
  await assertAdmin();
  const query = {};
  if (payload.roomId) query.roomId = payload.roomId;
  const items = await getAll("room_calendar", query);
  return {
    items: items.filter((item) => {
      if (payload.dateFrom && item.date < payload.dateFrom) return false;
      if (payload.dateTo && item.date > payload.dateTo) return false;
      return true;
    }),
  };
}

function validateCalendarPayload(payload) {
  if (!payload.roomId || !payload.date) return failure("INVALID_PARAM", "房型和日期不能为空");
  if (Number(payload.price) < 0 || Number(payload.stock) < 0 || Number(payload.remainingStock) < 0) {
    return failure("INVALID_PARAM", "价格和库存不能小于 0");
  }
  if (Number(payload.remainingStock) > Number(payload.stock)) return failure("INVALID_PARAM", "剩余库存不能大于总库存");
  return null;
}

async function adminUpdateRoomCalendar(payload = {}) {
  const admin = await assertAdmin();
  const room = await getRoom(payload.roomId);
  if (!room) return failure("ROOM_NOT_FOUND", "房型不存在");
  const validation = validateCalendarPayload(payload);
  if (validation) return validation;
  const id = `${payload.roomId}_${payload.date}`;
  const item = {
    _id: id,
    roomId: payload.roomId,
    date: payload.date,
    price: Number(payload.price),
    stock: Number(payload.stock),
    remainingStock: Number(payload.remainingStock),
    isBookable: Boolean(payload.isBookable),
    priceType: payload.priceType || "manual",
    note: payload.note || "",
    updatedBy: admin.openid,
    updatedAt: new Date(),
  };
  await upsert("room_calendar", { createdAt: new Date(), ...item });
  return item;
}

async function adminBatchUpdateRoomCalendar(payload = {}) {
  await assertAdmin();
  const failed = [];
  let updated = 0;
  for (const item of payload.items || []) {
    const result = await adminUpdateRoomCalendar(item);
    if (result.success === false) failed.push({ item, code: result.code, message: result.message });
    else updated += 1;
  }
  return { updated, failed };
}

async function adminRecordRefund(payload = {}) {
  const admin = await assertAdmin();
  const order = await getOrder(payload.orderId);
  if (!order) return failure("ORDER_NOT_FOUND", "订单不存在");
  if (order.status !== "paid") return failure("ORDER_STATUS_INVALID", "订单未支付，不能记录退款");
  if (Number(payload.amount) > order.amount) return failure("INVALID_PARAM", "退款金额不能大于订单金额");

  const refundId = `RF${Date.now()}`;
  await upsert("refund_records", {
    _id: refundId,
    orderId: order._id,
    openid: order.openid,
    amount: Number(payload.amount),
    status: payload.status,
    reason: payload.reason || "",
    operatorOpenid: admin.openid,
    operatorName: admin.name,
    note: payload.note || "",
    createdAt: new Date(),
  });

  if (payload.status === "processed") {
    await db.collection("orders").doc(order._id).update({
      data: { status: "refunded", paymentStatus: "refunded", refundStatus: "processed", updatedAt: new Date() },
    });
  }
  return { refundId, orderId: order._id, amount: Number(payload.amount), status: payload.status };
}

async function dispatch(event) {
  const payload = event.payload || {};
  switch (event.type) {
    case "getOpenId": {
      const context = wxContext();
      return { openid: context.OPENID, appid: context.APPID, unionid: context.UNIONID || "" };
    }
    case "initDatabase":
      return await initDatabase();
    case "getHotelProfile":
      return await getHotelProfile();
    case "listRooms":
      return await listRooms(payload);
    case "getRoomDetail":
      return await getRoomDetail(payload);
    case "createOrder":
      return await createOrder(payload);
    case "listOrders":
      return await listOrders(payload);
    case "getOrderDetail":
      return await getOrderDetail(payload);
    case "mockPayOrder":
      return await mockPayOrder(payload);
    case "cancelOrder":
      return await cancelOrder(payload);
    case "adminListOrders":
      return await adminListOrders(payload);
    case "adminGetOrderDetail":
      return await adminGetOrderDetail(payload);
    case "adminListRoomCalendar":
      return await adminListRoomCalendar(payload);
    case "adminUpdateRoomCalendar":
      return await adminUpdateRoomCalendar(payload);
    case "adminBatchUpdateRoomCalendar":
      return await adminBatchUpdateRoomCalendar(payload);
    case "adminRecordRefund":
      return await adminRecordRefund(payload);
    default:
      return failure("INVALID_PARAM", "未知接口类型");
  }
}

exports.main = async (event) => {
  const id = requestId();
  try {
    const data = await dispatch(event || {});
    if (data && data.success === false) return { ...data, requestId: id };
    return success(data, id);
  } catch (error) {
    if (error && error.success === false) return { ...error, requestId: id };
    return failure("SERVER_ERROR", error.message || String(error), id);
  }
};
