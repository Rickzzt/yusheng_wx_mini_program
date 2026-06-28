const assert = require("assert");
const {
  createOrderDraft,
  failure,
  listRoomsForBooking,
  mapRoomForClient,
  isValidChineseName,
} = require("../cloudfunctions/quickstartFunctions/domain");
const { seedData } = require("../cloudfunctions/quickstartFunctions/seedData");

function run() {
  const rooms = seedData.rooms;
  const calendars = seedData.room_calendar;
  const room309 = rooms.find((room) => room._id === "room309");

  const listed = listRoomsForBooking({ rooms, calendars, payload: {} });
  assert.strictEqual(listed.length, 6);
  assert.strictEqual(listed[0].id, "room309");
  assert.strictEqual(listed[0].price, 622);
  assert.strictEqual(listed[0].cancelRule, room309.cancelPolicy.text);

  const overCapacity = listRoomsForBooking({
    rooms,
    calendars,
    payload: { checkIn: "2026-07-01", checkOut: "2026-07-02", guests: 3 },
  }).find((room) => room.id === "tatami");
  assert.strictEqual(overCapacity.isBookable, false);

  const closed = listRoomsForBooking({
    rooms,
    calendars,
    payload: { checkIn: "2026-07-02", checkOut: "2026-07-03", guests: 2 },
  }).find((room) => room.id === "tatami");
  assert.strictEqual(closed.isBookable, false);
  assert.strictEqual(closed.remainingStock, 0);

  const mapped = mapRoomForClient(room309);
  assert.strictEqual(mapped.id, "room309");
  assert.strictEqual(mapped.price, 622);

  const order = createOrderDraft({
    room: room309,
    dailyPrices: [{ date: "2026-07-01", price: 622, priceType: "base" }],
    payload: {
      checkIn: "2026-07-01",
      checkOut: "2026-07-02",
      guests: 4,
      contactName: "测试住客",
      idNo: "330326199001010011",
      phone: "13800000000",
      remark: "晚到",
    },
    openid: "test_openid_user_001",
    nowMs: new Date("2026-07-01T10:00:00+08:00").getTime(),
  });
  assert.strictEqual(order.amount, 622);
  assert.strictEqual(order.status, "pending");
  assert.strictEqual(order.paymentStatus, "unpaid");
  assert.strictEqual(order.idNo, "330326199001010011");
  assert.strictEqual(order.roomSnapshot.cover, room309.images[0]);

  assert.strictEqual(isValidChineseName("测试住客"), true);
  assert.strictEqual(isValidChineseName("Rick"), false);
  assert.strictEqual(isValidChineseName("张三A"), false);

  const emptyRooms = listRoomsForBooking({ rooms: [], calendars, payload: {} });
  assert.deepStrictEqual(emptyRooms, []);

  const error = failure("DATA_NOT_INITIALIZED", "房型数据未初始化");
  assert.strictEqual(error.success, false);
  assert.strictEqual(error.code, "DATA_NOT_INITIALIZED");
}

run();
console.log("cloud domain tests passed");
