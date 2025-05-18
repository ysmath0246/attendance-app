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


  const handleDeleteLog = async (log) => {
    const pw = prompt("관리자 비밀번호를 입력하세요");
    if (pw !== "ys0246") return alert("비밀번호가 틀립니다.");
    const student = students.find((s) => s.id === log.studentId);
    if (!student) return;
    await deleteDoc(doc(db, "point_logs", log.id));
    await setDoc(
      doc(db, "students", student.id),
      {
        availablePoints:
          (student.availablePoints || 0) + log.point,
      },
      { merge: true }
    );
  };

  return (
    <div className="flex">
      <div className="w-2/3 relative">
        <p className="text-sm mb-1 text-blue-700">
          📣 생일 4자리 + 엄마번호 4자리로 인증 후 사용
        </p>
        <p className="text-sm mb-2 text-gray-600">
          🎲 랜덤 Lucky 2pt는 수업 10분 전 ~ 5분 후까지! 지각 시 0pt
        </p>

        {verifiedStudent && (
          <div className="text-green-600 font-bold mb-3">
            ✅ {verifiedStudent.name}님 {selectedItem?.point}pt 사용 완료!
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="text-center relative">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-32 object-cover rounded shadow"
              />
              <div className="text-sm font-semibold mt-1">{item.name}</div>
              <div className="text-xs text-gray-500 mb-2">
                {item.point}pt
              </div>
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

   {modalOpen && selectedItem && (
  <>
   {/* 어두운 배경 */}
<div
  className="fixed inset-0 z-40"
  style={{
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(2px)"
  }}
></div>

{/* 팝업 박스 */}
<div
  className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 text-center"
  style={{
    backgroundColor: "white",        // ✅ 완전 불투명
    width: "480px",                  // ✅ 더 큰 사이즈
    padding: "2rem",
    borderRadius: "1rem",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
    border: "2px solid #ccc"
  }}
>
  {/* 상품명 */}
  <h2
    className="text-xl font-bold text-blue-700 mb-4"
    style={{
      backgroundColor: "white",       // ✅ 텍스트 배경도 확실히
      padding: "0.5rem 1rem",
      borderRadius: "0.5rem"
    }}
  >
    ✅ {selectedItem.name} - {selectedItem.point}pt 사용
  </h2>

  {/* 인증 입력 */}
  <input
    type="text"
    value={authCode}
    onChange={(e) => setAuthCode(e.target.value)}
    placeholder="생일4 + 엄마번호4"
    maxLength={8}
    className="w-full p-2 border rounded mb-4 text-center"
    style={{
      backgroundColor: "#fff"
    }}
  />

  {/* 버튼 영역 */}
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


    </div>
  );
}
