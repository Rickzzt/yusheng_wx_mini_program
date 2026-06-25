const { demoOrders, statusLabels } = require("../../data/hotel");

Page({
  data: {
    tabs: ["全部", "待支付", "已支付", "已取消", "已完成", "已退款"],
    activeTab: "全部",
    orders: [],
    visibleOrders: [],
    statusLabels,
  },

  onShow() {
    this.loadOrders();
  },

  loadOrders() {
    const stored = wx.getStorageSync("orders") || [];
    const orders = [...stored, ...demoOrders];
    this.setData({ orders }, this.applyFilter);
  },

  selectTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab }, this.applyFilter);
  },

  applyFilter() {
    const { orders, activeTab } = this.data;
    const visibleOrders =
      activeTab === "全部"
        ? orders
        : orders.filter((order) => statusLabels[order.status] === activeTab);
    this.setData({ visibleOrders });
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${e.currentTarget.dataset.id}`,
    });
  },

  payOrder(e) {
    const id = e.currentTarget.dataset.id;
    const orders = (wx.getStorageSync("orders") || []).map((order) =>
      order.id === id ? { ...order, status: "paid", paymentStatus: "已支付" } : order
    );
    wx.setStorageSync("orders", orders);
    this.loadOrders();
  },

  cancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    const orders = (wx.getStorageSync("orders") || []).map((order) =>
      order.id === id ? { ...order, status: "cancelled", paymentStatus: "未支付" } : order
    );
    wx.setStorageSync("orders", orders);
    this.loadOrders();
  },
});
