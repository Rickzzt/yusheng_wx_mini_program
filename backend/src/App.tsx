import {
  BankOutlined,
  CalendarOutlined,
  DashboardOutlined,
  HomeOutlined,
  LoginOutlined,
  LogoutOutlined,
  ProfileOutlined,
  RedoOutlined,
  RestOutlined
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message
} from "antd";
import type { MenuProps, TableColumnsType } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { auth, getCurrentAdmin, getDoc, listDocs, setDoc, updateDoc } from "./cloudbase";
import { cloudbaseConfig } from "./config";
import type { AdminUser, HotelProfile, Order, RefundRecord, Room, RoomCalendar } from "./types";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

type ViewKey = "dashboard" | "hotel" | "rooms" | "calendar" | "orders" | "refunds";

type LoginForm = {
  username: string;
  password: string;
};

type RoomForm = Omit<Room, "_id" | "tags" | "facilities" | "notice" | "images"> & {
  _id: string;
  tagsText?: string;
  facilitiesText?: string;
  noticeText?: string;
  imagesText?: string;
};

type CalendarForm = Omit<RoomCalendar, "_id" | "date"> & {
  date: dayjs.Dayjs;
};

type RefundForm = {
  orderId: string;
  amount: number;
  status: "processed" | "rejected";
  reason?: string;
  note?: string;
};

