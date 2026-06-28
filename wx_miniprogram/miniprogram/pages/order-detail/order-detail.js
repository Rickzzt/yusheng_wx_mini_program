const { statusLabels } = require("../../data/hotel");
const api = require("../../services/api");

Page({
  data: {
    order: null,
    statusLabels,
    hotel: null,
  },

  async onLoad(query) {
    try {
      const [hotel, order] = await Promise.all([api.getHotelProfile(), api.getOrderDetail(query.id)]);
      this.setData({ hotel, order });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  callHotel() {
    wx.makePhoneCall({ phoneNumber: this.data.hotel.phone });
  },

  copyAddress() {
    wx.setClipboardData({ data: this.data.hotel.address });
  },

  goOrders() {
    wx.switchTab({ url: "/pages/orders/orders" });
  },
});
