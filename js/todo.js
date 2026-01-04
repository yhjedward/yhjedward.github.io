// 待办事项管理器
class TodoManager {
  constructor() {
    this.todos = [];
    this.apiUrl = ApiConfig.getModuleUrl('todos');
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadTodos();
    
    // 监听连接状态变化
    if (globalThis.serverConnection) {
      globalThis.serverConnection.onConnectionChange((isOnline) => {
        console.log(`Todo manager: Server ${isOnline ? 'online' : 'offline'}`);
        if (isOnline) {
          // 连接恢复时重新加载数据
          this.loadTodos();
        }
      });
    }
    
    // 监听来自其他窗口/标签页的待办事项变化
    if (globalThis.syncManager) {
      globalThis.syncManager.onTodosChange((data) => {
        console.log('Todos synced from another window:', data);
        // 如果有变化，重新加载待办事项
        if (data.todos) {
          this.todos = data.todos;
          this.renderTodos();
        }
      });
    }
  }

  // 从服务器加载任务
  async loadTodos() {
    try {
      if (!globalThis.serverConnection?.getStatus()) {
        this.loadTodosFromLocalStorage();
        return;
      }

      const response = await fetch(this.apiUrl, { 
        method: 'GET',
        mode: 'cors'
      });
      
      if (!response.ok) throw new Error('Failed to load todos');
      
      this.todos = await response.json();
      this.saveTodosToLocalStorage(); // 备份到本地
      this.renderTodos();
    } catch (err) {
      console.error('Error loading todos from server:', err);
      this.loadTodosFromLocalStorage();
    }
  }

  // 从本地存储加载任务（备份）
  loadTodosFromLocalStorage() {
    try {
      const saved = localStorage.getItem('todos_backup');
      this.todos = saved ? JSON.parse(saved) : [];
      this.renderTodos();
    } catch (err) {
      console.error('Error loading todos from localStorage:', err);
      this.todos = [];
    }
  }

  // 保存任务到本地存储（备份）
  saveTodosToLocalStorage() {
    try {
      localStorage.setItem('todos_backup', JSON.stringify(this.todos));
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  }

  // 保存任务到本地存储（备份）
  saveTodos() {
    this.saveTodosToLocalStorage();
    
    // 广播待办事项变化到其他窗口/标签页
    if (globalThis.syncManager) {
      globalThis.syncManager.broadcastTodosChange({ todos: this.todos, timestamp: Date.now() });
    }
  }

  // 添加任务
  async addTodo(text) {
    if (!text.trim()) return;
    
    try {
      if (!globalThis.serverConnection?.getStatus()) {
        // 离线模式：直接添加到本地
        const todo = {
          id: Date.now(),
          text: text.trim(),
          completed: false,
          createdAt: new Date().toISOString(),
          dueDate: null,
          priority: 'normal'
        };
        this.todos.unshift(todo);
        this.saveTodosToLocalStorage();
        this.renderTodos();
        this.saveTodos();
        return todo;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      });

      if (!response.ok) throw new Error('Failed to add todo');

      const todo = await response.json();
      this.todos.unshift(todo);
      this.saveTodosToLocalStorage();
      this.renderTodos();
      this.saveTodos();
      
      return todo;
    } catch (err) {
      console.error('Error adding todo:', err);
      alert('添加任务失败，请检查服务器连接');
    }
  }

