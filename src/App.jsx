// src/App.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import "./index.css";

function AttendanceApp() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [animated, setAnimated] = useState({});
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [now, setNow] = useState(new Date());

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const todayWeekday = weekdays[today.getDay()];

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "students"));
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(list);
    };

    fetchData();

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCardClick = async (student) => {
    const input = prompt(`${student.name} 생일 뒷 4자리를 입력하세요 (예: 0412)`);
    if (input === student.birth?.slice(-4)) {
      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setAttendance((prev) => ({ ...prev, [student.name]: timeStr }));

      const docRef = doc(db, "attendance", todayStr);
      await setDoc(docRef, { [student.name]: timeStr }, { merge: true });

      setAnimated((prev) => ({ ...prev, [student.name]: true }));
      setTimeout(() => {
        setAnimated((prev) => ({ ...prev, [student.name]: false }));
      }, 1500);

      alert(`${student.name}님 출석 완료!`);
    } else {
      alert("생일이 일치하지 않습니다.");
    }
  };

  const getTimeGroups = () => {
    const grouped = {};
    students.forEach((student) => {
      (student.schedules || []).forEach((schedule) => {
        if (schedule.day === todayWeekday) {
          if (!grouped[schedule.time]) grouped[schedule.time] = [];
          grouped[schedule.time].push(student);
        }
      });
    });
    return grouped;
  };

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-6 rounded shadow-md">
          <input
            type="password"
            placeholder="비밀번호 입력"
            className="border p-2 mr-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={() => {
              if (password === "1234") setAuthenticated(true);
              else alert("비밀번호 오류");
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  const groupedByTime = getTimeGroups();
  const totalToday = Object.keys(attendance).length;
  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* 상단 타이틀 영역 */}
      <div className="mb-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800">
          출석 체크 - {todayWeekday}요일
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          📅 {todayStr} 🕒 {timeStr} / ✅ 출석 인원: <strong>{totalToday}</strong>
        </p>
      </div>

      {Object.keys(groupedByTime)
        .sort((a, b) => a.localeCompare(b))
        .map((time) => (
          <div
            key={time}
            className="bg-white p-4 mb-8 rounded-md shadow-md max-w-5xl mx-auto"
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b border-gray-200 pb-2">
              {time} 수업
            </h2>
            {/* 그리드 레이아웃: 기본 3열, md 이상에서는 6열로 */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {groupedByTime[time].map((student) => {
                const isPresent = attendance[student.name];
                const animate = animated[student.name];

                const timeText = attendance[student.name];
                const isLate = (() => {
                  if (!timeText) return false;
                  const [h, m] = timeText.split(":").map(Number);
                  const [sh, sm] = time.split(":").map(Number);
                  const total = h * 60 + m;
                  const start = sh * 60 + sm;
                  return total > start + 15;
                })();

                return (
                  <div
                    key={student.id}
                    className={`
                      cursor-pointer 
                      rounded-md border border-gray-200 p-4 
                      shadow-sm hover:shadow-md transition-shadow
                      ${isPresent ? "bg-green-50" : "bg-white"}
                      ${animate ? "animate-pulse" : ""}
                    `}
                    onClick={() => handleCardClick(student)}
                  >
                    <p className="font-bold text-gray-800">{student.name}</p>
                    {isPresent && (
                      <>
                        <p className="text-sm text-gray-600">
                          {attendance[student.name]}
                        </p>
                        <p className="text-sm text-green-700 font-semibold">
                          ✅ {isLate ? "지각" : "출석"}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}

export default AttendanceApp;
