const { rooms, statusLabels } = require("../../data/hotel");

Page({
  data: {
    rooms,
    statusLabels,
    orders: [],
    activeModule: "orders",
    modules: [
      { id: "orders", name: "订单" },
      { id: "inventory", name: "房态" },
      { id: "price", name: "价格" },
      { id: "refund", name: "退款" },
    ],
  },

  onShow() {
    this.setData({ orders: wx.getStorageSync("orders") || [] });
  },

  selectModule(e) {
    this.setData({ activeModule: e.currentTarget.dataset.id });
  },

  updateInventory(e) {
    wx.showToast({
      title: `${e.currentTarget.dataset.name} 房态已标记`,
      icon: "none",
    });
  },

  updatePrice(e) {
    wx.showToast({
      title: `${e.currentTarget.dataset.name} 价格待接后端保存`,
      icon: "none",
    });
  },

  recordRefund() {
    wx.showToast({
      title: "退款记录待接后端保存",
      icon: "none",
    });
  },
});
