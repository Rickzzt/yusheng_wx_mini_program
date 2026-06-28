const assert = require("assert");
const { createOrderStore } = require("../miniprogram/services/orderStore");

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getStorageSync(key) {
      return data[key];
    },
    setStorageSync(key, value) {
      data[key] = value;
    },
  };
}

function run() {
  const now = new Date("2026-07-01T10:00:00+08:00").getTime();
  const storage = memoryStorage();
  const store = createOrderStore(storage, () => now);

  const order = store.createOrder({
    room: {
      id: "room309",
      name: "Loft亲子海景套房309",
      images: ["/images/hotel/room309/demo.jpg"],
      price: 622,
      cancelRule: "预订后不可取消",
    },
    checkIn: "2026-07-02",
    checkOut: "2026-07-04",
    nights: 2,
    guests: 4,
    contactName: "张三",
    phone: "13800000000",
    remark: "晚到",
    address: "浙江平阳跳头村358号",
  });

  assert.strictEqual(order.status, "pending");
  assert.strictEqual(order.paymentStatus, "待支付");
  assert.strictEqual(order.amount, 1244);
  assert.strictEqual(store.listOrders()[0].id, order.id);

  const paid = store.payOrder(order.id);
  assert.strictEqual(paid.status, "paid");
  assert.strictEqual(paid.paymentStatus, "已支付");
  assert.ok(paid.paidAt);

  const expiredStore = createOrderStore(
    memoryStorage({
      orders: [
        {
          ...order,
          id: "YS-EXPIRED",
          status: "pending",
          paymentStatus: "待支付",
          createdAtMs: now - 31 * 60 * 1000,
        },
      ],
    }),
    () => now
  );

  const [expired] = expiredStore.listOrders();
  assert.strictEqual(expired.status, "cancelled");
  assert.strictEqual(expired.paymentStatus, "未支付");
  assert.strictEqual(expired.cancelReason, "30分钟未支付自动取消");
}

run();
console.log("orderStore tests passed");
