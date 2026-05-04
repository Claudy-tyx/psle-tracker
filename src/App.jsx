import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import "./App.css";
import imageCompression from "browser-image-compression";

const PSLE_DATE = "2026-09-24";

const PSLE_EXAMS = [
  { title: "English Paper 1", date: "2026-09-24" },
  { title: "English Paper 2", date: "2026-09-24" },
  { title: "Math Paper 1", date: "2026-09-25" },
  { title: "Math Paper 2", date: "2026-09-25" },
  { title: "Science", date: "2026-09-29" },
  { title: "Mother Tongue Paper 1", date: "2026-10-01" },
  { title: "Mother Tongue Paper 2", date: "2026-10-01" },
  { title: "Listening Comprehension", date: "2026-09-16" },
  { title: "Oral", date: "2026-08-13" },
];

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function makeFamilyCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function App() {
  const [familyId, setFamilyId] = useState(
    () => localStorage.getItem("familyId") || ""
  );
  const [selectedChildId, setSelectedChildId] = useState(
    () => localStorage.getItem("selectedChildId") || ""
  );
  const [role, setRole] = useState(() => localStorage.getItem("role") || "");

  const [setupMode, setSetupMode] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyPassword, setFamilyPassword] = useState("");
  const [joinFamilyId, setJoinFamilyId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [password, setPassword] = useState("");

  const [children, setChildren] = useState([]);
  const [newChildName, setNewChildName] = useState("");

  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState({});

  const [newTask, setNewTask] = useState("");
  const [newSubject, setNewSubject] = useState("Homework");
  const [newDueDate, setNewDueDate] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [photoRequired, setPhotoRequired] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [restReason, setRestReason] = useState("");

  const [activeModal, setActiveModal] = useState(null);
  const [notice, setNotice] = useState(null);

  const selectedChild = children.find((child) => child.id === selectedChildId);

  const daysLeft = Math.ceil(
    (new Date(PSLE_DATE) - new Date()) / (1000 * 60 * 60 * 24)
  );

  function showNotice(title, message, onClose) {
    setNotice({ title, message, onClose });
  }

  function closeNotice() {
    const callback = notice?.onClose;
    setNotice(null);

    if (callback) {
      callback();
    }
  }

  async function generateUniqueFamilyCode() {
    let code = makeFamilyCode();
    let exists = await getDoc(doc(db, "families", code));

    while (exists.exists()) {
      code = makeFamilyCode();
      exists = await getDoc(doc(db, "families", code));
    }

    return code;
  }

  useEffect(() => {
    if (!familyId) return;

    const unsubFamily = onSnapshot(doc(db, "families", familyId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setFamilyName(data.familyName || "");
      }
    });

    const unsubChildren = onSnapshot(
      collection(db, "families", familyId, "children"),
      (snapshot) => {
        const loadedChildren = snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));

        setChildren(loadedChildren);

        const savedChildId = localStorage.getItem("selectedChildId");

        if (!savedChildId && loadedChildren.length > 0) {
          setSelectedChildId(loadedChildren[0].id);
          localStorage.setItem("selectedChildId", loadedChildren[0].id);
        }
      }
    );

    return () => {
      unsubFamily();
      unsubChildren();
    };
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !selectedChildId) return;

    const taskPath = collection(
      db,
      "families",
      familyId,
      "children",
      selectedChildId,
      "tasks"
    );

    const logsPath = collection(
      db,
      "families",
      familyId,
      "children",
      selectedChildId,
      "dailyLogs"
    );

    const unsubTasks = onSnapshot(taskPath, (snapshot) => {
      const loadedTasks = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      setTasks(loadedTasks);
    });

    const unsubLogs = onSnapshot(logsPath, (snapshot) => {
      const logs = {};

      snapshot.docs.forEach((docItem) => {
        logs[docItem.id] = docItem.data();
      });

      setHistory(logs);
    });

    return () => {
      unsubTasks();
      unsubLogs();
    };
  }, [familyId, selectedChildId]);

  useEffect(() => {
    if (familyId) localStorage.setItem("familyId", familyId);
  }, [familyId]);

  useEffect(() => {
    if (selectedChildId) {
      localStorage.setItem("selectedChildId", selectedChildId);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (role) localStorage.setItem("role", role);
  }, [role]);

  async function createFamily() {
    if (!familyName.trim() || !familyPassword.trim()) {
      showNotice("Missing Details", "Please enter a family name and password.");
      return;
    }

    const code = await generateUniqueFamilyCode();

    await setDoc(doc(db, "families", code), {
      familyName: familyName.trim(),
      password: familyPassword,
      createdAt: new Date().toISOString(),
    });

    showNotice(
      "Family Created!",
      `Your family code is ${code}. Save this code because other devices need it to join your family.`,
      () => {
        setFamilyId(code);
        localStorage.setItem("familyId", code);
      }
    );
  }

  async function joinFamily() {
    if (!joinFamilyId.trim() || !joinPassword.trim()) {
      showNotice("Missing Details", "Please enter the family code and password.");
      return;
    }

    const code = joinFamilyId.trim().toUpperCase();
    const familyRef = doc(db, "families", code);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) {
      showNotice("Family Not Found", "Check that the family code is correct.");
      return;
    }

    if (familySnap.data().password !== joinPassword) {
      showNotice("Wrong Password", "The parent password is incorrect.");
      return;
    }

    setFamilyId(code);
    localStorage.setItem("familyId", code);
    showNotice("Joined Family", "This device is now connected to the family.");
  }

  async function addChild() {
    if (!newChildName.trim()) {
      showNotice("Missing Name", "Please enter the child name.");
      return;
    }

    const childRef = await addDoc(
      collection(db, "families", familyId, "children"),
      {
        name: newChildName.trim(),
        createdAt: new Date().toISOString(),
      }
    );

    setSelectedChildId(childRef.id);
    localStorage.setItem("selectedChildId", childRef.id);
    setNewChildName("");
    setActiveModal(null);

    showNotice("Child Added", "The child profile has been created.");
  }

  async function enterAsParent() {
    const familyRef = doc(db, "families", familyId);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) {
      showNotice("Family Not Found", "Please rejoin or recreate the family.");
      return;
    }

    if (familySnap.data().password === password) {
      setRole("organizer");
      setPassword("");
    } else {
      showNotice("Wrong Password", "The parent password is incorrect.");
    }
  }

  function enterAsChild() {
    if (!selectedChildId) {
      showNotice("No Child Selected", "Please choose a child profile first.");
      return;
    }

    setRole("child");
  }

  function logout() {
    localStorage.removeItem("role");
    setRole("");
  }

  function leaveFamily() {
    localStorage.removeItem("familyId");
    localStorage.removeItem("selectedChildId");
    localStorage.removeItem("role");

    setFamilyId("");
    setSelectedChildId("");
    setRole("");
    setChildren([]);
    setTasks([]);
    setHistory({});
    setSetupMode("");
  }

  async function addTask() {
    if (!newTask.trim() || !selectedChildId) {
      showNotice("Missing Task", "Please enter a task name.");
      return;
    }

    await addDoc(
      collection(
        db,
        "families",
        familyId,
        "children",
        selectedChildId,
        "tasks"
      ),
      {
        name: newTask.trim(),
        subject: newSubject,
        dueDate: newDueDate,
        instructions: newInstructions,
        done: false,
        photoRequired,
        approved: "pending",
        image: null,
        imageDate: null,
        createdAt: new Date().toISOString(),
      }
    );

    setNewTask("");
    setNewSubject("Homework");
    setNewDueDate("");
    setNewInstructions("");
    setPhotoRequired(false);
    setActiveModal(null);

    showNotice("Task Added", "The work has been assigned.");
  }

  async function toggleTask(task) {
    await updateDoc(
      doc(
        db,
        "families",
        familyId,
        "children",
        selectedChildId,
        "tasks",
        task.id
      ),
      {
        done: !task.done,
      }
    );
  }

  async function deleteTask(taskId) {
    await deleteDoc(
      doc(
        db,
        "families",
        familyId,
        "children",
        selectedChildId,
        "tasks",
        taskId
      )
    );
  }

  async function updateApproval(taskId, status) {
    await updateDoc(
      doc(
        db,
        "families",
        familyId,
        "children",
        selectedChildId,
        "tasks",
        taskId
      ),
      {
        approved: status,
      }
    );

    showNotice(
      status === "approved" ? "Approved" : "Rejected",
      status === "approved"
        ? "The submitted work has been approved."
        : "The submitted work has been rejected."
    );
  }

  async function handleImageUpload(event, task) {
    const file = event.target.files[0];
    if (!file) return;

    const todayKey = getTodayKey();

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });

      const reader = new FileReader();

      reader.onloadend = async () => {
        await updateDoc(
          doc(
            db,
            "families",
            familyId,
            "children",
            selectedChildId,
            "tasks",
            task.id
          ),
          {
            image: reader.result,
            imageDate: todayKey,
            approved: "pending",
          }
        );
      };

      reader.readAsDataURL(compressedFile);
    } catch (error) {
      showNotice("Upload Failed", "Photo compression failed. Try another image.");
    }
  }

  async function submitDay() {
    const todayKey = getTodayKey();
    const completedTasks = tasks.filter((task) => task.done);
    const completed = completedTasks.length;

    let status = "red";

    if (completed === tasks.length && tasks.length > 0) {
      status = "green";
    } else if (completed > 0) {
      status = "yellow";
    }

    await setDoc(
      doc(
        db,
        "families",
        familyId,
        "children",
        selectedChildId,
        "dailyLogs",
        todayKey
      ),
      {
        date: todayKey,
        status,
        submittedAt: new Date().toISOString(),
        completedTasks: completedTasks.map((task) => ({
          id: task.id,
          name: task.name,
          subject: task.subject || "",
          dueDate: task.dueDate || "",
          instructions: task.instructions || "",
          approved: task.approved || "pending",
          hadPhoto: Boolean(task.image),
        })),
        allTasks: tasks.map((task) => ({
          id: task.id,
          name: task.name,
          subject: task.subject || "",
          done: Boolean(task.done),
          approved: task.approved || "pending",
          hadPhoto: Boolean(task.image),
        })),
      }
    );

    showNotice("Day Submitted", "Today's progress has been saved.");
  }

  async function markRestDay() {
    const todayKey = getTodayKey();

    await setDoc(
      doc(
        db,
        "families",
        familyId,
        "children",
        selectedChildId,
        "dailyLogs",
        todayKey
      ),
      {
        date: todayKey,
        status: "rest",
        reason: restReason,
        submittedAt: new Date().toISOString(),
        completedTasks: [],
        allTasks: tasks.map((task) => ({
          id: task.id,
          name: task.name,
          subject: task.subject || "",
          done: Boolean(task.done),
          approved: task.approved || "pending",
          hadPhoto: Boolean(task.image),
        })),
      }
    );

    setRestReason("");
    setActiveModal(null);
    showNotice("Rest Day Saved", "Today has been marked as a rest day.");
  }

  function changeMonth(amount) {
    const updated = new Date(selectedMonth);
    updated.setMonth(updated.getMonth() + amount);
    setSelectedMonth(updated);
  }

  function getCalendarDays() {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const days = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;

      return {
        day,
        dateKey,
        log: history[dateKey],
        exams: PSLE_EXAMS.filter((exam) => exam.date === dateKey),
      };
    });
  }

  function calculateStreaks() {
    const dates = Object.keys(history).sort();

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (const date of dates) {
      const status = history[date]?.status;

      if (status === "green") {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else if (status !== "rest") {
        tempStreak = 0;
      }
    }

    let currentDate = new Date();

    while (true) {
      const key = currentDate.toISOString().split("T")[0];
      const status = history[key]?.status;

      if (status === "green") {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (status === "rest") {
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { currentStreak, bestStreak };
  }

  const calendarDays = getCalendarDays();
  const completed = tasks.filter((task) => task.done).length;
  const { currentStreak, bestStreak } = calculateStreaks();

  const monthLabel = selectedMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  function NoticeModal() {
    if (!notice) return null;

    return (
      <div className="modal-backdrop">
        <div className="modal-card notice-card">
          <h2>{notice.title}</h2>
          <p>{notice.message}</p>

          {notice.message?.includes("family code") && (
            <button
              className="secondary-button"
              onClick={() => {
                const code = notice.message.match(/[A-Z0-9]{6}/)?.[0];
                if (code) navigator.clipboard.writeText(code);
              }}
            >
              Copy Code
            </button>
          )}

          <button onClick={closeNotice}>Got it</button>
        </div>
      </div>
    );
  }

  if (!familyId) {
    return (
      <div className="app">
        <h1>PSLE Progress Tracker</h1>

        {!setupMode && (
          <div className="card welcome-card">
            <h2>Welcome</h2>
            <p className="task-detail">
              Create a new family or join an existing one.
            </p>

            <div className="auth-actions">
              <button onClick={() => setSetupMode("create")}>
                Create Family
              </button>
              <button
                className="secondary-button"
                onClick={() => setSetupMode("join")}
              >
                Join Family
              </button>
            </div>
          </div>
        )}

        {setupMode === "create" && (
          <div className="card">
            <h2>Create New Family</h2>

            <input
              className="text-input"
              type="text"
              placeholder="Family name, e.g. Tan Family"
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
            />

            <input
              className="text-input"
              type="password"
              placeholder="Create parent password"
              value={familyPassword}
              onChange={(event) => setFamilyPassword(event.target.value)}
            />

            <button onClick={createFamily}>Create Family</button>
            <button
              className="ghost-button"
              onClick={() => setSetupMode("")}
            >
              Back
            </button>
          </div>
        )}

        {setupMode === "join" && (
          <div className="card">
            <h2>Join Existing Family</h2>

            <input
              className="text-input"
              type="text"
              placeholder="Family code"
              value={joinFamilyId}
              onChange={(event) => setJoinFamilyId(event.target.value)}
            />

            <input
              className="text-input"
              type="password"
              placeholder="Parent password"
              value={joinPassword}
              onChange={(event) => setJoinPassword(event.target.value)}
            />

            <button onClick={joinFamily}>Join Family</button>
            <button
              className="ghost-button"
              onClick={() => setSetupMode("")}
            >
              Back
            </button>
          </div>
        )}

        <NoticeModal />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="app">
        <h1>{familyName || "Family"}</h1>

        <div className="card countdown">
          <h2>Family Code</h2>
          <p className="family-code">{familyId}</p>
          <p className="task-detail">Use this code to connect another device.</p>
        </div>

        <div className="card">
          <h2>Select Child</h2>

          {children.length === 0 && (
            <p className="no-data">
              No child profiles yet. Enter Parent Mode to add one.
            </p>
          )}

          {children.length > 0 && (
            <select
              className="text-input"
              value={selectedChildId}
              onChange={(event) => setSelectedChildId(event.target.value)}
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          )}

          <button onClick={enterAsChild}>Child Mode</button>
        </div>

        <div className="card">
          <h2>Parent Mode</h2>

          <input
            className="text-input"
            type="password"
            placeholder="Parent password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button onClick={enterAsParent}>Enter Parent Mode</button>
        </div>

        <button className="logout-button" onClick={leaveFamily}>
          Leave Family
        </button>

        <NoticeModal />
      </div>
    );
  }

  return (
    <div className="app">
      <h1>{selectedChild?.name || "Child"}</h1>

      <p className="role-text">
        {role === "organizer" ? "Parent Mode" : "Child Mode"}
      </p>

      <button className="logout-button" onClick={logout}>
        Switch Profile
      </button>

      <div className="card countdown">
        <p className="eyebrow">Countdown</p>
        <h2>{daysLeft} days to PSLE</h2>
        <p>{selectedChild?.name || "No child selected"}</p>
      </div>

      <div className="card">
        {selectedDate && (
          <div className="day-detail">
            <div className="day-header">
              <h2>📅 {selectedDate}</h2>

              <p className="status-text">
                Status: {history[selectedDate]?.status || "No data"}
              </p>

              {history[selectedDate]?.reason && (
                <p className="reason-text">
                  Reason: {history[selectedDate].reason}
                </p>
              )}
            </div>

            {PSLE_EXAMS.filter((exam) => exam.date === selectedDate).length >
              0 && (
              <div className="task-detail-card exam-detail">
                <strong>PSLE Date</strong>
                {PSLE_EXAMS.filter((exam) => exam.date === selectedDate).map(
                  (exam) => (
                    <p key={exam.title}>📌 {exam.title}</p>
                  )
                )}
              </div>
            )}

            {history[selectedDate] ? (
              <>
                <h3 className="section-title">Completed Tasks</h3>

                {history[selectedDate].completedTasks?.length > 0 ? (
                  history[selectedDate].completedTasks.map((task, index) => (
                    <div key={index} className="task-detail-card">
                      <strong>{task.name}</strong>
                      {task.subject && <p>📚 {task.subject}</p>}
                      {task.instructions && <p>{task.instructions}</p>}
                      <p>Approved: {task.approved}</p>
                      <p>📸 {task.hadPhoto ? "Photo submitted" : "No photo"}</p>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No tasks recorded</p>
                )}
              </>
            ) : (
              <p className="no-data">No data for this day</p>
            )}

            <button className="close-btn" onClick={() => setSelectedDate(null)}>
              Close
            </button>
          </div>
        )}

        <div className="calendar-header">
          <button onClick={() => changeMonth(-1)}>←</button>
          <h2>{monthLabel}</h2>
          <button onClick={() => changeMonth(1)}>→</button>
        </div>

        <div className="calendar">
          {calendarDays.map((item) => {
            const isToday = item.dateKey === getTodayKey();
            const hasExam = item.exams.length > 0;
            const isSelected = selectedDate === item.dateKey;

            return (
              <div
                className={`day ${item.log?.status || ""} ${
                  isToday ? "today" : ""
                } ${hasExam ? "exam" : ""} ${isSelected ? "selected" : ""}`}
                key={item.dateKey}
                onClick={() => setSelectedDate(item.dateKey)}
              >
                <span>{item.day}</span>

                {item.exams.map((exam) => (
                  <small className="exam-badge" key={exam.title}>
                    {exam.title}
                  </small>
                ))}
              </div>
            );
          })}
        </div>

        <p className="legend">
          🟢 Good &nbsp; 🟡 Partial &nbsp; 🔴 Missed &nbsp; 🔵 Rest
        </p>
      </div>

      <div className="card streak">
        <p className="eyebrow">Consistency</p>
        <h2>🔥 {currentStreak} day streak</h2>
        <p>Best: {bestStreak} days</p>
      </div>

      {role === "organizer" && (
        <div className="card parent-tools">
          <h2>Parent Tools</h2>

          <p className="task-detail">Family Code: {familyId}</p>

          <select
            className="text-input"
            value={selectedChildId}
            onChange={(event) => setSelectedChildId(event.target.value)}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>

          <div className="tool-grid">
            <button onClick={() => setActiveModal("addChild")}>Add Child</button>
            <button onClick={() => setActiveModal("addWork")}>Add Work</button>
            <button onClick={() => setActiveModal("restDay")}>Rest Day</button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Today’s Check-In</h2>

        {tasks.length === 0 && (
          <p className="no-data">No tasks assigned yet.</p>
        )}

        {tasks.map((task) => (
          <div className="task-row" key={task.id}>
            <div className={`task-card ${task.done ? "task-done" : ""}`}>
              <input
                className="task-checkbox"
                type="checkbox"
                checked={Boolean(task.done)}
                onChange={() => toggleTask(task)}
              />

              <div className="task-content">
                <strong className="task-title">{task.name}</strong>

                {task.subject && (
                  <p className="task-detail">📚 {task.subject}</p>
                )}

                {task.dueDate && (
                  <p className="task-detail">📅 {task.dueDate}</p>
                )}

                {task.instructions && (
                  <p className="task-detail">{task.instructions}</p>
                )}

                <p className="task-detail">
                  📸 {task.photoRequired ? "Required" : "Not required"}
                </p>

                {role === "child" && task.photoRequired && (
                  <input
                    className="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleImageUpload(event, task)}
                  />
                )}

                {task.image && task.imageDate === getTodayKey() && (
                  <img src={task.image} alt="proof" className="proof-image" />
                )}

                {task.approved && (
                  <p className={`approval ${task.approved}`}>
                    Status: {task.approved}
                  </p>
                )}

                {role === "organizer" &&
                  task.image &&
                  task.imageDate === getTodayKey() && (
                    <div className="approval-buttons">
                      <button onClick={() => updateApproval(task.id, "approved")}>
                        Approve
                      </button>

                      <button
                        className="reject-button"
                        onClick={() => updateApproval(task.id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
              </div>

              {role === "organizer" && (
                <button
                  className="delete-button"
                  onClick={() => deleteTask(task.id)}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="progress-section">
          <p>
            Completed: {completed}/{tasks.length}
          </p>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width:
                  tasks.length > 0
                    ? `${(completed / tasks.length) * 100}%`
                    : "0%",
              }}
            ></div>
          </div>
        </div>

        {role === "child" && (
          <button onClick={submitDay}>Submit Today</button>
        )}
      </div>

      {activeModal && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveModal(null)}>
              ✕
            </button>

            {activeModal === "addChild" && (
              <>
                <h2>Add Child</h2>

                <input
                  className="text-input"
                  type="text"
                  placeholder="Child name"
                  value={newChildName}
                  onChange={(event) => setNewChildName(event.target.value)}
                />

                <button onClick={addChild}>Add Child</button>
              </>
            )}

            {activeModal === "addWork" && (
              <>
                <h2>Add Work</h2>

                <input
                  className="text-input"
                  type="text"
                  placeholder="Task name, e.g. Math problem sums"
                  value={newTask}
                  onChange={(event) => setNewTask(event.target.value)}
                />

                <select
                  className="text-input"
                  value={newSubject}
                  onChange={(event) => setNewSubject(event.target.value)}
                >
                  <option>Homework</option>
                  <option>English</option>
                  <option>Math</option>
                  <option>Science</option>
                  <option>Chinese</option>
                  <option>Reading</option>
                </select>

                <input
                  className="text-input"
                  type="date"
                  value={newDueDate}
                  onChange={(event) => setNewDueDate(event.target.value)}
                />

                <textarea
                  className="text-input"
                  placeholder="Instructions, e.g. Complete questions 1 to 5"
                  value={newInstructions}
                  onChange={(event) => setNewInstructions(event.target.value)}
                />

                <label className="photo-toggle">
                  <input
                    type="checkbox"
                    checked={photoRequired}
                    onChange={(event) => setPhotoRequired(event.target.checked)}
                  />
                  Photo proof required?
                </label>

                <button onClick={addTask}>Add Task</button>
              </>
            )}

            {activeModal === "restDay" && (
              <>
                <h2>Rest Day</h2>

                <input
                  className="text-input"
                  type="text"
                  placeholder="Reason, e.g. Sick / Family event / School activity"
                  value={restReason}
                  onChange={(event) => setRestReason(event.target.value)}
                />

                <button onClick={markRestDay}>Mark Today as Rest Day</button>
              </>
            )}
          </div>
        </div>
      )}

      <NoticeModal />
    </div>
  );
}

export default App;