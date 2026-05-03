import { useEffect, useState } from "react";
import "./App.css";

const ORGANIZER_PASSWORD = "pookie";

function App() {
  const psleDate = new Date("2026-09-24");
  const today = new Date();
  const daysLeft = Math.ceil((psleDate - today) / (1000 * 60 * 60 * 24));

  const [role, setRole] = useState(() => localStorage.getItem("role") || "");
  const [password, setPassword] = useState("");

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("tasks");
    return saved
      ? JSON.parse(saved)
      : [
          { name: "School homework", done: false },
          { name: "Read story book", done: false },
          { name: "Math problem sums", done: false },
          { name: "English compo", done: false },
        ];
  });

  const [newTask, setNewTask] = useState("");
  const [newSubject, setNewSubject] = useState("Homework");
  const [newDueDate, setNewDueDate] = useState("");
  const [newInstructions, setNewInstructions] = useState("");

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("history");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (role) {
      localStorage.setItem("role", role);
    }
  }, [role]);

  function enterAsOrganizer() {
    if (password === ORGANIZER_PASSWORD) {
      setRole("organizer");
      setPassword("");
    } else {
      alert("Wrong password");
    }
  }

  function logout() {
    localStorage.removeItem("role");
    setRole("");
  }

  function toggleTask(index) {
    const updated = [...tasks];
    updated[index].done = !updated[index].done;
    setTasks(updated);
  }

 function addTask() {
  if (newTask.trim() === "") return;

  setTasks([
    ...tasks,
    {
      name: newTask,
      subject: newSubject,
      dueDate: newDueDate,
      instructions: newInstructions,
      done: false,
      image: null,
      imageDate: null,
      photoRequired: photoRequired,
      approved: "pending",
    }
  ]);

  setNewTask("");
  setNewSubject("Homework");
  setNewDueDate("");
  setNewInstructions("");
  setPhotoRequired(false);
  }
const [photoRequired, setPhotoRequired] = useState(false);

  function calculateStreaks() {
    const dates = Object.keys(history).sort();

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < dates.length; i++) {
      const status = history[dates[i]];

      if (status === "green") {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // calculate current streak (from today backwards)
    let today = new Date();

    while (true) {
      const key = today.toISOString().split("T")[0];

      if (history[key] === "green") {
        currentStreak++;
        today.setDate(today.getDate() - 1);
      } else {
        break;
      }
    }

    return { currentStreak, bestStreak };
  }

  const { currentStreak, bestStreak } = calculateStreaks();

  function updateApproval(index, status) {
    const updated = [...tasks];
    updated[index].approved = status;
    setTasks(updated);
  }

  function deleteTask(indexToDelete) {
    const updated = tasks.filter((_, index) => index !== indexToDelete);
    setTasks(updated);
  }

  function handleImageUpload(event, index) {
    const file = event.target.files[0];
    if (!file) return;

    const todayKey = new Date().toISOString().split("T")[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const updated = [...tasks];
      updated[index].image = reader.result;
      updated[index].imageDate = todayKey;
      setTasks(updated);
    };

    reader.readAsDataURL(file);
  }

  function resetToday() {
    const resetTasks = tasks.map((task) => ({
      ...task,
      done: false,
      image: null,
      imageDate: null,
      approved: "pending",
    }));

    setTasks(resetTasks);
  }

  const completed = tasks.filter((task) => task.done).length;

  function submitDay() {
    const todayKey = new Date().toISOString().split("T")[0];

    let status = "red";

    if (completed === tasks.length && tasks.length > 0) {
      status = "green";
    } else if (completed > 0) {
      status = "yellow";
    }

    setHistory({
      ...history,
      [todayKey]: status,
    });

    alert("Day submitted!");
  }

  function getDaysInMonth() {
    const year = today.getFullYear();
    const month = today.getMonth();
    const days = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;

      return {
        day,
        status: history[dateKey],
      };
    });
  }

  const calendarDays = getDaysInMonth();

  if (!role) {
    return (
      <div className="app">
        <h1>PSLE Progress Tracker</h1>

        <div className="card countdown">
          <h2>{daysLeft} days to PSLE</h2>
          <p>Choose profile to continue</p>
        </div>

        <div className="card streak">
          <h2>🔥 Streak</h2>
          <p>Current: {currentStreak} days</p>
          <p>Best: {bestStreak} days</p>
        </div>

        <div className="card">
          <h2>Child Login</h2>
          <button onClick={() => setRole("child")}>Enter as Child</button>
        </div>

        <div className="card">
          <h2>Organizer Login</h2>

          <input
            className="text-input"
            type="password"
            placeholder="Enter organizer password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button onClick={enterAsOrganizer}>Enter as Organizer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>PSLE Progress Tracker</h1>

      <p className="role-text">
        Logged in as: <strong>{role}</strong>
      </p>

      <button className="logout-button" onClick={logout}>
        Switch Profile
      </button>

      <div className="card countdown">
        <h2>{daysLeft} days to PSLE</h2>
        <p>Caius Pookie Tan</p>
      </div>

      <div className="card">
        <h2>Today’s Check-In</h2>

        {tasks.map((task, index) => (
          <div className="task-row" key={index}>
            <label className="task">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(index)}
              />
              <div>
                <strong>{task.name}</strong>

                {task.subject && <p className="task-detail">Subject: {task.subject}</p>}
                {task.dueDate && <p className="task-detail">Due: {task.dueDate}</p>}
                {task.instructions && (
                  <p className="task-detail">Instructions: {task.instructions}</p>
                )}

                {role === "child" && task.photoRequired && (
                  <input
                    className="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleImageUpload(event, index)}
                  />
                )}

                {!task.photoRequired && (
                  <p className="task-detail">Photo proof: Not required</p>
                )}

                {task.photoRequired && (
                  <p className="task-detail">Photo proof: Required</p>
                )}

                {task.image && task.imageDate === new Date().toISOString().split("T")[0] && (
                  <img src={task.image} alt="proof" className="proof-image" />
                )}
                {task.approved && (
                  <p className={`approval ${task.approved}`}>
                    Status: {task.approved}
                  </p>
                )}

                {role === "organizer" &&
                  task.image &&
                  task.imageDate === new Date().toISOString().split("T")[0] && (
                  <div className="approval-buttons">
                    <button onClick={() => updateApproval(index, "approved")}>
                      Approve
                    </button>

                    <button
                      className="reject-button"
                      onClick={() => updateApproval(index, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </label>

            {role === "organizer" && (
              <button className="delete-button" onClick={() => deleteTask(index)}>
                ✕
              </button>
            )}
          </div>
        ))}

        <p>
          Completed: {completed}/{tasks.length}
        </p>

        <button onClick={resetToday}>Reset Today</button>
        <button onClick={submitDay}>Submit Today</button>
      </div>

      {role === "organizer" && (
        <div className="card">
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
        </div>
      )}

      <div className="card">
        <h2>This Month</h2>

        <div className="calendar">
          {calendarDays.map((item) => (
            <div className={`day ${item.status || ""}`} key={item.day}>
              {item.day}
            </div>
          ))}
        </div>

        <p className="legend">🟢 Good &nbsp; 🟡 Partial &nbsp; 🔴 Missed</p>
      </div>
    </div>
  );
}

export default App;