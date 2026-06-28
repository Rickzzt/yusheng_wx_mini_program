const api = require("../../services/api");

Page({
  data: {
    hotel: null,
    hero: "",
    nearbyText: "",
    trafficText: "",
  },

  onLoad() {
    this.loadHotel();
  },

  async loadHotel() {
    try {
      const hotel = await api.getHotelProfile();
      this.setData({
        hotel,
        hero: hotel.outdoorImages[1],
        nearbyText: hotel.nearby.join("、"),
        trafficText: hotel.traffic.join("、"),
      });
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

  openCtrip() {
    wx.setClipboardData({
      data: this.data.hotel.ctripUrl,
      success: () => wx.showToast({ title: "携程链接已复制", icon: "none" }),
    });
  },

  goAdmin() {
    wx.navigateTo({ url: "/pages/admin/admin" });
  },
});
