let currentUser = "";
let lastLoadedTasks = [];
let editingTaskId = null;
let notifications = [];
let isViewAllMode = false;
let taskToDeleteId = null;
let analyticsCharts = {};
const API_BASE = "http://localhost:5000";

// DOM Content Loaded
document.addEventListener("DOMContentLoaded", () => {
  let isRegisterMode = false;

  const submitBtn = document.getElementById("submitBtn");
  const toggleAuth = document.getElementById("toggleAuth");
  const authMessage = document.getElementById("authMessage");
  const formTitle = document.getElementById("formTitle");
  const loginFields = document.getElementById("loginFields");
  const registerFields = document.getElementById("registerFields");

  // Handle Login / Register button click
  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    let username, password;

    if (isRegisterMode) {
      username = document.getElementById("regUsername").value.trim();
      password = document.getElementById("regPassword").value.trim();
      
      if (!username || !password) {
        authMessage.textContent = "Please fill all fields";
        authMessage.className = "text-danger";
        return;
      }
      
      // Register user
      try {
        const response = await fetch(`${API_BASE}/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          isRegisterMode = false;
          formTitle.textContent = "Login";
          submitBtn.innerHTML = "<i class='bi bi-box-arrow-in-right'></i> Login";
          toggleAuth.textContent = "Don't have an account? Register";
          loginFields.style.display = "block";
          registerFields.style.display = "none";
          authMessage.textContent = "✅ Registered successfully, now log in!";
          authMessage.className = "text-success";
          addNotification("Registration Successful", "Your account has been created successfully. Please log in.", "success");
        } else {
          authMessage.textContent = data.message || "Registration failed";
          authMessage.className = "text-danger";
        }
      } catch (err) {
        authMessage.textContent = "Registration failed. Please try again.";
        authMessage.className = "text-danger";
      }
    } else {
      username = document.getElementById("username").value.trim();
      password = document.getElementById("password").value.trim();
      
      if (!username || !password) {
        authMessage.textContent = "Please fill all fields";
        authMessage.className = "text-danger";
        return;
      }
      
      // Login user
      try {
        const response = await fetch(`${API_BASE}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          currentUser = username;
          document.getElementById("authSection").style.display = "none";
          document.getElementById("taskSection").style.display = "block";
          document.getElementById("userInfo").textContent = `Logged in as: ${username}`;
          
          // Load user's tasks
          await loadUserTasks();
          addNotification("Login Successful", "You have successfully logged in to your account.", "success");
          
          // Add analytics button after login
          addAnalyticsButton();
          
          // Check for tasks due today
          checkTasksDueToday();
        } else {
          authMessage.textContent = data.message || "Login failed";
          authMessage.className = "text-danger";
        }
      } catch (err) {
        authMessage.textContent = "Login failed. Please try again.";
        authMessage.className = "text-danger";
      }
    }
  });

  // Handle toggle between Login/Register
  toggleAuth.addEventListener("click", (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;

    if (isRegisterMode) {
      formTitle.textContent = "Register";
      submitBtn.innerHTML = "<i class='bi bi-person-plus'></i> Register";
      toggleAuth.textContent = "Already have an account? Login";
      loginFields.style.display = "none";
      registerFields.style.display = "block";
    } else {
      formTitle.textContent = "Login";
      submitBtn.innerHTML = "<i class='bi bi-box-arrow-in-right'></i> Login";
      toggleAuth.textContent = "Don't have an account? Register";
      loginFields.style.display = "block";
      registerFields.style.display = "none";
    }

    authMessage.textContent = "";
  });

  // Toggle Add Task Form visibility
  document.getElementById("showTaskFormBtn").addEventListener("click", () => {
    const formSection = document.getElementById("taskFormSection");
    formSection.style.display = formSection.style.display === "none" ? "block" : "none";
  });

  // Show Shared Tasks
  document.getElementById("showSharedTasksBtn").addEventListener("click", () => {
    showSharedTasks();
  });

  // ------------------- ADD TASK -------------------
  document.getElementById("addTaskBtn").addEventListener("click", async () => {
    const titleInput = document.getElementById("taskTitle");
    const descInput = document.getElementById("taskDesc");
    const dateInput = document.getElementById("taskDate");

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const due_date = dateInput.value;

    if (!title || !due_date) {
      showToast("Please fill all required fields!", "warning");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser,
          title,
          description,
          due_date,
          status: "Pending"
        })
      });

      const data = await response.json();
      console.log("Add task response:", data);

      if (response.ok && data.success) {
        // Instead of just updating local array, reload tasks from server
        await loadUserTasks();
        
        showToast("✅ Task added successfully!", "success");
        addNotification("Task Added", `Task "${title}" has been added.`, "success");

        titleInput.value = "";
        descInput.value = "";
        dateInput.value = "";
        document.getElementById("taskFormSection").style.display = "none";
      } else {
        showToast(data.message || "Failed to add task!", "error");
        console.error("Add task error response:", data);
      }
    } catch (err) {
      console.error("Add task error:", err);
      showToast("Failed to add task!", "error");
    }
  });

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    currentUser = "";
    lastLoadedTasks = [];
    document.getElementById("taskSection").style.display = "none";
    document.getElementById("authSection").style.display = "block";
    addNotification("Logout Successful", "You have been logged out successfully.", "info");
  });

  // Filters & Search
  document.getElementById("viewAllBtn").addEventListener("click", () => {
    isViewAllMode = true;
    const userTasks = lastLoadedTasks.filter(task => task.username === currentUser);
    displayTasks(userTasks);
    updateProgressBar(userTasks);
    addNotification("View All Tasks", "Displaying all your tasks.", "info");
  });

  document.getElementById("pendingBtn").addEventListener("click", () => {
    isViewAllMode = false;
    filterByStatus("Pending");
    addNotification("Filter Applied", "Showing pending tasks only.", "info");
  });
  
  document.getElementById("inProgressBtn").addEventListener("click", () => {
    isViewAllMode = false;
    filterByStatus("In Progress");
    addNotification("Filter Applied", "Showing in-progress tasks only.", "info");
  });
  
  document.getElementById("completedBtn").addEventListener("click", () => {
    isViewAllMode = false;
    filterByStatus("Completed");
    addNotification("Filter Applied", "Showing completed tasks only.", "info");
  });

  document.getElementById("searchBtn").addEventListener("click", () => {
    const query = document.getElementById("searchInput").value.trim().toLowerCase();

    if (!query) {
      showToast("Enter a title to search.", "warning");
      return;
    }

    const userTasks = lastLoadedTasks.filter(task => task.username === currentUser);
    const filteredTasks = userTasks.filter(task =>
      task.title.toLowerCase().includes(query)
    );
    
    displayTasks(filteredTasks);
    addNotification("Search Results", `Found ${filteredTasks.length} tasks matching "${query}".`, "info");
  });

  // ------------------- UPDATE TASK -------------------
  document.getElementById("saveEditBtn").addEventListener("click", async () => {
    if (!editingTaskId) return;

    const updatedTask = {
      username: currentUser,
      title: document.getElementById("editTitle").value.trim(),
      description: document.getElementById("editDesc").value.trim(),
      due_date: document.getElementById("editDate").value,
      status: document.getElementById("editStatus").value
    };

    try {
      const response = await fetch(`${API_BASE}/tasks/${editingTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask)
      });

      const data = await response.json();
      console.log("Update task response:", data);

      if (response.ok && data.success) {
        // Instead of updating local array, reload tasks from server
        await loadUserTasks();
        
        showToast("✏️ Task updated successfully!", "success");
        addNotification("Task Updated", `Task "${updatedTask.title}" updated.`, "success");
      } else {
        showToast(data.message || "Failed to update task!", "error");
        console.error("Update task error response:", data);
      }
    } catch (err) {
      console.error("Update task error:", err);
      showToast("Failed to update task!", "error");
    }

    bootstrap.Modal.getInstance(document.getElementById("editTaskModal")).hide();
  });

  // Share Task functionality
  document.getElementById("confirmShareBtn").addEventListener("click", shareTask);

  // Notifications panel
  document.getElementById("openNotificationsBtn").addEventListener("click", () => {
    document.getElementById("notificationPanel").style.display = "block";
  });

  document.getElementById("closeNotificationsBtn").addEventListener("click", () => {
    document.getElementById("notificationPanel").style.display = "none";
  });

  document.getElementById("markAllReadBtn").addEventListener("click", markAllNotificationsAsRead);
  document.getElementById("clearNotificationsBtn").addEventListener("click", clearAllNotifications);
  
  // Delete confirmation
  document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
    if (taskToDeleteId) {
      await deleteTask(taskToDeleteId);
      taskToDeleteId = null;
    }
    const modal = bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal"));
    modal.hide();
  });
  
  // Event delegation for action icons
  document.getElementById("taskList").addEventListener("click", (e) => {
    const target = e.target.closest(".action-icon");
    if (!target) return;
    
    // Get the parent row
    const row = target.closest("tr");
    if (!row) return;
    
    // Get the task ID from the row's dataset
    const taskId = row.dataset.id;
    if (!taskId) return;
    
    // Find task from the last loaded tasks
    const task = lastLoadedTasks.find(t => t._id === taskId);
    if (!task) return;
    
    // Determine which action was clicked based on the class
    if (target.classList.contains("view-icon")) {
      showDetails(task);
    } else if (target.classList.contains("edit-icon")) {
      showEditForm(task);
    } else if (target.classList.contains("delete-icon")) {
      taskToDeleteId = taskId;
      new bootstrap.Modal(document.getElementById("deleteConfirmModal")).show();
    } else if (target.classList.contains("share-icon")) {
      openShareTask(taskId);
    }
  });
});

// Load user tasks from backend
async function loadUserTasks() {
  try {
    const response = await fetch(`${API_BASE}/tasks?username=${currentUser}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Loaded tasks:", data);
    
    // Store all tasks but only display current user's tasks
    lastLoadedTasks = Array.isArray(data) ? data : (data.tasks || []);
    
    // Display only current user's tasks
    const userTasks = lastLoadedTasks.filter(task => task.username === currentUser);
    displayTasks(userTasks);
    updateProgressBar(userTasks);
    
    // Initialize analytics if user is logged in
    if (currentUser) {
      updateAnalyticsData();
    }
  } catch (err) {
    console.error("Failed to load tasks:", err);
    showToast("Failed to load tasks!", "error");
  }
}

// Display notifications in the panel
function displayNotifications() {
  const notificationList = document.getElementById("notificationList");
  notificationList.innerHTML = "";
  
  if (notifications.length === 0) {
    notificationList.innerHTML = "<li class='text-center text-muted'>No notifications</li>";
    return;
  }
  
  notifications.forEach(notification => {
    const li = document.createElement("li");
    li.className = `notification-item ${notification.read ? "" : "unread"}`;
    li.dataset.id = notification.id;
    
    const time = new Date(notification.timestamp).toLocaleString();
    const icon = notification.type === 'success' ? 'bi-check-circle' : 
                notification.type === 'error' ? 'bi-exclamation-circle' : 
                notification.type === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle';
    
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <strong><i class="bi ${icon} me-1"></i> ${notification.title || "Notification"}</strong>
          <p class="mb-1 mt-1">${notification.message}</p>
          <div class="notification-time">${time}</div>
        </div>
        <button class="btn btn-sm btn-outline-danger delete-single-notification" data-id="${notification.id}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
      <div class="notification-actions">
        ${!notification.read ? 
          `<button class="btn btn-sm btn-outline-success mark-read-btn" data-id="${notification.id}">Mark Read</button>` : 
          `<span class="text-muted">Read</span>`}
      </div>
    `;
    
    notificationList.appendChild(li);
  });
  
  // Add event listeners to mark-as-read buttons
  document.querySelectorAll(".mark-read-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const notificationId = e.target.dataset.id;
      markNotificationAsRead(notificationId);
    });
  });
  
  // Add event listeners to delete single notification buttons
  document.querySelectorAll(".delete-single-notification").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const notificationId = e.target.closest("button").dataset.id;
      deleteNotification(notificationId);
    });
  });
  
  // Update notification badge
  const unreadCount = notifications.filter(n => !n.read).length;
  const badge = document.getElementById("notificationBadge");
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = "block";
  } else {
    badge.style.display = "none";
  }
}

// Add a notification
function addNotification(title, message, type = "info") {
  const newNotification = {
    id: 'notif-' + Date.now(),
    title,
    message,
    type,
    timestamp: new Date(),
    read: false
  };
  
  notifications.unshift(newNotification);
  displayNotifications();
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
  // Update local notifications array
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
  }
  displayNotifications();
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
  // Update all notifications to read
  notifications.forEach(n => n.read = true);
  displayNotifications();
  showToast("All notifications marked as read", "success");
}

// Clear all notifications
function clearAllNotifications() {
  notifications = [];
  displayNotifications();
  showToast("Notifications cleared", "success");
}

// Delete a single notification
function deleteNotification(notificationId) {
  notifications = notifications.filter(n => n.id !== notificationId);
  displayNotifications();
  showToast("Notification deleted", "success");
}

// Show task details in modal
function showDetails(task) {
  document.getElementById("detailTitle").textContent = task.title;
  document.getElementById("detailDesc").textContent = task.description || "No description";
  document.getElementById("detailDate").textContent = task.due_date ? new Date(task.due_date).toLocaleDateString() : "N/A";
  document.getElementById("detailStatus").textContent = task.status;
  document.getElementById("detailOwner").textContent = task.username || currentUser;
  
  // Show shared users
  const sharedWithElement = document.getElementById("detailSharedWith");
  if (task.shared_with && task.shared_with.length > 0) {
    sharedWithElement.textContent = task.shared_with.join(", ");
  } else {
    sharedWithElement.textContent = "None";
  }
  
  new bootstrap.Modal(document.getElementById("taskDetailsModal")).show();
}

// Show Shared Tasks in modal
function showSharedTasks() {
  const sharedTasksContainer = document.getElementById("sharedTasksContainer");
  sharedTasksContainer.innerHTML = "";
  
  // Get tasks shared with current user (owned by others but shared with current user)
  const sharedTasks = lastLoadedTasks.filter(task => 
    task.username !== currentUser && 
    task.shared_with && 
    task.shared_with.includes(currentUser)
  );
  
  if (sharedTasks.length === 0) {
    sharedTasksContainer.innerHTML = "<p class='text-center text-muted'>No shared tasks available.</p>";
  } else {
    sharedTasks.forEach((task, index) => {
      const dueDate = new Date(task.due_date);
      const taskCard = document.createElement("div");
      taskCard.className = "card shared-task-card";
      
      taskCard.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${task.title}</h5>
          <p class="card-text">${task.description || "No description"}</p>
          <div class="d-flex justify-content-between">
            <span class="text-muted">Due: ${dueDate.toLocaleDateString()}</span>
            <span class="badge bg-${getStatusBadgeColor(task.status)}">${task.status}</span>
          </div>
          <div class="mt-2">
            <small class="text-muted">Shared by: ${task.username}</small>
          </div>
          <div class="mt-2 text-end">
            <button class="btn btn-sm btn-outline-info view-shared-task" data-id="${task._id}">
              <i class="bi bi-eye"></i> View Details
            </button>
          </div>
        </div>
      `;
      
      sharedTasksContainer.appendChild(taskCard);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll(".view-shared-task").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const taskId = e.target.closest("button").dataset.id;
        const task = sharedTasks.find(t => t._id === taskId);
        if (task) {
          showDetails(task);
        }
      });
    });
  }
  
  new bootstrap.Modal(document.getElementById("sharedTasksModal")).show();
}
  
