// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAX9uLVgUyvjGi-lruDaF0KP2vCuLhWrPM",
  authDomain: "datastore-120c0.firebaseapp.com",
  databaseURL: "https://datastore-120c0-default-rtdb.firebaseio.com",
  projectId: "datastore-120c0",
  storageBucket: "datastore-120c0.firebasestorage.app",
  messagingSenderId: "196814843209",
  appId: "1:196814843209:web:5cd555ac056618ee8abe98",
  measurementId: "G-YF2M5J1J6S"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// State Variables
let currentUser = null; // Username string or 'admin'
let userRole = null;    // 'user' or 'admin'

// Switch Login Tab (User vs Admin) - Default is USER
function switchLoginType(type) {
  const userForm = document.getElementById('user-login-form');
  const adminForm = document.getElementById('admin-login-form');
  const tabUser = document.getElementById('tab-user-btn');
  const tabAdmin = document.getElementById('tab-admin-btn');

  if (type === 'user') {
    userForm.style.display = 'block';
    adminForm.style.display = 'none';
    tabUser.classList.add('active');
    tabAdmin.classList.remove('active');
  } else {
    userForm.style.display = 'none';
    adminForm.style.display = 'block';
    tabAdmin.classList.add('active');
    tabUser.classList.remove('active');
  }
}

// User Login Submit (PIN ONLY)
document.getElementById('user-login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const pin = document.getElementById('login-pin').value.trim();

  if (pin.length !== 4 || isNaN(pin)) {
    alert('Please enter a valid 4-digit PIN.');
    return;
  }

  // Find user by PIN
  database.ref('users').once('value').then(snapshot => {
    const users = snapshot.val();
    let foundUsername = null;

    if (users) {
      for (let uname in users) {
        if (users[uname].pin === pin) {
          foundUsername = uname;
          break;
        }
      }
    }

    if (foundUsername) {
      currentUser = foundUsername;
      userRole = 'user';
      startUserSession();
    } else {
      alert('Invalid PIN! No account found for this PIN.');
    }
  }).catch(err => {
    alert('Error connecting to server: ' + err.message);
  });
});

// Admin Login Submit (Master ID: 764061)
document.getElementById('admin-login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const adminId = document.getElementById('admin-id').value.trim();

  if (adminId === "764061") {
    currentUser = "Admin";
    userRole = "admin";
    startAdminSession();
  } else {
    alert('Invalid Admin ID!');
  }
});

// Session Helpers
function startUserSession() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('app-header').style.display = 'flex';
  document.getElementById('user-display-name').textContent = `User: ${currentUser}`;
  document.getElementById('dashboard-section').style.display = 'block';
}

function startAdminSession() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('app-header').style.display = 'flex';
  document.getElementById('user-display-name').textContent = `Role: ADMIN`;
  document.getElementById('admin-panel-section').style.display = 'block';
  loadUsersListInAdmin();
  loadAdminUserDropdown();
  loadDeleteRequestsInAdmin();
}

function logout() {
  currentUser = null;
  userRole = null;
  document.getElementById('app-header').style.display = 'none';
  document.getElementById('dashboard-section').style.display = 'none';
  document.getElementById('add-data-section').style.display = 'none';
  document.getElementById('reports-section').style.display = 'none';
  document.getElementById('syncin-section').style.display = 'none';
  document.getElementById('admin-panel-section').style.display = 'none';
  
  // Reset Forms and Default to User Login View
  document.getElementById('user-login-form').reset();
  document.getElementById('admin-login-form').reset();
  switchLoginType('user');
  document.getElementById('login-section').style.display = 'block';
}

// USER SECTION NAVIGATION
function openSection(section) {
  document.getElementById('dashboard-section').style.display = 'none';
  document.getElementById('add-data-section').style.display = 'none';
  document.getElementById('reports-section').style.display = 'none';
  document.getElementById('syncin-section').style.display = 'none';

  if (section === 'add') {
    document.getElementById('add-data-section').style.display = 'block';
    resetForm();
  } else if (section === 'reports') {
    document.getElementById('reports-section').style.display = 'block';
    renderLocalReports();
  } else if (section === 'syncin') {
    document.getElementById('syncin-section').style.display = 'block';
    syncInData();
  }
}