function splitText(value?: string) {
  return (value || "")
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinText(value?: string[]) {
  return (value || []).join("\n");
}

function statusTag(status: Order["status"]) {
  const colorMap: Record<Order["status"], string> = {
    pending: "gold",
    paid: "green",
    cancelled: "default",
    completed: "blue",
    refunded: "red"
  };
  return <Tag color={colorMap[status]}>{status}</Tag>;
}

function paymentTag(status: Order["paymentStatus"]) {
  const colorMap: Record<Order["paymentStatus"], string> = {
    unpaid: "gold",
    paid: "green",
    refunded: "red"
  };
  return <Tag color={colorMap[status]}>{status}</Tag>;
}

function LoginPage({ onLoggedIn }: { onLoggedIn: (admin: AdminUser) => void }) {
  const [loading, setLoading] = useState(false);

  async function handleLogin(values: LoginForm) {
    setLoading(true);
    try {
      const result = await auth.signInWithPassword({
        username: values.username,
        password: values.password
      });
      if (result.error) throw new Error(result.error.message || "登录失败");

      const admin = await getCurrentAdmin();
      if (!admin) {
        await auth.signOut();
        throw new Error("账号未加入 admin_users 白名单，无法进入后台");
      }
      onLoggedIn(admin);
      message.success("登录成功");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-panel">
        <div>
          <Text className="login-kicker">CloudBase Admin</Text>
          <Title level={1}>云生小楼后台管理</Title>
          <Text type="secondary">使用 CloudBase 用户名密码登录，并通过 admin_users 白名单校验。</Text>
        </div>
        <Form layout="vertical" onFinish={handleLogin} requiredMark={false}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input size="large" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password size="large" autoComplete="current-password" />
          </Form.Item>
          {!cloudbaseConfig.accessKey ? (
            <Alert
              className="login-alert"
              type="warning"
              showIcon
              message="尚未配置 VITE_CLOUDBASE_ACCESS_KEY"
              description="如果当前环境要求 Publishable Key，请在 backend/.env.local 中补充。"
            />
          ) : null}
          <Button type="primary" size="large" htmlType="submit" loading={loading} icon={<LoginOutlined />} block>
            登录后台
          </Button>
        </Form>
      </section>
    </div>
  );
}

function App() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hotel, setHotel] = useState<HotelProfile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [calendar, setCalendar] = useState<RoomCalendar[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingCalendar, setEditingCalendar] = useState<RoomCalendar | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [roomForm] = Form.useForm<RoomForm>();
  const [calendarForm] = Form.useForm<CalendarForm>();
  const [hotelForm] = Form.useForm<HotelProfile & { tagsText?: string; facilitiesText?: string; nearbyText?: string; trafficText?: string }>();
  const [refundForm] = Form.useForm<RefundForm>();

  const menuItems: MenuProps["items"] = [
    { key: "dashboard", icon: <DashboardOutlined />, label: "经营概览" },
    { key: "hotel", icon: <BankOutlined />, label: "民宿资料" },
    { key: "rooms", icon: <HomeOutlined />, label: "房型管理" },
    { key: "calendar", icon: <CalendarOutlined />, label: "房态日历" },
    { key: "orders", icon: <ProfileOutlined />, label: "订单管理" },
    { key: "refunds", icon: <RestOutlined />, label: "退款记录" }
  ];

  async function loadData() {
    setLoading(true);
    try {
      const [profile, roomList, orderList, calendarList, refundList] = await Promise.all([
        getDoc("hotel_profile", "yunsheng").catch(() => null),
        listDocs("rooms", "sort", "asc"),
        listDocs("orders", "createdAtMs", "desc"),
        listDocs("room_calendar", "date", "asc"),
        listDocs("refund_records", "createdAt", "desc")
      ]);
      setHotel(profile);
      setRooms(roomList);
      setOrders(orderList);
      setCalendar(calendarList);
      setRefunds(refundList);
      if (profile) {
        hotelForm.setFieldsValue({
          ...profile,
          tagsText: joinText(profile.tags),
          facilitiesText: joinText(profile.facilities),
          nearbyText: joinText(profile.nearby),
          trafficText: joinText(profile.traffic)
        });
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getCurrentAdmin()
      .then((current) => {
        setAdmin(current);
        if (current) void loadData();
      })
      .finally(() => setChecking(false));
  }, []);

  const summary = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === "paid" || order.status === "completed");
    return {
      roomCount: rooms.length,
      activeRooms: rooms.filter((room) => room.isActive).length,
      pendingOrders: orders.filter((order) => order.status === "pending").length,
      paidAmount: paidOrders.reduce((sum, order) => sum + Number(order.payAmount || order.amount || 0), 0)
    };
  }, [orders, rooms]);

  async function handleLogout() {
    await auth.signOut();
    setAdmin(null);
  }

  function openRoom(room: Room) {
    setEditingRoom(room);
    roomForm.setFieldsValue({
      ...room,
      tagsText: joinText(room.tags),
      facilitiesText: joinText(room.facilities),
      noticeText: joinText(room.notice),
      imagesText: joinText(room.images)
    });
  }

  async function saveRoom(values: RoomForm) {
    const data: Partial<Room> = {
      name: values.name,
      stock: Number(values.stock),
      area: values.area,
      bed: values.bed,
      capacity: Number(values.capacity),
      basePrice: Number(values.basePrice),
      originalPrice: values.originalPrice ? Number(values.originalPrice) : undefined,
      position: values.position,
      tags: splitText(values.tagsText),
      cancelPolicy: values.cancelPolicy,
      intro: values.intro,
      facilities: splitText(values.facilitiesText),
      notice: splitText(values.noticeText),
      images: splitText(values.imagesText),
      isActive: Boolean(values.isActive),
      sort: Number(values.sort)
    };
    await updateDoc("rooms", values._id, data);
    message.success("房型已保存");
    setEditingRoom(null);
    await loadData();
  }

  async function saveHotel(values: HotelProfile & { tagsText?: string; facilitiesText?: string; nearbyText?: string; trafficText?: string }) {
    await setDoc("hotel_profile", "yunsheng", {
      _id: "yunsheng",
      name: values.name,
      address: values.address,
      city: values.city,
      opened: values.opened,
      roomCount: Number(values.roomCount),
      rating: values.rating,
      reviewCount: Number(values.reviewCount || 0),
      level: values.level,
      phone: values.phone,
      ctripId: values.ctripId,
      ctripUrl: values.ctripUrl,
      tags: splitText(values.tagsText),
      facilities: splitText(values.facilitiesText),
      nearby: splitText(values.nearbyText),
      traffic: splitText(values.trafficText),
      outdoorImages: hotel?.outdoorImages || []
    });
    message.success("民宿资料已保存");
    await loadData();
  }

  function openCalendar(item?: RoomCalendar) {
    const fallbackRoom = rooms[0];
    const data =
      item ||
      ({
        _id: "",
        roomId: fallbackRoom?._id || "",
        date: dayjs().format("YYYY-MM-DD"),
        price: fallbackRoom?.basePrice || 0,
        stock: fallbackRoom?.stock || 1,
        remainingStock: fallbackRoom?.stock || 1,
        isBookable: true,
        priceType: "manual",
        note: ""
      } satisfies RoomCalendar);
    setEditingCalendar(data);
    calendarForm.setFieldsValue({
      ...data,
      date: dayjs(data.date)
    });
  }

  async function saveCalendar(values: CalendarForm) {
    const date = values.date.format("YYYY-MM-DD");
    const id = `${values.roomId}_${date}`;
    await setDoc("room_calendar", id, {
      _id: id,
      roomId: values.roomId,
      date,
      price: Number(values.price),
      stock: Number(values.stock),
      remainingStock: Number(values.remainingStock),
      isBookable: Boolean(values.isBookable),
      priceType: values.priceType,
      note: values.note || "",
      updatedBy: admin?.uid || admin?.openid || admin?._id
    });
    message.success("房态已保存");
    setEditingCalendar(null);
    await loadData();
  }

  async function saveRefund(values: RefundForm) {
    const order = orders.find((item) => item._id === values.orderId);
    if (!order) {
      message.error("请选择有效订单");
      return;
    }
    const id = `RF${Date.now()}`;
    await setDoc("refund_records", id, {
      _id: id,
      orderId: order._id,
      openid: order.openid,
      amount: Number(values.amount),
      status: values.status,
      reason: values.reason || "",
      operatorOpenid: admin?.openid || admin?.uid || admin?._id || "",
      operatorName: admin?.name || "",
      note: values.note || ""
    });
    if (values.status === "processed") {
      await updateDoc("orders", order._id, {
        status: "refunded",
        paymentStatus: "refunded",
        refundStatus: "processed"
      });
    }
    message.success("退款记录已保存");
    refundForm.resetFields();
    await loadData();
  }

  const roomNameMap = useMemo(() => new Map(rooms.map((room) => [room._id, room.name])), [rooms]);

  const roomColumns: TableColumnsType<Room> = [
    { title: "排序", dataIndex: "sort", width: 72 },
    { title: "房型", dataIndex: "name" },
    { title: "床型", dataIndex: "bed" },
    { title: "容量", dataIndex: "capacity", width: 80, render: (value: number) => `${value}人` },
    { title: "基础价", dataIndex: "basePrice", width: 100, render: (value: number) => `¥${value}` },
    { title: "库存", dataIndex: "stock", width: 80 },
    { title: "状态", dataIndex: "isActive", width: 90, render: (value: boolean) => <Tag color={value ? "green" : "default"}>{value ? "上架" : "下架"}</Tag> },
    { title: "操作", width: 100, render: (_, record) => <Button onClick={() => openRoom(record)}>编辑</Button> }
  ];

  const orderColumns: TableColumnsType<Order> = [
    { title: "订单号", dataIndex: "_id", width: 160 },
    { title: "房型", render: (_, record) => record.roomSnapshot?.name || record.roomName || roomNameMap.get(record.roomId) || record.roomId },
    { title: "入住", render: (_, record) => `${record.checkIn} 至 ${record.checkOut}` },
    { title: "客人", render: (_, record) => `${record.contactName} / ${record.phone}` },
    { title: "金额", dataIndex: "payAmount", width: 100, render: (value: number) => `¥${value}` },
    { title: "订单状态", dataIndex: "status", width: 110, render: statusTag },
    { title: "支付", dataIndex: "paymentStatus", width: 100, render: paymentTag },
    { title: "操作", width: 100, render: (_, record) => <Button onClick={() => setOrderDetail(record)}>详情</Button> }
  ];

  const calendarColumns: TableColumnsType<RoomCalendar> = [
    { title: "日期", dataIndex: "date", width: 130 },
    { title: "房型", dataIndex: "roomId", render: (value: string) => roomNameMap.get(value) || value },
    { title: "价格", dataIndex: "price", width: 100, render: (value: number) => `¥${value}` },
    { title: "总库存", dataIndex: "stock", width: 90 },
    { title: "剩余", dataIndex: "remainingStock", width: 90 },
    { title: "可订", dataIndex: "isBookable", width: 90, render: (value: boolean) => <Tag color={value ? "green" : "red"}>{value ? "可订" : "关闭"}</Tag> },
    { title: "价格类型", dataIndex: "priceType", width: 110 },
    { title: "备注", dataIndex: "note" },
    { title: "操作", width: 100, render: (_, record) => <Button onClick={() => openCalendar(record)}>编辑</Button> }
  ];

  const refundColumns: TableColumnsType<RefundRecord> = [
    { title: "退款号", dataIndex: "_id", width: 150 },
    { title: "订单号", dataIndex: "orderId", width: 160 },
    { title: "金额", dataIndex: "amount", width: 100, render: (value: number) => `¥${value}` },
    { title: "状态", dataIndex: "status", width: 100, render: (value: RefundRecord["status"]) => <Tag color={value === "processed" ? "green" : "red"}>{value}</Tag> },
    { title: "原因", dataIndex: "reason" },
    { title: "操作人", dataIndex: "operatorName", width: 120 }
  ];

  if (checking) return <div className="boot">正在检查登录状态...</div>;
  if (!admin) return <LoginPage onLoggedIn={setAdmin} />;

  return (
    <Layout className="app-shell">
      <Sider width={224} className="side">
        <div className="brand">
          <HomeOutlined />
          <span>云生小楼</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeView]}
          items={menuItems}
          onClick={(item) => setActiveView(item.key as ViewKey)}
        />
      </Sider>
      <Layout>
        <Header className="topbar">
          <div>
            <Text type="secondary">当前环境</Text>
            <Text strong className="env-text">
              {cloudbaseConfig.env}
            </Text>
          </div>
          <Space>
            <Text>{admin.name}</Text>
            <Tag color="cyan">{admin.role}</Tag>
            <Button icon={<RedoOutlined />} onClick={loadData} loading={loading}>
              刷新
            </Button>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              退出
            </Button>
          </Space>
        </Header>
        <Content className="content">
          {activeView === "dashboard" ? (
            <Space direction="vertical" size={16} className="wide">
              <Title level={3}>经营概览</Title>
              <div className="stats">
                <Card><Statistic title="房型总数" value={summary.roomCount} suffix="间" /></Card>
                <Card><Statistic title="上架房型" value={summary.activeRooms} suffix="间" /></Card>
                <Card><Statistic title="待支付订单" value={summary.pendingOrders} suffix="单" /></Card>
                <Card><Statistic title="已支付流水" value={summary.paidAmount} prefix="¥" /></Card>
              </div>
              <Card title="最近订单">
                <Table rowKey="_id" columns={orderColumns} dataSource={orders.slice(0, 8)} pagination={false} loading={loading} />
              </Card>
            </Space>
          ) : null}

          {activeView === "hotel" ? (
            <Card title="民宿资料">
              <Form form={hotelForm} layout="vertical" onFinish={saveHotel}>
                <div className="form-grid">
                  <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="phone" label="联系电话" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="city" label="城市" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="address" label="地址" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="opened" label="开业年份" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item name="roomCount" label="客房数" rules={[{ required: true }]}><InputNumber min={0} className="wide" /></Form.Item>
                  <Form.Item name="rating" label="评分"><Input /></Form.Item>
                  <Form.Item name="reviewCount" label="点评数"><InputNumber min={0} className="wide" /></Form.Item>
                  <Form.Item name="level" label="定位"><Input /></Form.Item>
                  <Form.Item name="ctripId" label="携程 ID"><Input /></Form.Item>
                </div>
                <Form.Item name="ctripUrl" label="携程链接"><Input /></Form.Item>
                <Form.Item name="tagsText" label="标签"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item name="facilitiesText" label="设施"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item name="nearbyText" label="周边地标"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item name="trafficText" label="交通"><Input.TextArea rows={3} /></Form.Item>
                <Button type="primary" htmlType="submit">保存资料</Button>
              </Form>
            </Card>
          ) : null}

          {activeView === "rooms" ? (
            <Card title="房型管理">
              <Table rowKey="_id" columns={roomColumns} dataSource={rooms} loading={loading} />
            </Card>
          ) : null}

          {activeView === "calendar" ? (
            <Card
              title="房态日历"
              extra={<Button type="primary" onClick={() => openCalendar()}>新增单日房态</Button>}
            >
              <Table rowKey="_id" columns={calendarColumns} dataSource={calendar} loading={loading} />
            </Card>
          ) : null}

          {activeView === "orders" ? (
            <Card title="订单管理">
              <Tabs
                items={["all", "pending", "paid", "cancelled", "completed", "refunded"].map((key) => ({
                  key,
                  label: key === "all" ? "全部" : key,
                  children: (
                    <Table
                      rowKey="_id"
                      columns={orderColumns}
                      dataSource={key === "all" ? orders : orders.filter((order) => order.status === key)}
                      loading={loading}
                    />
                  )
                }))}
              />
            </Card>
          ) : null}

          {activeView === "refunds" ? (
            <Space direction="vertical" size={16} className="wide">
              <Card title="记录人工退款">
                <Form form={refundForm} layout="inline" onFinish={saveRefund}>
                  <Form.Item name="orderId" rules={[{ required: true, message: "请选择订单" }]}>
                    <Select
                      className="refund-order"
                      placeholder="选择已支付订单"
                      options={orders
                        .filter((order) => order.status === "paid")
                        .map((order) => ({ label: `${order._id} / ${order.contactName} / ¥${order.payAmount}`, value: order._id }))}
                    />
                  </Form.Item>
                  <Form.Item name="amount" rules={[{ required: true, message: "请输入金额" }]}>
                    <InputNumber min={0} placeholder="退款金额" />
                  </Form.Item>
                  <Form.Item name="status" initialValue="processed">
                    <Select
                      className="status-select"
                      options={[
                        { label: "已处理", value: "processed" },
                        { label: "已拒绝", value: "rejected" }
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="reason"><Input placeholder="退款原因" /></Form.Item>
                  <Form.Item name="note"><Input placeholder="备注" /></Form.Item>
                  <Button type="primary" htmlType="submit">保存</Button>
                </Form>
              </Card>
              <Card title="退款记录">
                <Table rowKey="_id" columns={refundColumns} dataSource={refunds} loading={loading} />
              </Card>
            </Space>
          ) : null}
        </Content>
      </Layout>

      <Modal title="编辑房型" open={Boolean(editingRoom)} onCancel={() => setEditingRoom(null)} footer={null} width={820}>
        <Form form={roomForm} layout="vertical" onFinish={saveRoom}>
          <div className="form-grid">
            <Form.Item name="_id" label="房型 ID"><Input disabled /></Form.Item>
            <Form.Item name="name" label="房型名称" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="area" label="面积" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="bed" label="床型" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="capacity" label="可住人数"><InputNumber min={1} className="wide" /></Form.Item>
            <Form.Item name="stock" label="默认库存"><InputNumber min={0} className="wide" /></Form.Item>
            <Form.Item name="basePrice" label="基础价"><InputNumber min={0} className="wide" /></Form.Item>
            <Form.Item name="originalPrice" label="划线价"><InputNumber min={0} className="wide" /></Form.Item>
            <Form.Item name="sort" label="排序"><InputNumber min={0} className="wide" /></Form.Item>
            <Form.Item name="position" label="页面定位"><Input /></Form.Item>
          </div>
          <Form.Item name={["cancelPolicy", "type"]} label="取消规则类型">
            <Select
              options={[
                { label: "18 点前可取消", value: "free_before_18" },
                { label: "不可取消", value: "non_cancelable" }
              ]}
            />
          </Form.Item>
          <Form.Item name={["cancelPolicy", "text"]} label="取消规则文案"><Input /></Form.Item>
          <Form.Item name="intro" label="简介"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="tagsText" label="标签"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="facilitiesText" label="设施"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="noticeText" label="入住须知"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="imagesText" label="图片路径"><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="isActive" label="是否上架" valuePropName="checked"><Switch /></Form.Item>
          <Button type="primary" htmlType="submit">保存房型</Button>
        </Form>
      </Modal>

      <Modal title="维护单日房态" open={Boolean(editingCalendar)} onCancel={() => setEditingCalendar(null)} footer={null}>
        <Form form={calendarForm} layout="vertical" onFinish={saveCalendar}>
          <Form.Item name="roomId" label="房型" rules={[{ required: true }]}>
            <Select options={rooms.map((room) => ({ label: room.name, value: room._id }))} />
          </Form.Item>
          <Form.Item name="date" label="日期" rules={[{ required: true }]}><DatePicker className="wide" /></Form.Item>
          <div className="form-grid two">
            <Form.Item name="price" label="价格"><InputNumber min={0} className="wide" /></Form.Item>
            <Form.Item name="stock" label="总库存"><InputNumber min={0} className="wide" /></Form.Item>
            <Form.Item name="remainingStock" label="剩余库存"><InputNumber min={0} className="wide" /></Form.Item>
            <Form.Item name="priceType" label="价格类型">
              <Select
                options={[
                  { label: "基础价", value: "base" },
                  { label: "节假日", value: "holiday" },
                  { label: "手动", value: "manual" }
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="isBookable" label="是否可订" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="note" label="备注"><Input.TextArea rows={3} /></Form.Item>
          <Button type="primary" htmlType="submit">保存房态</Button>
        </Form>
      </Modal>

      <Drawer title="订单详情" open={Boolean(orderDetail)} onClose={() => setOrderDetail(null)} width={520}>
        {orderDetail ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="订单号">{orderDetail._id}</Descriptions.Item>
            <Descriptions.Item label="房型">{orderDetail.roomSnapshot?.name || orderDetail.roomName}</Descriptions.Item>
            <Descriptions.Item label="日期">{orderDetail.checkIn} 至 {orderDetail.checkOut}</Descriptions.Item>
            <Descriptions.Item label="入住人数">{orderDetail.guests}</Descriptions.Item>
            <Descriptions.Item label="联系人">{orderDetail.contactName}</Descriptions.Item>
            <Descriptions.Item label="身份证号">{orderDetail.idNo || "-"}</Descriptions.Item>
            <Descriptions.Item label="手机号">{orderDetail.phone}</Descriptions.Item>
            <Descriptions.Item label="金额">¥{orderDetail.payAmount}</Descriptions.Item>
            <Descriptions.Item label="订单状态">{statusTag(orderDetail.status)}</Descriptions.Item>
            <Descriptions.Item label="支付状态">{paymentTag(orderDetail.paymentStatus)}</Descriptions.Item>
            <Descriptions.Item label="备注">{orderDetail.remark || "-"}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </Layout>
  );
}

export default App;
