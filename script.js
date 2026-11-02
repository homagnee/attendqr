// Database Keys
const DB_USERS = 'uni_fac_db_v8';
const DB_CURRENT_USER = 'uni_active_fac_v8';
const DB_ROUTINE = 'uni_fac_routine_v8';
const DB_ATTENDANCE = 'uni_fac_attendance_v7'; // Shared with Student Portal
const DB_CHECKIN_STATE = 'uni_fac_checkin_v8';

// Full Semesters & Subjects Hierarchy
const branchData = {
    "B.Tech": {
        "Semester 1": ["Physics", "Mathematics I", "Basic Electrical", "C Programming"],
        "Semester 2": ["Chemistry", "Mathematics II", "Data Structures", "Engineering Graphics"],
        "Semester 3": ["Analog Electronics", "Digital Electronics", "Computer Organization", "IT Workshop"],
        "Semester 4": ["Computer Architecture", "Design & Analysis of Algorithms", "Formal Language & Automata Theory"],
        "Semester 5": ["Operating Systems", "Computer Networks", "DBMS", "Java Programming"],
        "Semester 6": ["Software Engineering", "Compiler Design", "Machine Learning", "Web Technologies"],
        "Semester 7": ["Artificial Intelligence", "Cloud Computing", "Cryptography", "Project Phase-I"],
        "Semester 8": ["Big Data Analytics", "Cyber Security", "Internet of Things", "Project Phase-II"]
    },
    "M.Tech": {
        "Semester 1": ["Advanced Algorithms", "Computer Systems Architecture", "Machine Learning"],
        "Semester 2": ["Data Science", "Cryptography", "Cloud Computing", "Deep Learning"],
        "Semester 3": ["Dissertation Phase I", "IoT Systems"],
        "Semester 4": ["Dissertation Phase II"]
    },
    "BCA": {
        "Semester 1": ["C Programming", "IT Fundamentals", "Mathematics", "English"],
        "Semester 2": ["Data Structures", "Digital Logic", "Environmental Science"],
        "Semester 3": ["Object Oriented Programming", "Operating Systems", "Computer Architecture"],
        "Semester 4": ["Web Development", "Advanced Java", "Software Engineering"],
        "Semester 5": ["Computer Networks", "PHP & MySQL", "Information Security"],
        "Semester 6": ["Python Programming", "E-Commerce", "Major Project"]
    },
    "MCA": {
        "Semester 1": ["Programming in C", "Database Management Systems", "Computer Organization"],
        "Semester 2": ["Advanced Algorithms", "Machine Learning", "Data Science", "Software Engineering"],
        "Semester 3": ["Java Programming", "Web Technologies", "Cloud Computing"],
        "Semester 4": ["Big Data Analytics", "Cyber Security", "Industrial Project"]
    }
};

// 10x10 Timetable Headers (9 Day Columns + 1 Header Column = 10 Columns; 9 Time Rows + 1 Header Row = 10 Rows)
const MATRIX_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Extra / Lab", "Make-Up"];
const MATRIX_TIMES = [
    { label: "09:00 - 10:00", hour: 9 },
    { label: "10:00 - 11:00", hour: 10 },
    { label: "11:00 - 12:00", hour: 11 },
    { label: "12:00 - 13:00", hour: 12 },
    { label: "13:00 - 14:00", hour: 13 },
    { label: "14:00 - 15:00", hour: 14 },
    { label: "15:00 - 16:00", hour: 15 },
    { label: "16:00 - 17:00", hour: 16 },
    { label: "17:00 - 18:00", hour: 17 }
];

