// Data Models
const categories = ['Food', 'Transportation', 'Entertainment', 'Bills', 'Shopping', 'Healthcare', 'Education', 'Other'];

// Authentication Functions
function hashPassword(password) {
    // Simple hash function (for basic security)
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}

function getStoredCredentials() {
    try {
        const stored = localStorage.getItem('userCredentials');
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        return null;
    }
}

function saveCredentials(username, password) {
    const credentials = {
        username: username,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString()
    };
    localStorage.setItem('userCredentials', JSON.stringify(credentials));
}

function checkCredentials(username, password) {
    const stored = getStoredCredentials();
    if (!stored) {
        // First time user - create account
        saveCredentials(username, password);
        return true;
    }
    
    // Check if username and password match
    return stored.username === username && stored.passwordHash === hashPassword(password);
}

function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

function setLoggedIn(value) {
    if (value) {
        localStorage.setItem('isLoggedIn', 'true');
    } else {
        localStorage.removeItem('isLoggedIn');
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        setLoggedIn(false);
        showLoginScreen();
        // Clear form
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').style.display = 'none';
    }
}

// Data Management - LocalStorage
function saveExpenses(expenses) {
    try {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    } catch (error) {
        console.error('Error saving expenses:', error);
    }
}

function getExpenses() {
    try {
        const expenses = localStorage.getItem('expenses');
        return expenses ? JSON.parse(expenses) : [];
    } catch (error) {
        console.error('Error loading expenses:', error);
        return [];
    }
}

function saveBudgets(budgets) {
    try {
        localStorage.setItem('budgets', JSON.stringify(budgets));
    } catch (error) {
        console.error('Error saving budgets:', error);
    }
}

function getBudgets() {
    try {
        const budgets = localStorage.getItem('budgets');
        return budgets ? JSON.parse(budgets) : [];
    } catch (error) {
        console.error('Error loading budgets:', error);
        return [];
    }
}

// Expense Management
let expenses = getExpenses();
let budgets = getBudgets();
let editingExpenseId = null;

function addExpense(expenseData) {
    const expense = {
        id: crypto.randomUUID(),
        amount: parseFloat(expenseData.amount),
        category: expenseData.category,
        date: expenseData.date,
        description: expenseData.description || '',
        tags: expenseData.tags ? expenseData.tags.split(',').map(t => t.trim()) : [],
        createdAt: new Date().toISOString()
    };
    expenses.push(expense);
    saveExpenses(expenses);
    return expense;
}

function editExpense(id, expenseData) {
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
        expenses[index] = {
            ...expenses[index],
            amount: parseFloat(expenseData.amount),
            category: expenseData.category,
            date: expenseData.date,
            description: expenseData.description || '',
            tags: expenseData.tags ? expenseData.tags.split(',').map(t => t.trim()) : [],
            updatedAt: new Date().toISOString()
        };
        saveExpenses(expenses);
        return expenses[index];
    }
    return null;
}

function deleteExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    saveExpenses(expenses);
}

function filterExpenses() {
    let filtered = [...expenses];
    
    // Date filter
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (startDate) {
        filtered = filtered.filter(e => e.date >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter(e => e.date <= endDate);
    }
    
    // Category filter
    const categoryFilter = document.getElementById('categoryFilter').value;
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(e => e.category === categoryFilter);
    }
    
    // Search filter
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    if (searchQuery) {
        filtered = filtered.filter(e => 
            e.description.toLowerCase().includes(searchQuery) ||
            e.category.toLowerCase().includes(searchQuery) ||
            e.tags.some(tag => tag.toLowerCase().includes(searchQuery))
        );
    }
    
    // Sort
    const sortBy = document.getElementById('sortBy').value;
    switch (sortBy) {
        case 'date':
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date-oldest':
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'amount-high':
            filtered.sort((a, b) => b.amount - a.amount);
            break;
        case 'amount-low':
            filtered.sort((a, b) => a.amount - b.amount);
            break;
        case 'category':
            filtered.sort((a, b) => a.category.localeCompare(b.category));
            break;
    }
    
    return filtered;
}

