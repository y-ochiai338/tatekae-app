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

  const [images, setImages] = useState([]);

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

    data.sort((a, b) => (a.number || 0) - (b.number || 0));

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

  // 画像圧縮アップロード
  const handleImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");

        const MAX_WIDTH = 800;

        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);

        const compressedImage = canvas.toDataURL(
          "image/jpeg",
          0.5
        );

        setImages((prev) => [
          ...prev,
          compressedImage,
        ]);
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  };

  // 保存・更新
  const saveRecord = async () => {
    try {
      if (editingId) {
        const target = records.find((r) => r.id === editingId);

        await updateDoc(doc(db, "tatekae", editingId), {
          ...target,
          name,
          date,
          category,
          detail,
          amount,
          images,
        });

        setEditingId(null);

        alert("更新しました");
      } else {
        const maxNumber =
          records.length > 0
            ? Math.max(
                ...records.map((r) => r.number || 0)
              )
            : 0;

        const nextNumber = maxNumber + 1;

        await addDoc(collection(db, "tatekae"), {
          number: nextNumber,
          name,
          date,
          category,
          detail,
          amount,
          images,
          user: user.email,
        });

        alert("保存しました");
      }

      setName("");
      setDate("");
      setCategory("");
      setDetail("");
      setAmount("");
      setImages([]);

      fetchRecords();
    } catch (e) {
      console.log(e);
      alert("保存エラー");
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
    setImages(r.images || []);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // 削除
  const deleteRecord = async (id) => {
    try {
      const ok = window.confirm("削除しますか？");

      if (!ok) return;

      await deleteDoc(doc(db, "tatekae", id));

      await fetchRecords();

      alert("削除しました");
    } catch (e) {
      console.log(e);
      alert("削除エラー");
    }
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

  // データExcel
  const exportExcel = () => {
    const data = filteredRecords.map((r) => ({
      投資番号: r.number
        ? String(r.number).padStart(4, "0")
        : "未設定",
      名前: r.name,
      日付: r.date,
      勘定科目: r.category,
      詳細: r.detail,
      金額: r.amount,
      担当者: r.user,
      画像枚数: r.images?.length || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "データ");

    XLSX.writeFile(
      wb,
      `立替金データ_${selectedMonth || "全期間"}.xlsx`
    );
  };

  // HTML画像台帳
  const exportImageLedger = () => {
    let html = `
      <html>
      <head>
        <title>画像台帳</title>

        <style>
          body {
            font-family: sans-serif;
            padding: 20px;
            background: #f5f5f5;
          }

          h1 {
            margin-bottom: 30px;
          }

          .card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }

          .image-block {
            margin-top: 20px;
          }

          img {
            width: 300px;
            border-radius: 10px;
            border: 1px solid #ccc;
            margin-top: 10px;
          }

          .number {
            font-size: 20px;
            font-weight: bold;
            color: #2563eb;
          }
        </style>
      </head>

      <body>
        <h1>立替金 画像台帳</h1>
    `;

    filteredRecords.forEach((r) => {
      html += `
        <div class="card">

          <p class="number">
            投資番号：
            ${
              r.number
                ? String(r.number).padStart(4, "0")
                : "未設定"
            }
          </p>

          <p><strong>名前：</strong>${r.name || ""}</p>
          <p><strong>日付：</strong>${r.date || ""}</p>
          <p><strong>勘定科目：</strong>${r.category || ""}</p>
          <p><strong>詳細：</strong>${r.detail || ""}</p>
          <p><strong>金額：</strong>${r.amount || ""}</p>
      `;

      if (r.images && r.images.length > 0) {
        r.images.forEach((img, index) => {
          html += `
            <div class="image-block">

              <p>
                <strong>画像番号：</strong>
                ${
                  r.number
                    ? String(r.number).padStart(4, "0")
                    : "未設定"
                }_${index + 1}
              </p>

              <img src="${img}" />

            </div>
          `;
        });
      }

      html += `
        </div>
      `;
    });

    html += `
        </body>
      </html>
    `;

    const newWindow = window.open();

    newWindow.document.write(html);

    newWindow.document.close();
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

        <p>画像枚数：{images.length}</p>

        {images.map((img, index) => (
          <img
            key={index}
            src={img}
            alt=""
            style={{
              width: "100%",
              marginBottom: "10px",
              borderRadius: "10px",
            }}
          />
        ))}

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
          データExcel出力
        </button>

        <button
          style={styles.imageExcel}
          onClick={exportImageLedger}
        >
          画像台帳出力
        </button>
      </div>

      {filteredRecords.map((r) => (
        <div key={r.id} style={styles.record}>
          <p>
            投資番号：
            {r.number
              ? String(r.number).padStart(4, "0")
              : "未設定"}
          </p>

          <p>名前：{r.name}</p>
          <p>日付：{r.date}</p>
          <p>勘定科目：{r.category}</p>
          <p>詳細：{r.detail}</p>
          <p>金額：{r.amount}</p>

          {r.images &&
            r.images.map((img, index) => (
              <div key={index}>
                <p>
                  画像番号：
                  {r.number
                    ? String(r.number).padStart(4, "0")
                    : "未設定"}
                  _{index + 1}
                </p>

                <img
                  src={img}
                  alt=""
                  style={{
                    width: "100%",
                    borderRadius: "10px",
                    marginTop: "10px",
                  }}
                />
              </div>
            ))}

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
    marginBottom: 10,
  },

  imageExcel: {
    width: "100%",
    padding: 12,
    background: "#9333ea",
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