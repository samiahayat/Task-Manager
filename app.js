let currentUser = "";
let isRegisterMode = false;

const submitBtn = document.getElementById("submitBtn");
const toggleAuth = document.getElementById("toggleAuth");
const authMessage = document.getElementById("authMessage");

toggleAuth.addEventListener("click", () => {
  isRegisterMode = !isRegisterMode;

  const loginFields = document.getElementById("loginFields");
  const registerFields = document.getElementById("registerFields");

  if (isRegisterMode) {
    loginFields.style.display = "none";
    registerFields.style.display = "block";
    submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Register';
    toggleAuth.textContent = "Already have an account? Login";
  } else {
    loginFields.style.display = "block";
    registerFields.style.display = "none";
    submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Login';
    toggleAuth.textContent = "If new, Register";
  }

  authMessage.textContent = "";
});

function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toastContainer");
  const toastMsg = document.getElementById("toastMsg");
  const toastText = document.getElementById("toastText");

  // Reset animation and background classes
  toastMsg.classList.remove("bg-success", "bg-danger", "bg-warning", "animate__fadeOut");
  toastMsg.classList.add("animate__fadeIn");

  // Set message and background color
  toastText.textContent = message;
  if (type === "success") toastMsg.classList.add("bg-success");
  else if (type === "error") toastMsg.classList.add("bg-danger");
  else if (type === "warning") toastMsg.classList.add("bg-warning");
  else toastMsg.classList.add("bg-secondary");

  // Show toast
  toastContainer.style.display = "block";

  // Auto hide after 3s
  setTimeout(() => {
    toastMsg.classList.remove("animate__fadeIn");
    toastMsg.classList.add("animate__fadeOut");

    setTimeout(() => {
      toastContainer.style.display = "none";
    }, 800);
  }, 3000);
}

submitBtn.addEventListener("click", async () => {
  if (isRegisterMode) {
    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value.trim();

    if (!username || !password) {
      authMessage.textContent = "Both fields are required!";
      return;
    }

    const res = await fetch("http://localhost:5000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.status === 201) {
      authMessage.style.color = "green";
      authMessage.textContent = "Registration successful! Now login.";
      // Switch to login mode after registration
      toggleAuth.click();
    } else {
      authMessage.style.color = "red";
      authMessage.textContent = data.message;
    }

  } else {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      authMessage.textContent = "Both fields are required!";
      return;
    }

    const res = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.status === 200) {
  currentUser = username;
  document.getElementById("authSection").style.display = "none";
  document.getElementById("taskSection").style.display = "block";
  document.getElementById("userInfo").textContent = `Logged in as: ${username}`;
  authMessage.textContent = "";
} else {
      authMessage.textContent = data.message;
    }
  }
});

document.getElementById("addTaskBtn").addEventListener("click", async () => {
  const titleInput = document.getElementById("taskTitle");
  const descInput = document.getElementById("taskDesc");
  const dateInput = document.getElementById("taskDate");

  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const due_date = dateInput.value;

  if (!title || !description || !due_date) {
    showToast("Please fill all fields!");
    return;
  }

  const res = await fetch("http://localhost:5000/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: currentUser, title, description, due_date })
  });

  const data = await res.json();
  showToast(data.message);

  // Reset input fields
  titleInput.value = "";
  descInput.value = "";
  dateInput.value = "";

  // Optionally refresh the task list
  loadTasks();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  currentUser = null;
  document.getElementById("taskSection").style.display = "none";
  document.getElementById("authSection").style.display = "block";
});

async function loadTasks() {
  const res = await fetch(`http://localhost:5000/tasks?username=${currentUser}`);
  const tasks = await res.json();

  // Show progress bar
  updateProgressBar(tasks);

  displayTasks(tasks);
}
function updateProgressBar(tasks) {
  const progressBar = document.getElementById("taskProgressBar");
  const progressInner = document.getElementById("progressBarInner");

  if (!tasks.length) {
    progressBar.style.display = "none";
    return;
  }

  const total = tasks.length;
  const completed = tasks.filter(task => task.status === "Completed").length;
  const percent = Math.round((completed / total) * 100);

  progressInner.style.width = percent + "%";
  progressInner.textContent = `${percent}% Completed`;
  progressBar.style.display = "block";
}


