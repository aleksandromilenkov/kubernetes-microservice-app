import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import TaskList from './components/TaskList';
import NewTask from './components/NewTask';

const TASKS_URL = "/tasks";

function App() {
  const [tasks, setTasks] = useState([]);

  const fetchTasks = useCallback(function () {
    console.log('Fetching tasks from:', `${TASKS_URL}/tasks`);
    fetch(`${TASKS_URL}/tasks`, {
    headers: { 'Authorization': 'Bearer abc' }
  })
      .then(function (response) {
        return response.json();
      })
      .then(function (jsonData) {
        setTasks(jsonData.tasks);
      });
  }, []);

  useEffect(
    function () {
      fetchTasks();
    },
    [fetchTasks]
  );

  function addTaskHandler(task) {
    console.log('Adding task to:', `${TASKS_URL}/tasks`);
    fetch(`${TASKS_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer abc',
      },
      body: JSON.stringify(task),
    })
      .then(function (response) {
        console.log(response);
        return response.json();
      })
      .then(function (resData) {
        console.log(resData);
      });
  }

  return (
    <div className='App'>
      <section>
        <NewTask onAddTask={addTaskHandler} />
      </section>
      <section>
        <button onClick={fetchTasks}>Fetch Tasks</button>
        <TaskList tasks={tasks} />
      </section>
    </div>
  );
}

export default App;
