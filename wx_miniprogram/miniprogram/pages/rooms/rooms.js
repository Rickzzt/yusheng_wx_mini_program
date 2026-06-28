const api = require("../../services/api");
const { rooms: fallbackRooms } = require("../../data/hotel");

Page({
  data: {
    filters: ["全部", "海景", "Loft", "亲子", "大床", "榻榻米"],
    activeFilter: "全部",
    rooms: [],
    visibleRooms: [],
  },

  onLoad() {
    this.loadRooms();
  },

  async loadRooms() {
    try {
      const rooms = await api.listRooms();
      this.setData({ rooms, visibleRooms: rooms });
    } catch (error) {
      console.error("listRooms failed", error);
      this.setData({ rooms: fallbackRooms, visibleRooms: fallbackRooms });
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  selectFilter(e) {
    const activeFilter = e.currentTarget.dataset.filter;
    const { rooms } = this.data;
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
