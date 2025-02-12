// App.js
import React, { useState } from "react";

function App() {
  const [view, setView] = useState("home");

  // Student registration fields
  const [stuUsername, setStuUsername] = useState("");
  const [stuEmail, setStuEmail] = useState("");
  const [stuPass, setStuPass] = useState("");
  const [stuFirst, setStuFirst] = useState("");
  const [stuLast, setStuLast] = useState("");

  // Instructor registration fields
  const [instEmail, setInstEmail] = useState("");
  const [instPass, setInstPass] = useState("");
  const [instFirst, setInstFirst] = useState("");
  const [instLast, setInstLast] = useState("");
  const [instBio, setInstBio] = useState("");

  // We'll keep track of the current userId (for a student)
  // If we want to handle instructor, we might store instructorId separately
  const [userId, setUserId] = useState(null);

  // For listing events
  const [events, setEvents] = useState([]);

  //////////////////////////////////////////////////
  // 1) Register as Student
  //////////////////////////////////////////////////
  const handleStudentRegister = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/register-student",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: stuUsername,
            email: stuEmail,
            password: stuPass,
            firstName: stuFirst,
            lastName: stuLast,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setUserId(data.userId);
        alert("Student registered successfully. userId = " + data.userId);
        // go to events
        setView("studentEvents");
      } else {
        alert(data.error || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error registering student");
    }
  };

  //////////////////////////////////////////////////
  // 2) Register as Instructor
  //////////////////////////////////////////////////
  const handleInstructorRegister = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/register-instructor",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instructorEmail: instEmail,
            instructorPassword: instPass,
            firstName: instFirst,
            lastName: instLast,
            biography: instBio,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        alert("Instructor registered. instructorId = " + data.instructorId);
        // If you want to do something else, do it here
        setView("home");
      } else {
        alert(data.error || "Instructor registration failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error registering instructor");
    }
  };

  //////////////////////////////////////////////////
  // 3) Load Events
  //////////////////////////////////////////////////
  const loadEvents = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/events");
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      } else {
        alert("Failed to load events");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching events");
    }
  };

  //////////////////////////////////////////////////
  // 4) Register for an event
  //////////////////////////////////////////////////
  const handleRegisterEvent = async (eventId) => {
    if (!userId) {
      alert(
        "You are not recognized as a student. Please register as a student first."
      );
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/api/register-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, eventId }),
      });
      const data = await response.json();
      if (data.success) {
        alert("Registered for event successfully");
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error registering for event");
    }
  };

  //////////////////////////////////////////////////
  // Render pages
  //////////////////////////////////////////////////
  if (view === "home") {
    return (
      <div style={{ padding: 20 }}>
        <h2>BlissCore - Home</h2>
        <button onClick={() => setView("registerStudent")}>
          Register as Student
        </button>
        <button onClick={() => setView("registerInstructor")}>
          Register as Instructor
        </button>
      </div>
    );
  }

  // Student registration page
  if (view === "registerStudent") {
    return (
      <div style={{ padding: 20 }}>
        <h3>Register as Student</h3>
        <input
          placeholder="Username"
          value={stuUsername}
          onChange={(e) => setStuUsername(e.target.value)}
        />
        <br />
        <input
          placeholder="Email"
          value={stuEmail}
          onChange={(e) => setStuEmail(e.target.value)}
        />
        <br />
        <input
          placeholder="Password"
          type="password"
          value={stuPass}
          onChange={(e) => setStuPass(e.target.value)}
        />
        <br />
        <input
          placeholder="First Name"
          value={stuFirst}
          onChange={(e) => setStuFirst(e.target.value)}
        />
        <br />
        <input
          placeholder="Last Name"
          value={stuLast}
          onChange={(e) => setStuLast(e.target.value)}
        />
        <br />
        <button onClick={handleStudentRegister}>Register</button>
        <button onClick={() => setView("home")}>Back</button>
      </div>
    );
  }

  // Instructor registration page
  if (view === "registerInstructor") {
    return (
      <div style={{ padding: 20 }}>
        <h3>Register as Instructor</h3>
        <input
          placeholder="Email"
          value={instEmail}
          onChange={(e) => setInstEmail(e.target.value)}
        />
        <br />
        <input
          placeholder="Password"
          type="password"
          value={instPass}
          onChange={(e) => setInstPass(e.target.value)}
        />
        <br />
        <input
          placeholder="First Name"
          value={instFirst}
          onChange={(e) => setInstFirst(e.target.value)}
        />
        <br />
        <input
          placeholder="Last Name"
          value={instLast}
          onChange={(e) => setInstLast(e.target.value)}
        />
        <br />
        <textarea
          placeholder="Biography"
          value={instBio}
          onChange={(e) => setInstBio(e.target.value)}
        />
        <br />
        <button onClick={handleInstructorRegister}>Register</button>
        <button onClick={() => setView("home")}>Back</button>
      </div>
    );
  }

  // After student registers, let's show them the events
  if (view === "studentEvents") {
    return (
      <div style={{ padding: 20 }}>
        <h3>Welcome Student (ID: {userId})</h3>
        <button onClick={loadEvents}>Load Upcoming Events</button>
        {events.length > 0 && (
          <div>
            <h4>Upcoming Events:</h4>
            <ul>
              {events.map((ev) => (
                <li key={ev.event_id}>
                  <strong>{ev.event_name}</strong> - {ev.description} <br />
                  Date: {ev.date}, Time: {ev.time}, Loc: {ev.location}
                  <br />
                  <button onClick={() => handleRegisterEvent(ev.event_id)}>
                    Register for this Event
                  </button>
                  <hr />
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => {
            setUserId(null);
            setEvents([]);
            setView("home");
          }}
        >
          Log Out
        </button>
      </div>
    );
  }

  return <div>Unknown View</div>;
}

export default App;