function goToDashboard() {
  document.getElementById('add-data-section').style.display = 'none';
  document.getElementById('reports-section').style.display = 'none';
  document.getElementById('syncin-section').style.display = 'none';
  document.getElementById('dashboard-section').style.display = 'block';
  resetForm();
}

function getCurrentDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB');
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return `${date} ${time}`;
}

function getStorageKey() {
  return `data_${currentUser}`;
}

function getStoredRecords() {
  const data = localStorage.getItem(getStorageKey());
  return data ? JSON.parse(data) : [];
}

// USER-SPECIFIC CONTINUOUS SL NO
async function fetchNextSlNo() {
  const localRecords = getStoredRecords();
  let maxSlNo = 0;

  localRecords.forEach(r => {
    if (r.slNo && r.slNo > maxSlNo) maxSlNo = r.slNo;
  });

  try {
    const snapshot = await database.ref(`user_data/${currentUser}`).once('value');
    const cloudData = snapshot.val();
    
    if (cloudData) {
      for (let key in cloudData) {
        const item = cloudData[key];
        if (item.slNo && parseInt(item.slNo) > maxSlNo) {
          maxSlNo = parseInt(item.slNo);
        }
      }
    }
  } catch (err) {
    console.error("Sl No Fetch Error:", err);
  }

  return maxSlNo + 1;
}

async function initForm() {
  const editIdx = parseInt(document.getElementById('edit-index').value);

  if (editIdx === -1) {
    document.getElementById('sl-no').value = "Loading...";
    document.getElementById('date-time').value = getCurrentDateTime();
    document.getElementById('form-heading').innerText = 'Add New Record';
    document.getElementById('btn-save').innerText = 'Save Data';

    const nextSlNo = await fetchNextSlNo();
    document.getElementById('sl-no').value = nextSlNo;
  }
}

document.getElementById('data-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const editIndex = parseInt(document.getElementById('edit-index').value);
  const slNo = parseInt(document.getElementById('sl-no').value);
  const dateTime = document.getElementById('date-time').value;
  const consumerNo = document.getElementById('consumer-no').value.trim();
  const meterNo = document.getElementById('meter-no').value.trim();
  const meterType = document.getElementById('meter-type').value;
  const remarks = document.getElementById('remarks').value.trim();

  const records = getStoredRecords();

  if (editIndex === -1) {
    const newRecord = { slNo, dateTime, consumerNo, meterNo, meterType, remarks };
    records.push(newRecord);
    alert('Data saved locally successfully!');
  } else {
    records[editIndex] = {
      slNo: records[editIndex].slNo,
      dateTime: getCurrentDateTime(),
      consumerNo,
      meterNo,
      meterType,
      remarks
    };
    alert('Data updated locally!');
  }

  localStorage.setItem(getStorageKey(), JSON.stringify(records));
  resetForm();
  goToDashboard();
});

function resetForm() {
  document.getElementById('data-form').reset();
  document.getElementById('edit-index').value = "-1";
  initForm();
}

function renderLocalReports() {
  const records = getStoredRecords();
  const tbody = document.getElementById('reports-tbody');
  tbody.innerHTML = '';

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No pending local data found.</td></tr>`;
    return;
  }

  records.forEach((record, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="badge-pending">Local</span></td>
      <td>${record.slNo}</td>
      <td>${record.dateTime}</td>
      <td>${record.consumerNo}</td>
      <td>${record.meterNo}</td>
      <td>${record.meterType}</td>
      <td>${record.remarks || '-'}</td>
      <td><button class="btn-edit" onclick="editRecord(${index})">Edit</button></td>
    `;
    tbody.appendChild(row);
  });
}

function editRecord(index) {
  const records = getStoredRecords();
  const record = records[index];

  if (!record) return;

  document.getElementById('dashboard-section').style.display = 'none';
  document.getElementById('reports-section').style.display = 'none';
  document.getElementById('add-data-section').style.display = 'block';

  document.getElementById('edit-index').value = index;
  document.getElementById('sl-no').value = record.slNo;
  document.getElementById('date-time').value = record.dateTime;
  document.getElementById('consumer-no').value = record.consumerNo;
  document.getElementById('meter-no').value = record.meterNo;
  document.getElementById('meter-type').value = record.meterType;
  document.getElementById('remarks').value = record.remarks || '';

  document.getElementById('form-heading').innerText = 'Edit Record (Sl No: ' + record.slNo + ')';
  document.getElementById('btn-save').innerText = 'Update Data';
}

