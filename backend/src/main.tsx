import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#0f766e",
          borderRadius: 6,
          fontFamily: "Ant Design Font, Segoe UI, Microsoft YaHei, sans-serif"
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