  // 删除任务
  async deleteTodo(id) {
    try {
      if (!globalThis.serverConnection?.getStatus()) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodosToLocalStorage();
        this.renderTodos();
        this.saveTodos();
        return;
      }

      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: 'DELETE',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Failed to delete todo');

      this.todos = this.todos.filter(t => t.id !== id);
      this.saveTodosToLocalStorage();
      this.renderTodos();
      this.saveTodos();
    } catch (err) {
      console.error('Error deleting todo:', err);
      alert('删除任务失败');
    }
  }

  // 切换任务完成状态
  async toggleTodo(id) {
    try {
      const todo = this.todos.find(t => t.id === id);
      if (!todo) return;

      if (!this.isOnline) {
        todo.completed = !todo.completed;
        this.saveTodosToLocalStorage();
        this.renderTodos();
        
        // 广播变化
        if (window.syncManager) {
          window.syncManager.broadcastTodosChange({ todos: this.todos, timestamp: Date.now() });
        }
        return;
      }

      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: 'PUT',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed })
      });

      if (!response.ok) throw new Error('Failed to toggle todo');

      todo.completed = !todo.completed;
      this.saveTodosToLocalStorage();
      this.renderTodos();
      
      // 广播变化
      if (window.syncManager) {
        window.syncManager.broadcastTodosChange({ todos: this.todos, timestamp: Date.now() });
      }
    } catch (err) {
      console.error('Error toggling todo:', err);
    }
  }

  // 更新任务优先级
  async updatePriority(id, priority) {
    try {
      const todo = this.todos.find(t => t.id === id);
      if (!todo) return;

      if (!this.isOnline) {
        todo.priority = priority;
        this.saveTodosToLocalStorage();
        this.renderTodos();
        return;
      }

      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: 'PUT',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      });

      if (!response.ok) throw new Error('Failed to update priority');

      todo.priority = priority;
      this.saveTodosToLocalStorage();
      this.renderTodos();
    } catch (err) {
      console.error('Error updating priority:', err);
    }
  }

  // 编辑任务
  async editTodo(id, newText) {
    try {
      const todo = this.todos.find(t => t.id === id);
      if (!todo) return;

      if (!this.isOnline) {
        todo.text = newText.trim();
        this.saveTodosToLocalStorage();
        this.renderTodos();
        return;
      }

      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: 'PUT',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim() })
      });

      if (!response.ok) throw new Error('Failed to edit todo');

      todo.text = newText.trim();
      this.saveTodosToLocalStorage();
      this.renderTodos();
    } catch (err) {
      console.error('Error editing todo:', err);
    }
  }

  // 获取统计信息
  getStats() {
    const total = this.todos.length;
    const completed = this.todos.filter(t => t.completed).length;
    const pending = total - completed;
    const high = this.todos.filter(t => t.priority === 'high' && !t.completed).length;
    
    return { total, completed, pending, high };
  }

  // 绘制任务列表
  renderTodos() {
    const container = document.getElementById('todo-list');
    if (!container) return;

    container.innerHTML = '';

    if (this.todos.length === 0) {
      container.innerHTML = '<div class="todo-empty">暂无待办事项</div>';
      return;
    }

    // 按优先级排序，优先级高的和未完成的排在前面
    const sorted = [...this.todos].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    sorted.forEach(todo => {
      const item = document.createElement('div');
      item.className = `todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority}`;
      item.dataset.id = todo.id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = todo.completed;
      checkbox.addEventListener('change', () => this.toggleTodo(todo.id));

      const textSpan = document.createElement('span');
      textSpan.className = 'todo-text';
      textSpan.textContent = todo.text;
      textSpan.addEventListener('click', () => this.startEdit(todo.id, todo.text));
      textSpan.title = '点击编辑';

      const priorityBtn = document.createElement('button');
      priorityBtn.className = 'priority-btn';
      priorityBtn.title = `优先级: ${this.getPriorityLabel(todo.priority)}`;
      priorityBtn.innerHTML = this.getPriorityIcon(todo.priority);
      priorityBtn.addEventListener('click', () => this.cyclePriority(todo.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.title = '删除';
      deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));

      item.appendChild(checkbox);
      item.appendChild(textSpan);
      item.appendChild(priorityBtn);
      item.appendChild(deleteBtn);

      container.appendChild(item);
    });

    this.updateStats();
  }

  // 获取优先级标签
  getPriorityLabel(priority) {
    const labels = { high: '高', normal: '普通', low: '低' };
    return labels[priority] || '普通';
  }

  // 获取优先级图标
  getPriorityIcon(priority) {
    const icons = {
      high: '🔴',
      normal: '🟡',
      low: '🟢'
    };
    return icons[priority] || '🟡';
  }

  // 循环切换优先级
  cyclePriority(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      const cycle = { high: 'normal', normal: 'low', low: 'high' };
      this.updatePriority(id, cycle[todo.priority]);
    }
  }

  // 开始编辑
  startEdit(id, text) {
    const item = document.querySelector(`.todo-item[data-id="${id}"]`);
    if (!item) return;

    const textSpan = item.querySelector('.todo-text');
    const input = document.createElement('input');
    input.className = 'todo-edit-input';
    input.value = text;

    const finishEdit = () => {
      if (input.value.trim()) {
        this.editTodo(id, input.value);
      } else {
        this.renderTodos();
      }
    };

    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finishEdit();
      if (e.key === 'Escape') this.renderTodos();
    });

    textSpan.replaceWith(input);
    input.focus();
    input.select();
  }

  // 更新统计信息
  updateStats() {
    const stats = this.getStats();
    const statsDiv = document.getElementById('todo-stats');
    if (statsDiv) {
      statsDiv.innerHTML = `
        <span class="stat-item">总计: <strong>${stats.total}</strong></span>
        <span class="stat-item">✓ <strong>${stats.completed}</strong></span>
        <span class="stat-item">● <strong>${stats.pending}</strong></span>
        ${stats.high > 0 ? `<span class="stat-item" style="color: #ef4444;">🔴 <strong>${stats.high}</strong></span>` : ''}
      `;
    }
  }

  // 设置事件监听
  setupEventListeners() {
    // 输入框
    const input = document.getElementById('todo-input');
    const addBtn = document.getElementById('todo-add-btn');

    if (input && addBtn) {
      const handleAdd = () => {
        this.addTodo(input.value);
        input.value = '';
        input.focus();
      };

      addBtn.addEventListener('click', handleAdd);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAdd();
      });
    }

    // 清空已完成
    const clearBtn = document.getElementById('todo-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (!confirm('确定要清空所有已完成的任务吗？')) return;
        
        try {
          if (!this.isOnline) {
            this.todos = this.todos.filter(t => !t.completed);
            this.saveTodosToLocalStorage();
            this.renderTodos();
            return;
          }

          // 删除所有已完成的项
          const completed = this.todos.filter(t => t.completed);
          for (const todo of completed) {
            await fetch(`${this.apiUrl}/${todo.id}`, {
              method: 'DELETE',
              mode: 'cors'
            });
          }

          this.todos = this.todos.filter(t => !t.completed);
          this.saveTodosToLocalStorage();
          this.renderTodos();
        } catch (err) {
          console.error('Error clearing completed todos:', err);
          alert('清空失败');
        }
      });
    }

    // 筛选按钮
    const filterBtns = document.querySelectorAll('.todo-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.dataset.filter;
        const items = document.querySelectorAll('.todo-item');
        
        items.forEach(item => {
          const isCompleted = item.classList.contains('completed');
          let show = true;
          
          if (filter === 'active') show = !isCompleted;
          else if (filter === 'completed') show = isCompleted;
          
          item.style.display = show ? '' : 'none';
        });
      });
    });
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const todoWindow = document.getElementById('todo-window');
  if (todoWindow && !window.todoManager) {
    window.todoManager = new TodoManager();
  }
});
