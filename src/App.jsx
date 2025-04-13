import React, { useEffect, useState } from "react"
import { db } from "./firebase"
import { collection, getDocs } from "firebase/firestore"
import "./index.css"

function AttendanceApp() {
  const [students, setStudents] = useState([])
  const [password, setPassword] = useState("")
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "students"))
      setStudents(querySnapshot.docs.map(doc => doc.data()))
    }
    fetchData()
  }, [])

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-6 rounded shadow-md">
          <input
            type="password"
            placeholder="비밀번호 입력"
            className="border p-2 mr-2"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button onClick={() => {
            if (password === "1234") setAuthenticated(true)
            else alert("비밀번호 오류")
          }} className="bg-blue-500 text-white px-4 py-2 rounded">
            로그인
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">출석 리스트</h1>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {students.map((student, index) => (
          <li key={index} className="border p-4 rounded shadow text-center bg-white hover:bg-green-100">
            <p className="font-semibold">{student.name}</p>
            <p className="text-sm text-gray-500">{student.birth}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AttendanceApp