function renderTasks(tasks) {
    const taskList = document.getElementById("taskList");
    taskList.innerHTML = "";

    if (tasks.length === 0) {
        taskList.innerHTML = "<p class='text-center'>No tasks to display.</p>";
        return;
    }

    tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    tasks.forEach(task => {
        const taskCard = document.createElement("div");
        taskCard.className = "card mb-3 p-3 shadow-sm";

        taskCard.innerHTML = `
            <h5>${task.title}</h5>
            <p>${task.description}</p>
            <p><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${task.status}</p>
            <button class="btn btn-danger btn-sm me-2" onclick="deleteTask('${task._id}')">Delete</button>
            <button class="btn btn-warning btn-sm" onclick="showEditForm('${task._id}', '${task.title}', '${task.description}', '${task.due_date}', '${task.status}')">Edit</button>
        `;

        taskList.appendChild(taskCard);
    });
}
function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function displayTasks(tasks) {
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  if (!tasks.length) {
    list.innerHTML = "<p class='text-center'>No tasks available.</p>";
    return;
  }

  let tableHTML = `
    <div class="table-responsive">
      <table class="table table-bordered table-striped align-middle">
       <thead class="table-dark">
  <tr>
    <th>Sr. No.</th>
    <th>Title</th>
    <th>Due Date</th>
    <th>Status</th>
    <th>Actions</th>
  </tr>
</thead>

        <tbody>
  `;

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  tasks.forEach((task, index) => {
  const dueDate = new Date(task.due_date);
  const isDueToday = dueDate.toDateString() === today.toDateString();
  const isDueTomorrow = dueDate.toDateString() === tomorrow.toDateString();
  const highlightClass = isDueToday || isDueTomorrow ? "overdue-soon" : "";

  tableHTML += `
    <tr class="${highlightClass}">
      <td>${index + 1}</td>
      <td>${task.title}</td>
      <td>${dueDate.toLocaleDateString()}</td>
      <td>
        <span class="badge ${task.status === 'Completed' ? 'bg-success' : task.status === 'In Progress' ? 'bg-info text-dark' : 'bg-warning text-dark'}">
          ${task.status}
        </span>
      </td>
     <td class="text-center">
  <div class="d-flex justify-content-center align-items-center gap-3">
    <i class="bi bi-eye text-info fs-5 cursor-pointer"
       onclick="showDetails('${escapeQuotes(task.title)}', '${escapeQuotes(task.description)}', '${task.due_date}', '${task.status}', '${task.created_at || ''}')"
       title="Details"></i>
    <i class="bi bi-pencil-square text-warning fs-5 cursor-pointer"
       onclick="showEditForm('${task._id}', '${escapeQuotes(task.title)}', '${escapeQuotes(task.description)}', '${task.due_date}', '${task.status}')"
       title="Edit"></i>
    <i class="bi bi-trash text-danger fs-5 cursor-pointer"
       onclick="deleteTask('${task._id}')"
       title="Delete"></i>
  </div>
</td>

    </tr>
  `;
});


  tableHTML += `</tbody></table></div>`;
  list.innerHTML = tableHTML;
}

let editTaskId = "";

function showEditForm(id, title, desc, date, status) {
  editTaskId = id;
  document.getElementById("editTitle").value = title;
  document.getElementById("editDesc").value = desc;
  document.getElementById("editDate").value = date;
  document.getElementById("editStatus").value = status;

  const modal = new bootstrap.Modal(document.getElementById("editTaskModal"));
  modal.show();
}
document.getElementById("saveEditBtn").addEventListener("click", async () => {
  const updatedTitle = document.getElementById("editTitle").value.trim();
  const updatedDesc = document.getElementById("editDesc").value.trim();
  const updatedDate = document.getElementById("editDate").value;
  const updatedStatus = document.getElementById("editStatus").value;

  if (!updatedTitle || !updatedDesc || !updatedDate) {
    showToast("Please fill in all fields.");
    return;
  }

  try {
    const res = await fetch(`http://localhost:5000/tasks/${editTaskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: updatedTitle,
        description: updatedDesc,
        due_date: updatedDate,
        status: updatedStatus
      })
    });

    const data = await res.json();

    if (res.ok) {
  showToast(data.message || "Task updated successfully", "success");

  const editModal = bootstrap.Modal.getInstance(document.getElementById("editTaskModal"));
  if (editModal) editModal.hide();

  loadTasks();
} else {
  showToast(data.message || "Failed to update task", "error");
}

  } catch (error) {
    console.error("Update error:", error);
    showToast("Something went wrong. Please try again.");
  }
});


function showDetails(title, desc, date, status, createdAt = "") {
  document.getElementById("detailTitle").textContent = title;
  document.getElementById("detailDesc").textContent = desc;
document.getElementById("detailDate").textContent = new Date(date).toLocaleDateString();

  document.getElementById("detailStatus").textContent = status;

  if (createdAt) {
    const createdDate = new Date(createdAt);
    const createdInfo = createdDate.toLocaleString();
    if (!document.getElementById("detailCreated")) {
      const p = document.createElement("p");
      p.innerHTML = `<strong>Created At:</strong> <span id="detailCreated">${createdInfo}</span>`;
      document.querySelector("#taskDetailsModal .modal-body").appendChild(p);
    } else {
      document.getElementById("detailCreated").textContent = createdInfo;
    }
  }

  const modal = new bootstrap.Modal(document.getElementById("taskDetailsModal"));
  modal.show();
}

function closeDetails() {
  document.getElementById("taskDetailsSection").style.display = "none";
}

function deleteTask(id) {
  showCustomConfirm("Are you sure you want to delete this task?").then((confirmed) => {
    if (confirmed) {
      fetch(`http://localhost:5000/tasks/${id}`, {
        method: "DELETE"
      })
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) {
          showToast(data.message || "Task deleted successfully", "success");
          loadTasks(); // Reload task list
        } else {
          showToast(data.message || "Failed to delete task", "error");
        }
      })
      .catch(error => {
        showToast("Error deleting task", "error");
        console.error(error);
      });
    }
  });
}


