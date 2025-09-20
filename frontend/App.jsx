//import { useState } from 'react'
//import reactLogo from './assets/react.svg'
//import viteLogo from '/vite.svg'
//import './App.css'
import React, { useEffect, useState } from "react";

const API_BASE = "/api/v1";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  // Load tasks on page load
  useEffect(() => {
    loadTasks();
  }, []);

  // Fetch tasks from backend
  async function loadTasks() {
    const res = await fetch(`${API_BASE}/tasks/`);
    const data = await res.json();
    setTasks(data);
  }

  // Add new task
  async function handleAddTask(e) {
    e.preventDefault();
    if (!newTask.trim()) return;

    await fetch(`${API_BASE}/tasks/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTask }),
    });

    setNewTask(""); // clear input
    loadTasks();    // refresh
  }

  // Toggle complete
  async function toggleComplete(taskId, completed) {
    await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    loadTasks();
  }

  // Delete task
  async function deleteTask(taskId) {
    await fetch(`${API_BASE}/tasks/${taskId}`, { method: "DELETE" });
    loadTasks();
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Team To-Do List</h1>

      {/* Task Form */}
      <form onSubmit={handleAddTask} style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Enter a task"
        />
        <button type="submit">Add</button>
      </form>

      {/* Task List */}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={task.completed}
              onChange={(e) => toggleComplete(task.id, e.target.checked)}
            />

            {/* Text */}
            <span
              style={{
                textDecoration: task.completed ? "line-through" : "none",
                color: task.completed ? "gray" : "black",
              }}
            >
              {task.title}
            </span>

            {/* Delete button */}
            <button onClick={() => deleteTask(task.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
