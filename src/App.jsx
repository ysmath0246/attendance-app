import React, { useEffect, useState, useMemo } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  updateDoc,
  arrayUnion,
  increment,
} from "firebase/firestore";
import "./index.css";
import PointShopTab from "./PointShopTab";


function AttendanceApp() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [todayMakeups, setTodayMakeups] = useState([]); // 🔥 보강 표시용
  const [selectedTab, setSelectedTab] = useState("attendance");
  const [animated, setAnimated] = useState({});
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(
    localStorage.getItem("authenticated") === "true"
  );
  const [now, setNow] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0); // 🔥 추가: 페이지 번호
// ✅ 1. 상단 useState 추가
const [luckyWinner, setLuckyWinner] = useState(null);
const [luckyVisible, setLuckyVisible] = useState(false);
const [highStudents, setHighStudents] = useState([]);
const [highAttendance, setHighAttendance] = useState({});


  const totalToday = Object.keys(attendance).length;
  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,  // ✅ 이 줄 추가
  });

  const studentsPerPage = 10;
  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));
  const totalPages = Math.ceil(sortedStudents.length / studentsPerPage);
  const paginatedStudents = sortedStudents.slice(
    currentPage * studentsPerPage,
    currentPage * studentsPerPage + studentsPerPage
  );
  
// ✅ 포인트 항목 리스트 선언
const pointFields = ["출석", "숙제", "수업태도", "시험", "문제집완료"];


  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const todayWeekday = weekdays[today.getDay()];

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "students"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
      // ✅ 기존 points: 숫자 → 항목별 객체로 마이그레이션
      const batch = writeBatch(db);
      list.forEach((s) => {
        if (typeof s.points === "number") {
          const converted = {
            출석: s.points,
            숙제: 0,
            수업태도: 0,
            시험: 0,
            문제집완료: 0,
          };
          batch.set(doc(db, "students", s.id), { points: converted }, { merge: true });
          s.points = converted;
        } else {
          pointFields.forEach((key) => {
            if (!s.points || s.points[key] === undefined) {
              if (!s.points) s.points = {};
              s.points[key] = 0;
            }
          });
        }
      });
      await batch.commit();
      setStudents(list);
    
      // ✅ 출석 정보도 함께 불러오기
      const attRef = doc(db, "attendance", todayStr);
      const attSnap = await getDoc(attRef);
      if (attSnap.exists()) {
        setAttendance(attSnap.data());
      }
      const makeupSnap = await getDocs(collection(db, "makeups"));
      const allMakeups = makeupSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const todayMakeups = allMakeups.filter(m => m.date === todayStr);
      setTodayMakeups(todayMakeups);
    };
    

fetchData(); // ✅ 함수 실행
}, []);
const [scheduleChanges, setScheduleChanges] = useState([]);



useEffect(() => {
  const fetchChanges = async () => {
    const snap = await getDocs(collection(db, 'schedule_changes'));
    const changes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setScheduleChanges(changes);
  };
  fetchChanges();
}, []);

useEffect(() => {
  const fetchHigh = async () => {
    const snap = await getDocs(collection(db, 'students_high'));
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setHighStudents(list);
  };
  fetchHigh();
}, []);


useEffect(() => {
  const fetchHighAttendance = async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const snap = await getDoc(doc(db, "high-attendance", todayStr));
    if (snap.exists()) {
      setHighAttendance(snap.data());
    }
  };
  fetchHighAttendance();
}, []);



const getScheduleForDate = (studentId, dateStr) => {
  const changes = scheduleChanges.filter(c => c.studentId === studentId);
  const applicable = changes.filter(c => c.effectiveDate <= dateStr);
  if (applicable.length === 0) {
    const student = students.find(s => s.id === studentId);
    return student?.schedules || [];
  }
  applicable.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  return applicable[0].schedules;
};

  const getTimeGroups = () => {
  const g = {};
  const dateStr = today.toISOString().split("T")[0];

  students.forEach((s) => {
    if (s.active === false || (s.pauseDate && s.pauseDate <= dateStr)) return;
    const schedules = getScheduleForDate(s.id, dateStr);
    schedules.forEach(({ day, time }) => {
      if (day === todayWeekday) {
        if (!g[time]) g[time] = [];
        g[time].push(s);
      }
    });
  });

  return g;
};

const groupedByTime = useMemo(() => getTimeGroups(), [students, scheduleChanges]);
// 🔁 Lucky 당첨자 Firebase에서 불러오기
useEffect(() => {
  const loadLuckyWinner = async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const luckyRef = doc(db, "dailyLucky", todayStr);
    const luckySnap = await getDoc(luckyRef);
    if (luckySnap.exists()) {
      const data = luckySnap.data();
      setLuckyWinner(data.name);
    }
  };
  loadLuckyWinner();
}, []);