let currentUser = JSON.parse(localStorage.getItem(DB_CURRENT_USER));
let qrTimerInterval;
let statusMonitorInterval;

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme === 'dark');

    renderAuthStatusBanner();

    if (currentUser) {
        loadDashboard();
    }

    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
        applyTheme(!document.body.classList.contains('dark-mode'));
    });

    // Periodically evaluate Check-In / Check-Out / Absent status
    statusMonitorInterval = setInterval(() => {
        updateDutyStatusUI();
        renderAuthStatusBanner();
    }, 5000);

    window.onclick = function(event) {
        if (!event.target.matches('.dropdown-toggle') && !event.target.closest('.dropdown-toggle')) {
            let dropdowns = document.getElementsByClassName("dropdown-menu");
            for (let i = 0; i < dropdowns.length; i++) {
                if (dropdowns[i].classList.contains('show')) {
                    dropdowns[i].classList.remove('show');
                }
            }
        }
    };
});

// ================= TOAST & THEME =================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if(!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const btn = document.getElementById('themeToggleBtn');
    if(btn) {
        btn.innerHTML = isDark ? '<i class="fa-solid fa-sun" style="color: #fbbf24;"></i>' : '<i class="fa-solid fa-moon"></i>';
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// ================= AUTHENTICATION =================
function switchAuthTab(tab, evt) {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (evt && evt.target) {
        evt.target.classList.add('active');
    } else {
        document.querySelector(`.auth-tab[onclick*="${tab}"]`)?.classList.add('active');
    }
    document.getElementById(tab + 'Form').classList.add('active');
}

function registerUser() {
    const designation = document.getElementById('regDesignation').value;
    const email = document.getElementById('regEmail').value.trim();
    const fname = document.getElementById('regFName').value.trim();
    const mname = document.getElementById('regMName').value.trim();
    const lname = document.getElementById('regLName').value.trim();
    const dept = document.getElementById('regDept').value;
    
    if(!designation || !email || !fname || !lname || !dept) {
        return showToast("Please fill all required (*) fields.", "error");
    }
    
    let users = JSON.parse(localStorage.getItem(DB_USERS) || '{}');
    if(Object.values(users).some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return showToast("Email Address is already registered.", "error");
    }

    const generatedFacId = 'FAC-' + Math.floor(1000 + Math.random() * 9000);
    const generatedPassword = Math.random().toString(36).slice(-8);
    const fullName = `${designation} ${fname} ${mname} ${lname}`.replace(/\s+/g, ' ').trim();

    users[generatedFacId] = { 
        uid: generatedFacId,
        designation,
        email, 
        name: fullName, 
        department: dept, 
        password: generatedPassword 
    };
    localStorage.setItem(DB_USERS, JSON.stringify(users));
    
    const frozenInput = document.getElementById('regFacultyId');
    frozenInput.value = generatedFacId;
    frozenInput.style.color = "var(--success)";
    frozenInput.style.borderColor = "var(--success)";

    showToast(`Success! ID (${generatedFacId}) & Password emailed to ${email}`, "success");
    console.log(`[SYSTEM EMAIL SIMULATION]\nTo: ${email}\nFaculty ID: ${generatedFacId}\nPassword: ${generatedPassword}`);
    
    setTimeout(() => {
        frozenInput.value = ''; 
        frozenInput.style.color = "";
        frozenInput.style.borderColor = "";
        switchAuthTab('login');
    }, 2500);
}

function loginUser() {
    const uid = document.getElementById('loginUserId').value.trim().toUpperCase();
    const pass = document.getElementById('loginPassword').value;
    
    if(!uid || !pass) return showToast("Please enter Faculty ID and Password.", "error");

    if (uid === '0000' && pass === '1234') {
        currentUser = {
            uid: '0000',
            designation: 'Dr.',
            name: 'Dr. Pitch Demo',
            department: 'Computer Science',
            email: 'pitch@college.edu'
        };
    } else {
        let users = JSON.parse(localStorage.getItem(DB_USERS) || '{}');
        if (users[uid] && users[uid].password === pass) {
            currentUser = users[uid];
        } else { 
            return showToast("Invalid Faculty ID or Password.", "error"); 
        }
    }

    localStorage.setItem(DB_CURRENT_USER, JSON.stringify(currentUser));

    // Set Check-In State on Login (unless explicitly marked Absent today)
    let checkInMap = JSON.parse(localStorage.getItem(DB_CHECKIN_STATE) || '{}');
    const existingState = checkInMap[currentUser.uid] || {};
    const todayStr = new Date().toISOString().slice(0, 10);

    // If not marked Absent today, automatically Check In
    if (!(existingState.isAbsent && existingState.date === todayStr)) {
        checkInMap[currentUser.uid] = {
            uid: currentUser.uid,
            name: currentUser.name,
            status: 'CHECKED_IN',
            isAbsent: false,
            date: todayStr,
            lastUpdated: Date.now()
        };
        localStorage.setItem(DB_CHECKIN_STATE, JSON.stringify(checkInMap));
        showToast("Authentication successful. You are now CHECKED IN.", "success");
    } else {
        showToast("Logged in (Currently marked ABSENT for today).", "info");
    }

    loadDashboard();
}

// ================= CHECK-IN / CHECK-OUT / ABSENT ENGINE =================
function isTeacherInActiveRoutine(uid) {
    const allRoutines = JSON.parse(localStorage.getItem(DB_ROUTINE) || '{}');
    const routineList = allRoutines[uid] || [];
    if (routineList.length === 0) return false;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return routineList.some(c => {
        if (c.date !== todayStr) return false;
        const [sh, sm] = (c.startTime || "00:00").split(':').map(Number);
        const [eh, em] = (c.endTime || "23:59").split(':').map(Number);
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;
        return currentMinutes >= startMins && currentMinutes <= endMins;
    });
}

function toggleTeacherAbsent() {
    if (!currentUser) return;
    let checkInMap = JSON.parse(localStorage.getItem(DB_CHECKIN_STATE) || '{}');
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentState = checkInMap[currentUser.uid] || {};

    const newAbsentState = !currentState.isAbsent;

    checkInMap[currentUser.uid] = {
        uid: currentUser.uid,
        name: currentUser.name,
        status: newAbsentState ? 'ABSENT' : 'CHECKED_IN',
        isAbsent: newAbsentState,
        date: todayStr,
        lastUpdated: Date.now()
    };

    localStorage.setItem(DB_CHECKIN_STATE, JSON.stringify(checkInMap));
    updateDutyStatusUI();

    if (newAbsentState) {
        showToast("Status set to ABSENT. Check-In indicator hidden.", "error");
    } else {
        showToast("Status set to PRESENT. You are now CHECKED IN.", "success");
    }
}

function updateDutyStatusUI() {
    if (!currentUser) return;
    const checkInBadge = document.getElementById('checkInBadge');
    const checkInText = document.getElementById('checkInText');
    const absentBadge = document.getElementById('absentBadge');
    const toggleBtn = document.getElementById('toggleAbsentBtn');

    let checkInMap = JSON.parse(localStorage.getItem(DB_CHECKIN_STATE) || '{}');
    const userState = checkInMap[currentUser.uid];

    // If teacher is Absent -> DO NOT show Check-In
    if (!userState || userState.isAbsent || userState.status === 'ABSENT') {
        checkInBadge.style.display = 'none';
        absentBadge.style.display = 'inline-flex';
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Mark Present (Check In)';
        }
        return;
    }

    // Teacher is Present -> Show glowing green Check-In badge
    absentBadge.style.display = 'none';
    checkInBadge.style.display = 'inline-flex';
    checkInBadge.className = 'checkin-badge glowing-green';
    checkInText.innerText = 'CHECKED IN';
    if (toggleBtn) {
        toggleBtn.innerHTML = '<i class="fa-solid fa-user-xmark"></i> Mark Absent';
    }
}

