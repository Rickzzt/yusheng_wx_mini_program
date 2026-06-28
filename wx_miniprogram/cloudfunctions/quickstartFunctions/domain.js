const AUTO_CANCEL_MS = 30 * 60 * 1000;

function success(data, requestId) {
  return { success: true, data, requestId };
}

function failure(code, message, requestId) {
  return { success: false, code, message, requestId };
}

function nightsBetween(checkIn, checkOut) {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  return Math.max(0, Math.ceil((end - start) / 86400000));
}

function isValidChineseName(name) {
  return /^[\u4e00-\u9fa5·]{2,20}$/.test(String(name || "").trim());
}

function eachDate(checkIn, checkOut) {
  const dates = [];
  const start = new Date(`${checkIn}T00:00:00+08:00`);
  const nights = nightsBetween(checkIn, checkOut);
  for (let index = 0; index < nights; index += 1) {
    const date = new Date(start.getTime() + index * 86400000);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    dates.push(`${date.getFullYear()}-${month}-${day}`);
  }
  return dates;
}

function mapRoomForClient(room, availability) {
  const price = availability?.displayPrice || room.basePrice;
  return {
    ...room,
    id: room._id,
    price,
    basePrice: room.basePrice,
    displayPrice: price,
    cover: room.images[0],
    cancelRule: room.cancelPolicy.text,
    isBookable: availability?.isBookable ?? room.isActive,
    remainingStock: availability?.remainingStock ?? room.stock,
  };
}

function buildDailyPrices(room, calendars, checkIn, checkOut) {
  const calendarMap = new Map(calendars.map((item) => [`${item.roomId}_${item.date}`, item]));
  return eachDate(checkIn, checkOut).map((date) => {
    const calendar = calendarMap.get(`${room._id}_${date}`);
    return {
      date,
      price: calendar?.price ?? room.basePrice,
      priceType: calendar?.priceType || "base",
      stock: calendar?.stock ?? room.stock,
      remainingStock: calendar?.remainingStock ?? room.stock,
      isBookable: calendar?.isBookable ?? true,
    };
  });
}

function getAvailability(room, calendars, payload) {
  if (!payload?.checkIn || !payload?.checkOut) {
    return {
      displayPrice: room.basePrice,
      remainingStock: room.stock,
      isBookable: room.isActive,
      dailyPrices: [],
    };
  }

  const dailyPrices = buildDailyPrices(room, calendars, payload.checkIn, payload.checkOut);
  const minPrice = Math.min(...dailyPrices.map((item) => item.price));
  const minStock = Math.min(...dailyPrices.map((item) => item.remainingStock));
  const guestsOk = !payload.guests || Number(payload.guests) <= room.capacity;
  const datesOk = dailyPrices.length > 0 && dailyPrices.every((item) => item.isBookable && item.remainingStock > 0);

  return {
    displayPrice: minPrice,
    remainingStock: minStock,
    isBookable: Boolean(room.isActive && guestsOk && datesOk),
    dailyPrices,
  };
}

function listRoomsForBooking({ rooms, calendars, payload = {} }) {
  return rooms
    .filter((room) => room.isActive)
    .sort((left, right) => left.sort - right.sort)
    .map((room) => mapRoomForClient(room, getAvailability(room, calendars, payload)));
}

function createOrderDraft({ room, dailyPrices, payload, openid, nowMs }) {
  const nights = nightsBetween(payload.checkIn, payload.checkOut);
  const amount = dailyPrices.reduce((sum, item) => sum + item.price, 0);
  const orderId = `YS${nowMs}`;
  return {
    _id: orderId,
    id: orderId,
    openid,
    roomId: room._id,
    roomSnapshot: {
      name: room.name,
      cover: room.images[0],
      bed: room.bed,
      capacity: room.capacity,
      cancelRule: room.cancelPolicy.text,
    },
    roomName: room.name,
    cover: room.images[0],
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    nights,
    guests: Number(payload.guests),
    contactName: payload.contactName,
    idNo: payload.idNo,
    phone: payload.phone,
    remark: payload.remark || "",
    dailyPrices,
    amount,
    payAmount: amount,
    status: "pending",
    paymentStatus: "unpaid",
    paymentMode: "mock",
    refundStatus: "none",
    cancelRule: room.cancelPolicy.text,
    createdAtMs: nowMs,
    createdAt: new Date(nowMs),
    updatedAt: new Date(nowMs),
  };
}

function isExpired(order, nowMs) {
  return order.status === "pending" && order.createdAtMs && nowMs - order.createdAtMs > AUTO_CANCEL_MS;
}

function mapOrderForClient(order) {
  return {
    ...order,
    id: order._id || order.id,
    roomName: order.roomName || order.roomSnapshot?.name,
    cover: order.cover || order.roomSnapshot?.cover,
    cancelRule: order.cancelRule || order.roomSnapshot?.cancelRule,
  };
}

module.exports = {
  AUTO_CANCEL_MS,
  buildDailyPrices,
  createOrderDraft,
  eachDate,
  failure,
  getAvailability,
  isExpired,
  isValidChineseName,
  listRoomsForBooking,
  mapOrderForClient,
  mapRoomForClient,
  nightsBetween,
  success,
};