// Show Edit Form modal
function showEditForm(task) {
  editingTaskId = task._id;
  document.getElementById("editTitle").value = task.title;
  document.getElementById("editDesc").value = task.description || "";
  document.getElementById("editDate").value = task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : "";
  document.getElementById("editStatus").value = task.status;
  new bootstrap.Modal(document.getElementById("editTaskModal")).show();
}

// ------------------- DELETE TASK -------------------
async function deleteTask(id) {
  try {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username: currentUser })
    });

    const data = await response.json();
    console.log("Delete task response:", data);

    if (response.ok && data.success) {
      // Instead of updating local array, reload tasks from server
      await loadUserTasks();
      
      showToast("🗑️ Task deleted successfully!", "success");
      addNotification("Task Deleted", "Task has been deleted successfully.", "success");
    } else {
      showToast(data.message || "Failed to delete task!", "error");
      console.error("Delete task error response:", data);
    }
  } catch (err) {
    console.error("Delete task error:", err);
    showToast("Failed to delete task!", "error");
  }
}

// Open share modal
function openShareTask(taskId) {
  document.getElementById("shareTaskId").value = taskId;
  document.getElementById("shareWithUser").value = "";
  
  // Load current shared users
  const task = lastLoadedTasks.find(t => t._id === taskId);
  const sharedWithList = document.getElementById("sharedWithList");
  if (task.shared_with && task.shared_with.length > 0) {
    sharedWithList.innerHTML = task.shared_with.map(user => 
      `<span class="badge bg-secondary me-1">${user}</span>`
    ).join("");
  } else {
    sharedWithList.innerHTML = "<span class='text-muted'>Not shared with anyone</span>";
  }
  
  new bootstrap.Modal(document.getElementById("shareTaskModal")).show();
}