function showCustomConfirm(message) {
  return new Promise((resolve) => {
    const confirmBox = document.getElementById("customConfirmBox");
    const confirmText = document.getElementById("confirmText");
    const confirmYes = document.getElementById("confirmYes");
    const confirmCancel = document.getElementById("confirmCancel");

    confirmText.innerText = message;
    confirmBox.classList.remove("d-none");

    const cleanUp = () => {
      confirmBox.classList.add("d-none");
      confirmYes.removeEventListener("click", onYes);
      confirmCancel.removeEventListener("click", onCancel);
    };

    const onYes = () => {
      cleanUp();
      resolve(true);
    };

    const onCancel = () => {
      cleanUp();
      resolve(false);
    };

    confirmYes.addEventListener("click", onYes);
    confirmCancel.addEventListener("click", onCancel);
  });
}

document.getElementById("viewAllBtn").addEventListener("click", loadTasks);
document.getElementById("pendingBtn").addEventListener("click", () => filterByStatus("Pending"));
document.getElementById("inProgressBtn").addEventListener("click", () => filterByStatus("In Progress"));
document.getElementById("completedBtn").addEventListener("click", () => filterByStatus("Completed"));

async function filterByStatus(status) {
  const res = await fetch(`http://localhost:5000/tasks?username=${currentUser}`);
  const tasks = await res.json();
  displayTasks(tasks.filter(task => task.status === status));
}
document.getElementById("searchBtn").addEventListener("click", async () => {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();

  if (!query) {
    showToast("Enter a title to search.");
    return;
  }

  const res = await fetch(`http://localhost:5000/tasks?username=${currentUser}`);
  const tasks = await res.json();

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(query)
  );

  displayTasks(filteredTasks);
});
document.getElementById("searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("searchBtn").click();
  }
});

// Toggle Add Task Form visibility
document.getElementById("showTaskFormBtn").addEventListener("click", () => {
  const taskForm = document.getElementById("taskFormSection");
  const btn = document.getElementById("showTaskFormBtn");

  if (taskForm.style.display === "none") {
    taskForm.style.display = "block";
    btn.innerHTML = '<i class="bi bi-dash-circle"></i> Hide Task Form';
  } else {
    taskForm.style.display = "none";
    btn.innerHTML = '<i class="bi bi-plus-circle"></i> Add New Task';
  }
});

function togglePassword(inputId, iconSpan) {
  const input = document.getElementById(inputId);
  const icon = iconSpan.querySelector("i");

  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("bi-eye-slash");
    icon.classList.add("bi-eye");
  } else {
    input.type = "password";
    icon.classList.remove("bi-eye");
    icon.classList.add("bi-eye-slash");
  }
}
document.getElementById("showTaskFormBtn").addEventListener("click", () => {
  const taskForm = document.getElementById("taskFormSection");
  const btn = document.getElementById("showTaskFormBtn");

  if (taskForm.style.display === "none") {
    taskForm.style.display = "block";
    btn.innerHTML = '<i class="bi bi-dash-circle"></i> Hide Task Form';
  } else {
    taskForm.style.display = "none";
    btn.innerHTML = '<i class="bi bi-plus-circle"></i> Add New Task';
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const showTaskFormBtn = document.getElementById("showTaskFormBtn");
  const taskFormSection = document.getElementById("taskFormSection");

  if (showTaskFormBtn && taskFormSection) {
    showTaskFormBtn.addEventListener("click", () => {
      if (taskFormSection.style.display === "none") {
        taskFormSection.style.display = "block";
        showTaskFormBtn.innerHTML = '<i class="bi bi-dash-circle"></i> Hide Task Form';
      } else {
        taskFormSection.style.display = "none";
        showTaskFormBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Add New Task';
      }
    });
  }
});