// SYNC OUT
function syncOutData() {
  const records = getStoredRecords();

  if (records.length === 0) {
    alert('No local data available to sync out!');
    return;
  }

  let completed = 0;
  const total = records.length;

  records.forEach(record => {
    const dataToUpload = {
      slNo: record.slNo,
      dateTime: record.dateTime,
      consumerNo: record.consumerNo,
      meterNo: record.meterNo,
      meterType: record.meterType,
      remarks: record.remarks,
      user: currentUser,
      deleteRequested: false
    };

    database.ref(`user_data/${currentUser}`).push(dataToUpload).then(() => {
      completed++;
      if (completed === total) {
        alert(`${total} record(s) synced to cloud successfully!`);
        localStorage.removeItem(getStorageKey());
        renderLocalReports();
      }
    }).catch(err => {
      console.error("Sync Error:", err);
      alert("Error: " + err.message);
    });
  });
}

// SYNC IN
function syncInData() {
  const tbody = document.getElementById('syncin-tbody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading cloud data...</td></tr>`;

  database.ref(`user_data/${currentUser}`).once('value').then(snapshot => {
    tbody.innerHTML = '';
    const data = snapshot.val();

    if (!data) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No cloud data found.</td></tr>`;
      return;
    }

    for (let key in data) {
      const record = data[key];
      const row = document.createElement('tr');

      const isRequested = record.deleteRequested === true;
      const reqBtn = isRequested 
        ? `<button class="btn-req-del requested" disabled>Requested</button>`
        : `<button class="btn-req-del" onclick="requestDelete('${key}')">Request Delete</button>`;

      row.innerHTML = `
        <td>${record.slNo || '-'}</td>
        <td>${record.dateTime || '-'}</td>
        <td>${record.consumerNo || '-'}</td>
        <td>${record.meterNo || '-'}</td>
        <td>${record.meterType || '-'}</td>
        <td>${record.remarks || '-'}</td>
        <td>${reqBtn}</td>
      `;
      tbody.appendChild(row);
    }
  });
}

// USER DELETE REQUEST
function requestDelete(key) {
  if (confirm("Are you sure you want to request deletion for this record?")) {
    database.ref(`user_data/${currentUser}/${key}`).update({
      deleteRequested: true
    }).then(() => {
      database.ref(`delete_requests/${key}`).set({
        user: currentUser,
        recordKey: key
      });
      alert("Delete request sent to Admin.");
      syncInData();
    });
  }
}

// EXPORT TO EXCEL/CSV HELPER FUNCTION
function exportToCSV(filename, rowsData) {
  let csvContent = "data:text/csv;charset=utf-8,";
  
  rowsData.forEach(row => {
    let rowString = row.map(item => `"${String(item).replace(/"/g, '""')}"`).join(",");
    csvContent += rowString + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// DOWNLOAD USER DATA (USER PANEL)
function downloadUserDataCSV() {
  database.ref(`user_data/${currentUser}`).once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data) {
      alert("No cloud data available to download.");
      return;
    }

    const csvData = [["Sl No", "Date & Time", "Consumer No", "Meter No", "Meter Type", "Remarks"]];

    for (let key in data) {
      const item = data[key];
      csvData.push([
        item.slNo || '',
        item.dateTime || '',
        item.consumerNo || '',
        item.meterNo || '',
        item.meterType || '',
        item.remarks || ''
      ]);
    }

    exportToCSV(`${currentUser}_Meter_Data.csv`, csvData);
  });
}

// DOWNLOAD SELECTED USER DATA (ADMIN PANEL)
function downloadSelectedUserCSV() {
  const selectedUser = document.getElementById('admin-select-user').value;
  if (!selectedUser) {
    alert("Please select a user first to download data!");
    return;
  }

  database.ref(`user_data/${selectedUser}`).once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data) {
      alert(`No data found for user: ${selectedUser}`);
      return;
    }

    const csvData = [["Sl No", "Date & Time", "Consumer No", "Meter No", "Meter Type", "Remarks"]];

    for (let key in data) {
      const item = data[key];
      csvData.push([
        item.slNo || '',
        item.dateTime || '',
        item.consumerNo || '',
        item.meterNo || '',
        item.meterType || '',
        item.remarks || ''
      ]);
    }

    exportToCSV(`${selectedUser}_Data_Report.csv`, csvData);
  });
}