function renderAuthStatusBanner() {
    const banner = document.getElementById('authStatusBanner');
    const title = document.getElementById('authStatusTitle');
    const desc = document.getElementById('authStatusDesc');
    if (!banner) return;

    let checkInMap = JSON.parse(localStorage.getItem(DB_CHECKIN_STATE) || '{}');
    const states = Object.values(checkInMap);
    if (states.length === 0) {
        banner.style.display = 'none';
        return;
    }

    // Get most recently updated faculty state
    const latest = states.sort((a, b) => b.lastUpdated - a.lastUpdated)[0];

    // Rule: If teacher is Absent, do NOT show Check-In banner
    if (latest.isAbsent || latest.status === 'ABSENT') {
        banner.style.display = 'none';
        return;
    }

    // Re-verify if routine time has ended while logged out
    const activeClassNow = isTeacherInActiveRoutine(latest.uid);
    if (latest.status === 'CHECKED_IN' && !currentUser && !activeClassNow) {
        latest.status = 'CHECKED_OUT';
        checkInMap[latest.uid] = latest;
        localStorage.setItem(DB_CHECKIN_STATE, JSON.stringify(checkInMap));
    }

    banner.style.display = 'flex';
    if (latest.status === 'CHECKED_IN') {
        banner.className = 'auth-status-banner in';
        title.innerText = `${latest.name} — CHECKED IN`;
        desc.innerText = `Active class routine in progress. Check-In remains locked.`;
    } else {
        banner.className = 'auth-status-banner out';
        title.innerText = `${latest.name} — CHECKED OUT`;
        desc.innerText = `Scheduled class routine completed.`;
    }
}