const handleCardClick = async (student, scheduleTime) => {
  const todayStr = new Date().toISOString().split("T")[0]; // ✅ 이 줄이 빠졌음!!
      const record = attendance[student.name];
      // onTime 또는 tardy 상태만 차단하고, '미정'은 허용
     if (record && (record.status === "onTime" || record.status === "tardy")) {
       alert("이미 출석 처리된 학생입니다.");
        return;
      }
    const input = prompt(`${student.name} 생일 뒷 4자리를 입력하세요 (예: 1225)`);
    if (input !== student.birth?.slice(-4)) {
      alert("생일이 일치하지 않습니다.");
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const [hh, mm] = scheduleTime.split(":");
const sched = new Date();
sched.setHours(+hh, +mm, 0);
const now = new Date();
const diffMin = (now - sched) / 60000;

let point = 0;
let status = "onTime";
let luckyToday = false;
const EXCLUDE_NAMES = ["김은우", "조예린"];

if (diffMin > 15) {
  status = "tardy";
  point = 0;
 } else if (diffMin >= -10 && diffMin <= 5) {
    // 1) 제외 대상이 아니면 후보자에 추가
    if (!EXCLUDE_NAMES.includes(student.name)) {
      const luckyRef = doc(db, "dailyLucky", todayStr);
      try {
        await updateDoc(luckyRef, {
          candidates: arrayUnion(student.name)
        });
      } catch {
        await setDoc(luckyRef, { candidates: [student.name] });
      }
    }

    // 2) 체크인 윈도우가 끝난 뒤(수업시간+5분) 랜덤 추첨
    const nowMs = Date.now();
    const windowEnd = sched.getTime() + 5 * 60000;
     const snapAfter = await getDoc(luckyRef);
        const data = snapAfter.data() || {};
+        // 수업시간+5분 후에 후보자가 2명 이상일 때만 추첨 실행
        const candidatesList = (data.candidates || []).filter(n => !EXCLUDE_NAMES.includes(n));
        if (!data.name && nowMs > windowEnd && candidatesList.length > 1) {
          const winner = candidatesList[Math.floor(Math.random() * candidatesList.length)];
          await updateDoc(luckyRef, { name: winner, time: timeStr });
          data.name = winner;
        }
    // 3) 포인트 부여 (추첨된 사람이면 2pt, 아니면 1pt)
    if (data.name === student.name) {
      point = 2;
      luckyToday = true;
    } else {
      point = 1;
    }
  } else if (diffMin >= -15 && diffMin < -10) {
    point = 1;
  }


 // ✅ 1) 출석 기록 저장
    await setDoc(doc(db, "attendance", todayStr), {
      [student.name]: { time: timeStr, status }
    }, { merge: true });
    setAttendance(prev => ({ ...prev, [student.name]: { time: timeStr, status } }));

    // ✅ 2) 총포인트, 가용포인트 계산
    const updated = {
      ...student.points,
      출석: (student.points.출석 || 0) + point
    };
    const prevAvailable = student.availablePoints ?? Object.values(student.points).reduce((a,b)=>a+b, 0);
    const updatedAvailable = prevAvailable + point;

    // ✅ 3) Firestore 에도 가용포인트 함께 저장
    await setDoc(
      doc(db, "students", student.id),
      { points: updated, availablePoints: updatedAvailable },
      { merge: true }
    );

    // ✅ 4) 로컬 상태에도 반영
    setStudents(prev =>
      prev.map(s =>
        s.id === student.id
          ? { ...s, points: updated, availablePoints: updatedAvailable }
          : s
      )
    );
// ✅ 애니메이션 설정
setAnimated(prev => ({ ...prev, [student.name]: true }));
setTimeout(() => setAnimated(prev => ({ ...prev, [student.name]: false })), 1500);

// ✅ Lucky 표시
if (luckyToday) {
  setLuckyWinner(student.name);
  setLuckyVisible(true);
  setTimeout(() => setLuckyVisible(false), 2500);
  alert(`🎉 Lucky!!! ${student.name}님 2pt 당첨!`);
} else {
  alert(`✅ ${student.name}님 출석 완료! (+${point}pt)`);
}




//setStudents((prev) =>
 // prev.map((s) => (s.id === student.id ? { ...s, points: updated } : s))
//);

  //  setAnimated((prev) => ({ ...prev, [student.name]: true }));
   // setTimeout(() => setAnimated((prev) => ({ ...prev, [student.name]: false })), 1500);
 //   alert(`✅ ${student.name}님 출석 완료! (+1pt)`);
//};

  
  const handleLogin = () => {
    if (password === "1234") {
      setAuthenticated(true);
      localStorage.setItem("authenticated", "true");
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    localStorage.removeItem("authenticated");
  };


  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-6 rounded shadow-md">
          <input
            type="password"
            placeholder="출석 체크 비밀번호"
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


    
  const handleOverrideTardy = async (studentName) => {
    const record = attendance[studentName];
    const pw = prompt("지각 상태입니다. 선생님 비밀번호를 입력하세요");
    if (pw === "0301") {
      const newStatus = { time: record.time, status: "onTime" };
      await setDoc(
        doc(db, "attendance", todayStr),
        { [studentName]: newStatus },
        { merge: true }
      );
      setAttendance(prev => ({ ...prev, [studentName]: newStatus }));
      alert(`${studentName}님의 출석 상태가 초록으로 변경되었습니다!`);
    }
  };


  const totalPoints = (p) => pointFields.reduce((sum, key) => sum + (p[key] || 0), 0);


// 동점자 처리: 상위 5개 점수별로 names 배열을 반환
const getTopRankings = (field) => {
  const list = students.map((s) => ({
    name: s.name,
    value: s.points?.[field] || 0
  }));
  // 점수 기준 내림차순, 중복 제거 후 상위 5개 점수만 추출
  const topValues = [...new Set(list.map((i) => i.value))]
    .sort((a, b) => b - a)
    .slice(0, 5);
  // 각 점수별 동점자 목록 생성
  return topValues.map((value) => ({
    value,
    names: list
     .filter((i) => i.value === value)
      .map((i) => i.name)
  }));
};




  const handleHighCardClick = async (student) => {
  const input = prompt(`${student.name} 생일 뒷 4자리를 입력하세요 (예: 1225)`);
  if (input !== student.birth?.slice(-4)) {
    alert("생일이 일치하지 않습니다.");
    return;
  }

  const now = new Date();
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const todayStr = now.toISOString().split("T")[0];

  
  await setDoc(doc(db, "high-attendance", todayStr), {
    [student.name]: { time, status: "출석" }
  }, { merge: true });

  setHighAttendance(prev => ({
    ...prev,
    [student.name]: { time, status: "출석" }
  }));

  alert(`✅ ${student.name}님 고등부 출석 완료!`);
};
  




  return (
      <>
    {luckyVisible && (
  <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-white text-2xl font-bold px-6 py-3 rounded shadow-lg z-50 animate-bounce">
    🎉 Lucky!!! {luckyWinner}님 2pt!
  </div>
)}
{/* ✅ 4. 출석 카드 상단 공지 텍스트 추가 */}
<div className="flex items-center gap-2 justify-center text-sm text-blue-700 bg-blue-100 px-4 py-2 rounded mb-4">
  <span>📣</span>
  <div>
    <div>생일 4자리 입력시 출석완료!</div>
    <div> 랜덤 Lucky 2pt는 10분전~5분후까지만! 지각시 0pt</div>
  </div>
</div>

    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-5xl mx-auto flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${
            selectedTab === "attendance"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-700"
          }`}
          onClick={() => setSelectedTab("attendance")}
        >
          출석 체크
        </button>
       

        <button onClick={() => setSelectedTab("ranking")}
    className={`px-4 py-2 rounded ${selectedTab === "ranking" ? "bg-blue-500 text-white" : "bg-white text-gray-700"}`}>
    포인트 랭킹
  </button>

<button
  className={`px-4 py-2 rounded ${
    selectedTab === "shop"
      ? "bg-blue-500 text-white"
      : "bg-white text-gray-700"
  }`}
  onClick={() => setSelectedTab("shop")}
>
  포인트상점
</button>


      </div>

      {selectedTab === "attendance" && (
        <>
          <div className="max-w-5xl mx-auto flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gray-700">
                📌 출석 체크 - {todayWeekday}요일
              </h1>
              <div className="text-gray-600">
                📅 {todayStr} / ⏰ {timeStr} / ✅ 출석 인원: {totalToday}
              </div>
              <div className="text-center text-lg text-yellow-600 font-bold mb-4">
  🎉 오늘의 Lucky 당첨자: {luckyWinner ? `${luckyWinner}님` : '아직 없음'}
</div>

            </div>
            <button
              onClick={handleLogout}
              className="bg-red-400 text-white px-4 py-2 rounded"
            >
              로그아웃
            </button>
          </div>

          {Object.keys(groupedByTime)
            .sort()
            .map((time) => (
              <div
                key={time}
                className="max-w-5xl mx-auto mb-6 bg-white p-4 rounded-lg shadow-md"
              >
                <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">
                  {time} 수업
                </h2>
                <div className="grid grid-cols-6 gap-4">
                {groupedByTime[time].map((student) => {
  const record    = attendance[student.name];
  const isPresent = record && (record.status === 'onTime' || record.status === 'tardy');  const animate   = animated[student.name];

  return (
    <div
      key={student.id}
      className={`
        card
        ${isPresent
          ? record.status === "tardy"
            ? "tardy"
            : "attended"
          : ""
        }
        ${animate ? "animated" : ""}
        ${isPresent
          ? "cursor-not-allowed opacity-80"
          : "cursor-pointer hover:shadow-lg"
        }
      `}
      onClick={() => {
        if (!isPresent) {
          handleCardClick(student, time);
        } else if (record.status === "tardy") {
          handleOverrideTardy(student.name);
        }
      }}
    >
      {/* ─── 카드 내부 콘텐츠 ─── */}
      {/* 👑 Lucky 당첨자 왕관 */}
{student.name === luckyWinner && (
    <div className="text-3xl text-yellow-500 text-center mb-1">👑</div>
)}
      
{/* 💡 전체 + 가용 포인트 */}
<div className="text-right text-xs font-semibold text-gray-700 leading-none mb-1">
  총 {totalPoints(student.points)}pt<br />
  <span className="text-green-600">가용 {student.availablePoints ?? totalPoints(student.points)}pt</span>
</div>



      {/* 2) 학생 이름 */}
      <p className="name m-0 leading-none mb-1">{student.name}</p>

      {/* 3) 이미 출석했으면 상태·시간 표시 */}
      {isPresent && (
        <p className="time-text m-0 leading-none mt-1">
          {record.status === "tardy" ? "⚠️ 지각" : "✅ 출석"}<br />
          {record.time}
        </p>
      )}
      {/* ─── 카드 내부 콘텐츠 끝 ─── */}
    </div>
  );
})}




                 
                </div>
              </div>
            ))}


           <div className="max-w-5xl mx-auto mt-8">
  <h2 className="text-xl font-bold mb-4">🎓 고등부 출석</h2>
  <div className="grid grid-cols-6 gap-4">
  {highStudents.map(student => {
    const record = highAttendance[student.name];
    const isPresent = record?.status === "출석";

    return (
      <div
        key={student.id}
        className={`card ${isPresent ? "attended" : ""} cursor-pointer hover:shadow-lg`}
        onClick={() => handleHighCardClick(student)}
      >
        <p className="name m-0 leading-none mb-1">{student.name}</p>
        {isPresent && (
          <p className="time-text m-0 leading-none mt-1">
            ✅ 출석<br />{record.time}
          </p>
        )}
      </div>
    );
  })}
</div>


</div>

        </>
      )}



{selectedTab === "ranking" && (
  <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-xl font-semibold mb-4">🏆 포인트 랭킹 (실시간)</h2>

   {/* 항목별 TOP 5 카드 (동점자 옆으로 나열) */}
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
    {pointFields.map((field) => {
      const rankings = getTopRankings(field);
      return (
        <div key={field} className="bg-gray-50 p-4 border rounded shadow">
          <h4 className="font-bold text-center mb-2">{field} TOP 5</h4>
          <div className="space-y-2 text-sm">
            {rankings.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-center items-center"
              >
                <span className="font-semibold mr-1">{idx + 1}등</span>
                {item.names.map((name) => (
                  <span key={name} className="mx-1">{name}</span>
                ))}
                <span className="ml-1">({item.value}pt)</span>
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>

    {/* 총합 TOP 5 */}
    <h3 className="text-lg font-bold mt-8 mb-2">💯 총합 TOP 5</h3>
    <div className="space-y-2 text-sm">
    {(() => {
      const totalList = students.map((s) => ({
        name: s.name,
        value: totalPoints(s.points)
      }));
      const totalValues = [...new Set(totalList.map((i) => i.value))]
        .sort((a, b) => b - a)
        .slice(0, 5);
      const totalRankings = totalValues.map((value) => ({
        value,
        names: totalList
          .filter((i) => i.value === value)
          .map((i) => i.name)
      }));
      return totalRankings.map((item, idx) => (
        <div
          key={idx}
          className="flex justify-center items-center"
        >
          <span className="font-semibold mr-1">{idx + 1}등</span>
          {item.names.map((name) => (
            <span key={name} className="mx-1">{name}</span>
          ))}
          <span className="ml-1">({item.value}pt)</span>
        </div>
      ));
    })()}
  </div>
  </div>
)}


{selectedTab === "shop" && <PointShopTab />}

        </div>
        </>
      )}
    

export default AttendanceApp;