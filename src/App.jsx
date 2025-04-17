import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, doc, getDocs, getDoc, setDoc } from "firebase/firestore";
import "./index.css";

function AttendanceApp() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [animated, setAnimated] = useState({});
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(
    localStorage.getItem("authenticated") === "true"
  );
  const [now, setNow] = useState(new Date());

  // 오늘 날짜 문자열 및 요일
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const todayWeekday = weekdays[today.getDay()];

  useEffect(() => {
    const fetchData = async () => {
      // 1) 학생 목록 불러오기
      const querySnapshot = await getDocs(collection(db, "students"));
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(list);

      // 2) 오늘자 출석 기록 불러오기
      const attendanceRef = doc(db, "attendance", todayStr);
      const attendanceSnap = await getDoc(attendanceRef);
      if (attendanceSnap.exists()) {
        setAttendance(attendanceSnap.data());
      }
    };

    fetchData();

    // 현재 시간 업데이트
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []); // todayStr는 컴포넌트 초기 렌더 시 고정값이므로 빈 deps

  // 카드 클릭 시 출석 처리
  const handleCardClick = async (student, scheduleTime) => {
    const input = prompt(
      `${student.name} 생일 뒷 4자리를 입력하세요 (예: 0412)`
    );
    if (input !== student.birth?.slice(-4)) {
      alert("생일이 일치하지 않습니다.");
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const [hh, mm] = scheduleTime.split(":");
    const scheduleDate = new Date();
    scheduleDate.setHours(parseInt(hh, 10));
    scheduleDate.setMinutes(parseInt(mm, 10));
    scheduleDate.setSeconds(0);

    const nowDate = new Date();
    const diffInMinutes = (nowDate - scheduleDate) / (1000 * 60);
    const status = diffInMinutes > 15 ? "tardy" : "onTime";

    // state와 Firestore에 저장
    setAttendance((prev) => ({
      ...prev,
      [student.name]: { time: timeStr, status },
    }));
    const docRef = doc(db, "attendance", todayStr);
    await setDoc(
      docRef,
      { [student.name]: { time: timeStr, status } },
      { merge: true }
    );

    // 애니메이션
    setAnimated((prev) => ({ ...prev, [student.name]: true }));
    setTimeout(() => {
      setAnimated((prev) => ({ ...prev, [student.name]: false }));
    }, 1500);

    alert(
      status === "tardy"
        ? `${student.name}님 지각 처리되었습니다.`
        : `${student.name}님 출석 완료!`
    );
  };

  // 로그인/로그아웃
  const handleLogin = () => {
    if (password === "1234") {
      setAuthenticated(true);
      localStorage.setItem("authenticated", "true");
    } else {
      alert("비밀번호 오류");
    }
  };
  const handleLogout = () => {
    setAuthenticated(false);
    localStorage.removeItem("authenticated");
  };

  // 오늘 요일에 해당하는 시간대별 학생 그룹
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
            onClick={handleLogin}
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
    <div className="bg-gray-100 min-h-screen p-6">
      {/* 헤더 */}
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-700">
            📌 출석 체크 - {todayWeekday}요일
          </h1>
          <div className="text-gray-600">
            📅 {todayStr} / ⏰ {timeStr} / ✅ 출석 인원: {totalToday}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-400 text-white px-3 py-1 rounded"
        >
          로그아웃
        </button>
      </div>

      {/* 시간대별 카드 */}
      {Object.keys(groupedByTime)
        .sort((a, b) => a.localeCompare(b))
        .map((time) => (
          <div
            key={time}
            className="max-w-5xl mx-auto mb-6 bg-white p-4 rounded-lg shadow-md"
          >
            <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">
              {time} 수업
            </h2>
            {/* 한 줄에 6개 카드 */}
            <div className="grid grid-cols-6 gap-4">
              {groupedByTime[time].map((student) => {
                const record = attendance[student.name];
                const isPresent = !!record;
                const isTardy = record?.status === "tardy";
                const animate = animated[student.name];

                return (
                  <div
                    key={student.id}
                    className={`card ${
                      isPresent ? (isTardy ? "tardy" : "attended") : ""
                    } ${animate ? "animated" : ""}`}
                    onClick={() => handleCardClick(student, time)}
                  >
                    <p className="name">{student.name}</p>
                    {isPresent && (
                      <p className="time-text">
                        ✅출석
                        <br />
                        {record.time}
                      </p>
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
