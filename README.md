# 📌 Task Manager – Team Collaboration & Analytics

A full-stack **Task Management System** built with **Flask (Python)**, **MongoDB**, and a **responsive HTML/Bootstrap frontend**.  
Supports **multi-user collaboration, real-time notifications, analytics dashboard, task attachments, and dark mode**.  
Deployed live with a single URL for frontend + backend.

---

## 🚀 Features

### ✅ Core Task Management
- Add, edit, delete tasks  
- Search, filter by status (Pending, In Progress, Completed)  
- Sort tasks by due date  
- Task details panel with edit/delete options  

### 👥 Multi-User Collaboration
- Task owners can **share tasks with other users**  
- Shared tasks appear in collaborators’ dashboards  
- Permissions ensure only authorized users can edit/share  

### 🔔 Real-Time Notifications
- Live notifications using **Socket.IO**  
- Users are notified when:
  - A task is shared with them  
  - A task’s status is updated  
- `GET /notifications` endpoint for past notifications  

### 📊 Analytics Dashboard
- Overview of tasks (created, completed, pending)  
- Weekly/monthly trends (completed vs overdue)  
- Status breakdown with **charts & graphs**  
- Powered by MongoDB **aggregation queries**  

### 🌙 Final Enhancements
- **Dark Mode Toggle** for UI  
- **Attachments**: Upload images/files with tasks  
- **Mobile Responsive** design  
- End-to-end tested before release  

---

## 🛠️ Tech Stack

- **Backend**: Flask (Python), Flask-SocketIO, Flask-PyMongo  
- **Database**: MongoDB (Atlas / Local)  
- **Frontend**: HTML, Bootstrap 5, JavaScript (Axios for API calls)  
- **Charts**: Chart.js / Recharts  
- **Deployment**: Render / Vercel / Heroku  
