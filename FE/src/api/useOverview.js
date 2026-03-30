import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API  = "http://localhost:5000/api/dashboard";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export function useOverview() {
  const [stats,        setStats]        = useState({});
  const [revenueChart, setRevenueChart] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts,  setTopProducts]  = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  // Fetch tất cả dữ liệu lần đầu (mặc định range = "day")
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    const h = auth();
    try {
      const [s, r, ro, tp, ps] = await Promise.all([
        axios.get(`${API}/stats`,           { headers: h }),
        axios.get(`${API}/revenue-chart?range=day`, { headers: h }),
        axios.get(`${API}/recent-orders`,   { headers: h }),
        axios.get(`${API}/top-products`,    { headers: h }),
        axios.get(`${API}/payment-stats`,   { headers: h }),
      ]);
      setStats(s.data);
      setRevenueChart(r.data);
      setRecentOrders(ro.data);
      setTopProducts(tp.data);
      setPaymentStats(ps.data);
    } catch {
      toast.error("Không thể tải dữ liệu tổng quan");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch riêng biểu đồ doanh thu theo range (day / week / month) hoặc khoảng ngày tuỳ chọn
  const fetchChart = useCallback(async (range, from, to) => {
    setChartLoading(true);
    try {
      let url = `${API}/revenue-chart?range=${range}`;
      if (range === "custom" && from && to) {
        url = `${API}/revenue-chart?range=custom&from=${from}&to=${to}`;
      }
      const res = await axios.get(url, { headers: auth() });
      setRevenueChart(res.data);
    } catch {
      toast.error("Không thể tải dữ liệu biểu đồ");
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  return {
    stats, revenueChart, recentOrders, topProducts, paymentStats,
    loading, chartLoading,
    fetchOverview, fetchChart,
  };
}