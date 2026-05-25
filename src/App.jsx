import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db, auth } from "./firebase";

export default function App() {
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("施設使用料");
  const [detail, setDetail] = useState("");
  const [amount, setAmount] = useState("");

  const [records, setRecords] = useState([]);

  const adminEmail = "y_ochiai@lifelong-sport.jp";
  const isAdmin = user?.email === adminEmail;

  // -----------------------------
  // ログイン保持
  // -----------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return () => unsub();
  }, []);

  // -----------------------------
  // データ取得
  // -----------------------------
  const fetchRecords = async () => {
    const snap = await getDocs(collection(db, "tatekae"));

    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    setRecords(data);
  };

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  // -----------------------------
  // ログイン
  // -----------------------------
  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      alert("ログイン失敗");
    }
  };

  // -----------------------------
  // ログアウト
  // -----------------------------
  const logout = async () => {
    await signOut(auth);
  };

  // -----------------------------
  // 保存
  // -----------------------------
  const addRecord = async () => {
    try {
      await addDoc(collection(db, "tatekae"), {
        name,
        date,
        category,
        detail,
        amount,
        user: user.email,
      });

      setName("");
      setDate("");
      setCategory("施設使用料");
      setDetail("");
      setAmount("");

      fetchRecords();
    } catch (e) {
      console.log(e);
    }
  };

  // -----------------------------
  // 削除
  // -----------------------------
  const deleteRecord = async (id) => {
    if (!window.confirm("削除しますか？")) return;

    await deleteDoc(doc(db, "tatekae", id));

    fetchRecords();
  };

  // -----------------------------
  // フィルター
  // -----------------------------
  const filteredRecords = records.filter((r) => {
    if (isAdmin) return true;

    return r.user === user?.email;
  });

  // -----------------------------
  // Excel出力
  // -----------------------------
  const exportExcel = () => {
    const data = filteredRecords.map((r) => ({
      名前: r.name,
      日付: r.date,
      勘定科目: r.category,
      詳細: r.detail,
      金額: r.amount,
      担当者: r.user,
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "立替金");

    XLSX.writeFile(wb, "立替金一覧.xlsx");
  };

  // -----------------------------
  // ログイン前
  // -----------------------------
  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>立替金アプリ</h2>

          <input
            style={styles.input}
            placeholder="メール"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={styles.button} onClick={login}>
            ログイン
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------
  // メイン画面
  // -----------------------------
  return (
    <div style={styles.container}>
      <h2>立替金アプリ</h2>

      <p>ログイン中：{user.email}</p>

      {isAdmin && <h3>管理者モード</h3>}

      <button style={styles.logout} onClick={logout}>
        ログアウト
      </button>

      <div style={styles.card}>
        <input
          style={styles.input}
          placeholder="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          style={styles.input}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <select
          style={styles.input}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>施設使用料</option>
          <option>消耗品費</option>
          <option>交通費</option>
          <option>その他</option>
        </select>

        <textarea
          style={styles.textarea}
          placeholder="詳細"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />

        <input
          style={styles.input}
          type="number"
          placeholder="金額"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <button style={styles.button} onClick={addRecord}>
          保存
        </button>

        <button style={styles.excel} onClick={exportExcel}>
          Excel出力
        </button>
      </div>

      {filteredRecords.map((r) => (
        <div key={r.id} style={styles.record}>
          <p>名前：{r.name}</p>
          <p>日付：{r.date}</p>
          <p>勘定科目：{r.category}</p>
          <p>詳細：{r.detail}</p>
          <p>金額：{r.amount}円</p>
          <p>担当者：{r.user}</p>

          <button
            style={styles.delete}
            onClick={() => deleteRecord(r.id)}
          >
            削除
          </button>
        </div>
      ))}
    </div>
  );
}

// -----------------------------
// styles
// -----------------------------
const styles = {
  container: {
    maxWidth: 600,
    margin: "0 auto",
    padding: 20,
    background: "#f4f6f9",
    minHeight: "100vh",
  },

  card: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },

  input: {
    width: "100%",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 16,
  },

  textarea: {
    width: "100%",
    minHeight: 80,
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 16,
  },

  button: {
    width: "100%",
    padding: 12,
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
  },

  excel: {
    width: "100%",
    padding: 12,
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
  },

  logout: {
    width: "100%",
    padding: 10,
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 8,
    marginBottom: 20,
  },

  record: {
    background: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },

  delete: {
    padding: 8,
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 6,
  },
};