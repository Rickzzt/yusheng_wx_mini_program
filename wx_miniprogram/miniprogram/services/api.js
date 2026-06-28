const FUNCTION_NAME = "quickstartFunctions";

function normalizeRoom(room) {
  if (!room) return room;
  return {
    ...room,
    id: room.id || room._id,
    price: room.price || room.displayPrice || room.basePrice,
    cancelRule: room.cancelRule || room.cancelPolicy?.text,
  };
}

function normalizeOrder(order) {
  if (!order) return order;
  return {
    ...order,
    id: order.id || order._id,
    roomName: order.roomName || order.roomSnapshot?.name,
    cover: order.cover || order.roomSnapshot?.cover,
    cancelRule: order.cancelRule || order.roomSnapshot?.cancelRule,
  };
}

async function callApi(type, payload = {}) {
  if (!wx.cloud) {
    throw new Error("当前基础库不支持云开发");
  }
  const response = await wx.cloud.callFunction({
    name: FUNCTION_NAME,
    data: { type, payload },
  });
  const result = response.result;
  if (!result || result.success === false) {
    throw new Error(result?.message || "接口调用失败");
  }
  return result.data;
}

async function getHotelProfile() {
  return await callApi("getHotelProfile");
}

async function listRooms(payload) {
  const data = await callApi("listRooms", payload);
  return (data.rooms || []).map(normalizeRoom);
}

async function getRoomDetail(payload) {
  return normalizeRoom(await callApi("getRoomDetail", payload));
}

async function createOrder(payload) {
  return await callApi("createOrder", payload);
}

async function listOrders(payload) {
  const data = await callApi("listOrders", payload);
  return (data.orders || []).map(normalizeOrder);
}

async function getOrderDetail(orderId) {
  return normalizeOrder(await callApi("getOrderDetail", { orderId }));
}

async function mockPayOrder(orderId) {
  return await callApi("mockPayOrder", { orderId });
}

async function cancelOrder(orderId) {
  return await callApi("cancelOrder", { orderId });
}

async function adminListOrders(payload) {
  const data = await callApi("adminListOrders", payload);
  return (data.orders || []).map(normalizeOrder);
}

async function adminUpdateRoomCalendar(payload) {
  return await callApi("adminUpdateRoomCalendar", payload);
}

async function adminRecordRefund(payload) {
  return await callApi("adminRecordRefund", payload);
}

async function initDatabase() {
  return await callApi("initDatabase");
}

module.exports = {
  adminListOrders,
  adminRecordRefund,
  adminUpdateRoomCalendar,
  cancelOrder,
  createOrder,
  getHotelProfile,
  getOrderDetail,
  getRoomDetail,
  initDatabase,
  listOrders,
  listRooms,
  mockPayOrder,
};