// Share task
async function shareTask() {
  const taskId = document.getElementById("shareTaskId").value;
  const toUser = document.getElementById("shareWithUser").value.trim();

  if (!toUser) {
    showToast("⚠️ Please enter a username!", "warning");
    return;
  }
  
  if (toUser === currentUser) {
    showToast("⚠️ You cannot share a task with yourself!", "warning");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/share_task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: currentUser,
        task_id: taskId,
        share_with: toUser
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Instead of updating local array, reload tasks from server
      await loadUserTasks();
      
      // Update the shared users list in the modal
      const sharedWithList = document.getElementById("sharedWithList");
      sharedWithList.innerHTML += `<span class="badge bg-secondary me-1">${toUser}</span>`;
      
      showToast("✅ Task shared successfully!", "success");
      addNotification("Task Shared", `Task has been shared with ${toUser}.`, "success");
    } else {
      showToast(data.error || "Failed to share task!", "error");
    }
  } catch (err) {
    showToast("Failed to share task!", "error");
  }
}

// Display Tasks (table view) - Sorted by due date
function displayTasks(tasks) {
  const list = document.getElementById("taskList");
  const tbody = list.querySelector("tbody");
  tbody.innerHTML = "";

  if (!tasks.length) {
    list.style.display = "none";
    document.getElementById("taskProgressBar").style.display = "none";
    return;
  }

  // Sort tasks by due date (earliest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = new Date(a.due_date);
    const dateB = new Date(b.due_date);
    return dateA - dateB;
  });

  sortedTasks.forEach((task, index) => {
    const dueDate = new Date(task.due_date);
    const isOwner = task.username === currentUser;
    const today = new Date().toISOString().split('T')[0];
    const isDueToday = task.due_date === today;
    
    const row = document.createElement("tr");
    row.dataset.id = task._id;
    if (isDueToday) {
      row.classList.add("due-today");
    }
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${task.title} ${isDueToday ? '<span class="badge bg-danger ms-1">Due Today</span>' : ''}</td>
      <td>${dueDate.toLocaleDateString()}</td>
      <td><span class="badge bg-${getStatusBadgeColor(task.status)}">${task.status}</span></td>
      <td class="action-cell">
        <i class="bi bi-eye text-info action-icon view-icon" title="View Details"></i>
        ${isOwner ? 
          `<i class="bi bi-pencil-square text-warning action-icon edit-icon" title="Edit Task"></i>` : ''}
        ${isOwner ? 
          `<i class="bi bi-trash text-danger action-icon delete-icon" title="Delete Task"></i>` : ''}
        ${isOwner ? 
          `<i class="bi bi-share text-primary action-icon share-icon" title="Share Task"></i>` : ''}
      </td>
    `;
    
    tbody.appendChild(row);
  });

  list.style.display = "block";
}

// Helper function to get badge color based on status
function getStatusBadgeColor(status) {
  switch(status) {
    case "Pending": return "warning";
    case "In Progress": return "info";
    case "Completed": return "success";
    default: return "secondary";
  }
}

// Filter by status
function filterByStatus(status) {
  const userTasks = lastLoadedTasks.filter(task => task.username === currentUser);
  const filtered = userTasks.filter(task => task.status === status);
  
  document.getElementById("taskList").style.display = "block";
  document.getElementById("taskProgressBar").style.display = "none";
  displayTasks(filtered);
}

// Update progress bar
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

// Show Toast notification (centered)
function showToast(message, type = "success") {
  const toastMessage = document.getElementById("toastMessage");
  const liveToast = document.getElementById("liveToast");
  
  // Set message and style
  toastMessage.textContent = message;
  
  // Remove previous color classes
  liveToast.classList.remove("bg-success", "bg-danger", "bg-warning", "bg-info");
  
  // Add appropriate color class based on type
  if (type === "success") {
    liveToast.classList.add("bg-success");
  } else if (type === "error") {
    liveToast.classList.add("bg-danger");
  } else if (type === "warning") {
    liveToast.classList.add("bg-warning");
  } else {
    liveToast.classList.add("bg-info");
  }
  
  // Show toast
  const toast = new bootstrap.Toast(liveToast, {
    autohide: true,
    delay: 3000
  });
  toast.show();
}

// Toggle password visibility
function togglePassword(inputId, element) {
  const input = document.getElementById(inputId);
  const icon = element.querySelector('i');
  
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

// Check for tasks due today and show notification
function checkTasksDueToday() {
  const today = new Date().toISOString().split('T')[0];
  const tasksDueToday = lastLoadedTasks.filter(task => 
    task.due_date === today && task.username === currentUser && task.status !== "Completed"
  );
  
  if (tasksDueToday.length > 0) {
    const taskTitles = tasksDueToday.map(task => task.title).join(", ");
    showToast(`⚠️ You have ${tasksDueToday.length} task(s) due today: ${taskTitles}`, "warning");
    addNotification("Tasks Due Today", `You have ${tasksDueToday.length} task(s) due today.`, "warning");
  }
}

function addAnalyticsButton() {
  const buttonGroup = document.getElementById('filterButtons');
  
  // Check if analytics button already exists
  if (document.getElementById('analyticsBtn')) {
    return;
  }
  
  const analyticsBtn = document.createElement('button');
  analyticsBtn.className = 'btn btn-outline-info';
  analyticsBtn.id = 'analyticsBtn';
  analyticsBtn.innerHTML = '<i class="bi bi-graph-up"></i> Analytics';
  buttonGroup.appendChild(analyticsBtn);
  
  // Add event listener
  analyticsBtn.addEventListener('click', () => {
    showAnalyticsDashboard();
  });
}

// Show Analytics Dashboard Modal
function showAnalyticsDashboard() {
  // Update analytics data
  updateAnalyticsData();
  
  // Show the modal
  const analyticsModal = new bootstrap.Modal(document.getElementById('analyticsModal'));
  analyticsModal.show();
}

// Update analytics data and charts
async function updateAnalyticsData() {
  try {
    // Fetch analytics data from backend
    const overviewResponse = await fetch(`${API_BASE}/analytics/overview?username=${currentUser}`);
    if (!overviewResponse.ok) {
      throw new Error(`HTTP error! status: ${overviewResponse.status}`);
    }
    const overviewData = await overviewResponse.json();
    
    const trendsResponse = await fetch(`${API_BASE}/analytics/trends?username=${currentUser}`);
    if (!trendsResponse.ok) {
      throw new Error(`HTTP error! status: ${trendsResponse.status}`);
    }
    const trendsData = await trendsResponse.json();
    
    // Update metric cards
    document.getElementById('totalTasks').textContent = overviewData.total_tasks;
    document.getElementById('completedTasks').textContent = overviewData.completed_tasks;
    document.getElementById('pendingTasks').textContent = overviewData.pending_tasks;
    document.getElementById('overdueTasks').textContent = overviewData.overdue_tasks;
    
    // Create/update charts
    createStatusPieChart(overviewData.status_distribution);
    createWeeklyTrendChart(trendsData.weekly);
  } catch (err) {
    console.error("Failed to load analytics data:", err);
    showToast("Failed to load analytics data!", "error");
  }
}

// Create Status Distribution Pie Chart
function createStatusPieChart(statusDistribution) {
  const ctx = document.getElementById('statusPieChart').getContext('2d');
  
  // Destroy previous chart if it exists
  if (analyticsCharts.statusPie) {
    analyticsCharts.statusPie.destroy();
  }
  
  // Create new chart
  analyticsCharts.statusPie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'In Progress', 'Completed'],
      datasets: [{
        data: [statusDistribution.Pending, statusDistribution['In Progress'], statusDistribution.Completed],
        backgroundColor: [
          'rgba(255, 206, 86, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgba(255, 206, 86, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: {
              size: 10
            }
          }
        }
      }
    }
  });
}

// Create Weekly Trend Chart
function createWeeklyTrendChart(weeklyData) {
  const ctx = document.getElementById('weeklyTrendChart').getContext('2d');
  
  // Destroy previous chart if it exists
  if (analyticsCharts.weeklyTrend) {
    analyticsCharts.weeklyTrend.destroy();
  }
  
  // Create new chart
  analyticsCharts.weeklyTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: weeklyData.labels,
      datasets: [
        {
          label: 'Completed',
          data: weeklyData.completed,
          fill: false,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1,
          pointBackgroundColor: 'rgba(75, 192, 192, 1)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: {
              size: 10
            }
          }
        }
      }
    }
  });
}