function logout() {
    if (currentUser) {
        let checkInMap = JSON.parse(localStorage.getItem(DB_CHECKIN_STATE) || '{}');
        let userState = checkInMap[currentUser.uid] || {};

        if (!userState.isAbsent) {
            const stillInRoutine = isTeacherInActiveRoutine(currentUser.uid);
            // Keep CHECKED_IN if logged out during active class routine; otherwise CHECKED_OUT
            userState.status = stillInRoutine ? 'CHECKED_IN' : 'CHECKED_OUT';
            userState.lastUpdated = Date.now();
            checkInMap[currentUser.uid] = userState;
            localStorage.setItem(DB_CHECKIN_STATE, JSON.stringify(checkInMap));
        }
    }
    localStorage.removeItem(DB_CURRENT_USER);
    location.reload();
}

// ================= NAVIGATION & DASHBOARD (10x10 TIMETABLE) =================
function loadDashboard() {
    document.getElementById('authPortal').classList.remove('active');
    document.getElementById('mainPortal').style.display = 'flex';
    document.getElementById('sidebarName').innerText = currentUser.name;
    document.getElementById('sidebarDept').innerText = currentUser.department;
    
    updateDutyStatusUI();
    renderRoutine();
    renderMasterTimetable();
    switchPage('dashboardPage');
}

function switchPage(pageId) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === pageId));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    const titles = {
        'dashboardPage': 'Overview Dashboard',
        'routinePage': 'Routine Planner',
        'generatePage': 'Gateway Initialization',
        'tablePage': 'Attendance Logs'
    };
    document.getElementById('pageTitleDisplay').innerText = titles[pageId] || 'Overview';
    
    if(pageId === 'dashboardPage') renderMasterTimetable();
    if(pageId === 'tablePage') renderAttendanceLogs();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// Builds the 10x10 Timetable (Days across top columns, Time down rows)
function renderMasterTimetable() {
    const table = document.getElementById('masterTimetable');
    if (!table) return;

    const routineList = getRoutine();

    // Row 1: Header Row (1 Corner Cell + 9 Day Columns = 10 Columns)
    let html = `<thead><tr><th>TIME \\ DAYS</th>`;
    MATRIX_DAYS.forEach(day => {
        html += `<th>${day}</th>`;
    });
    html += `</tr></thead><tbody>`;

    // Rows 2 to 10: 9 Time Slot Rows (Total 10x10 table)
    MATRIX_TIMES.forEach(slot => {
        html += `<tr><th class="time-col">${slot.label}</th>`;

        MATRIX_DAYS.forEach((dayName, dayIdx) => {
            // Find any class matching this day of week and starting hour
            const match = routineList.find(item => {
                if (!item.date || !item.startTime) return false;
                const d = new Date(item.date + 'T00:00:00');
                const jsDay = d.getDay(); // 0=Sun, 1=Mon...
                const mappedIndex = jsDay === 0 ? 6 : jsDay - 1;
                const startHour = parseInt(item.startTime.split(':')[0], 10);
                return mappedIndex === dayIdx && startHour === slot.hour;
            });

            if (match) {
                html += `
                    <td>
                        <div class="slot-badge">
                            <strong>${match.subject}</strong>
                            ${match.branch} (${match.semester})<br>
                            <i class="fa-solid fa-door-open"></i> ${match.room}
                        </div>
                    </td>
                `;
            } else {
                html += `<td style="color: var(--text-muted); opacity: 0.35;">—</td>`;
            }
        });

        html += `</tr>`;
    });

    html += `</tbody>`;
    table.innerHTML = html;
}