// Budget Management
function setBudget(budgetData) {
    const existingIndex = budgets.findIndex(b => 
        b.category === budgetData.category && b.period === budgetData.period
    );
    
    const budget = {
        category: budgetData.category,
        limit: parseFloat(budgetData.limit),
        period: budgetData.period
    };
    
    if (existingIndex !== -1) {
        budgets[existingIndex] = budget;
    } else {
        budgets.push(budget);
    }
    
    saveBudgets(budgets);
    return budget;
}

function calculateBudgetRemaining(category, period = 'monthly') {
    const budget = budgets.find(b => b.category === category && b.period === period);
    if (!budget) return null;
    
    const now = new Date();
    let startDate, endDate;
    
    if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    }
    
    const categoryExpenses = expenses.filter(e => 
        e.category === category && 
        e.date >= startDate && 
        e.date <= endDate
    );
    
    const totalSpent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
    return budget.limit - totalSpent;
}

function getBudgetUtilization(category, period = 'monthly') {
    const budget = budgets.find(b => b.category === category && b.period === period);
    if (!budget) return null;
    
    const now = new Date();
    let startDate, endDate;
    
    if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    }
    
    const categoryExpenses = expenses.filter(e => 
        e.category === category && 
        e.date >= startDate && 
        e.date <= endDate
    );
    
    const totalSpent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
    return (totalSpent / budget.limit) * 100;
}

// Statistics & Calculations
function calculateTotalExpenses(filteredExpenses = null) {
    const expensesToCalculate = filteredExpenses || expenses;
    return expensesToCalculate.reduce((sum, e) => sum + e.amount, 0);
}

function calculateAverageSpending(filteredExpenses = null) {
    const expensesToCalculate = filteredExpenses || expenses;
    if (expensesToCalculate.length === 0) return 0;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    
    const monthExpenses = expensesToCalculate.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate.getMonth() === now.getMonth() && 
               expenseDate.getFullYear() === now.getFullYear();
    });
    
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    return currentDay > 0 ? total / currentDay : 0;
}

function calculateCategoryTotals(filteredExpenses = null) {
    const expensesToCalculate = filteredExpenses || expenses;
    const totals = {};
    
    categories.forEach(category => {
        totals[category] = expensesToCalculate
            .filter(e => e.category === category)
            .reduce((sum, e) => sum + e.amount, 0);
    });
    
    return totals;
}

function compareMonths() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const monthExpenses = expenses.filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate.getMonth() === month && 
                   expenseDate.getFullYear() === year;
        });
        
        months.push({
            label: `${monthName} ${year}`,
            total: monthExpenses.reduce((sum, e) => sum + e.amount, 0)
        });
    }
    
    return months;
}

function compareYears() {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    const years = [];
    for (let i = 2; i >= 0; i--) {
        const year = currentYear - i;
        const yearExpenses = expenses.filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate.getFullYear() === year;
        });
        
        years.push({
            label: year.toString(),
            total: yearExpenses.reduce((sum, e) => sum + e.amount, 0)
        });
    }
    
    return years;
}

function getSpendingTrends() {
    const now = new Date();
    const days = [];
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayExpenses = expenses.filter(e => e.date === dateStr);
        days.push({
            date: dateStr,
            label: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
            total: dayExpenses.reduce((sum, e) => sum + e.amount, 0)
        });
    }
    
    return days;
}

// Chart Instances
let categoryChart = null;
let monthlyChart = null;
let yearlyChart = null;
let trendsChart = null;

