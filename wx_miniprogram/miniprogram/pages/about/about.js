const { hotel } = require("../../data/hotel");

Page({
  data: {
    hotel,
    hero: hotel.outdoorImages[1],
    nearbyText: hotel.nearby.join("、"),
    trafficText: hotel.traffic.join("、"),
  },

  callHotel() {
    wx.makePhoneCall({ phoneNumber: hotel.phone });
  },

  copyAddress() {
    wx.setClipboardData({ data: hotel.address });
  },

  openCtrip() {
    wx.setClipboardData({
      data: hotel.ctripUrl,
      success: () => wx.showToast({ title: "携程链接已复制", icon: "none" }),
    });
  },

  goAdmin() {
    wx.navigateTo({ url: "/pages/admin/admin" });
  },
});