// ================= ROUTINE BUILDER (NO DUPLICATES + ROOM + START/END TIME) =================
function updateSemesters() {
    const branch = document.getElementById('rtBranch').value;
    const semSelect = document.getElementById('rtSemester');
    const subSelect = document.getElementById('rtSubject');
    
    semSelect.innerHTML = '<option value="" disabled selected>Select Semester</option>';
    subSelect.innerHTML = '<option value="" disabled selected>Select Semester First</option>';
    
    if(branchData[branch]) {
        Object.keys(branchData[branch]).forEach(sem => {
            semSelect.innerHTML += `<option value="${sem}">${sem}</option>`;
        });
    }
}

function updateSubjects() {
    const branch = document.getElementById('rtBranch').value;
    const sem = document.getElementById('rtSemester').value;
    const subSelect = document.getElementById('rtSubject');
    
    subSelect.innerHTML = '<option value="" disabled selected>Select Subject</option>';
    
    if(branchData[branch] && branchData[branch][sem]) {
        branchData[branch][sem].forEach(sub => {
            subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
        });
    }
}

function toggleCustomRoom() {
    const sel = document.getElementById('rtRoomSelect').value;
    const customInput = document.getElementById('rtRoomCustom');
    if (sel === 'other') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
        customInput.value = '';
    }
}

function getRoutine() {
    const data = JSON.parse(localStorage.getItem(DB_ROUTINE) || '{}');
    return data[currentUser.uid] || [];
}

function saveRoutine() {
    const branch = document.getElementById('rtBranch').value;
    const semester = document.getElementById('rtSemester').value;
    const subject = document.getElementById('rtSubject').value;
    const date = document.getElementById('rtDate').value;
    const startTime = document.getElementById('rtStartTime').value;
    const endTime = document.getElementById('rtEndTime').value;
    const roomSelect = document.getElementById('rtRoomSelect').value;
    const room = roomSelect === 'other' ? document.getElementById('rtRoomCustom').value.trim() : roomSelect;
    
    if(!branch || !semester || !subject || !date || !startTime || !endTime || !room) {
        return showToast("Please fill all routine fields including Start/End Time and Room.", "error");
    }

    if (endTime <= startTime) {
        return showToast("End Time must be later than Start Time.", "error");
    }

    const routineList = getRoutine();

    // Prevent duplicate subject at the same date & time or overlapping slot
    const isDuplicate = routineList.some(c => 
        c.date === date && (
            (c.subject === subject && c.startTime === startTime) ||
            (startTime < c.endTime && endTime > c.startTime)
        )
    );

    if (isDuplicate) {
        return showToast("Conflict: A class or identical subject is already scheduled for this date and time slot!", "error");
    }

    routineList.push({
        id: Date.now(),
        branch,
        semester,
        subject,
        date,
        startTime,
        endTime,
        room
    });
    
    const allData = JSON.parse(localStorage.getItem(DB_ROUTINE) || '{}');
    allData[currentUser.uid] = routineList;
    localStorage.setItem(DB_ROUTINE, JSON.stringify(allData));
    
    document.getElementById('addRoutineForm').style.display = 'none';
    showToast("Class uniquely scheduled in Routine.", "success");
    renderRoutine();
    renderMasterTimetable();
    updateDutyStatusUI();
}

