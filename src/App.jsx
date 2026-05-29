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
  updateDoc,
} from "firebase/firestore";

import { db, auth } from "./firebase";

export default function App() {
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [detail, setDetail] = useState("");
  const [amount, setAmount] = useState("");

  const [image, setImage] = useState("");

  const [records, setRecords] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState("");

  const [editingId, setEditingId] = useState(null);

  const adminEmail = "y_ochiai@lifelong-sport.jp";
  const isAdmin = user?.email === adminEmail;

  // ログイン保持
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return () => unsub();
  }, []);

  // データ取得
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

  // ログイン
  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      alert("ログイン失敗");
    }
  };

  // ログアウト
  const logout = async () => {
    await signOut(auth);
  };

  // 画像変換
  const handleImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setImage(reader.result);
    };

    reader.readAsDataURL(file);
  };

  // 保存・更新
  const saveRecord = async () => {
    try {
      if (editingId) {
        await updateDoc(doc(db, "tatekae", editingId), {
          name,
          date,
          category,
          detail,
          amount,
          image,
        });

        setEditingId(null);
      } else {
        await addDoc(collection(db, "tatekae"), {
          name,
          date,
          category,
          detail,
          amount,
          image,
          user: user.email,
        });
      }

      setName("");
      setDate("");
      setCategory("");
      setDetail("");
      setAmount("");
      setImage("");

      fetchRecords();
    } catch (e) {
      console.log(e);
    }
  };

  // 編集
  const editRecord = (r) => {
    setEditingId(r.id);

    setName(r.name || "");
    setDate(r.date || "");
    setCategory(r.category || "");
    setDetail(r.detail || "");
    setAmount(r.amount || "");
    setImage(r.image || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // 削除
  const deleteRecord = async (id) => {
    if (!window.confirm("削除しますか？")) return;

    await deleteDoc(doc(db, "tatekae", id));

    fetchRecords();
  };

  // フィルター
  const filteredRecords = records.filter((r) => {
    const monthMatch = selectedMonth
      ? r.date?.slice(0, 7) === selectedMonth
      : true;

    const userMatch = isAdmin
      ? true
      : r.user === user?.email;

    return monthMatch && userMatch;
  });

  // Excel出力
  const exportExcel = () => {
    const data = filteredRecords.map((r) => ({
      名前: r.name,
      日付: r.date,
      勘定科目: r.category,
      詳細: r.detail,
      金額: r.amount,
      担当者: r.user,
      画像あり: r.image ? "あり" : "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "立替金");

    XLSX.writeFile(
      wb,
      `立替金_${selectedMonth || "全期間"}.xlsx`
    );
  };

  // ログイン前
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

  // メイン画面
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
          <option value="">勘定科目選択</option>
          <option value="交通費">交通費</option>
          <option value="消耗品費">消耗品費</option>
          <option value="通信費">通信費</option>
          <option value="その他">その他</option>
        </select>

        <input
          style={styles.input}
          placeholder="詳細"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="金額"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          style={styles.input}
          type="file"
          accept="image/*"
          onChange={handleImage}
        />

        {image && (
          <img
            src={image}
            alt=""
            style={{
              width: "100%",
              marginBottom: "10px",
              borderRadius: "10px",
            }}
          />
        )}

        <button style={styles.button} onClick={saveRecord}>
          {editingId ? "更新" : "保存"}
        </button>

        <hr />

        <input
          style={styles.input}
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />

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
          <p>金額：{r.amount}</p>
          <p>担当者：{r.user}</p>

          {r.image && (
            <img
              src={r.image}
              alt=""
              style={{
                width: "100%",
                borderRadius: "10px",
                marginTop: "10px",
              }}
            />
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              style={styles.edit}
              onClick={() => editRecord(r)}
            >
              編集
            </button>

            <button
              style={styles.delete}
              onClick={() => deleteRecord(r.id)}
            >
              削除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

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

  edit: {
    flex: 1,
    padding: 10,
    background: "#f59e0b",
    color: "white",
    border: "none",
    borderRadius: 8,
  },

  delete: {
    flex: 1,
    padding: 10,
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: 8,
  },
};