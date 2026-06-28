const { rooms, statusLabels } = require("../../data/hotel");
const api = require("../../services/api");

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
    this.loadAdminData();
  },

  async loadAdminData() {
    try {
      const [cloudRooms, orders] = await Promise.all([api.listRooms(), api.adminListOrders()]);
      this.setData({ rooms: cloudRooms.length ? cloudRooms : rooms, orders });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
      this.setData({ rooms });
    }
  },

  async initDatabase() {
    try {
      const result = await api.initDatabase();
      wx.showToast({ title: `已初始化 ${result.collections.length} 个集合`, icon: "none" });
      this.loadAdminData();
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
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
