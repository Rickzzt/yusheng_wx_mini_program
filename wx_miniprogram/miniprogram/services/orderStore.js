const ORDER_KEY = "orders";
const AUTO_CANCEL_MS = 30 * 60 * 1000;

function createOrderStore(storage, nowFn) {
  const now = nowFn || (() => Date.now());

  function read() {
    return storage.getStorageSync(ORDER_KEY) || [];
  }

  function write(orders) {
    storage.setStorageSync(ORDER_KEY, orders);
  }

  function formatTime(timeMs) {
    const date = new Date(timeMs);
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function withAutoCancel(orders) {
    const current = now();
    let changed = false;
    const updated = orders.map((order) => {
      if (order.status !== "pending") return order;
      if (!order.createdAtMs || current - order.createdAtMs <= AUTO_CANCEL_MS) return order;
      changed = true;
      return {
        ...order,
        status: "cancelled",
        paymentStatus: "未支付",
        cancelReason: "30分钟未支付自动取消",
        cancelledAt: formatTime(current),
      };
    });
    if (changed) write(updated);
    return updated;
  }

  function listOrders() {
    return withAutoCancel(read());
  }

  function createOrder(input) {
    const current = now();
    const order = {
      id: `YS${current}`,
      roomId: input.room.id,
      roomName: input.room.name,
      cover: input.room.images[0],
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights: input.nights,
      guests: input.guests,
      contactName: input.contactName,
      phone: input.phone,
      remark: input.remark,
      amount: input.nights * input.room.price,
      status: "pending",
      paymentStatus: "待支付",
      cancelRule: input.room.cancelRule,
      address: input.address,
      createdAt: formatTime(current),
      createdAtMs: current,
    };
    write([order, ...listOrders()]);
    return order;
  }

  function updateOrder(id, updater) {
    const orders = listOrders();
    let result = null;
    const updated = orders.map((order) => {
      if (order.id !== id) return order;
      result = updater(order);
      return result;
    });
    write(updated);
    return result;
  }

  function payOrder(id) {
    return updateOrder(id, (order) => {
      if (order.status !== "pending") return order;
      const current = now();
      return {
        ...order,
        status: "paid",
        paymentStatus: "已支付",
        paidAt: formatTime(current),
      };
    });
  }

  function cancelOrder(id) {
    return updateOrder(id, (order) => {
      if (order.status !== "pending") return order;
      const current = now();
      return {
        ...order,
        status: "cancelled",
        paymentStatus: "未支付",
        cancelReason: "用户取消",
        cancelledAt: formatTime(current),
      };
    });
  }

  function getOrder(id) {
    return listOrders().find((order) => order.id === id);
  }

  return {
    listOrders,
    createOrder,
    payOrder,
    cancelOrder,
    getOrder,
  };
}

module.exports = {
  AUTO_CANCEL_MS,
  createOrderStore,
};