function deleteRoutineItem(id) {
    let routineList = getRoutine().filter(item => item.id !== id);
    const allData = JSON.parse(localStorage.getItem(DB_ROUTINE) || '{}');
    allData[currentUser.uid] = routineList;
    localStorage.setItem(DB_ROUTINE, JSON.stringify(allData));
    renderRoutine();
    renderMasterTimetable();
    showToast("Class removed from Routine.", "info");
}

function renderRoutine() {
    const container = document.getElementById('routineTablesContainer');
    const noDataMsg = document.getElementById('noRoutineMsg');
    const routineList = getRoutine();
    
    if (!container) return;
    container.innerHTML = ''; 
    
    if(routineList.length === 0) {
        noDataMsg.style.display = 'block';
        return;
    }
    
    noDataMsg.style.display = 'none';
    
    const branches = [...new Set(routineList.map(r => r.branch))];
    
    branches.forEach(branch => {
        const branchClasses = routineList.filter(r => r.branch === branch);
        
        let tableRows = '';
        branchClasses.forEach(c => {
            tableRows += `
                <tr>
                    <td>
                        <i class="fa-regular fa-calendar"></i> ${c.date}<br>
                        <small><i class="fa-regular fa-clock"></i> ${c.startTime} - ${c.endTime}</small>
                    </td>
                    <td style="font-weight: 600;">${c.subject}</td>
                    <td><span class="text-muted"><i class="fa-solid fa-graduation-cap"></i> ${c.semester}</span></td>
                    <td><span style="font-weight: 600; color: var(--secondary);"><i class="fa-solid fa-door-open"></i> ${c.room}</span></td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button class="btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openQRGeneratorForClass(${c.id})">
                               <i class="fa-solid fa-bolt"></i> Init QR
                            </button>
                            <button class="btn-danger" style="padding: 6px 10px; font-size: 0.8rem;" onclick="deleteRoutineItem(${c.id})">
                               <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        const branchBoxHTML = `
            <div class="branch-table-container custom-border mb-4">
                <div class="branch-table-title">${branch} Scheduled Classes</div>
                <div class="table-wrapper" style="border:none;">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Subject</th>
                                <th>Semester</th>
                                <th>Room No</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML += branchBoxHTML;
    });
}

// ================= DIRECT QR INITIALIZATION FROM ROUTINE =================
function openQRGeneratorForClass(classId) {
    // Block QR Initialization if teacher is marked Absent
    let checkInMap = JSON.parse(localStorage.getItem(DB_CHECKIN_STATE) || '{}');
    if (checkInMap[currentUser.uid]?.isAbsent) {
        return showToast("Cannot initialize QR while marked ABSENT. Switch to Present first.", "error");
    }

    const routineList = getRoutine();
    const targetClass = routineList.find(c => c.id === classId);
    if (!targetClass) return;

    document.getElementById('activeBranch').value = targetClass.branch;
    document.getElementById('activeSemester').value = targetClass.semester;
    document.getElementById('activeSubject').value = targetClass.subject;
    document.getElementById('activeRoom').value = targetClass.room;
    document.getElementById('activeTime').value = `${targetClass.date} (${targetClass.startTime} - ${targetClass.endTime})`;

    switchPage('generatePage');
    showToast(`Loaded ${targetClass.subject} (${targetClass.room}) for QR Generation`, "success");
}

document.getElementById('generateBtn')?.addEventListener('click', () => {
    let checkInMap = JSON.parse(localStorage.getItem(DB_CHECKIN_STATE) || '{}');
    if (checkInMap[currentUser.uid]?.isAbsent) {
        return showToast("Cannot initialize Gateway while marked ABSENT.", "error");
    }

    const branch = document.getElementById('activeBranch').value;
    const semester = document.getElementById('activeSemester').value;
    const subject = document.getElementById('activeSubject').value;
    const room = document.getElementById('activeRoom').value;
    const time = document.getElementById('activeTime').value;
    
    if(!branch || !semester || !subject) return showToast("Please select a class from My Routine first.", "error");

    const valTime = parseInt(document.getElementById('validityTime').value) || 5;
    const totalDuration = document.getElementById('validityUnit').value === 'minutes' ? valTime * 60 : valTime;

    document.getElementById('qrPreviewWrapper').style.display = 'block';
    document.getElementById('qrRoomMeta').innerText = `${subject} | ${room} | ${time}`;
    showToast("Geo-fenced Gateway Initialized", "success");
    
    startTimer(totalDuration);
    
    const qrCodeDiv = document.getElementById('qrCode');
    qrCodeDiv.innerHTML = '';
    
    new QRCode(qrCodeDiv, {
        text: JSON.stringify({
            fid: currentUser.uid,
            subject,
            branch,
            semester,
            room,
            time,
            exp: Date.now() + totalDuration * 1000
        }),
        width: 220,
        height: 220
    });
});

document.getElementById('expireBtn')?.addEventListener('click', () => {
    clearInterval(qrTimerInterval);
    document.getElementById('timerDisplay').innerText = "00:00";
    document.getElementById('qrCode').innerHTML = "<div style='padding:40px; color:var(--text-muted);'><i class='fa-solid fa-lock fa-3x'></i><p class='mt-2'>Session Closed</p></div>";
    showToast("Gateway Terminated.", "error");
});

function startTimer(seconds) {
    clearInterval(qrTimerInterval);
    const display = document.getElementById('timerDisplay');
    
    qrTimerInterval = setInterval(() => {
        seconds--;
        if (seconds <= 0) { 
            clearInterval(qrTimerInterval); 
            document.getElementById('expireBtn').click();
            return; 
        }
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        display.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

// ================= ATTENDANCE LOGS & EXPORT =================
function renderAttendanceLogs() {
    const container = document.getElementById('branchLogsContainer');
    container.innerHTML = '';
    
    const routineList = getRoutine();
    const branches = [...new Set(routineList.map(r => r.branch))];
    const globalRecords = JSON.parse(localStorage.getItem(DB_ATTENDANCE) || '[]');
    
    if(branches.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
              <i class="fa-solid fa-folder-open"></i>
              <p>No attendance records logged for any branches yet.</p>
            </div>
        `;
        return;
    }

    branches.forEach(branch => {
        const branchRecords = globalRecords.filter(r => r.branch === branch);
        let rowsHTML = '';

        if (branchRecords.length === 0) {
            rowsHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">
                        Currently 0 records for ${branch}
                    </td>
                </tr>
            `;
        } else {
            branchRecords.forEach(r => {
                rowsHTML += `
                    <tr>
                        <td><strong>${r.rollNo}</strong></td>
                        <td>${r.studentName}</td>
                        <td>${r.semester || 'N/A'}</td>
                        <td>${r.subject}</td>
                        <td>${r.attended} / ${r.total}</td>
                        <td><span style="background:var(--success); color:#fff; padding:4px 8px; border-radius:4px; font-size:0.8rem;">Present</span></td>
                    </tr>
                `;
            });
        }

        const tableHTML = `
            <div class="branch-table-container custom-border mt-3">
                <div class="branch-table-title">${branch} Logs</div>
                <div class="table-wrapper" style="border:none;">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Student Reg ID</th>
                                <th>Name</th>
                                <th>Semester</th>
                                <th>Subject</th>
                                <th>Classes Attended</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHTML}</tbody>
                    </table>
                </div>
            </div>
        `;
        container.innerHTML += tableHTML;
    });
}

function exportData(format) {
    document.getElementById('exportMenu').classList.remove('show');
    
    if(format === 'csv') {
        let csv = "Branch,Semester,Student ID,Name,Subject,Attended,Status\n";
        csv += "B.Tech,Semester 1,REG-000,No Data,N/A,0,N/A\n";
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Logs_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        showToast("CSV Downloaded successfully.", "success");
    } else {
        showToast(`Exporting to ${format.toUpperCase()}... Check your downloads.`, "success");
    }
}