function updateCategoryChart() {
    const categoryTotals = calculateCategoryTotals();
    const data = Object.entries(categoryTotals)
        .filter(([_, total]) => total > 0)
        .map(([category, total]) => ({ category, total }));
    
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.category),
            datasets: [{
                data: data.map(d => d.total),
                backgroundColor: [
                    '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444',
                    '#ec4899', '#10b981', '#06b6d4', '#6b7280'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateMonthlyChart() {
    const months = compareMonths();
    
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;
    
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(m => m.label),
            datasets: [{
                label: 'Total Expenses',
                data: months.map(m => m.total),
                backgroundColor: 'rgba(79, 70, 229, 0.8)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toFixed(0);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '₹' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

function updateYearlyChart() {
    const years = compareYears();
    
    const ctx = document.getElementById('yearlyChart');
    if (!ctx) return;
    
    if (yearlyChart) {
        yearlyChart.destroy();
    }
    
    yearlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years.map(y => y.label),
            datasets: [{
                label: 'Total Expenses',
                data: years.map(y => y.total),
                backgroundColor: [
                    'rgba(79, 70, 229, 0.8)',
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(139, 92, 246, 0.8)'
                ],
                borderColor: [
                    'rgba(79, 70, 229, 1)',
                    'rgba(99, 102, 241, 1)',
                    'rgba(139, 92, 246, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toFixed(0);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '₹' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

function updateTrendsChart() {
    const trends = getSpendingTrends();
    
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;
    
    if (trendsChart) {
        trendsChart.destroy();
    }
    
    trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trends.map(t => t.label),
            datasets: [{
                label: 'Daily Spending',
                data: trends.map(t => t.total),
                borderColor: 'rgba(79, 70, 229, 1)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toFixed(0);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '₹' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// UI Update Functions
function renderStatsCards() {
    const filtered = filterExpenses();
    const total = calculateTotalExpenses(filtered);
    const average = calculateAverageSpending(filtered);
    
    // Calculate remaining budget
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const monthExpenses = expenses.filter(e => e.date >= startOfMonth && e.date <= endOfMonth);
    const monthlyBudgets = budgets.filter(b => b.period === 'monthly');
    const totalBudget = monthlyBudgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = totalBudget - totalSpent;
    
    // Count active categories
    const categoryTotals = calculateCategoryTotals(filtered);
    const activeCategories = Object.values(categoryTotals).filter(total => total > 0).length;
    
    document.getElementById('totalExpenses').textContent = `₹${total.toFixed(2)}`;
    document.getElementById('remainingBudget').textContent = `₹${Math.max(0, remaining).toFixed(2)}`;
    document.getElementById('averageDaily').textContent = `₹${average.toFixed(2)}`;
    document.getElementById('activeCategories').textContent = activeCategories;
    
    // Update period text
    const hasDateFilter = document.getElementById('startDate').value || document.getElementById('endDate').value;
    document.getElementById('totalPeriod').textContent = hasDateFilter ? 'Filtered' : 'This Month';
}

function renderBudgetProgress() {
    const container = document.getElementById('budgetProgressContainer');
    const monthlyBudgets = budgets.filter(b => b.period === 'monthly');
    
    if (monthlyBudgets.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No budgets set. Click "Set Budget" to create one.</p>';
        return;
    }
    
    container.innerHTML = monthlyBudgets.map(budget => {
        const utilization = getBudgetUtilization(budget.category, 'monthly');
        const remaining = calculateBudgetRemaining(budget.category, 'monthly');
        
        if (utilization === null) return '';
        
        const percentage = Math.min(100, utilization);
        const progressClass = percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : '';
        
        return `
            <div class="budget-item">
                <div class="budget-item-header">
                    <span class="budget-category">${budget.category}</span>
                    <span class="budget-amount">₹${remaining !== null ? remaining.toFixed(2) : budget.limit.toFixed(2)} / ₹${budget.limit.toFixed(2)}</span>
                </div>
                <div class="budget-progress-bar">
                    <div class="budget-progress-fill ${progressClass}" style="width: ${percentage}%">
                        ${percentage >= 10 ? `${percentage.toFixed(0)}%` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderExpenses() {
    const filtered = filterExpenses();
    const list = document.getElementById('expensesList');
    const emptyState = document.getElementById('emptyState');
    const count = document.getElementById('expensesCount');
    
    count.textContent = `${filtered.length} expense${filtered.length !== 1 ? 's' : ''}`;
    
    if (filtered.length === 0) {
        list.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    list.style.display = 'flex';
    emptyState.style.display = 'none';
    
    list.innerHTML = filtered.map(expense => {
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('default', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        const categoryClass = expense.category.toLowerCase().replace(/\s+/g, '-');
        
        return `
            <div class="expense-item ${categoryClass}">
                <div class="expense-info">
                    <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
                    <span class="expense-category">${expense.category}</span>
                    ${expense.description ? `<div class="expense-description">${expense.description}</div>` : ''}
                    <div class="expense-date">${formattedDate}</div>
                </div>
                <div class="expense-actions">
                    <button class="btn-icon" onclick="shareViaWhatsApp('${expense.id}')" title="Share via WhatsApp">📱</button>
                    <button class="btn-icon" onclick="editExpenseHandler('${expense.id}')" title="Edit">✏️</button>
                    <button class="btn-icon" onclick="deleteExpenseHandler('${expense.id}')" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateAllCharts() {
    updateCategoryChart();
    updateMonthlyChart();
    updateYearlyChart();
    updateTrendsChart();
}

function updateUI() {
    renderStatsCards();
    renderBudgetProgress();
    renderExpenses();
    updateAllCharts();
}

// Event Handlers
function openExpenseModal(expenseId = null) {
    const modal = document.getElementById('expenseModal');
    const form = document.getElementById('expenseForm');
    const title = document.getElementById('modalTitle');
    
    editingExpenseId = expenseId;
    
    if (expenseId) {
        const expense = expenses.find(e => e.id === expenseId);
        if (expense) {
            title.textContent = 'Edit Expense';
            document.getElementById('expenseId').value = expense.id;
            document.getElementById('expenseAmount').value = expense.amount;
            document.getElementById('expenseCategory').value = expense.category;
            document.getElementById('expenseDate').value = expense.date;
            document.getElementById('expenseDescription').value = expense.description || '';
            document.getElementById('expenseTags').value = expense.tags.join(', ');
        }
    } else {
        title.textContent = 'Add Expense';
        form.reset();
        document.getElementById('expenseId').value = '';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expenseDate').value = today;
    }
    
    modal.classList.add('active');
}

function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    modal.classList.remove('active');
    editingExpenseId = null;
}

function openBudgetModal() {
    const modal = document.getElementById('budgetModal');
    modal.classList.add('active');
}

function closeBudgetModal() {
    const modal = document.getElementById('budgetModal');
    modal.classList.remove('active');
}

function editExpenseHandler(id) {
    openExpenseModal(id);
}

function deleteExpenseHandler(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        deleteExpense(id);
        updateUI();
    }
}

// WhatsApp Integration Functions
function shareViaWhatsApp(expenseId) {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    const date = new Date(expense.date);
    const formattedDate = date.toLocaleDateString('default', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    const message = `💰 Expense Update\n\n` +
        `Amount: ₹${expense.amount.toFixed(2)}\n` +
        `Category: ${expense.category}\n` +
        `Date: ${formattedDate}\n` +
        `${expense.description ? `Description: ${expense.description}\n` : ''}` +
        `${expense.tags.length > 0 ? `Tags: ${expense.tags.join(', ')}\n` : ''}`;
    
    const whatsappNumber = '919886434945';
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

function parseWhatsAppMessage(message) {
    // Try to parse different formats
    const lines = message.split('\n').map(line => line.trim()).filter(line => line);
    
    let amount = null;
    let category = null;
    let date = null;
    let description = '';
    let tags = [];
    
    for (const line of lines) {
        // Parse amount
        const amountMatch = line.match(/(?:expense|amount|₹|rs|rupees?)[:\s]*₹?\s*(\d+(?:\.\d{2})?)/i);
        if (amountMatch && !amount) {
            amount = parseFloat(amountMatch[1]);
        }
        
        // Parse category
        const categoryMatch = line.match(/(?:category|cat)[:\s]+(.+)/i);
        if (categoryMatch && !category) {
            const cat = categoryMatch[1].trim();
            if (categories.includes(cat)) {
                category = cat;
            }
        }
        
        // Parse date
        const dateMatch = line.match(/(?:date|on)[:\s]+(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})/i);
        if (dateMatch && !date) {
            let dateStr = dateMatch[1];
            // Convert different date formats to YYYY-MM-DD
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else if (dateStr.includes('-') && dateStr.length === 10 && dateStr.split('-')[0].length === 2) {
                const parts = dateStr.split('-');
                dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            date = dateStr;
        }
        
        // Parse description
        const descMatch = line.match(/(?:description|desc|note|details)[:\s]+(.+)/i);
        if (descMatch && !description) {
            description = descMatch[1].trim();
        }
        
        // Parse tags
        const tagsMatch = line.match(/(?:tags?|label)[:\s]+(.+)/i);
        if (tagsMatch) {
            tags = tagsMatch[1].split(',').map(t => t.trim()).filter(t => t);
        }
    }
    
    // If amount is in the message but not parsed, try to find any number
    if (!amount) {
        const numberMatch = message.match(/\b(\d+(?:\.\d{2})?)\b/);
        if (numberMatch) {
            amount = parseFloat(numberMatch[1]);
        }
    }
    
    // Default date to today if not provided
    if (!date) {
        date = new Date().toISOString().split('T')[0];
    }
    
    // Try to infer category from keywords if not found
    if (!category) {
        const categoryKeywords = {
            'Food': ['food', 'grocery', 'restaurant', 'lunch', 'dinner', 'breakfast', 'eat'],
            'Transportation': ['transport', 'taxi', 'uber', 'fuel', 'petrol', 'diesel', 'bus', 'train', 'metro'],
            'Entertainment': ['movie', 'cinema', 'game', 'entertainment', 'fun', 'party'],
            'Bills': ['bill', 'electricity', 'water', 'internet', 'phone', 'utility'],
            'Shopping': ['shopping', 'shop', 'buy', 'purchase', 'mall'],
            'Healthcare': ['health', 'medicine', 'doctor', 'hospital', 'pharmacy', 'medical'],
            'Education': ['education', 'book', 'course', 'tuition', 'school', 'college']
        };
        
        const lowerMessage = message.toLowerCase();
        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                category = cat;
                break;
            }
        }
    }
    
    // Default category if still not found
    if (!category) {
        category = 'Other';
    }
    
    return {
        amount,
        category,
        date,
        description,
        tags: tags.join(', ')
    };
}

function openWhatsAppImportModal() {
    const modal = document.getElementById('whatsappImportModal');
    modal.classList.add('active');
    document.getElementById('whatsappMessage').value = '';
}

function closeWhatsAppImportModal() {
    const modal = document.getElementById('whatsappImportModal');
    modal.classList.remove('active');
}

function clearFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('categoryFilter').value = 'all';
    document.getElementById('searchInput').value = '';
    document.getElementById('sortBy').value = 'date';
    updateUI();
}

// Export Functions
function downloadAsXLSX() {
    const filtered = filterExpenses();
    
    if (filtered.length === 0) {
        alert('No expenses to download');
        return;
    }
    
    // Prepare data for Excel
    const excelData = filtered.map(expense => {
        const date = new Date(expense.date);
        return {
            'Date': date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
            'Amount (₹)': expense.amount.toFixed(2),
            'Category': expense.category,
            'Description': expense.description || '',
            'Tags': expense.tags.join(', ') || ''
        };
    });
    
    // Add summary row
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    excelData.push({});
    excelData.push({
        'Date': 'TOTAL',
        'Amount (₹)': total.toFixed(2),
        'Category': '',
        'Description': '',
        'Tags': ''
    });
    
    // Create workbook
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    
    // Generate filename with date
    const now = new Date();
    const filename = `expenses_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}.xlsx`;
    
    // Download
    XLSX.writeFile(wb, filename);
}

function downloadAsPDF() {
    const { jsPDF } = window.jspdf;
    const filtered = filterExpenses();
    
    if (filtered.length === 0) {
        alert('No expenses to download');
        return;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text('Personal Finance Dashboard - Expenses Report', margin, yPos);
    yPos += 10;
    
    // Date range
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    let dateRange = 'All Expenses';
    if (startDate && endDate) {
        dateRange = `${startDate} to ${endDate}`;
    } else if (startDate) {
        dateRange = `From ${startDate}`;
    } else if (endDate) {
        dateRange = `Until ${endDate}`;
    }
    doc.text(`Date Range: ${dateRange}`, margin, yPos);
    yPos += 8;
    
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, yPos);
    yPos += 15;
    
    // Table headers
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.setFont(undefined, 'bold');
    const colWidths = [30, 30, 50, 50, 30];
    const headers = ['Date', 'Amount', 'Category', 'Description', 'Tags'];
    let xPos = margin;
    
    headers.forEach((header, index) => {
        doc.text(header, xPos, yPos);
        xPos += colWidths[index];
    });
    
    yPos += 8;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
    yPos += 5;
    
    // Table rows
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    filtered.forEach((expense, index) => {
        // Check if we need a new page
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
        }
        
        const date = new Date(expense.date);
        const dateStr = date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        const amount = `₹${expense.amount.toFixed(2)}`;
        const category = expense.category;
        const description = expense.description || '-';
        const tags = expense.tags.join(', ') || '-';
        
        // Wrap long text
        const maxDescWidth = 50;
        const descLines = doc.splitTextToSize(description, maxDescWidth);
        const tagLines = doc.splitTextToSize(tags, 30);
        const maxLines = Math.max(descLines.length, tagLines.length, 1);
        
        xPos = margin;
        doc.text(dateStr, xPos, yPos);
        xPos += colWidths[0];
        doc.text(amount, xPos, yPos);
        xPos += colWidths[1];
        doc.text(category, xPos, yPos);
        xPos += colWidths[2];
        
        // Description (multi-line)
        let descY = yPos;
        descLines.forEach((line, i) => {
            doc.text(line, xPos, descY);
            descY += 4;
        });
        
        xPos += colWidths[3];
        // Tags (multi-line)
        let tagY = yPos;
        tagLines.forEach((line, i) => {
            doc.text(line, xPos, tagY);
            tagY += 4;
        });
        
        yPos += Math.max(8, maxLines * 4);
        
        // Light line between rows
        if (index < filtered.length - 1) {
            doc.setDrawColor(241, 245, 249);
            doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
            yPos += 3;
        }
    });
    
    // Summary
    yPos += 10;
    if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
    }
    
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(79, 70, 229);
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    doc.text(`Total Expenses: ₹${total.toFixed(2)}`, margin, yPos);
    yPos += 8;
    
    // Category breakdown
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Category Breakdown:', margin, yPos);
    yPos += 6;
    
    const categoryTotals = calculateCategoryTotals(filtered);
    Object.entries(categoryTotals)
        .filter(([_, total]) => total > 0)
        .sort(([_, a], [__, b]) => b - a)
        .forEach(([category, total]) => {
            if (yPos > pageHeight - 20) {
                doc.addPage();
                yPos = margin;
            }
            doc.text(`${category}: ₹${total.toFixed(2)}`, margin + 5, yPos);
            yPos += 5;
        });
    
    // Generate filename
    const now = new Date();
    const filename = `expenses_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}.pdf`;
    
    // Download
    doc.save(filename);
}

// Initialize
function init() {
    // Check if user is logged in
    if (!isLoggedIn()) {
        showLoginScreen();
        setupLoginForm();
        return;
    }
    
    showApp();
    initializeApp();
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('loginError');
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            errorMessage.textContent = 'Please enter both username and password';
            errorMessage.style.display = 'block';
            return;
        }
        
        if (checkCredentials(username, password)) {
            setLoggedIn(true);
            errorMessage.style.display = 'none';
            showApp();
            initializeApp();
        } else {
            errorMessage.textContent = 'Invalid username or password';
            errorMessage.style.display = 'block';
        }
    });
}

function initializeApp() {
    // Set default date to current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    // Event listeners
    document.getElementById('addExpenseBtn').addEventListener('click', () => openExpenseModal());
    document.getElementById('whatsappImportBtn').addEventListener('click', openWhatsAppImportModal);
    document.getElementById('closeExpenseModal').addEventListener('click', closeExpenseModal);
    document.getElementById('cancelExpenseBtn').addEventListener('click', closeExpenseModal);
    document.getElementById('closeWhatsAppModal').addEventListener('click', closeWhatsAppImportModal);
    document.getElementById('cancelWhatsAppBtn').addEventListener('click', closeWhatsAppImportModal);
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
            amount: document.getElementById('expenseAmount').value,
            category: document.getElementById('expenseCategory').value,
            date: document.getElementById('expenseDate').value,
            description: document.getElementById('expenseDescription').value,
            tags: document.getElementById('expenseTags').value
        };
        
        if (editingExpenseId) {
            editExpense(editingExpenseId, formData);
        } else {
            addExpense(formData);
        }
        
        closeExpenseModal();
        updateUI();
    });
    
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('downloadXlsxBtn').addEventListener('click', downloadAsXLSX);
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadAsPDF);
    document.getElementById('setBudgetBtn').addEventListener('click', openBudgetModal);
    document.getElementById('closeBudgetModal').addEventListener('click', closeBudgetModal);
    document.getElementById('cancelBudgetBtn').addEventListener('click', closeBudgetModal);
    document.getElementById('budgetForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
            category: document.getElementById('budgetCategory').value,
            limit: document.getElementById('budgetLimit').value,
            period: document.getElementById('budgetPeriod').value
        };
        
        setBudget(formData);
        closeBudgetModal();
        updateUI();
    });
    
    document.getElementById('whatsappImportForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const message = document.getElementById('whatsappMessage').value.trim();
        
        if (!message) {
            alert('Please paste a WhatsApp message');
            return;
        }
        
        const parsedData = parseWhatsAppMessage(message);
        
        if (!parsedData.amount || parsedData.amount <= 0) {
            alert('Could not parse amount from message. Please ensure the message contains an expense amount.');
            return;
        }
        
        // Pre-fill the expense form with parsed data
        closeWhatsAppImportModal();
        openExpenseModal();
        
        document.getElementById('expenseAmount').value = parsedData.amount;
        document.getElementById('expenseCategory').value = parsedData.category;
        document.getElementById('expenseDate').value = parsedData.date;
        document.getElementById('expenseDescription').value = parsedData.description;
        document.getElementById('expenseTags').value = parsedData.tags;
    });
    
    // Filter event listeners
    document.getElementById('startDate').addEventListener('change', updateUI);
    document.getElementById('endDate').addEventListener('change', updateUI);
    document.getElementById('categoryFilter').addEventListener('change', updateUI);
    document.getElementById('searchInput').addEventListener('input', updateUI);
    document.getElementById('sortBy').addEventListener('change', updateUI);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
    
    // Close modals on outside click
    document.getElementById('expenseModal').addEventListener('click', (e) => {
        if (e.target.id === 'expenseModal') {
            closeExpenseModal();
        }
    });
    
    document.getElementById('budgetModal').addEventListener('click', (e) => {
        if (e.target.id === 'budgetModal') {
            closeBudgetModal();
        }
    });
    
    document.getElementById('whatsappImportModal').addEventListener('click', (e) => {
        if (e.target.id === 'whatsappImportModal') {
            closeWhatsAppImportModal();
        }
    });
    
    // Initial render
    updateUI();
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

