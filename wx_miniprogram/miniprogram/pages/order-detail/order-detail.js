const { demoOrders, hotel, statusLabels } = require("../../data/hotel");

Page({
  data: {
    order: null,
    statusLabels,
    hotel,
  },

  onLoad(query) {
    const orders = wx.getStorageSync("orders") || [];
    const order = [...orders, ...demoOrders].find((item) => item.id === query.id);
    this.setData({ order });
  },

  callHotel() {
    wx.makePhoneCall({ phoneNumber: hotel.phone });
  },

  copyAddress() {
    wx.setClipboardData({ data: hotel.address });
  },

  goOrders() {
    wx.switchTab({ url: "/pages/orders/orders" });
  },
});
