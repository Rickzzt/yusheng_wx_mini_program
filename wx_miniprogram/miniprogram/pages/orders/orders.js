const { statusLabels } = require("../../data/hotel");
const api = require("../../services/api");

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
    api
      .listOrders()
      .then((orders) => this.setData({ orders }, this.applyFilter))
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
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
    api
      .mockPayOrder(id)
      .then(() => this.loadOrders())
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },

  cancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    api
      .cancelOrder(id)
      .then(() => this.loadOrders())
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },
});