// ================= ADMIN PANEL LOGIC =================

function switchAdminSubTab(viewName) {
  const tabs = document.querySelectorAll('.btn-admin-tab');
  tabs.forEach(t => t.classList.remove('active'));
  
  document.getElementById('admin-create-user-view').style.display = 'none';
  document.getElementById('admin-manage-users-view').style.display = 'none';
  document.getElementById('admin-view-data-view').style.display = 'none';
  document.getElementById('admin-delete-requests-view').style.display = 'none';

  if (viewName === 'create-user') {
    tabs[0].classList.add('active');
    document.getElementById('admin-create-user-view').style.display = 'block';
  } else if (viewName === 'manage-users') {
    tabs[1].classList.add('active');
    document.getElementById('admin-manage-users-view').style.display = 'block';
    loadUsersListInAdmin();
  } else if (viewName === 'view-user-data') {
    tabs[2].classList.add('active');
    document.getElementById('admin-view-data-view').style.display = 'block';
    loadAdminUserDropdown();
  } else if (viewName === 'delete-requests') {
    tabs[3].classList.add('active');
    document.getElementById('admin-delete-requests-view').style.display = 'block';
    loadDeleteRequestsInAdmin();
  }
}

// CREATE USER FORM (WITH DUPLICATE PIN & USERNAME CHECK)
document.getElementById('create-user-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const uname = document.getElementById('new-username').value.trim();
  const pin = document.getElementById('new-pin').value.trim();

  if (pin.length !== 4 || isNaN(pin)) {
    alert("PIN must be a 4-digit number!");
    return;
  }

  // Check if PIN already exists for any user
  database.ref('users').once('value').then(snapshot => {
    const users = snapshot.val() || {};

    if (users[uname]) {
      alert("This Username already exists!");
      return;
    }

    for (let u in users) {
      if (users[u].pin === pin) {
        alert("This 4-Digit PIN is already assigned to another user! Please choose a different PIN.");
        return;
      }
    }

    // Create User if unique
    database.ref(`users/${uname}`).set({
      pin: pin,
      createdAt: getCurrentDateTime()
    }).then(() => {
      alert(`User "${uname}" created successfully with PIN: ${pin}`);
      document.getElementById('create-user-form').reset();
    });
  });
});

