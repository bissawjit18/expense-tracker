
    console.log('JavaScript loaded');
    let currentUser = localStorage.getItem('currentUser') || null;
    let expenses = [];
    let filteredExpenses = [];
    let budget = {};
    let editingIndex = null;
    let categoryChart = null;
    let timelineChart = null;
    let isExpenseListVisible = true;

    // Local Storage Fallback
    function getLocalStorageItem(key, defaultValue) {
      try {
        if (key === 'users') {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : defaultValue;
        }
        const item = localStorage.getItem(`${currentUser}_${key}`);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error(`Error accessing localStorage for ${key}:`, error);
        return defaultValue;
      }
    }

    function setLocalStorageItem(key, value) {
      try {
        if (key === 'users') {
          localStorage.setItem(key, JSON.stringify(value));
        } else {
          localStorage.setItem(`${currentUser}_${key}`, JSON.stringify(value));
        }
      } catch (error) {
        console.error(`Error setting localStorage for ${key}:`, error);
      }
    }

    // User Management
    function loadUserProfile() {
      console.log('Loading user profile');
      if (!currentUser) {
        showUserModal();
        showNotification('প্রথমে একটি ইউজার প্রোফাইল তৈরি করুন!', 'info');
        return;
      }
      document.getElementById('currentUser').textContent = currentUser;
      updateUserSelect();
      expenses = getLocalStorageItem('expenses', []);
      filteredExpenses = [...expenses];
      budget = getLocalStorageItem('budget', {
        total: 0,
        food: 0,
        transport: 0,
        entertainment: 0,
        bill: 0,
        other: 0
      });
      renderExpenses();
      updateBudgetProgress();
      generateMonthlyReport();
      updateToggleButtonText();
    }

    function updateUserSelect() {
      console.log('Updating user select dropdown');
      const users = getLocalStorageItem('users', []);
      const userSelect = document.getElementById('userSelect');
      userSelect.innerHTML = '<option value="">ইউজার নির্বাচন করুন</option>';
      users.forEach(user => {
        userSelect.innerHTML += `<option value="${user}" ${user === currentUser ? 'selected' : ''}>${user}</option>`;
      });
    }

    function saveUserProfile() {
      console.log('Saving user profile');
      const userName = document.getElementById('userName').value.trim();
      if (!userName) {
        showNotification('ইউজারের নাম লিখুন!', 'error');
        return;
      }
      let users = getLocalStorageItem('users', []);
      if (!users.includes(userName)) {
        users.push(userName);
        setLocalStorageItem('users', users);
      }
      currentUser = userName;
      localStorage.setItem('currentUser', currentUser);
      loadUserProfile();
      closeUserModal();
      showNotification(`ইউজার প্রোফাইল তৈরি করা হয়েছে: ${userName}`, 'success');
    }

    function switchUser() {
      const userSelect = document.getElementById('userSelect').value;
      if (userSelect) {
        currentUser = userSelect;
        localStorage.setItem('currentUser', currentUser);
        loadUserProfile();
        showNotification(`ইউজার সুইচ করা হয়েছে: ${currentUser}`, 'success');
      }
    }

    function showUserModal() {
      console.log('Showing user modal');
      updateUserSelect();
      document.getElementById('userModal').classList.remove('hidden');
    }

    function closeUserModal() {
      console.log('Closing user modal');
      document.getElementById('userModal').classList.add('hidden');
      document.getElementById('userName').value = '';
    }

    function deleteUserPrompt() {
      console.log('Showing delete user confirmation');
      if (!currentUser) {
        showNotification('কোনো ইউজার নির্বাচিত নয়!', 'error');
        return;
      }
      document.getElementById('deleteUserModal').classList.remove('hidden');
    }

    function deleteUser() {
      console.log('Deleting user:', currentUser);
      let users = getLocalStorageItem('users', []);
      users = users.filter(user => user !== currentUser);
      setLocalStorageItem('users', users);
      localStorage.removeItem(`${currentUser}_expenses`);
      localStorage.removeItem(`${currentUser}_budget`);
      localStorage.removeItem(`${currentUser}_theme`);
      currentUser = null;
      localStorage.removeItem('currentUser');
      loadUserProfile();
      closeDeleteUserModal();
      closeUserModal();
      showNotification('ইউজার ডিলিট করা হয়েছে!', 'success');
    }

    function closeDeleteUserModal() {
      console.log('Closing delete user modal');
      document.getElementById('deleteUserModal').classList.add('hidden');
    }

    document.getElementById('userProfileButton').addEventListener('click', showUserModal);
    document.getElementById('userSelect').addEventListener('change', switchUser);

    // Dark Mode Toggle
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    function setInitialTheme() {
      console.log('Setting initial theme');
      const savedTheme = getLocalStorageItem('theme', null);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');
      themeIcon.textContent = initialTheme === 'dark' ? '☀️' : '🌙';
      setLocalStorageItem('theme', initialTheme);
      console.log('Applied theme:', initialTheme);
      updateCharts();
    }

    function toggleTheme() {
      console.log('Theme toggle clicked');
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      themeIcon.textContent = isDark ? '☀️' : '🌙';
      setLocalStorageItem('theme', isDark ? 'dark' : 'light');
      console.log('Theme set to:', isDark ? 'dark' : 'light');
      updateCharts();
    }

    themeToggle.addEventListener('click', toggleTheme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', e.matches);
      themeIcon.textContent = e.matches ? '☀️' : '🌙';
      setLocalStorageItem('theme', newTheme);
      updateCharts();
    });
    setInitialTheme();

    // Notification
    function showNotification(message, type = 'info') {
      const colors = {
        success: '#22c55e',
        error: '#ef4444',
        info: '#3b82f6'
      };
      Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: 'top',
        position: 'right',
        backgroundColor: colors[type],
        stopOnFocus: true
      }).showToast();
    }

    // Budget Management
    function saveBudget() {
      console.log('Saving budget');
      const totalBudget = parseFloat(document.getElementById('totalBudget').value) || 0;
      const foodBudget = parseFloat(document.getElementById('foodBudget').value) || 0;
      const transportBudget = parseFloat(document.getElementById('transportBudget').value) || 0;
      const entertainmentBudget = parseFloat(document.getElementById('entertainmentBudget').value) || 0;
      const billBudget = parseFloat(document.getElementById('billBudget').value) || 0;
      const otherBudget = parseFloat(document.getElementById('otherBudget').value) || 0;

      if (totalBudget < 0 || foodBudget < 0 || transportBudget < 0 || entertainmentBudget < 0 || billBudget < 0 || otherBudget < 0) {
        showNotification('বাজেট মান নেগেটিভ হতে পারে না!', 'error');
        return;
      }

      budget = {
        total: totalBudget,
        food: foodBudget,
        transport: transportBudget,
        entertainment: entertainmentBudget,
        bill: billBudget,
        other: otherBudget
      };
      setLocalStorageItem('budget', budget);
      updateBudgetProgress();
      showNotification('বাজেট সেভ করা হয়েছে!', 'success');
      checkBudgetLimits();
    }

    function updateBudgetProgress() {
      console.log('Updating budget progress');
      const categoryTotals = {
        খাবার: 0,
        পরিবহন: 0,
        বিনোদন: 0,
        বিল: 0,
        অন্যান্য: 0
      };
      let totalSpent = 0;

      expenses.forEach(expense => {
        categoryTotals[expense.category] += expense.amount;
        totalSpent += expense.amount;
      });

      document.getElementById('totalBudgetDisplay').textContent = budget.total.toFixed(2);
      document.getElementById('foodBudgetDisplay').textContent = budget.food.toFixed(2);
      document.getElementById('transportBudgetDisplay').textContent = budget.transport.toFixed(2);
      document.getElementById('entertainmentBudgetDisplay').textContent = budget.entertainment.toFixed(2);
      document.getElementById('billBudgetDisplay').textContent = budget.bill.toFixed(2);
      document.getElementById('otherBudgetDisplay').textContent = budget.other.toFixed(2);

      const totalProgress = budget.total ? (totalSpent / budget.total) * 100 : 0;
      document.getElementById('totalProgress').style.width = `${Math.min(totalProgress, 100)}%`;
      document.getElementById('totalProgress').style.backgroundColor = totalProgress > 100 ? '#ef4444' : '#3b82f6';

      const foodProgress = budget.food ? (categoryTotals['খাবার'] / budget.food) * 100 : 0;
      document.getElementById('foodProgress').style.width = `${Math.min(foodProgress, 100)}%`;
      document.getElementById('foodProgress').style.backgroundColor = foodProgress > 100 ? '#ef4444' : '#22c55e';

      const transportProgress = budget.transport ? (categoryTotals['পরিবহন'] / budget.transport) * 100 : 0;
      document.getElementById('transportProgress').style.width = `${Math.min(transportProgress, 100)}%`;
      document.getElementById('transportProgress').style.backgroundColor = transportProgress > 100 ? '#ef4444' : '#8b5cf6';

      const entertainmentProgress = budget.entertainment ? (categoryTotals['বিনোদন'] / budget.entertainment) * 100 : 0;
      document.getElementById('entertainmentProgress').style.width = `${Math.min(entertainmentProgress, 100)}%`;
      document.getElementById('entertainmentProgress').style.backgroundColor = entertainmentProgress > 100 ? '#ef4444' : '#eab308';

      const billProgress = budget.bill ? (categoryTotals['বিল'] / budget.bill) * 100 : 0;
      document.getElementById('billProgress').style.width = `${Math.min(billProgress, 100)}%`;
      document.getElementById('billProgress').style.backgroundColor = billProgress > 100 ? '#ef4444' : '#ef4444';

      const otherProgress = budget.other ? (categoryTotals['অন্যান্য'] / budget.other) * 100 : 0;
      document.getElementById('otherProgress').style.width = `${Math.min(otherProgress, 100)}%`;
      document.getElementById('otherProgress').style.backgroundColor = otherProgress > 100 ? '#ef4444' : '#6366f1';
    }

    function checkBudgetLimits() {
      console.log('Checking budget limits');
      const categoryTotals = {
        খাবার: 0,
        পরিবহন: 0,
        বিনোদন: 0,
        বিল: 0,
        অন্যান্য: 0
      };
      let totalSpent = 0;

      expenses.forEach(expense => {
        categoryTotals[expense.category] += expense.amount;
        totalSpent += expense.amount;
      });

      if (budget.total && totalSpent > budget.total) {
        showNotification(`মোট বাজেট অতিক্রম করেছে! (ব্যয়: ${totalSpent.toFixed(2)} টাকা)`, 'error');
      }
      if (budget.food && categoryTotals['খাবার'] > budget.food) {
        showNotification(`খাবারের বাজেট অতিক্রম করেছে! (ব্যয়: ${categoryTotals['খাবার'].toFixed(2)} টাকা)`, 'error');
      }
      if (budget.transport && categoryTotals['পরিবহন'] > budget.transport) {
        showNotification(`পরিবহনের বাজেট অতিক্রম করেছে! (ব্যয়: ${categoryTotals['পরিবহন'].toFixed(2)} টাকা)`, 'error');
      }
      if (budget.entertainment && categoryTotals['বিনোদন'] > budget.entertainment) {
        showNotification(`বিনোদনের বাজেট অতিক্রম করেছে! (ব্যয়: ${categoryTotals['বিনোদন'].toFixed(2)} টাকা)`, 'error');
      }
      if (budget.bill && categoryTotals['বিল'] > budget.bill) {
        showNotification(`বিলের বাজেট অতিক্রম করেছে! (ব্যয়: ${categoryTotals['বিল'].toFixed(2)} টাকা)`, 'error');
      }
      if (budget.other && categoryTotals['অন্যান্য'] > budget.other) {
        showNotification(`অন্যান্য বাজেট অতিক্রম করেছে! (ব্যয়: ${categoryTotals['অন্যান্য'].toFixed(2)} টাকা)`, 'error');
      }
    }

    // Expense Management
    function addExpense() {
      console.log('Adding expense');
      const date = document.getElementById('date').value;
      const description = document.getElementById('description').value.trim();
      const amount = parseFloat(document.getElementById('amount').value);
      const category = document.getElementById('category').value;
      const notes = document.getElementById('notes').value;

      if (!date) {
        showNotification('তারিখ নির্বাচন করুন!', 'error');
        return;
      }
      if (!description) {
        showNotification('বিবরণ লিখুন!', 'error');
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        showNotification('বৈধ টাকার পরিমাণ লিখুন!', 'error');
        return;
      }

      const expense = { date, description, amount, category, notes };
      expenses.push(expense);
      setLocalStorageItem('expenses', expenses);
      filteredExpenses = [...expenses];
      renderExpenses();
      updateBudgetProgress();
      checkBudgetLimits();
      generateMonthlyReport();
      clearForm();
      showNotification('খরচ যোগ করা হয়েছে!', 'success');
    }

    function editExpense(index) {
      console.log('Editing expense at index:', index);
      editingIndex = index;
      const expense = expenses[index];
      document.getElementById('editDate').value = expense.date;
      document.getElementById('editDescription').value = expense.description;
      document.getElementById('editAmount').value = expense.amount;
      document.getElementById('editCategory').value = expense.category;
      document.getElementById('editNotes').value = expense.notes;
      document.getElementById('editModal').classList.remove('hidden');
    }

    function saveEditedExpense() {
      console.log('Saving edited expense');
      const date = document.getElementById('editDate').value;
      const description = document.getElementById('editDescription').value.trim();
      const amount = parseFloat(document.getElementById('editAmount').value);
      const category = document.getElementById('editCategory').value;
      const notes = document.getElementById('editNotes').value;

      if (!date) {
        showNotification('তারিখ নির্বাচন করুন!', 'error');
        return;
      }
      if (!description) {
        showNotification('বিবরণ লিখুন!', 'error');
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        showNotification('বৈধ টাকার পরিমাণ লিখুন!', 'error');
        return;
      }

      expenses[editingIndex] = { date, description, amount, category, notes };
      setLocalStorageItem('expenses', expenses);
      filteredExpenses = [...expenses];
      renderExpenses();
      updateBudgetProgress();
      checkBudgetLimits();
      generateMonthlyReport();
      closeEditModal();
      showNotification('খরচ সম্পাদনা করা হয়েছে!', 'success');
    }

    function closeEditModal() {
      console.log('Closing edit modal');
      document.getElementById('editModal').classList.add('hidden');
      editingIndex = null;
    }

    function deleteExpense(index) {
      console.log('Deleting expense at index:', index);
      expenses.splice(index, 1);
      setLocalStorageItem('expenses', expenses);
      filteredExpenses = [...expenses];
      renderExpenses();
      updateBudgetProgress();
      checkBudgetLimits();
      generateMonthlyReport();
      showNotification('খরচ মুছে ফেলা হয়েছে!', 'success');
    }

    function toggleExpenseList() {
      console.log('Toggling expense list visibility');
      isExpenseListVisible = !isExpenseListVisible;
      const desktopTable = document.querySelector('.desktop-table');
      const mobileCards = document.querySelector('.mobile-cards');
      const totalAmount = document.getElementById('totalAmount').parentElement;

      if (isExpenseListVisible) {
        desktopTable.style.display = window.innerWidth <= 640 ? 'none' : 'block';
        mobileCards.style.display = window.innerWidth > 640 ? 'none' : 'block';
        totalAmount.style.display = 'block';
      } else {
        desktopTable.style.display = 'none';
        mobileCards.style.display = 'none';
        totalAmount.style.display = 'none';
      }

      updateToggleButtonText();
    }

    function updateToggleButtonText() {
      const toggleButton = document.getElementById('toggleExpenseListButton');
      toggleButton.textContent = isExpenseListVisible ? 'তালিকা হাইড করুন' : 'তালিকা শো করুন';
    }

    function renderExpenses() {
      console.log('Rendering expenses');
      const tableBody = document.getElementById('expenseTable');
      const cardContainer = document.getElementById('expenseCards');
      if (!tableBody || !cardContainer) {
        console.error('Expense table or cards container not found');
        return;
      }
      tableBody.innerHTML = '';
      cardContainer.innerHTML = '';
      let total = 0;

      filteredExpenses.forEach((expense, index) => {
        total += expense.amount;

        // Desktop Table
        const row = `
          <tr>
            <td class="p-2 border dark:border-gray-600">${expense.date}</td>
            <td class="p-2 border dark:border-gray-600">${expense.description}</td>
            <td class="p-2 border dark:border-gray-600">${expense.amount}</td>
            <td class="p-2 border dark:border-gray-600">${expense.category}</td>
            <td class="p-2 border dark:border-gray-600">${expense.notes}</td>
            <td class="p-2 border dark:border-gray-600">
              <button onclick="editExpense(${index})" class="text-blue-500 hover:underline mr-2">ইডিট</button>
              <button onclick="deleteExpense(${index})" class="text-red-500 hover:underline">মুছুন</button>
            </td>
          </tr>`;
        tableBody.innerHTML += row;

        // Mobile Card
        const card = `
          <div class="expense-card bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow">
            <p><strong>তারিখ:</strong> ${expense.date}</p>
            <p><strong>বিবরণ:</strong> ${expense.description}</p>
            <p><strong>টাকা:</strong> ${expense.amount}</p>
            <p><strong>ক্যাটাগরি:</strong> ${expense.category}</p>
            <p><strong>মন্তব্য:</strong> ${expense.notes || '-'}</p>
            <div class="mt-2 flex gap-2">
              <button onclick="editExpense(${index})" class="text-blue-500 hover:underline">ইডিট</button>
              <button onclick="deleteExpense(${index})" class="text-red-500 hover:underline">মুছুন</button>
            </div>
          </div>`;
        cardContainer.innerHTML += card;
      });

      document.getElementById('totalAmount').textContent = total.toFixed(2);
      toggleExpenseList(); // Ensure visibility is correctly set after rendering
      toggleExpenseList(); // Toggle back to maintain default visible state
    }

    function clearForm() {
      console.log('Clearing form');
      document.getElementById('date').value = '';
      document.getElementById('description').value = '';
      document.getElementById('amount').value = '';
      document.getElementById('category').value = 'খাবার';
      document.getElementById('notes').value = '';
    }

    function filterExpenses() {
      console.log('Filtering expenses');
      const startDate = document.getElementById('filterStartDate').value;
      const endDate = document.getElementById('filterEndDate').value;
      const category = document.getElementById('filterCategory').value;

      filteredExpenses = expenses.filter(expense => {
        let matches = true;
        if (startDate && expense.date < startDate) matches = false;
        if (endDate && expense.date > endDate) matches = false;
        if (category && expense.category !== category) matches = false;
        return matches;
      });

      renderExpenses();
    }

    function exportToCSV() {
      console.log('Exporting to CSV');
      const headers = ['তারিখ,বিবরণ,টাকা,ক্যাটাগরি,মন্তব্য'];
      const rows = filteredExpenses.map(expense => 
        `${expense.date},${expense.description},${expense.amount},${expense.category},${expense.notes}`
      );
      const csvContent = headers.concat(rows).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'expenses.csv';
      link.click();
      showNotification('CSV ফাইল এক্সপোর্ট করা হয়েছে!', 'success');
    }

    function printExpenses() {
      console.log('Printing expenses');
      const printContent = document.querySelector('.desktop-table').outerHTML;
      const total = document.getElementById('totalAmount').textContent;
      const userName = currentUser || 'ইউজার';
      const printWindow = window.open('', '', 'height=600,width=800');
      printWindow.document.write(`
        <html>
          <head>
            <title>খরচের তালিকা</title>
            <style>
              body { font-family: 'Noto Sans Bengali', sans-serif; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h2>ইউজার: ${userName} - খরচের তালিকা</h2>
            ${printContent}
            <p><strong>মোট খরচ: ${total} টাকা</strong></p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      showNotification('খরচের তালিকা প্রিন্ট করা হয়েছে!', 'success');
    }

    function generateMonthlyReport() {
      console.log('Generating monthly report');
      const reportMonth = document.getElementById('reportMonth').value;
      if (!reportMonth) {
        document.getElementById('monthlyReport').innerHTML = `<p class="text-gray-900 dark:text-slate-100">কোনো রিপোর্ট উপলব্ধ নেই। মাস নির্বাচন করুন।</p>`;
        updateCharts([]);
        return;
      }

      const [year, month] = reportMonth.split('-');
      const filteredByMonth = expenses.filter(expense => 
        expense.date.startsWith(`${year}-${month}`)
      );

      let total = 0;
      const categoryBreakdown = {};
      filteredByMonth.forEach(expense => {
        total += expense.amount;
        categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
      });

      let reportHTML = `
        <div class="space-y-4">
          <div>
            <p class="text-lg font-semibold">মাস: <span class="text-indigo-600 dark:text-indigo-400">${year}-${month}</span></p>
            <p class="text-lg font-semibold">মোট খরচ: <span class="text-indigo-600 dark:text-indigo-400">${total.toFixed(2)}</span> টাকা</p>
          </div>
          <div>
            <p class="text-md font-semibold mb-2 text-gray-900 dark:text-slate-100">ক্যাটাগরি অনুযায়ী খরচ:</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm font-medium text-gray-800 dark:text-slate-200">
      `;
      for (const [category, amount] of Object.entries(categoryBreakdown)) {
        reportHTML += `<div class="flex justify-between"><span>${category}</span><span>${amount.toFixed(2)} টাকা</span></div>`;
      }
      reportHTML += `
            </div>
          </div>
        </div>
      `;

      document.getElementById('monthlyReport').innerHTML = reportHTML;
      updateCharts(filteredByMonth, year, month);
    }

    function updateCharts(filteredExpenses = [], year, month) {
      console.log('Updating charts');
      const isDarkMode = document.documentElement.classList.contains('dark');
      const textColor = isDarkMode ? '#f1f5f9' : '#111827';
      const gridColor = isDarkMode ? '#475569' : '#d1d5db';
      const isMobile = window.innerWidth <= 640;
      const isTablet = window.innerWidth > 640 && window.innerWidth <= 1024;
      const fontSize = isMobile ? 10 : isTablet ? 12 : 14;
      const titleFontSize = isMobile ? 12 : isTablet ? 14 : 16;
      const legendPadding = isMobile ? 8 : isTablet ? 10 : 12;

      const categoryBreakdown = {};
      filteredExpenses.forEach(expense => {
        categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
      });

      // Pie Chart
      if (categoryChart) categoryChart.destroy();
      categoryChart = new Chart(document.getElementById('categoryChart'), {
        type: 'pie',
        data: {
          labels: Object.keys(categoryBreakdown),
          datasets: [{
            data: Object.values(categoryBreakdown),
            backgroundColor: ['#34d399', '#a855f7', '#facc15', '#f87171', '#3b82f6', '#f472b6', '#9ca3af', '#2dd4bf'],
            hoverOffset: 20,
            borderWidth: 1,
            borderColor: isDarkMode ? '#e2e8f0' : '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { 
              position: isMobile ? 'bottom' : 'top', 
              labels: { 
                font: { size: fontSize, family: 'Noto Sans Bengali' }, 
                color: textColor,
                padding: legendPadding,
                boxWidth: isMobile ? 24 : 32
              } 
            },
            title: { 
              display: true, 
              text: 'ক্যাটাগরি-ভিত্তিক খরচ', 
              font: { size: titleFontSize, family: 'Noto Sans Bengali' }, 
              color: textColor,
              padding: { top: 8, bottom: 8 }
            },
            tooltip: {
              bodyFont: { size: fontSize, family: 'Noto Sans Bengali' },
              titleFont: { size: fontSize + 2, family: 'Noto Sans Bengali' }
            }
          }
        }
      });

      // Line Chart
      const dailyTotals = {};
      filteredExpenses.forEach(expense => {
        const date = expense.date;
        dailyTotals[date] = (dailyTotals[date] || 0) + expense.amount;
      });

      const sortedDates = Object.keys(dailyTotals).sort();
      if (timelineChart) timelineChart.destroy();

      const ctx = document.getElementById('timelineChart').getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, isMobile ? 300 : isTablet ? 350 : 400);
      gradient.addColorStop(0, isDarkMode ? 'rgba(129, 140, 248, 0.8)' : 'rgba(59, 130, 246, 0.8)');
      gradient.addColorStop(1, isDarkMode ? 'rgba(165, 180, 252, 0.2)' : 'rgba(96, 165, 250, 0.2)');

      timelineChart = new Chart(document.getElementById('timelineChart'), {
        type: 'line',
        data: {
          labels: sortedDates,
          datasets: [{
            label: 'দৈনিক খরচ',
            data: sortedDates.map(date => dailyTotals[date]),
            borderColor: isDarkMode ? '#818cf8' : '#3b82f6',
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointRadius: isMobile ? 3 : 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { 
              position: isMobile ? 'bottom' : 'top', 
              labels: { 
                font: { size: fontSize, family: 'Noto Sans Bengali' }, 
                color: textColor,
                padding: legendPadding,
                boxWidth: isMobile ? 24 : 32
              } 
            },
            title: { 
              display: true, 
              text: 'দৈনিক খরচ ট্রেন্ড', 
              font: { size: titleFontSize, family: 'Noto Sans Bengali' }, 
              color: textColor,
              padding: { top: 8, bottom: 8 }
            },
            tooltip: {
              bodyFont: { size: fontSize, family: 'Noto Sans Bengali' },
              titleFont: { size: fontSize + 2, family: 'Noto Sans Bengali' }
            }
          },
          scales: {
            x: { 
              title: { 
                display: true, 
                text: 'তারিখ', 
                font: { size: fontSize + 2, family: 'Noto Sans Bengali' }, 
                color: textColor,
                padding: { top: 4 }
              },
              grid: { color: gridColor },
              ticks: { 
                font: { size: fontSize, family: 'Noto Sans Bengali' }, 
                color: textColor,
                maxRotation: isMobile ? 45 : 0,
                minRotation: isMobile ? 45 : 0
              }
            },
            y: { 
              title: { 
                display: true, 
                text: 'টাকা', 
                font: { size: fontSize + 2, family: 'Noto Sans Bengali' }, 
                color: textColor,
                padding: { bottom: 4 }
              }, 
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: { 
                font: { size: fontSize, family: 'Noto Sans Bengali' }, 
                color: textColor 
              }
            }
          }
        }
      });
    }

    // Initial Setup on Page Load
    try {
      loadUserProfile();
      document.getElementById('reportMonth').addEventListener('change', generateMonthlyReport);
      console.log('Initial render complete');
    } catch (error) {
      console.error('Error during initial render:', error);
      showNotification('অ্যাপ লোড করতে সমস্যা হয়েছে!', 'error');
    }
