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

const PSLE_DATE = "2026-09-24";

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
  const [createdFamilyCode, setCreatedFamilyCode] = useState("");

  const [familyName, setFamilyName] = useState("");
  const [familyPassword, setFamilyPassword] = useState("");
  const [joinFamilyId, setJoinFamilyId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [password, setPassword] = useState("");

  const [children, setChildren] = useState([]);
  const [newChildName, setNewChildName] = useState("");

  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState({});
  const [psleDates, setPsleDates] = useState([]);

  const [newTask, setNewTask] = useState("");
  const [newSubject, setNewSubject] = useState("Homework");
  const [newDueDate, setNewDueDate] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [photoRequired, setPhotoRequired] = useState(false);

  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamDate, setNewExamDate] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [restReason, setRestReason] = useState("");

  const [activeModal, setActiveModal] = useState(null);

  const selectedChild = children.find((child) => child.id === selectedChildId);

  const daysLeft = Math.ceil(
    (new Date(PSLE_DATE) - new Date()) / (1000 * 60 * 60 * 24)
  );

  useEffect(() => {
    if (!familyId) return;

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

    return () => unsubChildren();
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

    const pslePath = collection(
      db,
      "families",
      familyId,
      "children",
      selectedChildId,
      "psleDates"
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

    const unsubPsleDates = onSnapshot(pslePath, (snapshot) => {
      const dates = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      setPsleDates(dates);
    });

    return () => {
      unsubTasks();
      unsubLogs();
      unsubPsleDates();
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
      alert("Enter family name and password.");
      return;
    }

    const code = makeFamilyCode();

    await setDoc(doc(db, "families", code), {
      familyName,
      password: familyPassword,
      createdAt: new Date().toISOString(),
    });

    // ONLY show popup first
    setCreatedFamilyCode(code);
  }

  async function joinFamily() {
    if (!joinFamilyId.trim() || !joinPassword.trim()) {
      alert("Enter family code and password.");
      return;
    }

    const code = joinFamilyId.trim().toUpperCase();
    const familyRef = doc(db, "families", code);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) {
      alert("Family not found.");
      return;
    }

    if (familySnap.data().password !== joinPassword) {
      alert("Wrong password.");
      return;
    }

    setFamilyId(code);
    localStorage.setItem("familyId", code);
    alert("Joined family!");
  }

  async function addChild() {
    if (!newChildName.trim()) return;

    const childRef = await addDoc(
      collection(db, "families", familyId, "children"),
      {
        name: newChildName,
        createdAt: new Date().toISOString(),
      }
    );

    setSelectedChildId(childRef.id);
    localStorage.setItem("selectedChildId", childRef.id);
    setNewChildName("");
  }

  async function enterAsOrganizer() {
    const familyRef = doc(db, "families", familyId);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) {
      alert("Family not found.");
      return;
    }

    if (familySnap.data().password === password) {
      setRole("organizer");
      setPassword("");
    } else {
      alert("Wrong password.");
    }
  }

  function enterAsChild() {
    if (!selectedChildId) {
      alert("Choose a child profile first.");
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
  }

  async function addTask() {
    if (!newTask.trim() || !selectedChildId) return;

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
        name: newTask,
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
  }

  async function handleImageUpload(event, task) {
    const file = event.target.files[0];
    if (!file) return;

    const todayKey = getTodayKey();
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
        }
      );
    };

    reader.readAsDataURL(file);
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

    alert("Day submitted!");
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
    alert("Marked as rest day!");
  }

  async function addPsleDate() {
    if (!newExamTitle.trim() || !newExamDate) return;

    await addDoc(
      collection(
        db,
        "families",
        familyId,
        "children",
        selectedChildId,
        "psleDates"
      ),
      {
        title: newExamTitle,
        date: newExamDate,
      }
    );

    setNewExamTitle("");
    setNewExamDate("");
  }

  async function deletePsleDate(dateId) {
    await deleteDoc(
      doc(
        db,
        "families",
        familyId,
        "children",
        selectedChildId,
        "psleDates",
        dateId
      )
    );
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
        exams: psleDates.filter((item) => item.date === dateKey),
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

  if (!familyId) {
    return (
      <div className="app">
        <h1>PSLE Progress Tracker</h1>

        <div className="card">
          <h2>Create New Family</h2>

          <input
            className="text-input"
            type="text"
            placeholder="Family name (e.g. Tan Family)"
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
        </div>

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
        </div>

        {createdFamilyCode && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <h2>Family Created!</h2>

              <p>This is your family code:</p>

              <h1>{createdFamilyCode}</h1>

              <p className="task-detail">
                Save this code. Other devices need it to join your family.
              </p>

              <button
                onClick={() => {
                  setFamilyId(createdFamilyCode);
                  localStorage.setItem("familyId", createdFamilyCode);
                  setCreatedFamilyCode("");
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!role) {
    return (
      <div className="app">
        <h1>PSLE Progress Tracker</h1>

        <div className="card countdown">
          <h2>Family Code: {familyId}</h2>
          <p>Save this code to connect another device.</p>
        </div>

        <div className="card">
          <h2>Select Child</h2>

          {children.length === 0 && <p>No child profiles yet.</p>}

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

          <button onClick={enterAsChild}>Enter as Child</button>
        </div>

        <div className="card">
          <h2>Parent Login</h2>

          <input
            className="text-input"
            type="password"
            placeholder="Parent password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button onClick={enterAsOrganizer}>Enter as Parent</button>
        </div>

        <button className="logout-button" onClick={leaveFamily}>
          Leave Family
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>{selectedChild?.name || "Child"} Dashboard</h1>

      <p className="role-text">
        Logged in as: <strong>{role === "organizer" ? "parent" : "child"}</strong>
      </p>

      <button className="logout-button" onClick={logout}>
        Switch Profile
      </button>

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
            <button onClick={() => setActiveModal("psleDates")}>PSLE Dates</button>
          </div>
        </div>
      )}

      <div className="card countdown">
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
          {calendarDays.map((item) => (
            <div
              className={`day ${item.log?.status || ""}`}
              key={item.dateKey}
              onClick={() => setSelectedDate(item.dateKey)}
            >
              <span>{item.day}</span>

              {item.exams.map((exam) => (
                <small className="exam-badge" key={exam.id}>
                  {exam.title}
                </small>
              ))}
            </div>
          ))}
        </div>

        <p className="legend">
          🟢 Good &nbsp; 🟡 Partial &nbsp; 🔴 Missed &nbsp; 🔵 Rest
        </p>
      </div>

      <div className="card streak">
        <h2>🔥 Streak</h2>
        <p>Current: {currentStreak} days</p>
        <p>Best: {bestStreak} days</p>
      </div>

      <div className="card">
        <h2>Today’s Check-In</h2>

        {tasks.map((task) => (
          <div className="task-row" key={task.id}>
            <div className="task-card">
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

            {activeModal === "psleDates" && (
              <>
                <h2>PSLE Calendar Dates</h2>

                <input
                  className="text-input"
                  type="text"
                  placeholder="Example: English Paper"
                  value={newExamTitle}
                  onChange={(event) => setNewExamTitle(event.target.value)}
                />

                <input
                  className="text-input"
                  type="date"
                  value={newExamDate}
                  onChange={(event) => setNewExamDate(event.target.value)}
                />

                <button onClick={addPsleDate}>Add PSLE Date</button>

                {psleDates.map((item) => (
                  <div className="exam-row" key={item.id}>
                    <span>
                      {item.date} — {item.title}
                    </span>

                    <button
                      className="delete-button"
                      onClick={() => deletePsleDate(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {createdFamilyCode && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>Family Created!</h2>

            <p>This is your family code:</p>

            <h1>{createdFamilyCode}</h1>

            <p className="task-detail">
              Save this code. Other devices need it to join your family.
            </p>

            <button
              onClick={() => {
                setFamilyId(createdFamilyCode);
                localStorage.setItem("familyId", createdFamilyCode);
                setCreatedFamilyCode("");
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;