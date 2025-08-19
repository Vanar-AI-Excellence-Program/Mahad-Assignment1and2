<script lang="ts">
  import type { PageData } from './$types';
  export let data: PageData;

  let promoting: Record<string, boolean> = {};
  let demoting: Record<string, boolean> = {};

  async function setRole(userId: string, role: 'admin' | 'user') {
    try {
      role === 'admin' ? promoting[userId] = true : demoting[userId] = true;
      const res = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || 'Failed to update role');
        return;
      }
      location.reload();
    } finally {
      promoting[userId] = false;
      demoting[userId] = false;
    }
  }
</script>

<div class="px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
  <!-- Header Section -->
  <div class="mb-8">
    <div class="flex items-center space-x-3 mb-4">
      <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-glow">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
      </div>
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p class="text-gray-600 mt-1">Manage users and view system analytics</p>
      </div>
    </div>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="admin-stats-card group">
      <div class="flex items-center justify-between">
        <div>
          <div class="admin-stats-label">Total Users</div>
          <div class="admin-stats-value text-blue-600">{data.stats.total}</div>
        </div>
        <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="admin-stats-card group">
      <div class="flex items-center justify-between">
        <div>
          <div class="admin-stats-label">Verified Users</div>
          <div class="admin-stats-value text-green-600">{data.stats.verified}</div>
        </div>
        <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors duration-300">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="admin-stats-card group">
      <div class="flex items-center justify-between">
        <div>
          <div class="admin-stats-label">Admin Users</div>
          <div class="admin-stats-value text-purple-600">{data.stats.admins}</div>
        </div>
        <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors duration-300">
          <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="admin-stats-card group">
      <div class="flex items-center justify-between">
        <div>
          <div class="admin-stats-label">Unverified</div>
          <div class="admin-stats-value text-orange-600">{data.stats.total - data.stats.verified}</div>
        </div>
        <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors duration-300">
          <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
      </div>
    </div>
  </div>

  <!-- User Management Section -->
  <div class="card">
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900">User Management</h2>
      </div>
      <div class="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
        Showing {data.users.length} of {data.stats.total} users
      </div>
    </div>
    
    <div class="overflow-x-auto">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Status</th>
            <th>Role</th>
            <th>Joined</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.users as u}
            <tr>
              <td class="font-medium text-gray-900">
                <div class="flex items-center space-x-2">
                  <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span class="text-sm font-medium text-gray-600">
                      {u.email[0].toUpperCase()}
                    </span>
                  </div>
                  <span class="truncate max-w-xs">{u.email}</span>
                </div>
              </td>
              <td>
                {#if u.emailVerified}
                  <span class="admin-status-verified">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    Verified
                  </span>
                {:else}
                  <span class="admin-status-unverified">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    Unverified
                  </span>
                {/if}
              </td>
              <td>
                {#if (u as any).role === 'admin'}
                  <span class="admin-role-admin">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
                    </svg>
                    Admin
                  </span>
                {:else}
                  <span class="admin-role-user">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                    </svg>
                    User
                  </span>
                {/if}
              </td>
              <td class="text-gray-500">
                {new Date(u.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </td>
              <td class="text-right">
                {#if (u as any).role !== 'admin'}
                  <button 
                    class="admin-action-btn admin-action-btn-primary" 
                    disabled={promoting[u.id]} 
                    on:click={() => setRole(u.id, 'admin')}
                  >
                    {#if promoting[u.id]}
                      <svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Promoting...
                    {:else}
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      Make Admin
                    {/if}
                  </button>
                {:else}
                  <button 
                    class="admin-action-btn admin-action-btn-secondary" 
                    disabled={demoting[u.id]} 
                    on:click={() => setRole(u.id, 'user')}
                  >
                    {#if demoting[u.id]}
                      <svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Demoting...
                    {:else}
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                      </svg>
                      Remove Admin
                    {/if}
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>


