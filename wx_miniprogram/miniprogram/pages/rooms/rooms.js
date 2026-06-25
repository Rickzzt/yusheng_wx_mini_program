const { rooms } = require("../../data/hotel");

Page({
  data: {
    filters: ["全部", "海景", "Loft", "亲子", "大床", "榻榻米"],
    activeFilter: "全部",
    rooms,
    visibleRooms: rooms,
  },

  selectFilter(e) {
    const activeFilter = e.currentTarget.dataset.filter;
    const visibleRooms =
      activeFilter === "全部"
        ? rooms
        : rooms.filter((room) => room.tags.includes(activeFilter));

    this.setData({ activeFilter, visibleRooms });
  },

  goDetail(e) {
    wx.navigateTo({
      url: `/pages/room-detail/room-detail?id=${e.currentTarget.dataset.id}`,
    });
  },
});