// LOAD ALL USERS & PIN RESET / DELETE USER
function loadUsersListInAdmin() {
  const tbody = document.getElementById('admin-users-tbody');
  tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

  database.ref('users').once('value').then(snapshot => {
    tbody.innerHTML = '';
    const users = snapshot.val();

    if (!users) {
      tbody.innerHTML = '<tr><td colspan="3">No registered users found.</td></tr>';
      return;
    }

    for (let uname in users) {
      const u = users[uname];
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><b>${uname}</b></td>
        <td>${u.pin}</td>
        <td>
          <button class="btn-edit" onclick="adminResetPin('${uname}')">Reset PIN</button>
          <button class="btn-reject" onclick="adminDeleteUser('${uname}')">Delete User</button>
        </td>
      `;
      tbody.appendChild(row);
    }
  });
}

function adminResetPin(uname) {
  const newPin = prompt(`Enter new unique 4-digit PIN for user "${uname}":`);
  if (newPin && newPin.length === 4 && !isNaN(newPin)) {
    
    // Check if PIN is duplicate
    database.ref('users').once('value').then(snapshot => {
      const users = snapshot.val() || {};
      for (let u in users) {
        if (users[u].pin === newPin && u !== uname) {
          alert("This 4-Digit PIN is already assigned to another user!");
          return;
        }
      }

      database.ref(`users/${uname}`).update({ pin: newPin }).then(() => {
        alert("PIN reset successfully!");
        loadUsersListInAdmin();
      });
    });

  } else if (newPin !== null) {
    alert("Please enter a valid 4-digit numeric PIN!");
  }
}

function adminDeleteUser(uname) {
  if (confirm(`Are you sure you want to delete user "${uname}" and all associated data?`)) {
    database.ref(`users/${uname}`).remove();
    database.ref(`user_data/${uname}`).remove().then(() => {
      alert("User and user data deleted.");
      loadUsersListInAdmin();
    });
  }
}

// VIEW SPECIFIC USER DATA
function loadAdminUserDropdown() {
  const select = document.getElementById('admin-select-user');
  select.innerHTML = '<option value="">-- Choose User --</option>';

  database.ref('users').once('value').then(snapshot => {
    const users = snapshot.val();
    if (users) {
      for (let uname in users) {
        const option = document.createElement('option');
        option.value = uname;
        option.textContent = uname;
        select.appendChild(option);
      }
    }
  });
}

function loadAdminSelectedUserData() {
  const uname = document.getElementById('admin-select-user').value;
  const tbody = document.getElementById('admin-user-data-tbody');

  if (!uname) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Please select a user to view data.</td></tr>';
    return;
  }

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading data...</td></tr>';

  database.ref(`user_data/${uname}`).once('value').then(snapshot => {
    tbody.innerHTML = '';
    const data = snapshot.val();

    if (!data) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No cloud data found for this user.</td></tr>`;
      return;
    }

    for (let key in data) {
      const record = data[key];
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.slNo || '-'}</td>
        <td>${record.dateTime || '-'}</td>
        <td>${record.consumerNo || '-'}</td>
        <td>${record.meterNo || '-'}</td>
        <td>${record.meterType || '-'}</td>
        <td>${record.remarks || '-'}</td>
      `;
      tbody.appendChild(row);
    }
  });
}

// DELETE REQUESTS MANAGEMENT
function loadDeleteRequestsInAdmin() {
  const tbody = document.getElementById('admin-requests-tbody');
  tbody.innerHTML = '<tr><td colspan="5">Loading requests...</td></tr>';

  database.ref('delete_requests').once('value').then(snapshot => {
    tbody.innerHTML = '';
    const reqs = snapshot.val();

    if (!reqs) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No pending delete requests.</td></tr>';
      return;
    }

    for (let reqKey in reqs) {
      const r = reqs[reqKey];
      database.ref(`user_data/${r.user}/${r.recordKey}`).once('value').then(recSnap => {
        const rec = recSnap.val();
        if (rec) {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><b>${r.user}</b></td>
            <td>${rec.slNo}</td>
            <td>${rec.consumerNo}</td>
            <td>${rec.meterNo}</td>
            <td>
              <button class="btn-approve" onclick="approveDeleteRequest('${r.user}', '${r.recordKey}', '${reqKey}')">Approve Delete</button>
              <button class="btn-reject" onclick="rejectDeleteRequest('${r.user}', '${r.recordKey}', '${reqKey}')">Reject</button>
            </td>
          `;
          tbody.appendChild(row);
        }
      });
    }
  });
}

function approveDeleteRequest(username, recordKey, requestKey) {
  if (confirm("Are you sure you want to permanently delete this record?")) {
    database.ref(`user_data/${username}/${recordKey}`).remove();
    database.ref(`delete_requests/${requestKey}`).remove().then(() => {
      alert("Record deleted permanently.");
      loadDeleteRequestsInAdmin();
    });
  }
}

function rejectDeleteRequest(username, recordKey, requestKey) {
  database.ref(`user_data/${username}/${recordKey}`).update({ deleteRequested: false });
  database.ref(`delete_requests/${requestKey}`).remove().then(() => {
    alert("Delete request rejected.");
    loadDeleteRequestsInAdmin();
  });
}

// FILTER HELPER
function filterReports(tbodyId, searchInputId) {
  const searchValue = document.getElementById(searchInputId).value.toLowerCase().trim();
  const rows = document.querySelectorAll(`#${tbodyId} tr`);

  rows.forEach(row => {
    const consumerNoCell = tbodyId === 'reports-tbody' ? row.cells[3] : row.cells[2];
    const meterNoCell = tbodyId === 'reports-tbody' ? row.cells[4] : row.cells[3];

    const consumerNo = consumerNoCell ? consumerNoCell.textContent.toLowerCase() : '';
    const meterNo = meterNoCell ? meterNoCell.textContent.toLowerCase() : '';

    if (consumerNo.includes(searchValue) || meterNo.includes(searchValue)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}
