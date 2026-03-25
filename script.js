// State Variables
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
let targetSavings = parseFloat(localStorage.getItem('targetSavings')) || 0;

// Chart Instances
let pieChartInstance = null;
let barChartInstance = null;

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const budgetInput = document.getElementById('budgetInput');
const saveBudgetBtn = document.getElementById('saveBudgetBtn');
const savingsInput = document.getElementById('savingsInput');
const saveSavingsBtn = document.getElementById('saveSavingsBtn');
const totalExpenseDisplay = document.getElementById('totalExpenseDisplay');
const remainingBudgetDisplay = document.getElementById('remainingBudgetDisplay');
const remainingBudgetCard = document.getElementById('remainingBudgetCard');
const budgetWarning = document.getElementById('budgetWarning');

const expenseForm = document.getElementById('expenseForm');
const expenseTableBody = document.getElementById('expenseTableBody');
const noDataMessage = document.getElementById('noDataMessage');
const clearAllBtn = document.getElementById('clearAllBtn');
const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');


// --- Dark Mode Logic --- //
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        // Re-render charts to update colors if we are on dashboard
        if (typeof Chart !== 'undefined' && (pieChartInstance || barChartInstance)) {
            updateCharts();
        }
    });
}
initTheme();


// --- Dashboard Logic (only run if on dashboard) --- //
if (document.querySelector('.dashboard-grid')) {

    // Initialization
    function initDashboard() {
        // Set default date to today
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }

        // Set budget input value
        if (budgetInput && monthlyBudget > 0) {
            budgetInput.value = monthlyBudget;
        }

        // Set savings input value
        if (savingsInput && targetSavings > 0) {
            savingsInput.value = targetSavings;
        }

        updateUI();
    }

    // Budget Handling
    if (saveBudgetBtn) {
        saveBudgetBtn.addEventListener('click', () => {
            const val = parseFloat(budgetInput.value);
            if (!isNaN(val) && val >= 0) {
                monthlyBudget = val;
                localStorage.setItem('monthlyBudget', monthlyBudget);
                updateSummary();
                budgetInput.classList.add('pulse-success');
                setTimeout(() => budgetInput.classList.remove('pulse-success'), 500);
            } else {
                alert('Please enter a valid budget amount.');
            }
        });
    }

    // Savings Handling
    if (saveSavingsBtn) {
        saveSavingsBtn.addEventListener('click', () => {
            const val = parseFloat(savingsInput.value);
            if (!isNaN(val) && val >= 0) {
                targetSavings = val;
                localStorage.setItem('targetSavings', targetSavings);
                updateSummary();
                savingsInput.classList.add('pulse-success');
                setTimeout(() => savingsInput.classList.remove('pulse-success'), 500);
            } else {
                alert('Please enter a valid savings amount.');
            }
        });
    }

    // Handle Form Submission
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const amount = parseFloat(document.getElementById('amount').value);
            const category = document.getElementById('category').value;
            const date = document.getElementById('date').value;
            const description = document.getElementById('description').value.trim();
            const proofInput = document.getElementById('proof');

            if (!amount || !category || !date) {
                alert('Please fill out all required fields.');
                return;
            }

            const totalCurrentExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
            const usableBudget = monthlyBudget > 0 ? (monthlyBudget - targetSavings) : 0;
            
            if (monthlyBudget > 0 && (totalCurrentExpense + amount) > usableBudget) {
                alert('Expense exceeds your available budget after savings! Cannot add expense.');
                return;
            }

            let proofData = null;
            if (proofInput && proofInput.files && proofInput.files[0]) {
                const file = proofInput.files[0];
                if (file.size > 2 * 1024 * 1024) { 
                    alert('Proof file is too large! Please limit to 2MB.');
                    return;
                }
                proofData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (evt) => resolve(evt.target.result);
                    reader.readAsDataURL(file);
                });
            }

            const expense = {
                id: Date.now().toString(),
                amount: amount,
                category: category,
                date: date,
                description: description,
                proof: proofData
            };

            expenses.push(expense);
            saveData();
            updateUI();
            
            // Reset form but keep date
            document.getElementById('amount').value = '';
            document.getElementById('category').value = '';
            document.getElementById('description').value = '';
            if (proofInput) proofInput.value = '';
        });
    }

    // Clear All
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (expenses.length === 0) return;
            if (confirm('Are you sure you want to clear all expenses? This cannot be undone.')) {
                expenses = [];
                saveData();
                updateUI();
            }
        });
    }

    // Filters and Search
    if (searchInput) searchInput.addEventListener('input', updateTable);
    if (filterCategory) filterCategory.addEventListener('change', updateTable);

    // Save Data to LocalStorage
    function saveData() {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    }

    // Delete Expense
    window.deleteExpense = function(id) {
        expenses = expenses.filter(expense => expense.id !== id);
        saveData();
        updateUI();
    };

    // View Proof
    window.viewProof = function(id) {
        const exp = expenses.find(e => e.id === id);
        if (exp && exp.proof) {
            const w = window.open();
            if (w) {
                if (exp.proof.startsWith('data:application/pdf')) {
                    w.document.write(`<title>Expense Proof</title><iframe src="${exp.proof}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position:absolute;" allowfullscreen></iframe>`);
                } else {
                    w.document.write(`<title>Expense Proof</title><body style="margin:0; background:#f0f0f0; display:flex; justify-content:center; align-items:center; height:100vh;"><img src="${exp.proof}" style="max-width:90vw; max-height:90vh; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1);"></body>`);
                }
            } else {
                alert('Please allow popups to view proofs.');
            }
        }
    };

    // Format Currency
    function formatCurrency(amount) {
        return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // Get Badge Class
    function getBadgeClass(category) {
        return `badge-${category.toLowerCase()}`;
    }

    // Master Update UI Func
    function updateUI() {
        updateSummary();
        updateTable();
        updateCharts();
    }

    // Update Summary Cards
    function updateSummary() {
        const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        if (totalExpenseDisplay) {
            totalExpenseDisplay.textContent = formatCurrency(totalExpense);
        }

        if (remainingBudgetDisplay && budgetWarning) {
            if (monthlyBudget > 0) {
                const remaining = monthlyBudget - targetSavings - totalExpense;
                
                remainingBudgetDisplay.textContent = formatCurrency(Math.abs(remaining));
                
                if (remaining < 0) {
                    remainingBudgetDisplay.style.color = 'var(--danger-color)';
                    remainingBudgetDisplay.textContent = '-' + formatCurrency(Math.abs(remaining));
                    budgetWarning.classList.remove('hidden');
                } else {
                    remainingBudgetDisplay.style.color = 'var(--success-color)';
                    budgetWarning.classList.add('hidden');
                }
            } else {
                remainingBudgetDisplay.textContent = 'Not Set';
                remainingBudgetDisplay.style.color = 'var(--text-secondary)';
                budgetWarning.classList.add('hidden');
            }
        }
    }

    // Update Table with Filters
    function updateTable() {
        if (!expenseTableBody) return;

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const filterCat = filterCategory ? filterCategory.value : 'All';

        // Filter sorting desc by date
        let filtered = expenses.filter(exp => {
            const matchesSearch = exp.description.toLowerCase().includes(searchTerm) || exp.amount.toString().includes(searchTerm);
            const matchesCategory = filterCat === 'All' || exp.category === filterCat;
            return matchesSearch && matchesCategory;
        });

        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        expenseTableBody.innerHTML = '';

        if (filtered.length === 0) {
            document.getElementById('expensesTable').style.display = 'none';
            if (noDataMessage) noDataMessage.classList.remove('hidden');
        } else {
            document.getElementById('expensesTable').style.display = 'table';
            if (noDataMessage) noDataMessage.classList.add('hidden');

            filtered.forEach(exp => {
                const tr = document.createElement('tr');
                
                // Format date nicely
                const dateObj = new Date(exp.date);
                const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                const proofHtml = exp.proof ? `<button class="btn-primary" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; border-radius: 4px; border: none; cursor:pointer;" onclick="viewProof('${exp.id}')" title="View Proof"><i class="fas fa-file-invoice"></i> View</button>` : `<span style="color:var(--text-secondary)">-</span>`;

                tr.innerHTML = `
                    <td>${formattedDate}</td>
                    <td><span class="category-badge ${getBadgeClass(exp.category)}">${exp.category}</span></td>
                    <td>${exp.description || '-'}</td>
                    <td class="amount">${formatCurrency(exp.amount)}</td>
                    <td>${proofHtml}</td>
                    <td>
                        <button class="btn-delete" title="Delete" onclick="deleteExpense('${exp.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                expenseTableBody.appendChild(tr);
            });
        }
    }

    // Update Charts
    function updateCharts() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? '#334155' : '#e2e8f0';

        // 1. Pie Chart Data (Category wise)
        const categoryData = {};
        let totalExp = 0;
        expenses.forEach(exp => {
            if (categoryData[exp.category]) {
                categoryData[exp.category] += exp.amount;
            } else {
                categoryData[exp.category] = exp.amount;
            }
            totalExp += exp.amount;
        });

        if (monthlyBudget > 0) {
            if (targetSavings > 0) {
                categoryData['Target Savings'] = targetSavings;
            }
            
            const remaining = monthlyBudget - targetSavings - totalExp;
            if (remaining > 0) {
                categoryData['Remaining Budget'] = remaining;
            }
        }

        const pieLabels = Object.keys(categoryData);
        const pieValues = Object.values(categoryData);

        // Define colors matching the badges
        const colors = {
            'Food': '#ef4444',
            'Travel': '#3b82f6',
            'Shopping': '#10b981',
            'Bills': '#f59e0b',
            'Entertainment': '#8b5cf6',
            'Other': '#64748b',
            'Target Savings': '#a855f7',
            'Remaining Budget': '#22c55e'
        };

        const pieBgColors = pieLabels.map(label => colors[label] || '#94a3b8');

        if (pieChartInstance) pieChartInstance.destroy();
        const ctxPie = document.getElementById('categoryPieChart');
        if (ctxPie) {
            pieChartInstance = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: pieLabels,
                    datasets: [{
                        data: pieValues,
                        backgroundColor: pieBgColors,
                        borderWidth: isDark ? 2 : 1,
                        borderColor: isDark ? '#1e293b' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: textColor,
                                font: {
                                    family: "'Outfit', sans-serif"
                                }
                            }
                        }
                    }
                }
            });
        }

        // 2. Bar Chart Data (Over Time / Last 7 days or chronological)
        // Group by Date
        const dateData = {};
        expenses.forEach(exp => {
            if (dateData[exp.date]) {
                dateData[exp.date] += exp.amount;
            } else {
                dateData[exp.date] = exp.amount;
            }
        });

        // Sort dates chronologically
        const sortedDates = Object.keys(dateData).sort((a, b) => new Date(a) - new Date(b));
        // Get last 7 days of data available
        const recentDates = sortedDates.slice(-7);
        const barValues = recentDates.map(date => dateData[date]);

        // Format labels nicely
        const barLabels = recentDates.map(date => {
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        if (barChartInstance) barChartInstance.destroy();
        const ctxBar = document.getElementById('expenseBarChart');
        if (ctxBar) {
            barChartInstance = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: barLabels,
                    datasets: [{
                        label: 'Daily Expenses',
                        data: barValues,
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: gridColor
                            },
                            ticks: {
                                color: textColor,
                                family: "'Outfit', sans-serif"
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: textColor,
                                family: "'Outfit', sans-serif"
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
    }

    // Init App
    document.addEventListener('DOMContentLoaded', initDashboard);
}
