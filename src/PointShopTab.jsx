import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export default function PointShopTab() {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [deleteTargetLog, setDeleteTargetLog] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // 🔁 Firebase 실시간 데이터 수신
  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, "point_shop"), (snap) =>
      setItems(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    );
    const unsubLogs = onSnapshot(collection(db, "point_logs"), (snap) =>
      setLogs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    );
    const unsubStudents = onSnapshot(collection(db, "students"), (snap) =>
      setStudents(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    );
    return () => {
      unsubItems();
      unsubLogs();
      unsubStudents();
    };
  }, []);

  // ✅ 포인트 사용 확인 처리
  const handleConfirmUse = async () => {
    const student = students.find((s) => {
      const birth = (s.birth || "").slice(-4);
      const phone = (s.parentPhone || "").slice(-4);
      return birth + phone === authCode;
    });

    if (!student) {
      alert("학생 인증 실패! 생일 4자리 + 엄마번호 뒤 4자리를 확인해주세요.");
      return;
    }

    if ((student.availablePoints || 0) < selectedItem.point) {
      return alert("포인트가 부족합니다");
    }

    if (
      !window.confirm(
        `현재 가용 포인트는 ${student.availablePoints}pt입니다. ${selectedItem.point}pt를 사용하시겠습니까?`
      )
    )
      return;

    const log = {
      studentId: student.id,
      name: student.name,
      item: selectedItem.name,
      point: selectedItem.point,
      date: new Date().toISOString().split("T")[0],
    };

    await addDoc(collection(db, "point_logs"), log);
    await setDoc(
      doc(db, "students", student.id),
      {
        availablePoints: (student.availablePoints || 0) - selectedItem.point,
      },
      { merge: true }
    );

    setModalOpen(false);
    setVerifiedStudent(student);
    setTimeout(() => setVerifiedStudent(null), 5000);
  };

  // 🗑 삭제 모달 열기
  const handleDeleteLog = (log) => {
    setDeleteTargetLog(log);
    setDeletePassword("");
    setDeleteModalOpen(true);
  };

  // 🗑 삭제 확인
  const confirmDeleteLog = async () => {
    if (deletePassword !== "ys0246") {
      alert("비밀번호가 틀렸습니다.");
      return;
    }
    const student = students.find((s) => s.id === deleteTargetLog.studentId);
    if (!student) return;
    await deleteDoc(doc(db, "point_logs", deleteTargetLog.id));
    await setDoc(
      doc(db, "students", student.id),
      {
        availablePoints: (student.availablePoints || 0) + deleteTargetLog.point,
      },
      { merge: true }
    );
    setDeleteModalOpen(false);
  };

  return (
    <div className="flex">
      {/* ✅ 왼쪽: 상품 목록 */}
      <div className="w-2/3 relative">
        <p className="text-sm mb-1 text-blue-700">
          📣 생일 4자리 + 엄마번호 4자리로 인증 후 사용
        </p>
        

        {verifiedStudent && (
          <div className="text-green-600 font-bold mb-3">
            ✅ {verifiedStudent.name}님 {selectedItem?.point}pt 사용 완료!
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {[...items]
            .sort((a, b) => a.point - b.point)
            .map((item) => (
              <div
                key={item.id}
                className="text-center relative border rounded p-4 shadow bg-white"
              >
                <div className="text-sm font-semibold mb-1">{item.name}</div>
                <div className="text-xs text-gray-500 mb-2">{item.point}pt</div>
                <button
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded shadow"
                  onClick={() => {
                    setSelectedItem(item);
                    setModalOpen(true);
                  }}
                >
                  사용
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* ✅ 오른쪽: 사용 내역 */}
      <div className="w-1/3 pl-4 border-l">
        <h3 className="text-lg font-bold mb-2">🧾 사용 내역</h3>
        {logs.map((log) => (
          <div
            key={log.id}
            className="text-sm border-b py-1 flex justify-between items-center"
          >
            <div>
              {log.name} - {log.item} - {log.point}pt
              <div className="text-xs text-gray-500">{log.date}</div>
            </div>
            <button
              className="text-red-500 text-xs"
              onClick={() => handleDeleteLog(log)}
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      {/* ✅ 상품 사용 인증 모달 */}
      {modalOpen && selectedItem && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(2px)",
            }}
          ></div>
          <div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-center"
            style={{
              backgroundColor: "white",
              width: "480px",
              padding: "2rem",
              borderRadius: "1rem",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
              border: "2px solid #ccc",
            }}
          >
            <h2 className="text-xl font-bold text-blue-700 mb-4">
              ✅ {selectedItem.name} - {selectedItem.point}pt 사용
            </h2>
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="생일4 + 엄마번호4"
              maxLength={8}
              className="w-full p-2 border rounded mb-4 text-center"
              style={{
                backgroundColor: "#fff",
              }}
            />
            <div className="flex justify-between gap-4">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSelectedItem(null);
                  setAuthCode("");
                }}
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded w-1/2"
              >
                취소
              </button>
              <button
                onClick={handleConfirmUse}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-1/2"
              >
                사용하기
              </button>
            </div>
          </div>
        </>
      )}

      {/* ✅ 삭제 비밀번호 모달 */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-80 text-center">
            <h3 className="text-lg font-semibold mb-4">🧾 사용 내역 삭제</h3>
            <input
              type="password"
              placeholder="관리자 비밀번호"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full border p-2 rounded mb-4"
            />
            <div className="flex justify-between gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="bg-gray-300 px-4 py-2 rounded w-1/2"
              >
                취소
              </button>
              <button
                onClick={confirmDeleteLog}
                className="bg-red-600 text-white px-4 py-2 rounded w-1/2"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
