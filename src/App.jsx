import { useState, useEffect } from "react";
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
  // -----------------------------
  // user
  // -----------------------------
  const [user, setUser] = useState(null);

  // -----------------------------
  // login
  // -----------------------------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // -----------------------------
  // form
  // -----------------------------
  const [name, setName] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [category, setCategory] = useState("施設使用料");
  const [amount, setAmount] = useState("");

  // -----------------------------
  // data
  // -----------------------------
  const [records, setRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [editId, setEditId] = useState(null);

  // -----------------------------
  // error
  // -----------------------------
  const [error, setError] = useState("");

  // -----------------------------
  // admin
  // -----------------------------
  const adminEmail = "y_ochiai@lifelong-sport.jp";
  const isAdmin = user?.email === adminEmail;

  // -----------------------------
  // auth keep login
  // -----------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
      }
    );

    return () => unsubscribe();
  }, []);

  // -----------------------------
  // fetch
  // -----------------------------
  const fetchRecords = async () => {
    try {
      const snap = await getDocs(
        collection(db, "expenses")
      );

      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setRecords(data);
    } catch (e) {
      console.error(e);
      setError("データ取得エラー");
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  // -----------------------------
  // login
  // -----------------------------
  const login = async () => {
    try {
      setError("");

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
    } catch (e) {
      console.error(e);
      setError("ログイン失敗");
    }
  };

  // -----------------------------
  // logout
  // -----------------------------
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  // -----------------------------
  // add
  // -----------------------------
  const addRecord = async () => {
    try {
      await addDoc(collection(db, "expenses"), {
        name,
        receiptDate,
        category,
        amount,
        user: user?.email,
      });

      setName("");
      setReceiptDate("");
      setCategory("施設使用料");
      setAmount("");

      fetchRecords();
    } catch (e) {
      console.error(e);
    }
  };

  // -----------------------------
  // delete
  // -----------------------------
  const deleteRecord = async (id) => {
    try {
      if (!window.confirm("削除しますか？"))
        return;

      await deleteDoc(doc(db, "expenses", id));

      fetchRecords();
    } catch (e) {
      console.error(e);
    }
  };

  // -----------------------------
  // edit
  // -----------------------------
  const editRecord = (r) => {
    setEditId(r.id);

    setName(r.name || "");
    setReceiptDate(r.receiptDate || "");
    setCategory(r.category || "施設使用料");
    setAmount(r.amount || "");
  };

  // -----------------------------
  // update
  // -----------------------------
  const updateRecord = async () => {
    try {
      await updateDoc(
        doc(db, "expenses", editId),
        {
          name,
          receiptDate,
          category,
          amount,
        }
      );

      setEditId(null);

      setName("");
      setReceiptDate("");
      setCategory("施設使用料");
      setAmount("");

      fetchRecords();
    } catch (e) {
      console.error(e);
    }
  };

  // -----------------------------
  // filter
  // -----------------------------
  const filteredRecords = records.filter(
    (r) => {
      const monthMatch = selectedMonth
        ? r.receiptDate?.slice(0, 7) ===
          selectedMonth
        : true;

      const userMatch = isAdmin
        ? true
        : r.user === user?.email;

      return monthMatch && userMatch;
    }
  );

  // -----------------------------
  // excel
  // -----------------------------
  const exportExcel = () => {
    if (!selectedMonth) {
      alert("月を選択してください");
      return;
    }

    const data = filteredRecords.map((r) => ({
      氏名: r.name || "",
      領収書日付: r.receiptDate || "",
      勘定科目: r.category || "",
      金額: r.amount || "",
      入力者: r.user || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "立替金"
    );

    XLSX.writeFile(
      wb,
      `立替金_${selectedMonth}.xlsx`
    );
  };

  // -----------------------------
  // login screen
  // -----------------------------
  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>
            立替金アプリ
          </h1>

          {error && (
            <p style={{ color: "red" }}>
              {error}
            </p>
          )}

          <input
            style={styles.input}
            placeholder="メール"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            style={styles.input}
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <button
            style={styles.button}
            onClick={login}
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------
  // main
  // -----------------------------
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          立替金アプリ
        </h1>

        <p>
          ログイン中：{user?.email}
        </p>

        {isAdmin && (
          <p style={styles.admin}>
            管理者モード
          </p>
        )}

        <button
          style={styles.logout}
          onClick={logout}
        >
          ログアウト
        </button>
      </div>

      <div style={styles.card}>
        <input
          style={styles.input}
          placeholder="名前"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />

        <input
          style={styles.input}
          type="date"
          value={receiptDate}
          onChange={(e) =>
            setReceiptDate(e.target.value)
          }
        />

        <select
          style={styles.input}
          value={category}
          onChange={(e) =>
            setCategory(e.target.value)
          }
        >
          <option>施設使用料</option>
          <option>消耗品費</option>
          <option>交通費</option>
          <option>その他</option>
        </select>

        <input
          style={styles.input}
          type="number"
          placeholder="金額"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
        />

        {editId ? (
          <button
            style={styles.button}
            onClick={updateRecord}
          >
            更新
          </button>
        ) : (
          <button
            style={styles.button}
            onClick={addRecord}
          >
            保存
          </button>
        )}
      </div>

      <div style={styles.card}>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) =>
            setSelectedMonth(e.target.value)
          }
        />

        <button
          style={styles.button}
          onClick={exportExcel}
        >
          Excel出力
        </button>
      </div>

      {filteredRecords.length === 0 ? (
        <div style={styles.card}>
          <p>データなし</p>
        </div>
      ) : (
        filteredRecords.map((r) => (
          <div key={r.id} style={styles.card}>
            <p>名前：{r.name}</p>
            <p>
              領収書日付：
              {r.receiptDate}
            </p>
            <p>
              勘定科目：
              {r.category}
            </p>
            <p>金額：¥{r.amount}</p>
            <p>入力者：{r.user}</p>

            <button
              style={styles.small}
              onClick={() =>
                editRecord(r)
              }
            >
              編集
            </button>

            <button
              style={styles.smallDelete}
              onClick={() =>
                deleteRecord(r.id)
              }
            >
              削除
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// -----------------------------
// styles
// -----------------------------
const styles = {
  container: {
    minHeight: "100vh",
    background:
      "linear-gradient(to bottom, #dbeafe, #f8fafc)",
    padding: 20,
    maxWidth: 700,
    margin: "0 auto",
    fontFamily: "sans-serif",
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1e3a8a",
  },

  admin: {
    color: "#dc2626",
    fontWeight: "bold",
  },

  card: {
    background: "white",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    boxShadow:
      "0 4px 10px rgba(0,0,0,0.08)",
  },

  input: {
    width: "100%",
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 16,
    boxSizing: "border-box",
  },

  button: {
    width: "100%",
    padding: 14,
    border: "none",
    borderRadius: 12,
    background: "#2563eb",
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer",
  },

  logout: {
    padding: 10,
    border: "none",
    borderRadius: 10,
    background: "#ef4444",
    color: "white",
    cursor: "pointer",
  },

  small: {
    padding: 8,
    marginRight: 10,
    border: "none",
    borderRadius: 8,
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
  },

  smallDelete: {
    padding: 8,
    border: "none",
    borderRadius: 8,
    background: "#ef4444",
    color: "white",
    cursor: "pointer",
  },
};